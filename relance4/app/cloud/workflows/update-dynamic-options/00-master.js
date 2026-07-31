// backend/cloud/workflows/update-dynamic-options/00-master.js
// Orchestre la mise à jour des options dynamiques

// Charger les variables d'environnement depuis .env
require("dotenv").config({ path: "/home/ubuntu/prod/adti/.env" });

const { writeLog } = require("../../utils/logger");
const updateDynamicOptions = require("./01-updateDynamicOptions");

/**
 * Orchestre la mise à jour des options dynamiques
 * @param {Object} options - Options de configuration
 * @returns {Promise<Object>} Statistiques
 */
async function updateDynamicOptionsMaster(options = {}) {
    const startedAt = new Date();
    console.log(
        `[update-dynamic-options/master] Début du processus de mise à jour`,
    );
    writeLog(
        `INFO: Début du processus (trigger: ${options.trigger || "manual"})`,
    );

    const stats = {
        result: null,
        errors: [],
        total: {
            startedAt,
            finishedAt: null,
            durationMs: 0,
        },
    };

    try {
        console.log(
            "[update-dynamic-options/master] Étape 1/1: Mise à jour des options dynamiques...",
        );
        stats.result = await updateDynamicOptions();
        console.log(
            `[update-dynamic-options/master] Mise à jour terminée: ${stats.result?.updated ?? 0} configurations mises à jour`,
        );
    } catch (error) {
        console.error("[update-dynamic-options/master] Erreur:", error.message);
        stats.result = { updated: 0, errors: [error.message] };
        stats.errors.push({
            step: 1,
            script: "01-updateDynamicOptions",
            error: error.message,
        });
    }

    const finishedAt = new Date();
    stats.total.finishedAt = finishedAt;
    stats.total.durationMs = finishedAt - startedAt;

    console.log(
        `[update-dynamic-options/master] Durée totale: ${(finishedAt - startedAt) / 1000} secondes`,
    );
    writeLog(
        `SUCCESS: Processus terminé (${finishedAt - startedAt}ms) - ${stats.result?.updated || 0} configurations mises à jour`,
    );

    return stats;
}

module.exports = updateDynamicOptionsMaster;

// Exécution directe si appelé en CLI
if (require.main === module) {
    updateDynamicOptionsMaster()
        .then((stats) => {
            console.log(
                "Processus update-dynamic-options terminé:",
                JSON.stringify(stats, null, 2),
            );
            process.exit(stats.errors.length > 0 ? 1 : 0);
        })
        .catch((error) => {
            console.error("Erreur dans update-dynamic-options/master:", error);
            process.exit(1);
        });
}
