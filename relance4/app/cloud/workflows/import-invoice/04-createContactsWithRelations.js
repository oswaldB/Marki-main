// backend/cloud/workflows/import-invoice/04-createContactsWithRelations.js
// Étape 4.5 : Crée tous les contacts Parse et lie les employés aux entreprises
// Input: { interlocuteursByDossier: {} }
// Output: { contactsMap: Map, relInterlocuteurContactMap: {}, stats: {} }

const Database = require("better-sqlite3");
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

/**
 * Récupère les relations entreprise→employés depuis SQLite
 * @returns {Promise<Object>} Map: idInterlocuteur -> [{idContact, typeContact}]
 */
async function fetchRelInterlocuteurContact() {
    const dbPath =
        process.env.NODE_ENV === "test" && process.env.TEST_DB_PATH
            ? process.env.TEST_DB_PATH
            : "/home/arthur/adti/sync.db";

    const db = new Database(dbPath);

    try {
        info(
            "Récupération des relations entreprise-employés",
            "import-invoice",
            "fetchRelInterlocuteurContact",
        );

        const rows = db
            .prepare(
                `SELECT idInterlocuteur, idContact, typeContact FROM _ADN_RG_RelInterlocuteurContact`,
            )
            .all();

        const relMap = {};
        rows.forEach((row) => {
            if (!relMap[row.idInterlocuteur]) {
                relMap[row.idInterlocuteur] = [];
            }
            relMap[row.idInterlocuteur].push({
                idContact: row.idContact,
                typeContact: row.typeContact,
            });
        });

        info(
            `Relations entreprise-employés chargées: ${Object.keys(relMap).length} entreprises avec employés`,
            "import-invoice",
            "fetchRelInterlocuteurContact",
            { entreprisesCount: Object.keys(relMap).length },
        );

        return relMap;
    } catch (err) {
        error(
            `Erreur récupération relations: ${err.message}`,
            "import-invoice",
            "fetchRelInterlocuteurContact",
            { error: err.message },
        );
        return {};
    } finally {
        db.close();
    }
}

/**
 * Crée un contact Parse à partir des données interlocuteur
 * @param {Object} interloc - Données de l'interlocuteur
 * @param {Map} existingContactsMap - Map des contacts existants (externe_id -> Parse.Object)
 * @returns {Parse.Object} Le contact préparé
 */
function prepareContactFromInterlocuteur(interloc, existingContactsMap) {
    const externeId = String(interloc.idInterlocuteur);
    const Contact = Parse.Object.extend("Contact");
    let contact = existingContactsMap.get(externeId);

    if (!contact) {
        contact = new Contact();
        contact.set("externe_id", externeId);
        contact.set("source", "db_externe");
    }

    // Mettre à jour les champs de base
    contact.set("nom", interloc.nom || null);
    contact.set("prenom", interloc.prenom || null);
    contact.set("type_personne", interloc.typePersonne || null);

    // Civilité
    if (interloc.titre || interloc.civilite) {
        contact.set("civilite", interloc.titre || interloc.civilite || null);
    }

    // Email - priorité à l'email de l'interlocuteur principal
    if (interloc.email) {
        contact.set("email", interloc.email);
    }

    // Téléphone - priorité au téléphone mobile, sinon fixe
    const telephone = interloc.telephoneMobile || interloc.telephone || interloc.telephoneFixe || null;
    if (telephone) {
        contact.set("telephone", telephone);
    }

    // Adresse
    if (interloc.adresse1) contact.set("adresse", interloc.adresse1);
    if (interloc.codePostal) contact.set("code_postal", interloc.codePostal);
    if (interloc.ville) contact.set("ville", interloc.ville);

    return contact;
}

/**
 * Crée tous les contacts Parse depuis les interlocuteurs et lie les employés aux entreprises
 * @param {Object} param0 - { interlocuteursByDossier: {} }
 * @returns {Promise<Object>} { contactsMap, relInterlocuteurContactMap, stats }
 */
async function createContactsWithRelations({ interlocuteursByDossier }) {
    const stats = {
        contacts_created: 0,
        contacts_updated: 0,
        employees_linked: 0,
    };

    info(
        "Étape 4.5: Création des contacts avec relations entreprise-employés",
        "import-invoice",
        "createContactsWithRelations",
        { dossiersCount: Object.keys(interlocuteursByDossier).length },
    );

    // 1. Récupérer les relations entreprise→employés
    const relInterlocuteurContactMap = await fetchRelInterlocuteurContact();

    // 2. Collecter TOUS les interlocuteurs uniques depuis tous les dossiers
    const allInterlocuteursMap = {}; // idInterlocuteur -> interloc data
    const contactIdsToCheck = new Set();

    for (const interlocuteurs of Object.values(interlocuteursByDossier)) {
        for (const interloc of interlocuteurs) {
            // Interlocuteur principal
            if (interloc.idInterlocuteur) {
                const idKey = String(interloc.idInterlocuteur);
                allInterlocuteursMap[idKey] = interloc;
                contactIdsToCheck.add(idKey);
            }
            // Contact associé (si présent)
            if (interloc.contact_interlocuteur_id) {
                const idKey = String(interloc.contact_interlocuteur_id);
                // On n'a pas les données complètes pour ce contact, mais on l'ajoute
                if (!allInterlocuteursMap[idKey]) {
                    allInterlocuteursMap[idKey] = {
                        idInterlocuteur: interloc.contact_interlocuteur_id,
                        nom: interloc.contact_nom,
                        prenom: interloc.contact_prenom,
                        email: interloc.contact_email,
                        typePersonne: interloc.contact_typePersonne,
                        titre: interloc.contact_civilite,
                    };
                }
                contactIdsToCheck.add(idKey);
            }
        }
    }

    // 3. Ajouter les employés depuis les relations (qui ne sont pas encore dans allInterlocuteursMap)
    for (const [idInterlocuteur, employes] of Object.entries(relInterlocuteurContactMap)) {
        for (const emp of employes) {
            const empId = String(emp.idContact);
            contactIdsToCheck.add(empId);
            // Si on n'a pas déjà cet employé dans allInterlocuteursMap, on va le récupérer plus tard
            // depuis Parse ou on le créera avec des données minimales
        }
    }

    // 4. Récupérer les contacts Parse existants
    const existingContactsMap = new Map(); // externe_id -> Parse.Object
    if (contactIdsToCheck.size > 0) {
        info(
            `Récupération de ${contactIdsToCheck.size} contacts existants...`,
            "import-invoice",
            "createContactsWithRelations",
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
                "createContactsWithRelations",
                { foundCount: existingContacts.length },
            );
        } catch (err) {
            error(
                `Erreur récupération contacts existants: ${err.message}`,
                "import-invoice",
                "createContactsWithRelations",
                { error: err.message, stack: err.stack?.substring(0, 500) },
            );
        }
    }

    // 5. Préparer tous les contacts à sauvegarder
    const contactsToSave = [];

    for (const [externeId, interloc] of Object.entries(allInterlocuteursMap)) {
        const contact = prepareContactFromInterlocuteur(interloc, existingContactsMap);

        if (!existingContactsMap.has(externeId)) {
            stats.contacts_created++;
        } else {
            stats.contacts_updated++;
        }

        contactsToSave.push(contact);
        existingContactsMap.set(externeId, contact);
    }

    // 6. Sauvegarder tous les contacts
    if (contactsToSave.length > 0) {
        info(
            `Sauvegarde de ${contactsToSave.length} contacts...`,
            "import-invoice",
            "createContactsWithRelations",
        );
        try {
            await Parse.Object.saveAll(contactsToSave, { useMasterKey: true, batchSize: 50 });
            info(
                `✅ ${contactsToSave.length} contacts sauvegardés`,
                "import-invoice",
                "createContactsWithRelations",
            );
        } catch (err) {
            error(
                `Erreur sauvegarde contacts: ${err.message}`,
                "import-invoice",
                "createContactsWithRelations",
                { error: err.message },
            );
        }
    }

    // 7. Lier les employés aux entreprises via le champ "entreprise"
    const contactsToLink = [];

    for (const [idEntreprise, employes] of Object.entries(relInterlocuteurContactMap)) {
        const entrepriseExterneId = String(idEntreprise);
        const entrepriseContact = existingContactsMap.get(entrepriseExterneId);

        if (!entrepriseContact) {
            warn(
                `Entreprise non trouvée pour idInterlocuteur: ${idEntreprise}`,
                "import-invoice",
                "createContactsWithRelations",
            );
            continue;
        }

        for (const emp of employes) {
            const employeExterneId = String(emp.idContact);
            const employeContact = existingContactsMap.get(employeExterneId);

            if (!employeContact) {
                warn(
                    `Employé non trouvé pour idContact: ${emp.idContact} (entreprise: ${idEntreprise})`,
                    "import-invoice",
                    "createContactsWithRelations",
                );
                continue;
            }

            // Éviter les auto-références
            if (employeContact.id === entrepriseContact.id) {
                continue;
            }

            // Définir le pointeur entreprise sur l'employé
            employeContact.set("entreprise", entrepriseContact);
            contactsToLink.push(employeContact);
            stats.employees_linked++;
        }
    }

    // 8. Sauvegarder les liens entreprise-employé
    if (contactsToLink.length > 0) {
        info(
            `Sauvegarde des liens entreprise-employé pour ${contactsToLink.length} employés...`,
            "import-invoice",
            "createContactsWithRelations",
        );
        try {
            await Parse.Object.saveAll(contactsToLink, { useMasterKey: true, batchSize: 50 });
            info(
                `✅ ${contactsToLink.length} employés liés à leur entreprise`,
                "import-invoice",
                "createContactsWithRelations",
            );
        } catch (err) {
            error(
                `Erreur sauvegarde liens: ${err.message}`,
                "import-invoice",
                "createContactsWithRelations",
                { error: err.message },
            );
        }
    }

    info(
        `✅ Étape 4.5 TERMINÉE: ${stats.contacts_created} créés, ${stats.contacts_updated} mis à jour, ${stats.employees_linked} employés liés`,
        "import-invoice",
        "createContactsWithRelations",
        stats,
    );

    return {
        contactsMap: existingContactsMap,
        relInterlocuteurContactMap,
        stats,
    };
}

module.exports = createContactsWithRelations;
