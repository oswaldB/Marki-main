// backend/cloud/workflows/import-invoice/06-assignSequences.js
// Étape 6 : Attribue automatiquement des séquences aux impayés selon les règles définies
// Input: { }
// Output: { stats }

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

const {
    appliquerReglesAttributionAutomatique,
} = require("../../workflows/appliquer-regles-attribution/01-appliquerReglesAttributionAutomatique");

// ============================================================================
// UTILITAIRES POUR BATCH SAVE
// ============================================================================

/**
 * Sauvegarde un tableau d'objets Parse par lots (batch)
 * Utilise Parse.Object.saveAll() pour minimiser les requêtes réseau
 * @param {Parse.Object[]} objects - Tableau d'objets Parse à sauvegarder
 * @param {Object} options - Options pour saveAll (ex: { useMasterKey: true })
 * @param {number} batchSize - Taille maximale d'un batch (défaut: 50)
 * @returns {Promise<Parse.Object[]>} Tableau des objets sauvegardés
 */
async function batchSave(objects, options = {}, batchSize = 50) {
    if (!objects || objects.length === 0) {
        return [];
    }

    const results = [];
    const totalBatches = Math.ceil(objects.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
        const startIdx = i * batchSize;
        const endIdx = startIdx + batchSize;
        const batch = objects.slice(startIdx, endIdx);

        info(
            `Sauvegarde batch ${i + 1}/${totalBatches} (${batch.length} objets)`,
            "import-invoice",
            "batchSave",
            { batchNum: i + 1, totalBatches, batchSize: batch.length }
        );

        try {
            const saved = await Parse.Object.saveAll(batch, options);
            results.push(...saved);
            info(
                `Batch ${i + 1}/${totalBatches} sauvegardé avec succès`,
                "import-invoice",
                "batchSave",
                { batchNum: i + 1, savedCount: saved.length }
            );
        } catch (err) {
            error(
                `Erreur sauvegarde batch ${i + 1}/${totalBatches}: ${err.message}`,
                "import-invoice",
                "batchSave",
                {
                    batchNum: i + 1,
                    error: err.message,
                    stack: err.stack?.substring(0, 500),
                }
            );
            throw err;
        }
    }

    return results;
}

/**
 * Étape 6 : Attribue automatiquement des séquences aux impayés
 * @returns {Promise<Object>} { stats }
 */
async function assignSequences() {
    const stats = {
        impayesTraites: 0,
        sequencesAttribuees: 0,
        erreurs: [],
    };

    info(
        "Étape 6: Début de l'attribution des séquences",
        "import-invoice",
        "assignSequences",
    );

    try {
        // 1. Récupérer tous les impayés sans séquence attribuée, non soldés
        const Impaye = Parse.Object.extend("Impaye");
        const query = new Parse.Query(Impaye);
        query.doesNotExist("sequence");
        query.equalTo("facture_soldee", false);
        query.greaterThan("reste_a_payer", 0);
        query.include("contact_relance");
        query.limit(999999);

        const impayes = await query.find({ useMasterKey: true });
        info(
            `Étape 6: ${impayes.length} impayés à traiter (sans séquence)`,
            "import-invoice",
            "assignSequences",
            { count: impayes.length },
        );

        // 2. Traiter chaque impayé et collecter ceux à sauvegarder
        const impayesToSave = [];
        
        for (const impaye of impayes) {
            try {
                stats.impayesTraites++;

                // 3. Appliquer les règles d'attribution automatique
                const sequence =
                    await appliquerReglesAttributionAutomatique(impaye);

                if (sequence) {
                    stats.sequencesAttribuees++;
                    info(
                        `Étape 6: Séquence attribuée: ${sequence.id}`,
                        "import-invoice",
                        "assignSequences",
                        { sequenceId: sequence.id },
                    );

                    // 4. Préparer l'impayé avec la séquence attribuée (sans save immédiat)
                    impaye.set("sequence", sequence);
                    impayesToSave.push(impaye);
                    info(
                        `Étape 6: Séquence préparée pour ${impaye.id}`,
                        "import-invoice",
                        "assignSequences",
                        { impayeId: impaye.id },
                    );
                } else {
                    warn(
                        `Étape 6: Aucune séquence applicable pour ${impaye.id} (${impaye.get("nfacture")})`,
                        "import-invoice",
                        "assignSequences",
                        {
                            impayeId: impaye.id,
                            nfacture: impaye.get("nfacture"),
                        },
                    );
                    stats.erreurs.push({
                        impayeId: impaye.id,
                        nfacture: impaye.get("nfacture"),
                        erreur: "Aucune séquence applicable",
                    });
                }
            } catch (err) {
                error(
                    `Erreur impayé ${impaye.id}: ${err.message}`,
                    "import-invoice",
                    "assignSequences",
                    {
                        impayeId: impaye.id,
                        error: err.message,
                        stack: err.stack?.substring(0, 500),
                    },
                );
                stats.erreurs.push({
                    impayeId: impaye.id,
                    nfacture: impaye.get("nfacture"),
                    erreur: err.message,
                    stack: err.stack && err.stack.substring(0, 500),
                });
            }
        }

        // 5. Sauvegarder tous les impayés modifiés en batch
        if (impayesToSave.length > 0) {
            info(
                `Étape 6: Sauvegarde de ${impayesToSave.length} impayés avec séquences par batch`,
                "import-invoice",
                "assignSequences",
                { count: impayesToSave.length },
            );
            await batchSave(impayesToSave, { useMasterKey: true }, 50);
            info(
                `Étape 6: ${impayesToSave.length} impayés sauvegardés avec succès`,
                "import-invoice",
                "assignSequences",
                { savedCount: impayesToSave.length },
            );
        }

        info(
            `Étape 6: ${stats.impayesTraites} traités | ${stats.sequencesAttribuees} séquences attribuées | ${stats.erreurs.length} erreurs`,
            "import-invoice",
            "assignSequences",
        );

        return {
            stats,
        };
    } catch (err) {
        error(
            `Erreur Étape 6: ${err.message}`,
            "import-invoice",
            "assignSequences",
            { error: err.message, stack: err.stack?.substring(0, 500) },
        );
        throw err;
    }
}

module.exports = assignSequences;
