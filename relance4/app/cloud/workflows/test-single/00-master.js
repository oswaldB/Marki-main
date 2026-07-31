// backend/cloud/workflows/test-single/00-master.js
// Workflow d'envoi d'email de test unique avec traitement de template

// Charger les variables d'environnement depuis .env
require("dotenv").config({ path: "/home/ubuntu/prod/adti/.env" });

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const nodemailer = require("nodemailer");
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

// Configuration Ollama
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "https://ollama.com/api";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral-large-3:675b-cloud";
const USE_OLLAMA = process.env.USE_OLLAMA !== "false" && !!OLLAMA_API_KEY;
const MAX_RETRIES = 3;

// Chemin des prompts par scénario
const PROMPT_BASE_PATH = "/home/ubuntu/prod/adti/configuration/prompts/scenarios";

// Fichier de prompt legacy (fallback)
const PROMPT_FILE = "/home/ubuntu/prod/adti/configuration/prompts/relance-email-prompt.txt";

/**
 * Récupère le chemin du fichier de prompt selon le scénario
 * @param {string} scenarioType - Type de scénario (single, multiple, broker, both)
 * @returns {string} - Chemin du fichier de prompt
 */
function getPromptFile(scenarioType) {
    return path.join(PROMPT_BASE_PATH, `relance-${scenarioType}-prompt.txt`);
}

// URL Frontend
const FRONTEND_URL = process.env.FRONTEND_URL || "https://adti.markidiags.com";

/**
 * Parse la réponse YAML du LLM
 * @param {string} content - Contenu YAML
 * @returns {Object} Objet avec objet et corps
 */
function parseLLMResponse(content) {
    // Extraire le bloc YAML de la réponse
    const yamlMatch =
        content.match(/---\n([\s\S]*?)\n---/) ||
        content.match(/```yaml\n([\s\S]*?)```/) ||
        (content.match(/^(objet:|corps:)/m) ? [null, content] : null);

    if (!yamlMatch) {
        throw new Error("Format YAML non trouvé dans la réponse");
    }

    const yamlContent = yamlMatch[1] || content;

    // Parser le YAML en objet JavaScript
    const parsed = yaml.load(yamlContent);

    // Vérifier la structure attendue
    if (!parsed.objet || !parsed.corps) {
        throw new Error(
            "La réponse doit contenir les champs 'objet' et 'corps'",
        );
    }

    return {
        objet: parsed.objet,
        corps: parsed.corps,
    };
}

/**
 * Génère le contenu via Ollama avec retry
 * @param {string} prompt - Prompt pour Ollama
 * @param {number} retries - Nombre de tentatives actuelles
 * @returns {Promise<Object>} Objet avec objet et corps
 */
async function generateContentWithRetry(prompt, retries = 0) {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OLLAMA_API_KEY}`,
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            throw new Error(
                `Ollama API error: ${response.status} ${response.statusText}`,
            );
        }

        const data = await response.json();

        if (!data.response) {
            throw new Error("No response from Ollama API");
        }

        // Parser la réponse YAML
        const content = data.response.trim();
        info(
            `Réponse Ollama reçue (${content.length} caractères)`,
            "test-single",
            "generateContentWithRetry",
        );

        return parseLLMResponse(content);
    } catch (err) {
        if (retries < MAX_RETRIES) {
            warn(
                `LLM échoué (attempt ${retries + 1}/${MAX_RETRIES}), retry... Error: ${err.message}`,
                "test-single",
                "generateContentWithRetry",
                { attempt: retries + 1, error: err.message },
            );
            return generateContentWithRetry(prompt, retries + 1);
        }
        throw new Error(
            `LLM échoué après ${MAX_RETRIES} tentatives: ${err.message}`,
        );
    }
}

/**
 * Construit le prompt pour Ollama
 * @param {Object} emailConfig - Configuration de l'email
 * @param {Object} scenarioActif - Scénario actif (ou null)
 * @param {Array} impayes - Liste des impayés
 * @param {Object} contact - Contact (payeur)
 * @param {number} emailIndex - Index de l'email dans la séquence
 * @param {string} scenarioType - Type de scénario (single/multiple)
 * @returns {string} Prompt complet
 */
function buildPrompt(
    emailConfig,
    scenarioActif,
    impayes,
    contact,
    emailIndex,
    scenarioType,
) {
    const impayesJson = JSON.stringify(impayes);
    const contactJson = JSON.stringify(contact);
    const historyJson = JSON.stringify([]); // Pas d'historique pour un test

    const objetTemplate = scenarioActif?.objet || emailConfig.objet || "";
    const corpsTemplate = scenarioActif?.corps || emailConfig.corps || "";

    // Charger le prompt spécifique au scénario avec fallback
    let promptTemplate;
    try {
        const promptFile = getPromptFile(scenarioType);
        promptTemplate = fs.readFileSync(promptFile, "utf-8");
    } catch (e) {
        // Fallback sur le prompt legacy
        promptTemplate = fs.readFileSync(PROMPT_FILE, "utf-8");
    }

    // Remplacer les variables dans le template
    return promptTemplate
        .replace(/{{objetTemplate}}/g, objetTemplate)
        .replace(/{{corpsTemplate}}/g, corpsTemplate)
        .replace(/{{impayesJson}}/g, impayesJson)
        .replace(/{{historyJson}}/g, historyJson)
        .replace(/{{emailIndex}}/g, emailIndex)
        .replace(/{{contactJson}}/g, contactJson)
        .replace(/{{scenarioType}}/g, scenarioType);
}

/**
 * Récupère le profil SMTP et crée le transport nodemailer
 * @param {string} smtpId - ID du profil SMTP
 * @returns {Promise<Object>} Transport nodemailer
 */
async function createSmtpTransport(smtpId) {
    if (!smtpId) {
        throw new Error("Aucun profil SMTP configuré");
    }

    const SmtpProfile = Parse.Object.extend("SmtpProfile");
    const query = new Parse.Query(SmtpProfile);
    const smtpProfile = await query.get(smtpId, { useMasterKey: true });

    if (!smtpProfile) {
        throw new Error(`Profil SMTP ${smtpId} introuvable`);
    }

    const host = smtpProfile.get("host");
    const port = smtpProfile.get("port");
    const username = smtpProfile.get("username");
    const password = smtpProfile.get("password");
    const secure = smtpProfile.get("secure") || false;

    if (!host || !port || !username || !password) {
        throw new Error("Configuration SMTP incomplète");
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user: username,
            pass: password,
        },
    });
}

/**
 * Workflow principal d'envoi d'email de test
 * @param {Object} options - Options
 * @param {string} options.sequenceId - ID de la séquence
 * @param {string} options.testEmail - Email de destination pour le test
 * @param {string} options.payeurId - ID du payeur (contact)
 * @param {number} options.emailIndex - Index de l'email dans la séquence
 * @param {string} options.userId - ID de l'utilisateur (optionnel)
 * @param {string} options.userEmail - Email de l'utilisateur (optionnel)
 * @param {string} options.userName - Nom de l'utilisateur (optionnel)
 * @returns {Promise<Object>} Résultat de l'envoi
 */
async function testSingleMaster(options = {}) {
    const startedAt = new Date();
    const {
        sequenceId,
        testEmail,
        payeurId,
        emailIndex,
        userId,
        userEmail,
        userName,
    } = options;

    info(
        `[test-single/master] Début du workflow d'envoi d'email de test`,
        "test-single",
        "testSingleMaster",
        { sequenceId, testEmail, payeurId, emailIndex, userId },
    );

    // Validation des paramètres requis
    if (!sequenceId || !testEmail || !payeurId || emailIndex === undefined) {
        throw new Error(
            "Paramètres requis manquants: sequenceId, testEmail, payeurId, emailIndex",
        );
    }

    const result = {
        status: "error",
        emailSent: false,
        preview: null,
        metadata: {
            sequenceId,
            emailIndex,
            testEmail,
            payeurId,
            sentAt: null,
            durationMs: 0,
        },
        errors: [],
    };

    try {
        // ═══════════════════════════════════════════════════════════════
        // NŒUD 1 : Validation et Récupération
        // ═══════════════════════════════════════════════════════════════
        info(
            "Nœud 1/3: Validation et récupération des données...",
            "test-single",
            "testSingleMaster",
        );

        // Récupérer la séquence
        const Sequence = Parse.Object.extend("Sequence");
        const sequenceQuery = new Parse.Query(Sequence);
        const sequence = await sequenceQuery.get(sequenceId, {
            useMasterKey: true,
        });

        if (!sequence) {
            throw new Error(`Séquence ${sequenceId} introuvable`);
        }

        // Extraire l'email à tester par emailIndex
        const emails = sequence.get("emails") || [];
        const emailConfig = emails[emailIndex];

        if (!emailConfig) {
            throw new Error(
                `Email à l'index ${emailIndex} introuvable dans la séquence`,
            );
        }

        info(
            `Séquence récupérée: ${sequence.get("nom")} - Email index ${emailIndex}`,
            "test-single",
            "testSingleMaster",
            {
                sequenceName: sequence.get("nom"),
                emailSubject: emailConfig.objet,
            },
        );

        // Récupérer le Contact (payeur)
        const Contact = Parse.Object.extend("Contact");
        const contactQuery = new Parse.Query(Contact);
        const contact = await contactQuery.get(payeurId, {
            useMasterKey: true,
        });

        if (!contact) {
            throw new Error(`Contact (payeur) ${payeurId} introuvable`);
        }

        // Construire l'objet contact pour les données
        const contactData = {
            objectId: contact.id,
            nom: contact.get("nom"),
            prenom: contact.get("prenom"),
            email: contact.get("email"),
            telephone: contact.get("telephone"),
            civilite: contact.get("civilite"),
            type_personne: contact.get("type_personne"),
            adresse: contact.get("adresse"),
        };

        info(
            `Contact récupéré: ${contactData.nom} ${contactData.prenom || ""}`,
            "test-single",
            "testSingleMaster",
            { contactId: contact.id },
        );

        // Récupérer les impayés non soldés du payeur
        const Impaye = Parse.Object.extend("Impaye");
        const impayeQuery = new Parse.Query(Impaye);
        impayeQuery.equalTo("payeur", contact);
        impayeQuery.equalTo("facture_soldee", false);
        impayeQuery.greaterThan("reste_a_payer", 0);
        impayeQuery.descending("date_piece");
        impayeQuery.limit(1000);

        const impayes = await impayeQuery.find({ useMasterKey: true });

        info(
            `${impayes.length} impayés récupérés pour le contact`,
            "test-single",
            "testSingleMaster",
            { impayesCount: impayes.length },
        );

        // Construire l'objet payeurData
        const impayesData = impayes.map((impaye) => {
            const json = impaye.toJSON ? impaye.toJSON() : impaye;
            return json;
        });

        const impayesAmount = impayesData.reduce(
            (sum, imp) => sum + (imp.reste_a_payer || 0),
            0,
        );

        const payeurData = {
            ...contactData,
            impayesCount: impayes.length,
            impayesAmount: impayesAmount,
            impayes: impayesData,
        };

        // ═══════════════════════════════════════════════════════════════
        // NŒUD 2 : Traitement du Template
        // ═══════════════════════════════════════════════════════════════
        info(
            "Nœud 2/3: Traitement du template...",
            "test-single",
            "testSingleMaster",
        );

        // Déterminer le scénario (single ou multiple)
        const scenarioType = impayes.length > 1 ? "multiple" : "single";

        // Trouver le scénario actif
        const scenarios = emailConfig.scenarios || [];
        const scenarioActif = scenarios.find(
            (s) => s.format === scenarioType && s.active,
        );

        info(
            `Scénario actif: ${scenarioType} - ${scenarioActif ? "trouvé" : "non trouvé (utilisation du template par défaut)"}`,
            "test-single",
            "testSingleMaster",
        );

        // Templates initiaux
        let objetFinal = scenarioActif?.objet || emailConfig.objet || "";
        let corpsFinal = scenarioActif?.corps || emailConfig.corps || "";

        // Génération via Ollama si activé
        if (USE_OLLAMA && OLLAMA_API_KEY) {
            try {
                const prompt = buildPrompt(
                    emailConfig,
                    scenarioActif,
                    impayesData,
                    contactData,
                    emailIndex,
                    scenarioType,
                );

                info(
                    `Envoi du prompt à Ollama (${prompt.length} caractères)`,
                    "test-single",
                    "testSingleMaster",
                );

                // Logger le prompt complet pour debug
                info(
                    "=== PROMPT OLLAMA (début) ===",
                    "test-single",
                    "testSingleMaster",
                );
                info(prompt, "test-single", "testSingleMaster");
                info(
                    "=== PROMPT OLLAMA (fin) ===",
                    "test-single",
                    "testSingleMaster",
                );

                const generated = await generateContentWithRetry(prompt);
                objetFinal = generated.objet;
                corpsFinal = generated.corps;

                info(
                    "Contenu généré par Ollama avec succès",
                    "test-single",
                    "testSingleMaster",
                );
            } catch (ollamaErr) {
                warn(
                    `Erreur Ollama, utilisation des templates bruts: ${ollamaErr.message}`,
                    "test-single",
                    "testSingleMaster",
                    { error: ollamaErr.message },
                );
                // Continue avec les templates bruts
            }
        }

        // Remplacement des variables [[lien_pdf]] et [[lien_espace]]
        if (payeurData.impayes && payeurData.impayes.length > 0) {
            const lienPdf = `${FRONTEND_URL}/redirect-pdf/${payeurData.impayes[0].objectId}`;
            objetFinal = objetFinal.split("[[lien_pdf]]").join(lienPdf);
            corpsFinal = corpsFinal.split("[[lien_pdf]]").join(lienPdf);
            info(
                `Lien PDF remplacé: ${lienPdf}`,
                "test-single",
                "testSingleMaster",
            );
        }

        const lienEspace = `${FRONTEND_URL}/redirect-espace/${payeurId}`;
        objetFinal = objetFinal.split("[[lien_espace]]").join(lienEspace);
        corpsFinal = corpsFinal.split("[[lien_espace]]").join(lienEspace);

        info(
            `Lien espace client remplacé: ${lienEspace}`,
            "test-single",
            "testSingleMaster",
        );

        // ═══════════════════════════════════════════════════════════════
        // NŒUD 3 : Envoi de l'Email
        // ═══════════════════════════════════════════════════════════════
        info(
            "Nœud 3/3: Envoi de l'email...",
            "test-single",
            "testSingleMaster",
        );

        // Déterminer le profil SMTP
        let smtpId = null;
        if (scenarioActif && scenarioActif.smtp) {
            smtpId = scenarioActif.smtp;
        } else if (emailConfig.smtp) {
            smtpId = emailConfig.smtp;
        }

        if (!smtpId) {
            throw new Error("Aucun profil SMTP configuré pour cet email");
        }

        // Créer le transport SMTP
        const transporter = await createSmtpTransport(smtpId);

        // Récupérer les infos SMTP pour l'expéditeur
        const SmtpProfile = Parse.Object.extend("SmtpProfile");
        const smtpQuery = new Parse.Query(SmtpProfile);
        const smtpProfile = await smtpQuery.get(smtpId, { useMasterKey: true });
        const fromEmail =
            smtpProfile.get("email_from") || smtpProfile.get("username");
        
        // DEBUG: Récupération de la signature
        const signatureRaw = smtpProfile.get("signature_html");
        info(
            "DEBUG SMTP Profil - signature_html brut:",
            "test-single",
            "testSingleMaster",
            { 
                smtpProfilId: smtpProfile.id,
                signatureRaw: signatureRaw,
                signatureType: typeof signatureRaw,
                signatureLength: signatureRaw ? signatureRaw.length : 0
            },
        );
        
        const signatureHtml = signatureRaw || null;

        // Ajouter la signature au corps si elle existe
        if (signatureHtml && signatureHtml.trim()) {
            const signaturePreview = signatureHtml.substring(0, 100).replace(/\n/g, '\\n');
            corpsFinal = corpsFinal + "<br><br>" + signatureHtml;
            info(
                `✅ Signature trouvée et ajoutée (début: "${signaturePreview}...")`,
                "test-single",
                "testSingleMaster",
                { signatureLength: signatureHtml.length, signaturePreview },
            );
        } else {
            info(
                `⚠️ Pas de signature trouvée (signatureHtml=${signatureHtml}, trim=${signatureHtml ? signatureHtml.trim() : 'N/A'})`,
                "test-single",
                "testSingleMaster",
            );
        }

        // Construire l'email
        const fromName = userName ? `${userName} (Test)` : "Test ADTI";
        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: testEmail,
            subject: `[TEST] ${objetFinal}`,
            html: corpsFinal,
            headers: {
                "X-Test-Email": "true",
                "X-Sequence-Id": sequenceId,
                "X-Email-Index": String(emailIndex),
                "X-User-Id": userId || "system",
            },
        };

        // Envoyer l'email
        const sendResult = await transporter.sendMail(mailOptions);

        const finishedAt = new Date();
        const durationMs = finishedAt - startedAt;

        info(
            `Email envoyé avec succès à ${testEmail}`,
            "test-single",
            "testSingleMaster",
            { messageId: sendResult.messageId, durationMs },
        );

        // Mettre à jour le résultat
        result.status = "success";
        result.emailSent = true;
        result.preview = {
            objet: objetFinal,
            corps: corpsFinal,
            from: fromEmail,
            to: testEmail,
            smtpProfile: smtpProfile.get("nom") || smtpId,
        };
        result.metadata = {
            sequenceId,
            emailIndex,
            testEmail,
            payeurId,
            userId: userId || null,
            userEmail: userEmail || null,
            sentAt: finishedAt.toISOString(),
            durationMs,
            messageId: sendResult.messageId,
            impayesCount: impayes.length,
            scenarioType,
        };
    } catch (err) {
        const errorMessage = err.message || "Erreur inconnue";
        error(
            `Erreur dans le workflow: ${errorMessage}`,
            "test-single",
            "testSingleMaster",
            { stack: err.stack?.substring(0, 500) },
        );
        result.errors.push(errorMessage);
        result.status = "error";
    }

    const finishedAt = new Date();
    result.metadata.durationMs = finishedAt - startedAt;

    info(
        `[test-single/master] Workflow terminé en ${result.metadata.durationMs}ms - Status: ${result.status}`,
        "test-single",
        "testSingleMaster",
    );

    return result;
}

module.exports = testSingleMaster;

// ═══════════════════════════════════════════════════════════════════════
// Cloud Function pour déclencher l'envoi de test
// ═══════════════════════════════════════════════════════════════════════
Parse.Cloud.define("sendTestSingleEmail", async (request) => {
    info(
        "Cloud Function sendTestSingleEmail appelée",
        "test-single",
        "sendTestSingleEmail",
        { params: request.params },
    );

    // Vérification de l'authentification
    if (!request.master && !request.user) {
        throw new Error("Non autorisé - nécessite authentification");
    }

    const { sequenceId, testEmail, payeurId, emailIndex } = request.params;

    if (!sequenceId || !testEmail || !payeurId || emailIndex === undefined) {
        throw new Error(
            "Paramètres requis: sequenceId, testEmail, payeurId, emailIndex",
        );
    }

    const options = {
        sequenceId,
        testEmail,
        payeurId,
        emailIndex,
        userId: request.user?.id || null,
        userEmail: request.user?.get?.("email") || null,
        userName: request.user?.get?.("username") || null,
    };

    return await testSingleMaster(options);
});

// ═══════════════════════════════════════════════════════════════════════
// Exécution directe si appelé en CLI
// ═══════════════════════════════════════════════════════════════════════
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length < 4) {
        console.error(
            "Usage: node 00-master.js <sequenceId> <testEmail> <payeurId> <emailIndex>",
        );
        console.error(
            "Exemple: node 00-master.js abc123 test@example.com def456 0",
        );
        process.exit(1);
    }

    const [sequenceId, testEmail, payeurId, emailIndex] = args;

    testSingleMaster({
        sequenceId,
        testEmail,
        payeurId,
        emailIndex: parseInt(emailIndex, 10),
    })
        .then((result) => {
            info(
                "Workflow test-single terminé via CLI",
                "test-single",
                "testSingleMaster",
                { status: result.status },
            );
            console.log("\n=== RÉSULTAT ===");
            console.log(JSON.stringify(result, null, 2));
            process.exit(result.status === "success" ? 0 : 1);
        })
        .catch((err) => {
            error(
                `Erreur dans test-single/master: ${err.message}`,
                "test-single",
                "testSingleMaster",
                { error: err.message, stack: err.stack?.substring(0, 500) },
            );
            console.error("Erreur:", err.message);
            process.exit(1);
        });
}
