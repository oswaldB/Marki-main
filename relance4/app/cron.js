// Configuration des tâches cron pour l'exécution automatique des workflows
// Heure de Paris (CET/CEST) = UTC+1 ou UTC+2 selon l'heure d'été

const cron = require("node-cron");
const path = require("path");

// Initialiser Parse si nécessaire
if (typeof Parse === "undefined") {
    const Parse = require("parse/node");
    Parse.initialize(
        process.env.PARSE_APP_ID || "marki15-app-id",
        process.env.PARSE_JAVASCRIPT_KEY || "",
        process.env.PARSE_MASTER_KEY || "marki15-master-key",
    );
    Parse.serverURL =
        process.env.PARSE_SERVER_URL || "http://localhost:1555/parse";
    Parse.Cloud.useMasterKey();
    global.Parse = Parse;
}

// Charger les masters des workflows
const importInvoicesMaster = require("./cloud/workflows/import-invoice/00-master");
// const sendEmailsMaster = require("./cloud/workflows/send-emails/00-master");
const sendSuivisMaster =
    require("./cloud/workflows/send-suivi/00-master").sendSuivisMaster;
const verifyPaidInvoicesMaster = require("./cloud/workflows/verify-paid-invoices/00-master");
const generateSuivisMaster = require("./cloud/workflows/generate-suivi/index");
const cleanupRelancesBlacklistMaster = require("./cloud/workflows/cleanup-relances-contact-blackliste/index");
const cleanupAllRelancesBlacklistMaster = require("./cloud/workflows/cleanup-all-relances-contact-blackliste/index");
const cleanupAllRelancesPaidImpayesMaster = require("./cloud/workflows/cleanup-all-relances-paid-impayes/index");
const regenerateRelancesWithStatusMaster = require("./cloud/workflows/regenerate-relances-with-status/index");
const syncContactsMaster = require("./cloud/workflows/sync-contacts/index");

// Utilitaires pour le nettoyage des fichiers temporaires
const fs = require("fs");
const TEMP_DIR = "/tmp/adti-invoices";
const FILE_RETENTION_HOURS = 24; // Garder les fichiers 24h

/**
 * Nettoie les fichiers temporaires trop anciens
 */
function cleanupTempFiles() {
    try {
        if (!fs.existsSync(TEMP_DIR)) return;
        const now = Date.now();
        const retentionMs = FILE_RETENTION_HOURS * 60 * 60 * 1000;
        const files = fs.readdirSync(TEMP_DIR);
        let deletedCount = 0;
        for (const file of files) {
            const filePath = path.join(TEMP_DIR, file);
            try {
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > retentionMs) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`[cleanupTempFiles] Supprimé: ${file}`);
                }
            } catch (err) {
                console.warn(
                    `[cleanupTempFiles] Erreur avec ${file}:`,
                    err.message,
                );
            }
        }
        console.log(
            `[cleanupTempFiles] Nettoyage terminé: ${deletedCount} fichiers supprimés`,
        );
        return deletedCount;
    } catch (err) {
        console.error("[cleanupTempFiles] Erreur:", err.message);
        return 0;
    }
}

console.log("📅 Configuration des tâches cron...");

// 1. IMPORT INVOICE : Tous les jours à minuit
cron.schedule(
    "0 0 * * *",
    () => {
        console.log("⏰ [CRON] Déclenchement: import-invoice (minuit)");
        importInvoicesMaster({ trigger: "cron" })
            .then(() => console.log("✅ [CRON] import-invoice terminé"))
            .catch((error) =>
                console.error(
                    "❌ [CRON] Erreur import-invoice:",
                    error.message,
                ),
            );
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

// 2. SEND EMAILS : DÉSACTIVÉ
// cron.schedule(
//     "0 19 * * *",
//     () => {
//         console.log("⏰ [CRON] Déclenchement: send-emails (19h)");
//         sendEmailsMaster({ trigger: "cron" })
//             .then(() => console.log("✅ [CRON] send-emails terminé"))
//             .catch((error) =>
//                 console.error("❌ [CRON] Erreur send-emails:", error.message),
//             );
//     },
//     { scheduled: true, timezone: "Europe/Paris" },
// );

// 2b. SEND SUIVIS : Tous les jours à 19h30 (après send-emails)
cron.schedule(
    "30 19 * * *",
    () => {
        console.log("⏰ [CRON] Déclenchement: send-suivi (19h30)");
        sendSuivisMaster({ trigger: "cron" })
            .then(() => console.log("✅ [CRON] send-suivi terminé"))
            .catch((error) =>
                console.error("❌ [CRON] Erreur send-suivi:", error.message),
            );
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

// 3. VERIFY PAID INVOICES : Toutes les heures à hh:50
cron.schedule(
    "50 * * * *",
    () => {
        console.log("⏰ [CRON] Déclenchement: verify-paid-invoices (hh:50)");
        verifyPaidInvoicesMaster({ trigger: "cron" })
            .then(() => console.log("✅ [CRON] verify-paid-invoices terminé"))
            .catch((error) =>
                console.error(
                    "❌ [CRON] Erreur verify-paid-invoices:",
                    error.message,
                ),
            );
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

// 4. GENERATE SUIVI : Tous les jours à 1h
cron.schedule(
    "0 1 * * *",
    () => {
        console.log("⏰ [CRON] Déclenchement: generate-suivi (1h)");
        generateSuivisMaster({ trigger: "cron" })
            .then(() => console.log("✅ [CRON] generate-suivi terminé"))
            .catch((error) =>
                console.error(
                    "❌ [CRON] Erreur generate-suivi:",
                    error.message,
                ),
            );
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

// 5. CLEANUP RELANCES BLACKLIST : Toutes les heures au début de l'heure
cron.schedule(
    "0 * * * *",
    () => {
        console.log(
            "⏰ [CRON] Déclenchement: cleanup-relances-contact-blackliste (toutes les heures)",
        );
        cleanupRelancesBlacklistMaster({ trigger: "cron" })
            .then((result) =>
                console.log(
                    `✅ [CRON] cleanup-relances-contact-blackliste terminé: ${result.deletedCount} relances supprimées`,
                ),
            )
            .catch((error) =>
                console.error(
                    "❌ [CRON] Erreur cleanup-relances-contact-blackliste:",
                    error.message,
                ),
            );
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

// 6. CLEANUP ALL RELANCES BLACKLIST : Tous les jours à 16h00
cron.schedule(
    "0 16 * * *",
    () => {
        console.log(
            "⏰ [CRON] Déclenchement: cleanup-all-relances-contact-blackliste (16h00)",
        );
        cleanupAllRelancesBlacklistMaster({ trigger: "cron" })
            .then((result) =>
                console.log(
                    `✅ [CRON] cleanup-all-relances-contact-blackliste terminé: ${result.deletedCount} relances supprimées`,
                ),
            )
            .catch((error) =>
                console.error(
                    "❌ [CRON] Erreur cleanup-all-relances-contact-blackliste:",
                    error.message,
                ),
            );
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

// 7. CLEANUP ALL RELANCES PAID IMPAYES : Tous les jours à 17h00
cron.schedule(
    "0 17 * * *",
    () => {
        console.log(
            "⏰ [CRON] Déclenchement: cleanup-all-relances-paid-impayes (17h00)",
        );
        cleanupAllRelancesPaidImpayesMaster({ trigger: "cron" })
            .then((result) =>
                console.log(
                    `✅ [CRON] cleanup-all-relances-paid-impayes terminé: ${result.deletedCount} relances supprimées, ${result.toRegenerateCount} à régénérer`,
                ),
            )
            .catch((error) =>
                console.error(
                    "❌ [CRON] Erreur cleanup-all-relances-paid-impayes:",
                    error.message,
                ),
            );
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

// 8. REGENERATE RELANCES WITH STATUS : Tous les jours à 17h10 (10 min après cleanup)
cron.schedule(
    "10 17 * * *",
    () => {
        console.log(
            "⏰ [CRON] Déclenchement: regenerate-relances-with-status (17h10)",
        );
        regenerateRelancesWithStatusMaster({ trigger: "cron" })
            .then((result) =>
                console.log(
                    `✅ [CRON] regenerate-relances-with-status terminé: ${result.regeneratedCount} relances régénérées sur ${result.processedCount} traitées`,
                ),
            )
            .catch((error) =>
                console.error(
                    "❌ [CRON] Erreur regenerate-relances-with-status:",
                    error.message,
                ),
            );
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

// 9. CLEANUP TEMP FILES : Tous les jours à 2h
cron.schedule(
    "0 2 * * *",
    () => {
        console.log("⏰ [CRON] Déclenchement: cleanup-temp-files (2h)");
        cleanupTempFiles();
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

// 7. SYNC CONTACTS : Tous les jours à 4h
cron.schedule(
    "0 4 * * *",
    () => {
        console.log("⏰ [CRON] Déclenchement: sync-contacts (4h)");
        syncContactsMaster({ trigger: "cron" })
            .then((result) =>
                console.log(
                    `✅ [CRON] sync-contacts terminé: ${result.stats?.updatedInDb || 0} contacts synchronisés`,
                ),
            )
            .catch((error) =>
                console.error("❌ [CRON] Erreur sync-contacts:", error.message),
            );
    },
    { scheduled: true, timezone: "Europe/Paris" },
);

function setupCronJobs() {
    console.log("✅ Tâches cron initialisées");
}

module.exports = { setupCronJobs };
console.log("✅ Fichier cron.js chargé - tâches planifiées activées");
