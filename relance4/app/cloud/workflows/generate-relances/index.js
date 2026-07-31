// backend/cloud/workflows/generate-relances/index.js
// Mega-fonction de génération des relances d'impayés
// Implémente la spécification : specs/technical-specification.md

const Parse = require("parse/node");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// Configuration Ollama
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "https://ollama.com/api";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_MODEL = "mistral-large-3:675b-cloud";
const USE_OLLAMA = true;

// Configuration Frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || "https://adti.markidiags.com";

// Fichier de prompt (à la racine du projet)
const PROMPT_BASE_PATH = "/home/ubuntu/prod/adti/configuration/prompts/scenarios";

/**
 * Récupère le chemin du fichier de prompt selon le scénario
 * @param {string} scenarioType - Type de scénario (single, multiple, broker, both)
 * @returns {string} - Chemin du fichier de prompt
 */
function getPromptFile(scenarioType) {
    return path.join(PROMPT_BASE_PATH, `relance-${scenarioType}-prompt.txt`);
}

/**
 * Récupère les impayés où le contact est apporteur d'affaires (mais pas payeur)
 * @param {Parse.Object} contact - Le contact
 * @param {Array} currentImpayes - Les impayés déjà sélectionnés (à exclure)
 * @returns {Promise<Array>} - Liste des impayés où le contact est apporteur
 */
async function getBrokerImpayes(contact, currentImpayes) {
    const currentImpayeIds = new Set(currentImpayes.map((i) => i.id));
    
    const Impaye = Parse.Object.extend("Impaye");
    const query = new Parse.Query(Impaye);
    query.equalTo("facture_soldee", false);
    query.greaterThan("reste_a_payer", 0);
    
    // Le contact est l'apporteur
    query.equalTo("apporteur", contact);
    
    // Mais PAS le payeur (sinon c'est ses propres impayés)
    query.notEqualTo("payeur", contact);
    query.notEqualTo("contact_relance", contact);
    
    // Exclure les impayés déjà dans le groupe courant
    if (currentImpayeIds.size > 0) {
        query.notContainedIn("objectId", Array.from(currentImpayeIds));
    }
    
    query.limit(999999);
    
    try {
        const brokerImpayes = await query.find({ useMasterKey: true });
        return brokerImpayes;
    } catch (error) {
        log("ERROR", contact.id, null, `Erreur récupération broker impayés: ${error.message}`);
        return [];
    }
}

/**
 * Construit le JSON des impayés broker pour le prompt
 * @param {Array} brokerImpayes - Liste des impayés où le contact est apporteur
 * @returns {string} - JSON sérialisé
 */
function buildBrokerImpayesJson(brokerImpayes) {
    const data = brokerImpayes.map((i) => ({
        id: i.id,
        nfacture: i.get("nfacture"),
        reference: i.get("reference"),
        numero_dossier: i.get("numero_dossier"),
        date_piece: i.get("date_piece"),
        date_echeance: i.get("date_echeance"),
        total_ttc: i.get("total_ttc"),
        reste_a_payer: i.get("reste_a_payer"),
        adresse_bien: i.get("adresse_bien"),
        ville: i.get("ville"),
        code_postal: i.get("code_postal"),
        // Payeur de cet impayé (pas le contact courant)
        payeur_nom: i.get("payeur_nom"),
        payeur_prenom: i.get("payeur_prenom"),
        payeur_email: i.get("payeur_email"),
        // Apporteur = contact courant
        apporteur_nom: i.get("apporteur_nom"),
        apporteur_prenom: i.get("apporteur_prenom"),
        apporteur_societe: i.get("apporteur_societe"),
    }));

    return JSON.stringify(data);
}

/**
 * Détermine le type de scénario selon le contact et les impayés
 * @param {Parse.Object} contact - Le contact
 * @param {Array} impayes - Les impayés du groupe
 * @param {Array} brokerImpayes - Les impayés où le contact est apporteur
 * @returns {string} - Type de scénario (single, multiple, broker, both)
 */
function determineScenarioType(contact, impayes, brokerImpayes) {
    const nombreImpayes = impayes.length;
    
    // Détecter si le contact est un apporteur d'affaires
    const contactType = contact.get("type_personne");
    const isBroker = contactType === "Apporteur d'affaire" || 
                     contactType === "Apporteur" ||
                     contactType === "apporteur" ||
                     contactType === "apporteur d'affaire";
    
    const hasBrokerImpayes = brokerImpayes && brokerImpayes.length > 0;
    
    if (isBroker && hasBrokerImpayes) {
        return "both";
    } else if (isBroker) {
        return "broker";
    } else if (nombreImpayes === 1) {
        return "single";
    } else {
        return "multiple";
    }
}

// Fichier de prompt legacy (pour fallback)
const PROMPT_FILE = "/home/ubuntu/prod/adti/configuration/prompts/relance-email-prompt.txt";

/**
 * Écrit un message dans le fichier de log
 * Format : [timestamp] [INFO][contactId][email_index] message
 *          [timestamp] [GENERATE-RELANCES][INFO] message
 */
function log(level, contactId, emailIndex, message) {
    const timestamp = new Date().toISOString();
    const prefix = contactId && emailIndex !== undefined
        ? `[${level}][${contactId}][${emailIndex}]`
        : `[GENERATE-RELANCES][${level}]`;
    const logLine = `${timestamp} ${prefix} ${message}\n`;

    console.log(logLine.trim());

    try {
        const logDir = path.join(__dirname, "logs");
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(
            logDir,
            `generate-relances-${new Date().toISOString().split("T")[0]}.log`,
        );
        fs.appendFileSync(logFile, logLine);
    } catch (err) {
        console.error("Erreur d'écriture des logs:", err.message);
    }
}

/**
 * Parse la réponse YAML du LLM
 * @param {string} content - Contenu de la réponse
 * @returns {Object} - Objet avec objet et corps
 */
function parseLLMResponse(content) {
    const yamlMatch =
        content.match(/---\n([\s\S]*?)\n---/) ||
        content.match(/```yaml\n([\s\S]*?)```/) ||
        (content.match(/^(objet:|corps:)/m) ? [null, content] : null);

    if (!yamlMatch) {
        throw new Error("Format YAML non trouvé dans la réponse");
    }

    const yamlContent = yamlMatch[1] || content;
    const parsed = yaml.load(yamlContent);

    if (!parsed || !parsed.objet || !parsed.corps) {
        throw new Error("La réponse doit contenir les champs 'objet' et 'corps'");
    }

    return {
        objet: parsed.objet,
        corps: parsed.corps,
    };
}

/**
 * Appelle l'API Ollama pour générer le contenu de l'email
 * @param {string} prompt - Le prompt complet
 * @param {string} contactId - ID du contact pour les logs
 * @param {number} emailIndex - Index de l'email pour les logs
 * @returns {Promise<Object>} - Objet avec objet et corps
 */
async function callOllama(prompt, contactId, emailIndex) {
    const startTime = Date.now();

    log("INFO", contactId, emailIndex, `Début appel Ollama - Modèle: ${OLLAMA_MODEL}`);
    log("INFO", contactId, emailIndex, `Taille du prompt: ${prompt.length} caractères`);

    try {
        const response = await fetch(`${OLLAMA_API_URL}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(OLLAMA_API_KEY && { "Authorization": `Bearer ${OLLAMA_API_KEY}` }),
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt,
                stream: false,
                temperature: 0.1,
            }),
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        const content = data.response || data.text || data.content || data.message?.content;

        if (!content) {
            throw new Error("Réponse Ollama vide ou format inattendu");
        }

        log(
            "INFO",
            contactId,
            emailIndex,
            `Appel Ollama réussi - Durée: ${duration}ms - Status: ${response.status}`,
        );
        log("INFO", contactId, emailIndex, `Taille de la réponse: ${content.length} caractères`);

        const preview = content.substring(0, 200).replace(/\n/g, "\\n");
        log("INFO", contactId, emailIndex, `Aperçu réponse: ${preview}...`);

        return parseLLMResponse(content);
    } catch (error) {
        const duration = Date.now() - startTime;
        log("ERROR", contactId, emailIndex, `Échec appel Ollama après ${duration}ms: ${error.message}`);
        throw error;
    }
}

/**
 * Vérifie si le contact dispose d'un email valide
 * @param {Parse.Object} impaye - L'impayé
 * @returns {boolean} - True si le contact a un email valide
 */
function contactHasEmail(impaye) {
    let contact = impaye.get("contact_relance");
    if (!contact) {
        contact = impaye.get("payeur");
    }

    if (!contact) {
        return false;
    }

    const email = contact.get("email");
    if (typeof email !== "string") {
        return false;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
        return false;
    }

    const atIndex = trimmedEmail.indexOf("@");
    if (atIndex <= 0 || atIndex === trimmedEmail.length - 1) {
        return false;
    }

    return true;
}

/**
 * Construit le JSON des impayés pour le prompt
 * @param {Array} impayes - Liste des impayés
 * @returns {string} - JSON sérialisé
 */
function buildImpayesJson(impayes) {
    const data = impayes.map((i) => ({
        // Identifiants
        id: i.id,
        nfacture: i.get("nfacture"),
        reference: i.get("reference"),
        ref_piece: i.get("ref_piece"),
        numero_dossier: i.get("numero_dossier"),
        id_dossier: i.get("id_dossier"),

        // Dates
        date_piece: i.get("date_piece"),
        date_echeance: i.get("date_echeance"),

        // Montants
        total_ht: i.get("total_ht"),
        total_ttc: i.get("total_ttc"),
        montant_total: i.get("montant_total"),
        reste_a_payer: i.get("reste_a_payer"),

        // Statut
        facture_soldee: i.get("facture_soldee"),

        // Commentaire
        commentaire_piece: i.get("commentaire_piece"),

        // Payeur (informations dénormalisées)
        payeur_nom: i.get("payeur_nom"),
        payeur_prenom: i.get("payeur_prenom"),
        payeur_email: i.get("payeur_email"),
        payeur_telephone: i.get("payeur_telephone"),
        payeur_civilite: i.get("payeur_civilite"),
        payeur_type: i.get("payeur_type"),

        // Bien immobilier
        adresse_bien: i.get("adresse_bien"),
        ville: i.get("ville"),
        code_postal: i.get("code_postal"),

        // Document
        url_pdf: i.get("url_pdf"),

        // Apporteur
        apporteur_nom: i.get("apporteur_nom"),
        apporteur_prenom: i.get("apporteur_prenom"),
        apporteur_email: i.get("apporteur_email"),
        apporteur_telephone: i.get("apporteur_telephone"),
        apporteur_civilite: i.get("apporteur_civilite"),
        apporteur_societe: i.get("apporteur_societe"),

        // Propriétaire
        proprietaire_nom: i.get("proprietaire_nom"),
        proprietaire_prenom: i.get("proprietaire_prenom"),
        proprietaire_email: i.get("proprietaire_email"),
        proprietaire_telephone: i.get("proprietaire_telephone"),
        proprietaire_civilite: i.get("proprietaire_civilite"),

        // Donneur d'ordre
        donneur_ordre_nom: i.get("donneur_ordre_nom"),
        donneur_ordre_prenom: i.get("donneur_ordre_prenom"),
        donneur_ordre_email: i.get("donneur_ordre_email"),
        donneur_ordre_telephone: i.get("donneur_ordre_telephone"),
        donneur_ordre_civilite: i.get("donneur_ordre_civilite"),
    }));

    return JSON.stringify(data);
}

/**
 * Récupère l'historique des relances pour un contact et une séquence
 * @param {Parse.Object} contact - Le contact
 * @param {Parse.Object} sequence - La séquence
 * @param {Array} impayes - Les impayés du groupe
 * @returns {Promise<Array>} - Historique des relances (max 10)
 */
async function getHistory(contact, sequence, impayes) {
    const Relance = Parse.Object.extend("Relance");
    const relanceQuery = new Parse.Query(Relance);
    relanceQuery.equalTo("contact", contact);
    relanceQuery.equalTo("sequence", sequence);
    relanceQuery.exists("dateEnvoi");
    relanceQuery.descending("dateEnvoi");
    relanceQuery.limit(10);

    const relances = await relanceQuery.find({ useMasterKey: true });

    // Filtre additionnel : ne garder que les relances qui partagent au moins un impayé
    const impayeIds = new Set(impayes.map((i) => i.id));

    return relances
        .filter((r) => {
            const impayesArray = r.get("impayes") || [];
            return impayesArray.some((imp) => {
                const impId = imp.id || imp.objectId;
                return impayeIds.has(impId);
            });
        })
        .map((r) => ({
            statut: r.get("statut"),
            dateEnvoi: r.get("dateEnvoi"),
            envoye_le: r.get("envoye_le"),
            objet: r.get("objet"),
            scenario: r.get("scenario"),
            email_index: r.get("email_index"),
        }));
}

/**
 * Remplace les placeholders [[lien_pdf]] et [[lien_espace]] dans le contenu
 * @param {string} objet - Objet de l'email
 * @param {string} corps - Corps de l'email
 * @param {Parse.Object} contact - Le contact
 * @param {Array} impayes - Les impayés
 * @returns {Object} - Objet et corps modifiés
 */
function replacePlaceholders(objet, corps, contact, impayes) {
    let objetFinal = objet;
    let corpsFinal = corps;

    if (impayes.length > 0) {
        const lienPdf = `${FRONTEND_URL}/redirect-pdf/${impayes[0].id}`;
        objetFinal = objetFinal.split("[[lien_pdf]]").join(lienPdf);
        corpsFinal = corpsFinal.split("[[lien_pdf]]").join(lienPdf);
    }

    const lienEspace = `${FRONTEND_URL}/redirect-espace/${contact.id}`;
    objetFinal = objetFinal.split("[[lien_espace]]").join(lienEspace);
    corpsFinal = corpsFinal.split("[[lien_espace]]").join(lienEspace);

    return { objet: objetFinal, corps: corpsFinal };
}

/**
 * Fonction principale du workflow de génération des relances
 */
async function generateRelances() {
    log("INFO", null, null, "=== Démarrage du workflow de génération des relances ===");

    try {
        // Charger le template de prompt
        let promptTemplate;
        try {
            promptTemplate = fs.readFileSync(PROMPT_FILE, "utf-8");
        } catch (err) {
            log("ERROR", null, null, `Impossible de charger le fichier de prompt: ${err.message}`);
            throw err;
        }

        // === ÉTAPE 1 : Récupération des impayés avec séquence ===
        log("INFO", null, null, "Étape 1: Récupération des impayés non soldés avec séquence...");

        const Impaye = Parse.Object.extend("Impaye");
        const impayeQuery = new Parse.Query(Impaye);
        impayeQuery.equalTo("facture_soldee", false);
        impayeQuery.greaterThan("reste_a_payer", 0);
        impayeQuery.exists("sequence");
        impayeQuery.include(["sequence", "contact_relance", "payeur"]);
        impayeQuery.limit(999999);

        const impayesAvecSequence = await impayeQuery.find({ useMasterKey: true });
        log(
            "INFO",
            null,
            null,
            `${impayesAvecSequence.length} impayés non soldés avec séquence trouvés`,
        );

        if (impayesAvecSequence.length === 0) {
            log("INFO", null, null, "Aucun impayé à traiter");
            return {
                success: true,
                relancesCrees: 0,
                relancesIgnorees: 0,
                erreurs: 0,
                message: "Aucun impayé avec séquence trouvé",
            };
        }

        // === ÉTAPE 2 : Filtrage ===
        // Filtre 1 : séquences de type "relances"
        const impayesAvecSequenceRelance = impayesAvecSequence.filter((impaye) => {
            const sequence = impaye.get("sequence");
            return sequence && sequence.get("type") === "relances";
        });
        log(
            "INFO",
            null,
            null,
            `Filtre 1 (séquences de type "relances"): ${impayesAvecSequenceRelance.length}/${impayesAvecSequence.length}`,
        );

        // Filtre 1.5 : exclusion des contacts blacklistés
        const impayesSansContactsBlacklistes = impayesAvecSequenceRelance.filter((impaye) => {
            let contact = impaye.get("contact_relance");
            if (!contact) {
                contact = impaye.get("payeur");
            }
            return !contact || contact.get("isBlacklisted") !== true;
        });
        log(
            "INFO",
            null,
            null,
            `Filtre 1.5 (exclusion contacts blacklistés): ${impayesSansContactsBlacklistes.length}/${impayesAvecSequenceRelance.length}`,
        );

        // Filtre 1.6 : exclusion des impayés blacklistés
        const impayesSansBlacklistes = impayesSansContactsBlacklistes.filter((impaye) => {
            return impaye.get("isBlacklisted") !== true;
        });
        log(
            "INFO",
            null,
            null,
            `Filtre 1.6 (exclusion impayés blacklistés): ${impayesSansBlacklistes.length}/${impayesSansContactsBlacklistes.length}`,
        );

        // Filtre 2 : exclusion des impayés déjà associés à une relance envoyée
        const Relance = Parse.Object.extend("Relance");
        const relanceQuery = new Parse.Query(Relance);
        relanceQuery.limit(999999);
        relanceQuery.equalTo("manuelle", false);
        relanceQuery.exists("dateEnvoi");
        const relancesExistantes = await relanceQuery.find({ useMasterKey: true });

        const impayesAvecRelanceIds = new Set();
        for (const relance of relancesExistantes) {
            const impayesArray = relance.get("impayes");
            if (impayesArray && Array.isArray(impayesArray)) {
                for (const impaye of impayesArray) {
                    impayesAvecRelanceIds.add(impaye.id || impaye.objectId);
                }
            }
        }

        // Filtre 2bis : exclusion des contacts sans email
        const impayesSansRelance = impayesSansBlacklistes.filter(
            (impaye) => !impayesAvecRelanceIds.has(impaye.id) && contactHasEmail(impaye),
        );
        log(
            "INFO",
            null,
            null,
            `Filtre 2 + 2bis (exclusion déjà relancés + sans email): ${impayesSansRelance.length}/${impayesSansContactsBlacklistes.length}`,
        );

        if (impayesSansRelance.length === 0) {
            log("INFO", null, null, "Aucun impayé restant après filtrage");
            return {
                success: true,
                relancesCrees: 0,
                relancesIgnorees: 0,
                erreurs: 0,
                message: "Aucun impayé éligible après filtrage",
            };
        }

        // === ÉTAPE 3 : Regroupement des impayés par (contact, séquence, nfacture) ===
        log("INFO", null, null, "Étape 3: Regroupement des impayés par contact, séquence et numéro de facture...");

        const groupedByContactSequence = new Map();

        for (const impaye of impayesSansRelance) {
            let contact = impaye.get("contact_relance");
            if (!contact) {
                contact = impaye.get("payeur");
            }
            const sequence = impaye.get("sequence");
            const nfacture = impaye.get("nfacture");

            // Important: regrouper par contact + séquence + nfacture
            // car une même facture peut avoir plusieurs numéros de dossier
            if (!contact || !sequence || !nfacture) continue;

            const key = `${contact.id}_${sequence.id}_${nfacture}`;
            if (!groupedByContactSequence.has(key)) {
                groupedByContactSequence.set(key, { contact, sequence, nfacture, impayes: [] });
            }
            groupedByContactSequence.get(key).impayes.push(impaye);
        }

        log(
            "INFO",
            null,
            null,
            `${groupedByContactSequence.size} groupes (contact, séquence, nfacture) à traiter`,
        );

        // === ÉTAPES 4-7 : Pour chaque groupe, générer les relances ===
        let relancesCrees = 0;
        let relancesIgnorees = 0;
        let erreurs = 0;

        for (const [groupKey, { contact, sequence, nfacture, impayes }] of groupedByContactSequence) {
            const contactId = contact.id;
            const sequenceObj = sequence;
            const validationObligatoire = sequenceObj.get("validation_obligatoire") || false;
            const fullSequence = sequenceObj;
            const emails = fullSequence.get("emails") || [];

            // Récupérer les impayés où ce contact est apporteur (pour scénarios broker/both)
            const brokerImpayes = await getBrokerImpayes(contact, impayes);
            
            // Détermination automatique du scénario
            const nombreImpayes = impayes.length;
            const scenarioType = determineScenarioType(contact, impayes, brokerImpayes);
            
            log(
                "INFO",
                contactId,
                null,
                `Traitement groupe ${groupKey} - ${nombreImpayes} impayé(s), ${brokerImpayes.length} en tant qu'apporteur - scénario: ${scenarioType}`,
            );

            for (const emailConfig of emails) {
                const emailIndex = emailConfig.email_index;
                const scenarios = emailConfig.scenarios || [];

                // Recherche du scénario actif correspondant
                const scenarioActif = scenarios.find(
                    (s) => s.format === scenarioType && s.active,
                );

                if (!scenarioActif) {
                    log(
                        "INFO",
                        contactId,
                        emailIndex,
                        `Aucun scénario actif pour format "${scenarioType}", groupe ignoré`,
                    );
                    relancesIgnorees++;
                    continue;
                }

                // Vérifier si une relance existe déjà (envoyée) pour ce triplet
                const existingRelanceQuery = new Parse.Query(Relance);
                existingRelanceQuery.equalTo("contact", contact);
                existingRelanceQuery.equalTo("sequence", sequenceObj);
                existingRelanceQuery.equalTo("email_index", emailIndex);
                existingRelanceQuery.containedIn("impayes", impayes.map((i) => i.id));
                existingRelanceQuery.equalTo("manuelle", false);
                existingRelanceQuery.exists("dateEnvoi");

                if (await existingRelanceQuery.first({ useMasterKey: true })) {
                    log(
                        "INFO",
                        contactId,
                        emailIndex,
                        "Relance existante déjà envoyée pour ce triplet, ignoré",
                    );
                    relancesIgnorees++;
                    continue;
                }

                // Calcul de la date d'envoi
                let dateEcheance = null;
                for (const impaye of impayes) {
                    const impayeDateEcheance = impaye.get("date_echeance");
                    if (impayeDateEcheance) {
                        if (!dateEcheance || impayeDateEcheance < dateEcheance) {
                            dateEcheance = impayeDateEcheance;
                        }
                    }
                }

                if (!dateEcheance) dateEcheance = new Date();
                const maintenant = new Date();
                if (dateEcheance < maintenant) dateEcheance = maintenant;

                let delai = emailConfig.delai || 0;
                if (!delai && fullSequence.get("delai")) {
                    delai = fullSequence.get("delai");
                }

                const dateEnvoi = new Date(dateEcheance);
                dateEnvoi.setDate(dateEnvoi.getDate() + (delai || 0));

                // Préparer le smtpProfil
                let smtpProfileObj = null;
                if (scenarioActif.smtp) {
                    const SmtpProfile = Parse.Object.extend("SmtpProfile");
                    smtpProfileObj = SmtpProfile.createWithoutData(scenarioActif.smtp);
                }

                try {
                    // Récupérer l'historique (incluant les relances précédentes dans la même séquence)
                    const history = await getHistory(contact, sequenceObj, impayes);

                    // Charger le prompt spécifique au scénario
                    let promptTemplate;
                    try {
                        const promptFile = getPromptFile(scenarioType);
                        promptTemplate = fs.readFileSync(promptFile, "utf-8");
                        log("INFO", contactId, emailIndex, `Prompt chargé: relance-${scenarioType}-prompt.txt`);
                    } catch (promptErr) {
                        log("ERROR", contactId, emailIndex, `Erreur chargement prompt spécifique: ${promptErr.message}`);
                        // Fallback sur le prompt legacy
                        try {
                            promptTemplate = fs.readFileSync(PROMPT_FILE, "utf-8");
                            log("INFO", contactId, emailIndex, "Fallback sur prompt legacy");
                        } catch (legacyErr) {
                            throw new Error(`Impossible de charger le prompt: ${legacyErr.message}`);
                        }
                    }

                    // Construire les données pour le prompt
                    const objetTemplate = scenarioActif.objet || emailConfig.objet || "";
                    const corpsTemplate = scenarioActif.corps || emailConfig.corps || "";
                    const impayesJson = buildImpayesJson(impayes);
                    const historyJson = JSON.stringify(history);
                    const contactJson = JSON.stringify({
                        id: contact.id,
                        nom: contact.get("nom"),
                        prenom: contact.get("prenom"),
                        email: contact.get("email"),
                        telephone: contact.get("telephone"),
                        civilite: contact.get("civilite"),
                        type_personne: contact.get("type_personne"),
                    });

                    // Construire le prompt avec les variables
                    const now = new Date();
                    const dateJour = now.toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });

                    let prompt = promptTemplate
                        .replace(/{{objetTemplate}}/g, objetTemplate)
                        .replace(/{{corpsTemplate}}/g, corpsTemplate)
                        .replace(/{{impayesJson}}/g, impayesJson)
                        .replace(/{{historyJson}}/g, historyJson)
                        .replace(/{{emailIndex}}/g, String(emailIndex))
                        .replace(/{{contactJson}}/g, contactJson)
                        .replace(/{{scenarioType}}/g, scenarioType)
                        .replace(/{{nombreImpayes}}/g, String(impayes.length))
                        .replace(/{{dateJour}}/g, dateJour);

                    // Ajouter les données broker pour les scénarios broker et both
                    if (scenarioType === "broker" || scenarioType === "both") {
                        const brokerImpayesJson = buildBrokerImpayesJson(brokerImpayes);
                        prompt = prompt.replace(/{{brokerImpayesJson}}/g, brokerImpayesJson);
                        log("INFO", contactId, emailIndex, `Données broker ajoutées: ${brokerImpayes.length} impayés`);
                    }

                    // === ÉTAPE 5 : Génération avec Ollama ===
                    let generatedContent;
                    try {
                        if (USE_OLLAMA) {
                            generatedContent = await callOllama(prompt, contactId, emailIndex);
                        } else {
                            generatedContent = { objet: objetTemplate, corps: corpsTemplate };
                        }
                    } catch (ollamaError) {
                        log(
                            "ERROR",
                            contactId,
                            emailIndex,
                            `Erreur Ollama, fallback sur templates: ${ollamaError.message}`,
                        );
                        generatedContent = { objet: objetTemplate, corps: corpsTemplate };
                    }

                    // === ÉTAPE 6 : Remplacement des placeholders ===
                    const { objet: objetFinal, corps: corpsFinal } = replacePlaceholders(
                        generatedContent.objet,
                        generatedContent.corps,
                        contact,
                        impayes,
                    );

                    // === ÉTAPE 7 : Sauvegarde de la relance ===
                    const relance = new Relance();
                    relance.set("contact", contact);
                    relance.set("sequence", sequenceObj);
                    relance.set("email_index", emailIndex);
                    relance.set("impayes", impayes);
                    relance.set("scenario", scenarioType);
                    relance.set("valide", !validationObligatoire);
                    relance.set("manuelle", false);
                    relance.set("dateEnvoi", dateEnvoi);
                    relance.set("objet", objetFinal);
                    relance.set("corps", corpsFinal);
                    relance.set("statut", "pret pour envoi");
                    relance.set("erreur_count", 0);

                    if (smtpProfileObj) {
                        relance.set("smtpProfil", smtpProfileObj);
                    }

                    if (emailConfig.cc) {
                        relance.set("cc", emailConfig.cc);
                    }

                    await relance.save(null, { useMasterKey: true });

                    relancesCrees++;
                    log(
                        "INFO",
                        contactId,
                        emailIndex,
                        `Relance créée avec succès - scénario: ${scenarioType}`,
                    );
                } catch (groupError) {
                    log(
                        "ERROR",
                        contactId,
                        emailIndex,
                        `Erreur traitement groupe: ${groupError.message}`,
                    );
                    erreurs++;
                }
            }
        }

        log("INFO", null, null, "=== Workflow terminé ===");
        log(
            "INFO",
            null,
            null,
            `Résumé: ${relancesCrees} relances créées, ${relancesIgnorees} ignorées, ${erreurs} erreurs`,
        );

        return {
            success: true,
            relancesCrees,
            relancesIgnorees,
            erreurs,
        };
    } catch (error) {
        log("ERROR", null, null, `Erreur fatale du workflow: ${error.message}`);
        throw error;
    }
}

// Enregistrer la Cloud Function pour appel via Parse.Cloud.run
try {
    Parse.Cloud.define("generateRelances", async (request) => {
        log("INFO", null, null, "Cloud Function generateRelances appelée");
        try {
            const result = await generateRelances();
            log("INFO", null, null, "Cloud Function generateRelances terminée avec succès");
            return result;
        } catch (error) {
            log("ERROR", null, null, `Cloud Function generateRelances échouée: ${error.message}`);
            throw error;
        }
    });
    log("INFO", null, null, "Cloud Function generateRelances enregistrée");
} catch (err) {
    log("DEBUG", null, null, `Cloud Function non enregistrée (hors environnement Parse?): ${err.message}`);
}

// Export pour Parse Cloud Code et utilisation programmatique
module.exports = generateRelances;

// Si exécuté directement (local/test)
if (require.main === module) {
    // Initialiser Parse
    const appId = process.env.PARSE_APP_ID || "adti-marki";
    const serverURL = process.env.PARSE_SERVER_URL || "https://dev.markidiags.com/api/parse";
    const masterKey = process.env.PARSE_MASTER_KEY;

    Parse.initialize(appId, null, masterKey);
    Parse.serverURL = serverURL;

    generateRelances()
        .then((result) => {
            console.log("Résultat:", JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch((error) => {
            console.error("Erreur:", error);
            process.exit(1);
        });
}
