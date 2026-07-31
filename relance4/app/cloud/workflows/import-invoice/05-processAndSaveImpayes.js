// backend/cloud/workflows/import-invoice/05-processAndSaveImpayes.js
// Étape 5 : Traite et sauvegarde les impayés dans Parse
// Input: { pieces, statutsMap, employesMap, interlocuteursByDossier }
// Output: { stats }

const { info, warn, error } = require("../../utils/logger");

// Initialiser Parse si nécessaire
if (typeof Parse === "undefined") {
    const Parse = require("parse/node");
    Parse.initialize(
        process.env.PARSE_APP_ID,
        process.env.PARSE_JAVASCRIPT_KEY,
        process.env.PARSE_MASTER_KEY,
    );
    Parse.serverURL = process.env.PARSE_SERVER_URL;
    Parse.Cloud.useMasterKey();
    global.Parse = Parse;
}

// ============================================================================
// UTILITAIRES POUR BATCH SAVE
// ============================================================================

/**
 * Sauvegarde un tableau d'objets Parse par lots (batch)
 * Utilise Parse.Object.saveAll() pour minimiser les requêtes réseau
 * @param {Parse.Object[]} objects - Tableau d'objets Parse à sauvegarder
 * @param {Object} options - Options pour saveAll (ex: { useMasterKey: true })
 * @param {number} batchSize - Taille maximale d'un batch (défaut: 50)
 * @returns {Promise<Parse.Object[]>} Tableau des objets sauvegardés
 */
async function batchSave(objects, options = {}, batchSize = 50) {
    if (!objects || objects.length === 0) {
        return [];
    }

    const results = [];
    const totalBatches = Math.ceil(objects.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
        const startIdx = i * batchSize;
        const endIdx = startIdx + batchSize;
        const batch = objects.slice(startIdx, endIdx);

        info(
            `Sauvegarde batch ${i + 1}/${totalBatches} (${batch.length} objets)`,
            "import-invoice",
            "batchSave",
            { batchNum: i + 1, totalBatches, batchSize: batch.length },
        );

        try {
            const saved = await Parse.Object.saveAll(batch, options);
            results.push(...saved);
            info(
                `Batch ${i + 1}/${totalBatches} sauvegardé avec succès`,
                "import-invoice",
                "batchSave",
                { batchNum: i + 1, savedCount: saved.length },
            );
        } catch (err) {
            error(
                `Erreur sauvegarde batch ${i + 1}/${totalBatches}: ${err.message}`,
                "import-invoice",
                "batchSave",
                {
                    batchNum: i + 1,
                    error: err.message,
                    stack: err.stack?.substring(0, 500),
                },
            );
            throw err;
        }
    }

    return results;
}

// Month names in French for URL building
let MOIS_FR = [
    "janvier",
    "fevrier",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "aout",
    "septembre",
    "octobre",
    "novembre",
    "decembre",
];

function buildUrlPdf(refPiece, dateCre) {
    if (!refPiece || !dateCre) return null;
    let d = new Date(dateCre);
    if (isNaN(d.getTime())) return null;
    let year = d.getFullYear();
    let month = MOIS_FR[d.getMonth()];
    let refClean = String(refPiece).replace(/\s+/g, "_");
    return `/ADN/Reporting/Gco/Piece/${year}/${month}/${refClean}/standard/${refPiece} (GCO PI FA).pdf`;
}

function buildAdresse(row) {
    return (
        [row.numVoie, row.cptNumVoie, row.typeVoie, row.adresse, row.cptAdresse]
            .filter(Boolean)
            .join(" ")
            .trim() || null
    );
}

// Helper to get interlocuteur by role
function getInterlocuteurDataByRole(interlocuteurs, roleName) {
    const interloc = interlocuteurs.find((i) => i.role === roleName);
    return interloc || null;
}

function getInterlocuteurField(interlocuteurs, role, field) {
    const interloc = interlocuteurs.find((i) => i.role === role);
    return interloc ? interloc[field] : null;
}

function getInterlocuteurContactField(interlocuteurs, role, field) {
    const interloc = interlocuteurs.find((i) => i.role === role && i.idContact);
    return interloc ? interloc[field] : null;
}

// Fonction utilitaire pour comparer les changements
function hasChanges(oldValues, newValues) {
    if (!oldValues) return true;
    for (let key in newValues) {
        if (newValues[key] instanceof Date && oldValues[key] instanceof Date) {
            if (newValues[key].getTime() !== oldValues[key].getTime())
                return true;
        } else if (newValues[key] !== oldValues[key]) {
            return true;
        }
    }
    return false;
}

// ============================================================================
// FONCTIONS POUR PRÉPARER LES OBJETS (sans save immédiat)
// ============================================================================

/**
 * Prépare un contact pour upsert (sans save)
 * @returns {Parse.Object} Le contact préparé
 */
function prepareContactUpsert({
    externeId,
    nom,
    prenom,
    email,
    telephone,
    typePersonne,
    existingContact = null,
}) {
    if (!externeId || !nom) return null;

    let Contact = Parse.Object.extend("Contact");
    let contact = existingContact ? existingContact : new Contact();

    if (!existingContact) {
        contact.set("externe_id", String(externeId));
        contact.set("source", "db_externe");
    }

    // Toujours mettre à jour tous les champs - SQLite est la source de vérité
    contact.set("nom", nom);
    contact.set("prenom", prenom || null);
    contact.set("type_personne", typePersonne || null);

    if (email !== undefined) contact.set("email", email || null);
    if (telephone !== undefined) contact.set("telephone", telephone || null);

    return contact;
}

/**
 * Prépare un impayé pour upsert (sans save)
 * @returns {Parse.Object} L'impayé préparé
 */
function prepareImpayeUpsert(
    pieceRow,
    impaye,
    statutsMap,
    employesMap,
    interlocuteurs,
) {
    const externeId = Number(pieceRow.nfacture);
    const dossierNum =
        pieceRow.numero || pieceRow.idDossier || pieceRow.dossier_id;

    const employe = pieceRow.idEmployeIntervention
        ? employesMap[pieceRow.idEmployeIntervention]
        : null;
    const employeIntervention = employe
        ? `${employe.prenom || ""} ${employe.nom || ""}`.trim()
        : "";

    const statutIntitule = pieceRow.idStatut
        ? statutsMap[pieceRow.idStatut]
        : null;

    let Impaye = Parse.Object.extend("Impaye");
    let isNewImpaye = !impaye;

    if (!impaye) {
        impaye = new Impaye();
        impaye.set("externe_id", externeId);
        impaye.set("source", "db_externe");
    }

    // Champs toujours mis à jour
    impaye.set("nfacture", Number(pieceRow.nfacture));
    impaye.set(
        "date_piece",
        pieceRow.datepiece ? new Date(pieceRow.datepiece) : null,
    );
    impaye.set(
        "date_echeance",
        pieceRow.dateecheance ? new Date(pieceRow.dateecheance) : null,
    );
    impaye.set(
        "date_debut_mission",
        pieceRow.dateDebutMission ? new Date(pieceRow.dateDebutMission) : null,
    );
    impaye.set(
        "total_ht",
        pieceRow.totalhtnet != null ? Number(pieceRow.totalhtnet) : null,
    );
    impaye.set(
        "total_ttc",
        pieceRow.totalttcnet != null ? Number(pieceRow.totalttcnet) : null,
    );
    impaye.set(
        "reste_a_payer",
        pieceRow.resteapayer != null ? Number(pieceRow.resteapayer) : null,
    );
    impaye.set("facture_soldee", Boolean(pieceRow.facturesoldee));
    impaye.set("commentaire_piece", pieceRow.commentaire_piece || null);
    impaye.set("ref_piece", pieceRow.refpiece || null);
    impaye.set("url_pdf", buildUrlPdf(pieceRow.refpiece, pieceRow.datecre));
    impaye.set(
        "id_dossier",
        pieceRow.idDossier ? String(pieceRow.idDossier) : null,
    );
    impaye.set("numero_dossier", pieceRow.numero || null);
    impaye.set("reference", pieceRow.reference || null);
    impaye.set("reference_externe", pieceRow.referenceExterne || null);
    impaye.set("statut_dossier", statutIntitule || null);
    impaye.set("commentaire_dossier", pieceRow.commentaire_dossier || null);
    impaye.set("employe_intervention", employeIntervention || null);
    impaye.set("adresse_bien", buildAdresse(pieceRow));
    impaye.set("code_postal", pieceRow.codePostal || null);
    impaye.set("ville", pieceRow.ville || null);
    impaye.set("numero_lot", pieceRow.numeroLot || null);
    impaye.set("etage", pieceRow.etage || null);
    impaye.set("entree", pieceRow.entree || null);
    impaye.set("escalier", pieceRow.escalier || null);
    impaye.set("porte", pieceRow.porte || null);

    // Cadre mission (contexte: AVV=avant vente, LOC=location, etc.)
    impaye.set("cadre_mission", pieceRow.idCadreMission || null);

    // Tableau de toutes les missions (parsé depuis JSON SQLite)
    let missions = [];
    if (pieceRow.missions_json) {
        try {
            const parsed = JSON.parse(pieceRow.missions_json);
            // json_group_array retourne '[null]' si vide, on filtre
            missions = Array.isArray(parsed)
                ? parsed.filter((m) => m && m.idMission)
                : [];
        } catch (e) {
            missions = [];
        }
    }
    impaye.set("missions", missions);

    // Mapping des rôles vers les préfixes de champs Parse existants
    const roleToFieldPrefix = {
        Payeur: "payeur",
        "Apporteur d'affaire": "apporteur",
        Acquéreur: "acquereur",
        "Donneur d'ordre": "donneur_ordre",
        "Locataire entrant": "locataire_entrant",
        "Locataire sortant": "locataire_sortant",
        Notaire: "notaire",
        Propriétaire: "proprietaire",
        Syndic: "syndic",
    };

    for (const [role, prefix] of Object.entries(roleToFieldPrefix)) {
        impaye.set(
            `${prefix}_nom`,
            getInterlocuteurField(interlocuteurs, role, "nom") || null,
        );
        impaye.set(
            `${prefix}_prenom`,
            getInterlocuteurField(interlocuteurs, role, "prenom") || null,
        );
        impaye.set(
            `${prefix}_email`,
            getInterlocuteurField(interlocuteurs, role, "email") || null,
        );
        impaye.set(
            `${prefix}_telephone`,
            getInterlocuteurField(interlocuteurs, role, "telephone") || null,
        );

        if (role === "Propriétaire" || role === "Payeur") {
            impaye.set(
                `${prefix}_type_personne`,
                getInterlocuteurField(interlocuteurs, role, "typePersonne") ||
                    null,
            );
        }

        // contact fields
        if (
            role === "Payeur" ||
            role === "Apporteur d'affaire" ||
            role === "Propriétaire"
        ) {
            impaye.set(
                `${prefix}_contact_nom`,
                getInterlocuteurContactField(
                    interlocuteurs,
                    role,
                    "contact_nom",
                ) || null,
            );
            impaye.set(
                `${prefix}_contact_prenom`,
                getInterlocuteurContactField(
                    interlocuteurs,
                    role,
                    "contact_prenom",
                ) || null,
            );
            impaye.set(
                `${prefix}_contact_email`,
                getInterlocuteurContactField(
                    interlocuteurs,
                    role,
                    "contact_email",
                ) || null,
            );
        }
    }

    // Calcul du type payeur
    const payeurNom = getInterlocuteurField(interlocuteurs, "Payeur", "nom");
    const proprietaireNom = getInterlocuteurField(
        interlocuteurs,
        "Propriétaire",
        "nom",
    );
    const apporteurNom = getInterlocuteurField(
        interlocuteurs,
        "Apporteur d'affaire",
        "nom",
    );
    let payeurType = "Autre";
    if (payeurNom && proprietaireNom && payeurNom === proprietaireNom) {
        payeurType = "Propriétaire";
    } else if (payeurNom && apporteurNom && payeurNom === apporteurNom) {
        payeurType = "Apporteur d'affaire";
    }
    impaye.set("payeur_type", payeurType);

    return { impaye, isNewImpaye };
}

/**
 * Prépare une activité de log (sans save)
 * @returns {Parse.Object} L'activité préparée
 */
function prepareActiviteLog({
    operation,
    nfacture,
    impayeId,
    montant,
    payeurNom,
    datePiece,
    oldValues,
    newValues,
    errorMessage = null,
}) {
    let activite = new Parse.Object("Activite");
    activite.set("type", "sync_impaye");
    activite.set("operation", operation);
    activite.set("nfacture", nfacture);
    if (impayeId) activite.set("impaye_id", impayeId);
    if (montant !== undefined) activite.set("montant", montant);
    if (payeurNom) activite.set("payeur_nom", payeurNom);
    if (datePiece) activite.set("date_piece", datePiece);
    activite.set("trigger", "workflow");
    activite.set("timestamp", new Date());
    if (errorMessage) activite.set("error_message", errorMessage);
    return activite;
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

/**
 * Étape 5 : Traite et sauvegarde les impayés dans Parse
 * Utilise des batch saves pour optimiser les performances
 * @param {Object} param0 - { pieces, statutsMap, employesMap, interlocuteursByDossier }
 * @returns {Promise<Object>} { stats }
 */
async function processAndSaveImpayes({
    pieces,
    statutsMap,
    employesMap,
    interlocuteursByDossier,
}) {
    const stats = {
        impayes_created: 0,
        impayes_updated: 0,
        contacts_created: 0,
        contacts_updated: 0,
        errors: [],
    };

    info(
        "Étape 5: Début du traitement des impayés (mode BATCH)",
        "import-invoice",
        "processAndSaveImpayes",
        { pieceCount: pieces.length },
    );

    // ========================================================================
    // PHASE 1 : COLLECTE DES IDS DE CONTACTS À VÉRIFIER
    // ========================================================================
    const contactIdsToCheck = new Set();

    for (const pieceRow of pieces) {
        const dossierId = pieceRow.dossier_id || pieceRow.idDossier;
        const interlocuteurs = interlocuteursByDossier[dossierId] || [];

        const payeurPersonneData = interlocuteurs.find(
            (i) => i.role === "Payeur" && i.contact_interlocuteur_id,
        );
        const payeurContactData = interlocuteurs.find(
            (i) => i.role === "Payeur" && i.idInterlocuteur,
        );
        const apporteurPersonneData = interlocuteurs.find(
            (i) =>
                i.role === "Apporteur d'affaire" && i.contact_interlocuteur_id,
        );
        const apporteurContactData = interlocuteurs.find(
            (i) => i.role === "Apporteur d'affaire" && i.idInterlocuteur,
        );

        if (payeurPersonneData?.contact_interlocuteur_id) {
            contactIdsToCheck.add(
                String(payeurPersonneData.contact_interlocuteur_id),
            );
        }
        if (payeurContactData?.idInterlocuteur) {
            contactIdsToCheck.add(String(payeurContactData.idInterlocuteur));
        }
        if (apporteurPersonneData?.contact_interlocuteur_id) {
            contactIdsToCheck.add(
                String(apporteurPersonneData.contact_interlocuteur_id),
            );
        }
        if (apporteurContactData?.idInterlocuteur) {
            contactIdsToCheck.add(String(apporteurContactData.idInterlocuteur));
        }
    }

    // ========================================================================
    // PHASE 2 : RÉCUPÉRER TOUS LES CONTACTS EXISTANTS EN UNE SEULE REQUÊTE
    // ========================================================================
    const existingContactsMap = new Map(); // externe_id -> Parse.Object

    if (contactIdsToCheck.size > 0) {
        info(
            `Récupération de ${contactIdsToCheck.size} contacts existants`,
            "import-invoice",
            "processAndSaveImpayes",
            { contactCount: contactIdsToCheck.size },
        );

        const Contact = Parse.Object.extend("Contact");
        const query = new Parse.Query(Contact);
        query.containedIn("externe_id", Array.from(contactIdsToCheck));
        query.limit(10000);

        try {
            const existingContacts = await query.find({ useMasterKey: true });
            for (const contact of existingContacts) {
                existingContactsMap.set(contact.get("externe_id"), contact);
            }
            info(
                `${existingContacts.length} contacts existants trouvés`,
                "import-invoice",
                "processAndSaveImpayes",
                { foundCount: existingContacts.length },
            );
        } catch (err) {
            error(
                `Erreur récupération contacts existants: ${err.message}`,
                "import-invoice",
                "processAndSaveImpayes",
                { error: err.message, stack: err.stack?.substring(0, 500) },
            );
            // Continuer sans les contacts existants
        }
    }

    // ========================================================================
    // PHASE 3 : TRAITEMENT DES PIÈCES ET COLLECTE DES OBJETS
    // ========================================================================

    // Tableaux pour collecter les objets à sauvegarder
    const contactsToSave = []; // Contacts (personnes et entreprises)
    const impayesToSave = []; // Impayés
    const activitesToSave = []; // Activités de log
    const entreprisesToSave = []; // Entreprises avec relations employes

    for (const pieceRow of pieces) {
        try {
            info(
                `Traitement de l'impayé nfacture=${pieceRow.nfacture}`,
                "import-invoice",
                "processAndSaveImpayes",
                { nfacture: pieceRow.nfacture },
            );

            // Récupérer les interlocuteurs pour ce dossier
            const dossierId = pieceRow.dossier_id || pieceRow.idDossier;
            const interlocuteurs = interlocuteursByDossier[dossierId] || [];

            // Récupérer le statut du dossier
            const statutIntitule = pieceRow.idStatut
                ? statutsMap[pieceRow.idStatut]
                : null;

            // Récupérer l'employé intervention
            const employe = pieceRow.idEmployeIntervention
                ? employesMap[pieceRow.idEmployeIntervention]
                : null;
            const employeIntervention = employe
                ? `${employe.prenom || ""} ${employe.nom || ""}`.trim()
                : "";

            // Extraire les interlocuteurs par rôle
            const payeurPersonneData = interlocuteurs.find(
                (i) => i.role === "Payeur" && i.contact_interlocuteur_id,
            );
            const payeurContactData = interlocuteurs.find(
                (i) => i.role === "Payeur" && i.idInterlocuteur,
            );
            const apporteurPersonneData = interlocuteurs.find(
                (i) =>
                    i.role === "Apporteur d'affaire" &&
                    i.contact_interlocuteur_id,
            );
            const apporteurContactData = interlocuteurs.find(
                (i) => i.role === "Apporteur d'affaire" && i.idInterlocuteur,
            );

            // ── 1. Préparer personne physique du payeur (si entreprise)
            let payeurPersonne = null;
            if (
                payeurPersonneData?.contact_interlocuteur_id &&
                payeurPersonneData.contact_nom
            ) {
                const externeId = String(
                    payeurPersonneData.contact_interlocuteur_id,
                );
                const existing = existingContactsMap.get(externeId);
                payeurPersonne = prepareContactUpsert({
                    externeId,
                    nom: payeurPersonneData.contact_nom || null,
                    prenom: payeurPersonneData.contact_prenom || null,
                    email: payeurPersonneData.contact_email,
                    typePersonne: payeurPersonneData.contact_typePersonne,
                    existingContact: existing,
                });
                contactsToSave.push(payeurPersonne);
                // Mettre à jour la map pour les références futures
                if (!existing) {
                    existingContactsMap.set(externeId, payeurPersonne);
                }
            }

            // ── 2. Préparer Contact payeur + lien employe
            let payeurContact = null;
            if (payeurContactData?.idInterlocuteur) {
                const externeId = String(payeurContactData.idInterlocuteur);
                const existing = existingContactsMap.get(externeId);
                payeurContact = prepareContactUpsert({
                    externeId,
                    nom: payeurContactData.nom || null,
                    prenom: payeurContactData.prenom || null,
                    email: payeurContactData.email,
                    telephone: payeurContactData.telephone,
                    typePersonne: payeurContactData.typePersonne,
                    existingContact: existing,
                });
                contactsToSave.push(payeurContact);
                if (!existing) {
                    existingContactsMap.set(externeId, payeurContact);
                }
            }

            // ── 3. Préparer personne physique de l'apporteur
            let apporteurPersonne = null;
            if (
                apporteurPersonneData?.contact_interlocuteur_id &&
                apporteurPersonneData.contact_nom
            ) {
                const externeId = String(
                    apporteurPersonneData.contact_interlocuteur_id,
                );
                const existing = existingContactsMap.get(externeId);
                apporteurPersonne = prepareContactUpsert({
                    externeId,
                    nom: apporteurPersonneData.contact_nom || null,
                    prenom: apporteurPersonneData.contact_prenom || null,
                    email: apporteurPersonneData.contact_email,
                    typePersonne: apporteurPersonneData.contact_typePersonne,
                    existingContact: existing,
                });
                contactsToSave.push(apporteurPersonne);
                if (!existing) {
                    existingContactsMap.set(externeId, apporteurPersonne);
                }
            }

            // ── 4. Préparer Contact apporteur + lien employe
            let apporteurContact = null;
            if (apporteurContactData?.idInterlocuteur) {
                const externeId = String(apporteurContactData.idInterlocuteur);
                const existing = existingContactsMap.get(externeId);
                apporteurContact = prepareContactUpsert({
                    externeId,
                    nom: apporteurContactData.nom || null,
                    prenom: apporteurContactData.prenom || null,
                    email: apporteurContactData.email,
                    telephone: apporteurContactData.telephone,
                    typePersonne: apporteurContactData.typePersonne,
                    existingContact: existing,
                });
                contactsToSave.push(apporteurContact);
                if (!existing) {
                    existingContactsMap.set(externeId, apporteurContact);
                }
            }

            // ── 5. Préparer Impayé
            const externeId = Number(pieceRow.nfacture);
            const dossierNum =
                pieceRow.numero || pieceRow.idDossier || pieceRow.dossier_id;

            // Rechercher l'impayé existant
            const Impaye = Parse.Object.extend("Impaye");
            const qi = new Parse.Query(Impaye);
            qi.equalTo("nfacture", externeId);
            qi.equalTo("numero_dossier", dossierNum || null);
            let impaye = await qi.first({ useMasterKey: true });
            let isNewImpaye = !impaye;

            const result = prepareImpayeUpsert(
                pieceRow,
                impaye,
                statutsMap,
                employesMap,
                interlocuteurs,
            );
            impaye = result.impaye;
            isNewImpaye = result.isNewImpaye;

            // Pointers vers les Contacts (nécessitent que les contacts soient déjà sauvés)
            if (payeurContact) impaye.set("payeur", payeurContact);
            if (apporteurContact) impaye.set("apporteur", apporteurContact);

            // contact_relance : défini uniquement à la création
            if (isNewImpaye) {
                let defaultRelance = payeurPersonne || payeurContact;
                if (defaultRelance)
                    impaye.set("contact_relance", defaultRelance);
            }

            impayesToSave.push(impaye);

            // Statistiques
            if (isNewImpaye) {
                stats.impayes_created++;
            } else {
                stats.impayes_updated++;
            }

            // Préparer l'activité de log (à sauvegarder après les impayés)
            const payeurNomValue = getInterlocuteurField(
                interlocuteurs,
                "Payeur",
                "nom",
            );
            const datePieceValue = pieceRow.datepiece
                ? new Date(pieceRow.datepiece)
                : null;
            const montantValue =
                pieceRow.resteapayer != null
                    ? Number(pieceRow.resteapayer)
                    : null;

            activitesToSave.push(
                prepareActiviteLog({
                    operation: isNewImpaye ? "created" : "updated",
                    nfacture: pieceRow.nfacture,
                    impayeId: impaye.id,
                    montant: montantValue,
                    payeurNom: payeurNomValue,
                    datePiece: datePieceValue,
                }),
            );

            info(
                `Impayé préparé nfacture=${pieceRow.nfacture} (${isNewImpaye ? "NOUVEAU" : "MAJ"})`,
                "import-invoice",
                "processAndSaveImpayes",
                { nfacture: pieceRow.nfacture, isNew: isNewImpaye },
            );
        } catch (err) {
            error(
                `Erreur traitement nfacture=${pieceRow?.nfacture || "inconnu"}: ${err.message}`,
                "import-invoice",
                "processAndSaveImpayes",
                {
                    nfacture: pieceRow?.nfacture,
                    error: err.message,
                    stack: err.stack?.substring(0, 500),
                },
            );
            stats.errors.push({
                nfacture: pieceRow?.nfacture,
                error: err.message,
            });

            // Préparer une activité d'erreur
            if (pieceRow?.nfacture) {
                activitesToSave.push(
                    prepareActiviteLog({
                        operation: "error",
                        nfacture: pieceRow.nfacture,
                        errorMessage: err.message,
                    }),
                );
            }
        }
    }

    // ========================================================================
    // PHASE 4 : SAUVEGARDE PAR BATCHS DANS LE BON ORDRE
    // ========================================================================

    // 1. Sauvegarder tous les contacts
    if (contactsToSave.length > 0) {
        info(
            `Sauvegarde de ${contactsToSave.length} contacts par batch`,
            "import-invoice",
            "processAndSaveImpayes",
            { contactCount: contactsToSave.length },
        );
        await batchSave(contactsToSave, { useMasterKey: true }, 50);
    }

    // 2. Sauvegarder tous les impayés
    if (impayesToSave.length > 0) {
        info(
            `Sauvegarde de ${impayesToSave.length} impayés par batch`,
            "import-invoice",
            "processAndSaveImpayes",
            { impayeCount: impayesToSave.length },
        );
        await batchSave(impayesToSave, { useMasterKey: true }, 50);
    }

    // 3. Sauvegarder toutes les activités
    if (activitesToSave.length > 0) {
        info(
            `Sauvegarde de ${activitesToSave.length} activités par batch`,
            "import-invoice",
            "processAndSaveImpayes",
            { activiteCount: activitesToSave.length },
        );
        await batchSave(activitesToSave, { useMasterKey: true }, 50);
    }

    // Mettre à jour les statistiques pour les contacts
    // Pour l'instant, on compte simplement le nombre de contacts préparés
    // (On pourrait faire mieux en vérifiant quels étaient nouveaux)
    // stats.contacts_created = ...; // À implémenter si nécessaire
    // stats.contacts_updated = ...;

    info(
        `Étape 5 terminée — ${stats.impayes_created} créés, ${stats.impayes_updated} MàJ, ${stats.errors.length} erreurs`,
        "import-invoice",
        "processAndSaveImpayes",
        {
            created: stats.impayes_created,
            updated: stats.impayes_updated,
            errors: stats.errors.length,
        },
    );

    return {
        stats,
    };
}

module.exports = processAndSaveImpayes;
