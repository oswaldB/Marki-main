// backend/cloud/workflows/appliquer-regles-attribution/00-master.js
// Workflow: Applique les règles d'attribution automatique des séquences

require("dotenv").config({ path: "/home/ubuntu/prod/adti/.env" });

const fs = require("fs");
const path = require("path");
const { info, warn, error } = require("../../utils/logger");

// Chemin du répertoire logs
const LOGS_DIR = path.join(__dirname, "logs");

/**
 * Vide le répertoire logs
 */
function clearLogs() {
    try {
        if (fs.existsSync(LOGS_DIR)) {
            const files = fs.readdirSync(LOGS_DIR);
            files.forEach((file) => {
                const filePath = path.join(LOGS_DIR, file);
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    warn(
                        `Impossible de supprimer ${filePath}: ${err.message}`,
                        "appliquer-regles-attribution",
                        "clearLogs",
                    );
                }
            });
            info(
                `Répertoire logs vidé: ${files.length} fichiers supprimés`,
                "appliquer-regles-attribution",
                "master",
            );
        }
    } catch (err) {
        warn(
            `Impossible de vider le répertoire logs: ${err.message}`,
            "appliquer-regles-attribution",
            "clearLogs",
        );
    }
}

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

// Séparateur visuel
info(
    "\n═════════════════════════════════════════════════════════════",
    "appliquer-regles-attribution",
    "master",
);
info(
    `🚀 DÉBUT: appliquer-regles-attribution - Module utilitaire`,
    "appliquer-regles-attribution",
    "master",
);
info(
    "Ce workflow est un service utilitaire appelé par d'autres workflows",
    "appliquer-regles-attribution",
    "master",
);
info(
    "═════════════════════════════════════════════════════════════",
    "appliquer-regles-attribution",
    "master",
);

const {
    appliquerReglesAttributionAutomatique,
} = require("./01-appliquerReglesAttributionAutomatique");

// Ce workflow est un service utilitaire
// Il n'a pas de point d'entrée cron ou Cloud Function directe
// Il est appelé par d'autres workflows

info(
    "✅ Module appliquer-regles-attribution prêt à être utilisé",
    "appliquer-regles-attribution",
    "master",
);

module.exports = { appliquerReglesAttributionAutomatique };
