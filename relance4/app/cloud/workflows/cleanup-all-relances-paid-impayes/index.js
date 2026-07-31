// backend/cloud/workflows/cleanup-all-relances-paid-impayes/index.js
// Workflow de nettoyage des relances dont les impayés associés ont été réglés
// NOUVELLE LOGIQUE :
// Si une relance a plusieurs impayés et qu'au moins un est réglé :
//   - On retire les impayés réglés de la relance
//   - Si des impayés non réglés restent : on met le statut à "À regénérer"
//   - Si tous les impayés sont réglés : on supprime la relance
// Un autre workflow (regenerate-relances-with-status) se chargera de regénérer
// les relances avec statut "À regénérer"
// UN SEUL "function" dans tout le fichier

const Parse = require("parse/node");
const fs = require("fs");
const path = require("path");

/**
 * Vérifie si un impayé est réglé (soldé)
 */
function isImpayeRegle(impaye) {
    return impaye &&
           impaye.get("solde") === true &&
           impaye.get("facture_soldee") === true &&
           impaye.get("reste_a_payer") === 0;
}

Parse.Cloud.define("cleanupAllRelancesPaidImpayes", async function(request) {
    const trigger = request.user ? "manual" : "cron";

    // CHECKPOINT: cleanup-start
    const ts_start = new Date().toISOString();
    const line_start = ts_start + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][CHECKPOINT] [cleanup-start] Démarrage " + JSON.stringify({ trigger: trigger });
    console.log(line_start);
    try {
        const dir_start = path.join(__dirname, "logs");
        if (!fs.existsSync(dir_start)) fs.mkdirSync(dir_start, { recursive: true });
        fs.appendFileSync(path.join(dir_start, "cleanup-all-relances-" + ts_start.split("T")[0] + ".log"), line_start + "\n");
    } catch(e) {}

    try {
        const Impaye = Parse.Object.extend("Impaye");
        const Relance = Parse.Object.extend("Relance");

        // CHECKPOINT: db-connected
        console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][CHECKPOINT] [db-connected] Classes Parse initialisées");

        // 1. Récupérer TOUTES les relances
        const relanceQuery = new Parse.Query(Relance);
        relanceQuery.exists("impayes");
        relanceQuery.limit(1000);

        const allRelances = await relanceQuery.find({ useMasterKey: true });

        // CHECKPOINT: relances-fetched
        console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][CHECKPOINT] [relances-fetched] " + allRelances.length + " relance(s) à analyser " + JSON.stringify({ count: allRelances.length }));

        if (allRelances.length === 0) {
            console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][CHECKPOINT] [cleanup-completed] Aucune relance {\"processedCount\":0,\"deletedCount\":0,\"toRegenerateCount\":0}");
            return {
                success: true,
                processedCount: 0,
                deletedCount: 0,
                toRegenerateCount: 0,
                message: "Aucune relance à analyser"
            };
        }

        // 2. Analyser chaque relance
        let deletedCount = 0;
        let toRegenerateCount = 0;
        const deletedRelanceIds = [];
        const toRegenerateRelanceIds = [];
        const removedImpayeIds = [];

        for (const relance of allRelances) {
            const impayes = relance.get("impayes") || [];

            if (impayes.length === 0) {
                // Pas d'impayés, on passe
                continue;
            }

            // Récupérer les objets Impaye complets pour vérifier leur statut
            const impayeIds = impayes.map(i => i.id);

            const impayeQuery = new Parse.Query(Impaye);
            impayeQuery.containedIn("objectId", impayeIds);
            const fullImpayes = await impayeQuery.find({ useMasterKey: true });

            // Séparer les impayés réglés et non réglés
            const impayesRegles = [];
            const impayesNonRegles = [];

            for (const fullImpaye of fullImpayes) {
                if (isImpayeRegle(fullImpaye)) {
                    impayesRegles.push(fullImpaye);
                } else {
                    impayesNonRegles.push(fullImpaye);
                }
            }

            // 3. Traiter selon le cas
            if (impayesRegles.length > 0) {
                // Cette relance a au moins un impayé réglé
                removedImpayeIds.push(...impayesRegles.map(i => i.id));

                if (impayesNonRegles.length === 0) {
                    // Cas 1 : TOUS les impayés sont réglés -> supprimer la relance
                    await relance.destroy({ useMasterKey: true });
                    deletedCount++;
                    deletedRelanceIds.push(relance.id);
                    console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][INFO] Relance supprimée (tous impayés réglés) " + JSON.stringify({ relanceId: relance.id, impayeCount: impayesRegles.length }));
                } else {
                    // Cas 2 : Certains impayés sont réglés, d'autres non -> mettre à jour la relance
                    // NOUVELLE LOGIQUE : on retire les impayés réglés ET on met statut à "À regénérer"
                    const newImpayes = impayesNonRegles.map(i => ({
                        __type: "Pointer",
                        className: "Impaye",
                        objectId: i.id
                    }));

                    relance.set("impayes", newImpayes);
                    relance.set("statut", "À regénérer");
                    await relance.save(null, { useMasterKey: true });
                    toRegenerateCount++;
                    toRegenerateRelanceIds.push(relance.id);
                    console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][INFO] Relance marquée à regénérer (impayés réglés retirés) " + JSON.stringify({ relanceId: relance.id, removedCount: impayesRegles.length, keptCount: impayesNonRegles.length }));
                }
            }
        }

        // CHECKPOINT: cleanup-completed
        console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][CHECKPOINT] [cleanup-completed] Terminé " + JSON.stringify({ processedCount: allRelances.length, deletedCount: deletedCount, toRegenerateCount: toRegenerateCount }));
        console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][INFO] === Terminé === " + JSON.stringify({ processedCount: allRelances.length, deletedCount: deletedCount, toRegenerateCount: toRegenerateCount, removedImpayeIdsCount: removedImpayeIds.length }));

        // Écriture du log Markdown
        try {
            const dir = path.join(__dirname, "logs");
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const ts = new Date().toISOString();
            const fileName = "cleanup-all-report-" + ts.replace(/[:.]/g, "-") + ".md";

            let content = "# Nettoyage Relances - Impayés Réglés - " + ts + "\n\n";
            content += "## Résumé\n\n";
            content += "- **Relances analysées** : " + allRelances.length + "\n";
            content += "- **Relances supprimées** : " + deletedCount + "\n";
            content += "- **Relances à régénérer** : " + toRegenerateCount + "\n";
            content += "- **Impayés réglés retirés** : " + removedImpayeIds.length + "\n";
            content += "- **Mode** : " + trigger + "\n\n";

            if (deletedRelanceIds.length > 0) {
                content += "## Relances Supprimées (tous impayés réglés)\n\n";
                for (let i = 0; i < deletedRelanceIds.length; i++) {
                    content += "- " + deletedRelanceIds[i] + "\n";
                }
                content += "\n";
            }

            if (toRegenerateRelanceIds.length > 0) {
                content += "## Relances À Régénérer (impayés réglés retirés, statut mis à jour)\n\n";
                for (let i = 0; i < toRegenerateRelanceIds.length; i++) {
                    content += "- " + toRegenerateRelanceIds[i] + "\n";
                }
                content += "\n";
            }

            if (removedImpayeIds.length > 0) {
                content += "## Impayés Réglés Retirés\n\n";
                for (let i = 0; i < removedImpayeIds.length; i++) {
                    content += "- " + removedImpayeIds[i] + "\n";
                }
            }

            fs.writeFileSync(path.join(dir, fileName), content);

            // CHECKPOINT: log-written
            console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][CHECKPOINT] [log-written] Log: " + fileName);
        } catch (e) {
            console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][WARN] Erreur écriture log fichier " + JSON.stringify({ error: e.message }));
        }

        return {
            success: true,
            processedCount: allRelances.length,
            deletedCount: deletedCount,
            toRegenerateCount: toRegenerateCount,
            deletedRelanceIds: deletedRelanceIds,
            toRegenerateRelanceIds: toRegenerateRelanceIds,
            removedImpayeIds: removedImpayeIds,
            message: `${deletedCount} relance(s) supprimée(s), ${toRegenerateCount} relance(s) à régénérer, ${removedImpayeIds.length} impayé(s) réglé(s) retiré(s) sur ${allRelances.length} analysée(s)`
        };

    } catch (error) {
        console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][CHECKPOINT] [cleanup-error] " + error.message);
        console.log(new Date().toISOString() + " [CLEANUP-ALL-RELANCES-PAID-IMPAYES][ERROR] Erreur: " + error.message);
        throw error;
    }
});

console.log("✅ Mega-function cleanup-all-relances-paid-impayes chargée");
