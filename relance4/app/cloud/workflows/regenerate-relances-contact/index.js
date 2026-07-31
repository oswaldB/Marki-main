// backend/cloud/workflows/regenerate-relances-contact/index.js
// Workflow de régénération des relances d'un contact après blacklist/unblacklist d'un impayé
// Format mega function avec checkpoints

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

// Base des prompts par scénario
const PROMPT_BASE_PATH = "/home/ubuntu/prod/adti/configuration/prompts/scenarios";

// Fichier de prompt legacy (pour fallback)
const PROMPT_FILE = "/home/ubuntu/prod/adti/configuration/prompts/relance-email-prompt.txt";

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
        log("ERROR", `Erreur récupération broker impayés: ${error.message}`);
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

/**
 * Écrit un checkpoint dans les logs
 * Format : [CHECKPOINT] name - message
 */
function checkpoint(name, message = "", data = null) {
    const timestamp = new Date().toISOString();
    const logLine = `[CHECKPOINT][${name}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
    
    console.log(`${timestamp} [REGENERATE-RELANCES][${name}] ${message}`);

    try {
        const logDir = path.join(__dirname, "logs");
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(
            logDir,
            `regenerate-relances-${new Date().toISOString().split("T")[0]}.log`,
        );
        fs.appendFileSync(logFile, `${timestamp} ${logLine}\n`);
    } catch (err) {
        console.error("Erreur d'écriture des logs:", err.message);
    }
}

/**
 * Écrit un message d'info/error dans les logs
 */
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logLine = `[REGENERATE-RELANCES][${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
    
    console.log(logLine);

    try {
        const logDir = path.join(__dirname, "logs");
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(
            logDir,
            `regenerate-relances-${new Date().toISOString().split("T")[0]}.log`,
        );
        fs.appendFileSync(logFile, `${timestamp} ${logLine}\n`);
    } catch (err) {
        console.error("Erreur d'écriture des logs:", err.message);
    }
}

/**
 * Parse la réponse YAML du LLM
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
 */
async function callOllama(prompt, contactId, emailIndex) {
    const startTime = Date.now();
    log("INFO", `Début appel Ollama - Contact: ${contactId}, Email: ${emailIndex}`);

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

        log("INFO", `Appel Ollama réussi - Durée: ${duration}ms`);
        return parseLLMResponse(content);
    } catch (error) {
        const duration = Date.now() - startTime;
        log("ERROR", `Échec appel Ollama après ${duration}ms: ${error.message}`);
        throw error;
    }
}

/**
 * Vérifie si le contact dispose d'un email valide
 */
function contactHasEmail(contact) {
    if (!contact) return false;
    
    const email = contact.get("email");
    if (typeof email !== "string") return false;
    
    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) return false;
    
    const atIndex = trimmedEmail.indexOf("@");
    return atIndex > 0 && atIndex < trimmedEmail.length - 1;
}

/**
 * Construit le JSON des impayés pour le prompt
 */
function buildImpayesJson(impayes) {
    const data = impayes.map((i) => ({
        id: i.id,
        nfacture: i.get("nfacture"),
        reference: i.get("reference"),
        ref_piece: i.get("ref_piece"),
        numero_dossier: i.get("numero_dossier"),
        id_dossier: i.get("id_dossier"),
        date_piece: i.get("date_piece"),
        date_echeance: i.get("date_echeance"),
        total_ht: i.get("total_ht"),
        total_ttc: i.get("total_ttc"),
        montant_total: i.get("montant_total"),
        reste_a_payer: i.get("reste_a_payer"),
        facture_soldee: i.get("facture_soldee"),
        commentaire_piece: i.get("commentaire_piece"),
        payeur_nom: i.get("payeur_nom"),
        payeur_prenom: i.get("payeur_prenom"),
        payeur_email: i.get("payeur_email"),
        payeur_telephone: i.get("payeur_telephone"),
        payeur_civilite: i.get("payeur_civilite"),
        payeur_type: i.get("payeur_type"),
        adresse_bien: i.get("adresse_bien"),
        ville: i.get("ville"),
        code_postal: i.get("code_postal"),
        url_pdf: i.get("url_pdf"),
        apporteur_nom: i.get("apporteur_nom"),
        apporteur_prenom: i.get("apporteur_prenom"),
        apporteur_email: i.get("apporteur_email"),
        apporteur_telephone: i.get("apporteur_telephone"),
        apporteur_civilite: i.get("apporteur_civilite"),
        apporteur_societe: i.get("apporteur_societe"),
        proprietaire_nom: i.get("proprietaire_nom"),
        proprietaire_prenom: i.get("proprietaire_prenom"),
        proprietaire_email: i.get("proprietaire_email"),
        proprietaire_telephone: i.get("proprietaire_telephone"),
        proprietaire_civilite: i.get("proprietaire_civilite"),
        donneur_ordre_nom: i.get("donneur_ordre_nom"),
        donneur_ordre_prenom: i.get("donneur_ordre_prenom"),
        donneur_ordre_email: i.get("donneur_ordre_email"),
        donneur_ordre_telephone: i.get("donneur_ordre_telephone"),
        donneur_ordre_civilite: i.get("donneur_ordre_civilite"),
    }));

    return JSON.stringify(data);
}

/**
 * Remplace les placeholders [[lien_pdf]] et [[lien_espace]]
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
 * Récupère l'historique des relances pour un contact et une séquence
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
 * Fonction principale de régénération des relances pour un contact
 * 
 * @checkpoint regenerate-start
 * @checkpoint regenerate-brouillons-loaded
 * @checkpoint regenerate-brouillons-deleted
 * @checkpoint regenerate-impayes-loaded
 * @checkpoint regenerate-generation-start
 * @checkpoint regenerate-generation-end
 * @checkpoint regenerate-completed
 * @checkpoint regenerate-error
 */
async function regenerateRelancesContact(contactId, excludeImpayeId = null) {
    checkpoint("regenerate-start", "Démarrage régénération", { contactId, excludeImpayeId });
    log("INFO", "=== Démarrage régénération des relances ===", { contactId, excludeImpayeId });

    try {
        // Vérifier le contact
        const Contact = Parse.Object.extend("Contact");
        const contact = await new Parse.Query(Contact).get(contactId, { useMasterKey: true });
        
        if (!contact) {
            throw new Error(`Contact ${contactId} non trouvé`);
        }

        // Vérifier si le contact est blacklisté
        if (contact.get("isBlacklisted") === true) {
            log("INFO", "Contact blacklisté - pas de régénération", { contactId });
            return { success: true, createdCount: 0, message: "Contact blacklisté - aucune relance générée" };
        }

        // 1. Récupérer et supprimer les relances brouillons du contact
        const Relance = Parse.Object.extend("Relance");
        const query = new Parse.Query(Relance);
        query.equalTo("contact", { __type: "Pointer", className: "Contact", objectId: contactId });
        // ⚠️ Vérifier l'orthographe exact du statut (envoyee/envoyée/sent)
        query.notEqualTo("statut", "envoyee");
        query.doesNotExist("dateEnvoi");
        query.limit(1000);

        const brouillons = await query.find({ useMasterKey: true });
        checkpoint("regenerate-brouillons-loaded", "Brouillons chargés", { count: brouillons.length });
        log("INFO", `${brouillons.length} brouillons trouvés pour suppression`);

        // 3. Supprimer les brouillons
        if (brouillons.length > 0) {
            await Parse.Object.destroyAll(brouillons, { useMasterKey: true });
            checkpoint("regenerate-brouillons-deleted", "Brouillons supprimés", { deleted: brouillons.length });
            log("INFO", `${brouillons.length} brouillons supprimés`);
        }

        // 4. Récupérer les impayés non soldés du contact
        const Impaye = Parse.Object.extend("Impaye");
        const impayeQuery = new Parse.Query(Impaye);
        impayeQuery.equalTo("contact_relance", { __type: "Pointer", className: "Contact", objectId: contactId });
        impayeQuery.equalTo("facture_soldee", false);
        impayeQuery.greaterThan("reste_a_payer", 0);
        impayeQuery.exists("sequence");
        impayeQuery.include("sequence");
        impayeQuery.limit(1000);

        let impayes = await impayeQuery.find({ useMasterKey: true });
        checkpoint("regenerate-impayes-loaded", "Impayés chargés", { count: impayes.length });
        log("INFO", `${impayes.length} impayés trouvés pour le contact`);

        // 5. Filtrer les impayés blacklistés et l'impayé à exclure
        const ImpayeExclude = excludeImpayeId ? await new Parse.Query(Impaye).get(excludeImpayeId, { useMasterKey: true }) : null;
        
        impayes = impayes.filter((impaye) => {
            // Exclure les impayés blacklistés
            if (impaye.get("isBlacklisted") === true) {
                log("INFO", `Impayé ${impaye.id} blacklisté - exclu`);
                return false;
            }
            // Exclure l'impayé spécifique si fourni
            if (excludeImpayeId && impaye.id === excludeImpayeId) {
                log("INFO", `Impayé ${impaye.id} explicitement exclu`);
                return false;
            }
            return true;
        });

        log("INFO", `${impayes.length} impayés éligibles après filtrage`);

        if (impayes.length === 0) {
            checkpoint("regenerate-completed", "Aucun impayé éligible - terminé", { createdCount: 0 });
            return { success: true, createdCount: 0, message: "Aucun impayé éligible pour la génération" };
        }

        // Vérifier si le contact a un email valide
        if (!contactHasEmail(contact)) {
            log("INFO", "Contact sans email valide - pas de génération");
            return { success: true, createdCount: 0, message: "Contact sans email valide" };
        }

        // Charger le template de prompt spécifique au scénario (sera déterminé plus bas)

        // Regrouper les impayés par séquence
        const groupedBySequence = new Map();
        for (const impaye of impayes) {
            const sequence = impaye.get("sequence");
            if (!sequence || sequence.get("type") !== "relances") continue;

            const key = sequence.id;
            if (!groupedBySequence.has(key)) {
                groupedBySequence.set(key, { sequence, impayes: [] });
            }
            groupedBySequence.get(key).impayes.push(impaye);
        }

        log("INFO", `${groupedBySequence.size} groupe(s) par séquence à traiter`);

        // Générer les relances pour chaque groupe
        checkpoint("regenerate-generation-start", "Début génération des relances");
        let createdCount = 0;

        for (const [sequenceId, { sequence, impayes: groupImpayes }] of groupedBySequence) {
            const fullSequence = await sequence.fetch({ useMasterKey: true });
            const emails = fullSequence.get("emails") || [];
            const validationObligatoire = fullSequence.get("validation_obligatoire") || false;

            // Récupérer les impayés où ce contact est apporteur (pour scénarios broker/both)
            const brokerImpayes = await getBrokerImpayes(contact, groupImpayes);
            
            // Détermination automatique du scénario
            const nombreImpayes = groupImpayes.length;
            const scenarioType = determineScenarioType(contact, groupImpayes, brokerImpayes);

            log("INFO", `Traitement séquence ${sequenceId} - ${nombreImpayes} impayé(s), ${brokerImpayes.length} en tant qu'apporteur - scénario: ${scenarioType}`);

            for (const emailConfig of emails) {
                const emailIndex = emailConfig.email_index;
                const scenarios = emailConfig.scenarios || [];

                const scenarioActif = scenarios.find((s) => s.format === scenarioType && s.active);
                if (!scenarioActif) {
                    log("INFO", `Aucun scénario actif pour format "${scenarioType}"`);
                    continue;
                }

                // Vérifier si une relance existe déjà (envoyée) pour ce triplet
                const existingRelanceQuery = new Parse.Query(Relance);
                existingRelanceQuery.equalTo("contact", contact);
                existingRelanceQuery.equalTo("sequence", fullSequence);
                existingRelanceQuery.equalTo("email_index", emailIndex);
                existingRelanceQuery.containedIn("impayes", groupImpayes.map((i) => i.id));
                existingRelanceQuery.equalTo("manuelle", false);
                existingRelanceQuery.exists("dateEnvoi");

                if (await existingRelanceQuery.first({ useMasterKey: true })) {
                    log("INFO", `Relance existante déjà envoyée pour email_index ${emailIndex}`);
                    continue;
                }

                // Calcul de la date d'envoi
                let dateEcheance = null;
                for (const impaye of groupImpayes) {
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
                    // Récupérer l'historique
                    const history = await getHistory(contact, fullSequence, groupImpayes);

                    // Charger le prompt spécifique au scénario
                    let promptTemplate;
                    try {
                        const promptFile = getPromptFile(scenarioType);
                        promptTemplate = fs.readFileSync(promptFile, "utf-8");
                        log("INFO", `Prompt chargé: relance-${scenarioType}-prompt.txt`);
                    } catch (promptErr) {
                        log("ERROR", `Erreur chargement prompt spécifique: ${promptErr.message}`);
                        // Fallback sur le prompt legacy
                        try {
                            promptTemplate = fs.readFileSync(PROMPT_FILE, "utf-8");
                            log("INFO", "Fallback sur prompt legacy");
                        } catch (legacyErr) {
                            throw new Error(`Impossible de charger le prompt: ${legacyErr.message}`);
                        }
                    }

                    // Construire le prompt
                    const objetTemplate = scenarioActif.objet || emailConfig.objet || "";
                    const corpsTemplate = scenarioActif.corps || emailConfig.corps || "";
                    const impayesJson = buildImpayesJson(groupImpayes);
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
                        .replace(/{{nombreImpayes}}/g, String(groupImpayes.length))
                        .replace(/{{dateJour}}/g, dateJour);

                    // Ajouter les données broker pour les scénarios broker et both
                    if (scenarioType === "broker" || scenarioType === "both") {
                        const brokerImpayesJson = buildBrokerImpayesJson(brokerImpayes);
                        prompt = prompt.replace(/{{brokerImpayesJson}}/g, brokerImpayesJson);
                        log("INFO", `Données broker ajoutées: ${brokerImpayes.length} impayés`);
                    }

                    // Génération avec Ollama
                    let generatedContent;
                    try {
                        if (USE_OLLAMA) {
                            generatedContent = await callOllama(prompt, contactId, emailIndex);
                        } else {
                            generatedContent = { objet: objetTemplate, corps: corpsTemplate };
                        }
                    } catch (ollamaError) {
                        log("ERROR", `Erreur Ollama, fallback sur templates: ${ollamaError.message}`);
                        generatedContent = { objet: objetTemplate, corps: corpsTemplate };
                    }

                    // Remplacement des placeholders
                    const { objet: objetFinal, corps: corpsFinal } = replacePlaceholders(
                        generatedContent.objet,
                        generatedContent.corps,
                        contact,
                        groupImpayes,
                    );

                    // Sauvegarde de la relance
                    const relance = new Relance();
                    relance.set("contact", contact);
                    relance.set("sequence", fullSequence);
                    relance.set("email_index", emailIndex);
                    relance.set("impayes", groupImpayes);
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
                    createdCount++;
                    log("INFO", `Relance créée avec succès - email_index: ${emailIndex}`);
                } catch (groupError) {
                    log("ERROR", `Erreur création relance email_index ${emailIndex}: ${groupError.message}`);
                }
            }
        }

        checkpoint("regenerate-generation-end", "Génération terminée", { createdCount });
        checkpoint("regenerate-completed", "Régénération complétée", { createdCount });
        log("INFO", "=== Régénération terminée ===", { createdCount });

        return {
            success: true,
            createdCount,
            message: `${createdCount} relance(s) générée(s)`,
        };

    } catch (error) {
        checkpoint("regenerate-error", "Erreur lors de la régénération", { error: error.message });
        log("ERROR", `Erreur fatale: ${error.message}`);
        throw error;
    }
}

// Enregistrer la Cloud Function
Parse.Cloud.define("regenerateRelancesContact", async (request) => {
    const { contactId, excludeImpayeId } = request.params;
    
    // Vérifier l'authentification
    if (!request.user) {
        throw new Error("Authentification requise");
    }
    
    log("INFO", "Cloud Function regenerateRelancesContact appelée", { contactId, excludeImpayeId, user: request.user.id });
    
    try {
        const result = await regenerateRelancesContact(contactId, excludeImpayeId);
        log("INFO", "Cloud Function terminée avec succès", result);
        return result;
    } catch (error) {
        log("ERROR", `Cloud Function échouée: ${error.message}`);
        throw error;
    }
});

// Export pour utilisation programmatique
module.exports = { regenerateRelancesContact };
