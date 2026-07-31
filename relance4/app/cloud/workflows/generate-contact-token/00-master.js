// backend/cloud/workflows/generate-contact-token/00-master.js
// Orchestrateur du workflow de génération des tokens de contact

// Charger les variables d'environnement depuis .env
require("dotenv").config({ path: "/home/ubuntu/prod/adti/.env" });

const { info, warn, error } = require("../../utils/logger");
const crypto = require("crypto");

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

const CONTACT_SIGNING_SECRET =
    process.env.CONTACT_SIGNING_SECRET ||
    process.env.PDF_SIGNING_SECRET ||
    "marki16-default-contact-secret-change-me";

const FRONTEND_URL =
    process.env.FRONTEND_URL || "https://dev.markidiags.com";

/**
 * Génère un token signé pour l'accès à l'espace client
 * @param {Object} options - Options de configuration
 * @param {string} options.contactId - ID du contact
 * @returns {Promise<Object>} URL signée
 */
async function generateContactTokenMaster(options = {}) {
    const startedAt = new Date();
    const { contactId } = options;

    info(
        `[generate-contact-token/master] Génération du token pour contact: ${contactId}`,
        "generate-contact-token",
        "generateContactTokenMaster",
        { contactId }
    );

    if (!contactId) {
        throw new Error("contactId est requis");
    }

    // Vérifier que le contact existe
    try {
        const Contact = Parse.Object.extend("Contact");
        const query = new Parse.Query(Contact);
        await query.get(contactId, { useMasterKey: true });
    } catch (err) {
        throw new Error("Contact introuvable");
    }

    // Générer l'expiration (3 minutes)
    const expires = Math.floor(Date.now() / 1000) + 3 * 60;

    // Créer la signature
    const dataToSign = `${contactId}:${expires}:${CONTACT_SIGNING_SECRET}`;
    const sig = crypto
        .createHmac("sha256", CONTACT_SIGNING_SECRET)
        .update(dataToSign)
        .digest("hex");

    // Construire l'URL complète
    const url = `${FRONTEND_URL}/espace/${contactId}/impaye?sig=${sig}&expires=${expires}`;

    const finishedAt = new Date();
    info(
        `[generate-contact-token/master] Token généré en ${finishedAt - startedAt}ms`,
        "generate-contact-token",
        "generateContactTokenMaster",
        { contactId, expires }
    );

    return { url, expires };
}

module.exports = generateContactTokenMaster;

// Cloud Function pour générer un token d'accès à l'espace client
Parse.Cloud.define("generateContactToken", async (request) => {
    info(
        "Cloud Function generateContactToken appelée",
        "generate-contact-token",
        "generateContactToken",
        { contactId: request.params.contactId, master: request.master },
    );

    // Cette fonction est publique (pas d'authentification requise)
    // car elle est appelée depuis un lien email par un client non connecté
    const { contactId } = request.params;

    if (!contactId) {
        throw new Error("contactId est requis");
    }

    return await generateContactTokenMaster({ contactId });
});

// Exécution directe si appelé en CLI (nécessite un contactId en argument)
if (require.main === module) {
    const contactId = process.argv[2];
    if (!contactId) {
        console.error("Usage: node 00-master.js <contactId>");
        process.exit(1);
    }
    
    generateContactTokenMaster({ contactId })
        .then((result) => {
            info(
                "Workflow generate-contact-token terminé via CLI",
                "generate-contact-token",
                "generateContactTokenMaster",
                { url: result.url }
            );
            console.log("URL générée:", result.url);
            process.exit(0);
        })
        .catch((error) => {
            error(
                `Erreur dans generate-contact-token/master: ${error.message}`,
                "generate-contact-token",
                "generateContactTokenMaster",
                { error: error.message, stack: error.stack?.substring(0, 500) },
            );
            console.error("Erreur:", error.message);
            process.exit(1);
        });
}
