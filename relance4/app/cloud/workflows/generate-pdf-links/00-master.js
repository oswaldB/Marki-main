// backend/cloud/workflows/generate-pdf-links/00-master.js
// Orchestrateur du workflow de génération des liens PDF

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

/**
 * Orchestrateur principal du workflow generate-pdf-links
 * @param {Object} options - Options de configuration
 * @returns {Promise<Object>} Statistiques
 */
async function generatePdfLinksMaster(options = {}) {
    const startedAt = new Date();
    const stats = {
        generated: 0,
        errors: [],
        total: {
            startedAt,
            finishedAt: null,
            durationMs: 0,
        },
    };

    info(
        `[generate-pdf-links/master] Début du processus de génération des liens PDF (trigger: ${options.trigger || "manual"})`,
        "generate-pdf-links",
        "generatePdfLinksMaster",
    );

    try {
        // TODO: Implémenter la logique de génération des liens PDF
        info(
            `[generate-pdf-links/master] Workflow generate-pdf-links non encore implémenté`,
            "generate-pdf-links",
            "generatePdfLinksMaster",
        );
        
        stats.generated = 0;
    } catch (err) {
        error(
            `[generate-pdf-links/master] Erreur: ${err.message}`,
            "generate-pdf-links",
            "generatePdfLinksMaster",
        );
        stats.errors.push({
            error: err.message,
            stack: err.stack?.substring(0, 500),
        });
    }

    const finishedAt = new Date();
    stats.total.finishedAt = finishedAt;
    stats.total.durationMs = finishedAt - startedAt;

    info(
        `[generate-pdf-links/master] Durée totale: ${(finishedAt - startedAt) / 1000} secondes`,
        "generate-pdf-links",
        "generatePdfLinksMaster",
    );

    return stats;
}

module.exports = generatePdfLinksMaster;

// Clé secrète pour signer les URLs PDF (même que dans server.js)
const PDF_SIGNING_SECRET =
    process.env.PDF_SIGNING_SECRET || "marki16-default-pdf-secret-change-me";

const API_BASE_URL =
    process.env.API_BASE_URL ||
    process.env.PARSE_SERVER_URL?.replace("/parse", "") ||
    "https://dev.api.markidiags.com:8444";

/**
 * Génère un lien signé pour accéder au PDF d'un impayé
 * @param {Object} options - Options
 * @param {string} options.impayelId - ID de l'impayé
 * @returns {Promise<Object>} URL signée
 */
async function generatePdfLinkMaster(options = {}) {
    const { impayelId } = options;

    if (!impayelId) {
        throw new Error("impayelId est requis");
    }

    info(
        `[generate-pdf-links/generatePdfLink] Génération du lien pour impayé: ${impayelId}`,
        "generate-pdf-links",
        "generatePdfLink",
        { impayelId }
    );

    // Vérifier que l'impayé existe
    try {
        const Impaye = Parse.Object.extend("Impaye");
        const query = new Parse.Query(Impaye);
        await query.get(impayelId, { useMasterKey: true });
    } catch (err) {
        throw new Error("Impayé introuvable");
    }

    // Générer l'expiration (24 heures)
    const expires = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

    // Créer la signature
    const dataToSign = `${impayelId}:${expires}:${PDF_SIGNING_SECRET}`;
    const sig = crypto
        .createHmac("sha256", PDF_SIGNING_SECRET)
        .update(dataToSign)
        .digest("hex");

    // Construire l'URL complète vers l'API
    const url = `${API_BASE_URL}/api/pdf/${impayelId}?sig=${sig}&expires=${expires}`;

    info(
        `[generate-pdf-links/generatePdfLink] Lien généré avec succès`,
        "generate-pdf-links",
        "generatePdfLink",
        { impayelId, expires }
    );

    return { url, expires };
}

// Cloud Function publique pour générer un lien PDF (appelée depuis redirect-pdf)
Parse.Cloud.define("generatePdfLink", async (request) => {
    info(
        "Cloud Function generatePdfLink appelée",
        "generate-pdf-links",
        "generatePdfLink",
        { impayelId: request.params.impayelId }
    );

    // Cette fonction est publique (pas d'authentification requise)
    // car elle est appelée depuis un lien email par un client non connecté
    const { impayelId } = request.params;

    if (!impayelId) {
        throw new Error("impayelId est requis");
    }

    return await generatePdfLinkMaster({ impayelId });
});

// Cloud Function pour déclencher la génération des liens PDF via Parse (batch)
Parse.Cloud.define("generatePdfLinks", async (request) => {
    info(
        "Cloud Function generatePdfLinks appelée",
        "generate-pdf-links",
        "generatePdfLinks",
        { user: request.user?.id, master: request.master },
    );

    if (!request.master && !request.user) {
        throw new Error(
            "Non autorisé - cette fonction nécessite un utilisateur authentifié ou le master key",
        );
    }

    return await generatePdfLinksMaster({ trigger: "cloud-function" });
});

// Exécution directe si appelé en CLI
if (require.main === module) {
    generatePdfLinksMaster({ trigger: "cli" })
        .then((stats) => {
            info(
                "Workflow generate-pdf-links terminé via CLI",
                "generate-pdf-links",
                "generatePdfLinksMaster",
                {
                    errors: stats.errors.length,
                    durationMs: stats.total.durationMs,
                },
            );
            process.exit(stats.errors.length > 0 ? 1 : 0);
        })
        .catch((error) => {
            error(
                `Erreur dans generate-pdf-links/master: ${error.message}`,
                "generate-pdf-links",
                "generatePdfLinksMaster",
                { error: error.message, stack: error.stack?.substring(0, 500) },
            );
            process.exit(1);
        });
}
