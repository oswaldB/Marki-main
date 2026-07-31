// backend/cloud/workflows/update-dynamic-options/01-updateDynamicOptions.js
// Met à jour les options dynamiques du système

// Charger les variables d'environnement depuis .env
require("dotenv").config({ path: "/home/ubuntu/prod/adti/.env" });

// Initialiser Parse
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
 * Met à jour les options dynamiques
 * @returns {Promise<Object>} Statistiques de mise à jour
 */
async function updateDynamicOptions() {
    const startedAt = new Date();
    const stats = {
        updated: 0,
        errors: [],
    };

    console.log(
        "[updateDynamicOptions] Début de la mise à jour des options dynamiques",
    );

    try {
        // Exemple: mettre à jour des configuration dynamiques
        // À adapter selon les besoins réels

        // 1. Récupérer les configurations à mettre à jour
        const Config = Parse.Object.extend("Config");
        const query = new Parse.Query(Config);
        query.equalTo("type", "dynamic");

        const configs = await query.find({ useMasterKey: true });
        console.log(
            `[updateDynamicOptions] ${configs.length} configurations dynamiques trouvées`,
        );

        for (const config of configs) {
            try {
                // Mettre à jour la valeur ou le statut
                const now = new Date();
                config.set("lastUpdated", now);
                await config.save(null, { useMasterKey: true });
                stats.updated++;
                console.log(
                    `[updateDynamicOptions] Configuration ${config.id} mise à jour`,
                );
            } catch (error) {
                console.error(
                    `[updateDynamicOptions] Erreur configuration ${config.id}:`,
                    error.message,
                );
                stats.errors.push({
                    configId: config.id,
                    error: error.message,
                });
            }
        }

        console.log(
            `[updateDynamicOptions] Terminé - ${stats.updated} configurations mises à jour, ${stats.errors.length} erreurs`,
        );
    } catch (error) {
        console.error("[updateDynamicOptions] Erreur globale:", error.message);
        stats.errors.push({
            source: "global",
            error: error.message,
            stack: error.stack,
        });
    }

    return stats;
}

module.exports = updateDynamicOptions;

// Exécution directe si appelé en CLI
if (require.main === module) {
    updateDynamicOptions()
        .then((stats) => {
            console.log("Mise à jour des options dynamiques terminée:", stats);
            process.exit(stats.errors.length > 0 ? 1 : 0);
        })
        .catch((error) => {
            console.error("Erreur:", error);
            process.exit(1);
        });
}
