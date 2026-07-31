// backend/cloud/workflows/regenerate-relances-with-status/index.js
// Workflow de régénération des relances avec statut "À regénérer"
// Ce workflow trouve les relances avec statut = "À regénérer" et regénère leur contenu
// UN SEUL "function" dans tout le fichier

const Parse = require("parse/node");
const fs = require("fs");
const path = require("path");

Parse.Cloud.define("regenerateRelancesWithStatus", async function(request) {
    const trigger = request.user ? "manual" : "cron";

    // CHECKPOINT: regenerate-start
    const ts_start = new Date().toISOString();
    const line_start = ts_start + " [REGENERATE-RELANCES-WITH-STATUS][CHECKPOINT] [regenerate-start] Démarrage " + JSON.stringify({ trigger: trigger });
    console.log(line_start);
    try {
        const dir_start = path.join(__dirname, "logs");
        if (!fs.existsSync(dir_start)) fs.mkdirSync(dir_start, { recursive: true });
        fs.appendFileSync(path.join(dir_start, "regenerate-relances-" + ts_start.split("T")[0] + ".log"), line_start + "\n");
    } catch(e) {}

    try {
        const Relance = Parse.Object.extend("Relance");

        // CHECKPOINT: db-connected
        console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][CHECKPOINT] [db-connected] Classes Parse initialisées");

        // 1. Trouver toutes les relances avec statut = "À regénérer"
        const relanceQuery = new Parse.Query(Relance);
        relanceQuery.equalTo("statut", "À regénérer");
        relanceQuery.exists("impayes");
        relanceQuery.limit(1000);

        const relancesToRegenerate = await relanceQuery.find({ useMasterKey: true });

        // CHECKPOINT: relances-fetched
        console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][CHECKPOINT] [relances-fetched] " + relancesToRegenerate.length + " relance(s) à régénérer " + JSON.stringify({ count: relancesToRegenerate.length }));

        if (relancesToRegenerate.length === 0) {
            console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][CHECKPOINT] [regenerate-completed] Aucune relance à régénérer {\"processedCount\":0,\"regeneratedCount\":0}");
            return {
                success: true,
                processedCount: 0,
                regeneratedCount: 0,
                message: "Aucune relance à régénérer"
            };
        }

        // 2. Traiter chaque relance
        let regeneratedCount = 0;
        const regeneratedRelanceIds = [];
        const errors = [];

        // Charger le workflow regenerate-relances-contact pour réutiliser la logique
        const { regenerateRelancesContact } = require("../regenerate-relances-contact/index");

        for (const relance of relancesToRegenerate) {
            try {
                const contact = relance.get("contact");
                const contactId = contact ? contact.id : null;

                if (!contactId) {
                    errors.push({ relanceId: relance.id, error: "Pas de contact associé" });
                    console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][WARN] Relance sans contact " + JSON.stringify({ relanceId: relance.id }));
                    continue;
                }

                // 2a. Supprimer la relance existante avec statut "À regénérer"
                await relance.destroy({ useMasterKey: true });
                console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][INFO] Relance supprimée (pour régénération) " + JSON.stringify({ relanceId: relance.id, contactId: contactId }));

                // 2b. Appeler regenerateRelancesContact pour ce contact
                // Cela va recréer les relances pour ce contact (y compris celle qu'on vient de supprimer)
                const result = await regenerateRelancesContact(contactId, null);

                if (result.success && result.createdCount > 0) {
                    regeneratedCount++;
                    regeneratedRelanceIds.push(relance.id);
                    console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][INFO] Relance régénérée " + JSON.stringify({ relanceId: relance.id, contactId: contactId, createdCount: result.createdCount }));
                } else {
                    errors.push({ relanceId: relance.id, contactId: contactId, error: result.message || "Aucune relance générée" });
                    console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][WARN] Régénération échouée " + JSON.stringify({ relanceId: relance.id, contactId: contactId }));
                }

            } catch (error) {
                errors.push({ relanceId: relance.id, error: error.message });
                console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][ERROR] Erreur régénération " + JSON.stringify({ relanceId: relance.id, error: error.message }));
            }
        }

        // CHECKPOINT: regenerate-completed
        console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][CHECKPOINT] [regenerate-completed] Terminé " + JSON.stringify({ processedCount: relancesToRegenerate.length, regeneratedCount: regeneratedCount, errorsCount: errors.length }));
        console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][INFO] === Terminé === " + JSON.stringify({ processedCount: relancesToRegenerate.length, regeneratedCount: regeneratedCount, errorsCount: errors.length }));

        // Écriture du log Markdown
        try {
            const dir = path.join(__dirname, "logs");
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const ts = new Date().toISOString();
            const fileName = "regenerate-report-" + ts.replace(/[:.]/g, "-") + ".md";

            let content = "# Régénération Relances - " + ts + "\n\n";
            content += "## Résumé\n\n";
            content += "- **Relances à régénérer** : " + relancesToRegenerate.length + "\n";
            content += "- **Relances régénérées** : " + regeneratedCount + "\n";
            content += "- **Erreurs** : " + errors.length + "\n";
            content += "- **Mode** : " + trigger + "\n\n";

            if (regeneratedRelanceIds.length > 0) {
                content += "## Relances Régénérées\n\n";
                for (let i = 0; i < regeneratedRelanceIds.length; i++) {
                    content += "- " + regeneratedRelanceIds[i] + "\n";
                }
                content += "\n";
            }

            if (errors.length > 0) {
                content += "## Erreurs\n\n";
                for (let i = 0; i < errors.length; i++) {
                    content += "- " + JSON.stringify(errors[i]) + "\n";
                }
            }

            fs.writeFileSync(path.join(dir, fileName), content);

            // CHECKPOINT: log-written
            console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][CHECKPOINT] [log-written] Log: " + fileName);
        } catch (e) {
            console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][WARN] Erreur écriture log fichier " + JSON.stringify({ error: e.message }));
        }

        return {
            success: true,
            processedCount: relancesToRegenerate.length,
            regeneratedCount: regeneratedCount,
            regeneratedRelanceIds: regeneratedRelanceIds,
            errors: errors,
            message: `${regeneratedCount} relance(s) régénérée(s) sur ${relancesToRegenerate.length} traitée(s), ${errors.length} erreur(s)`
        };

    } catch (error) {
        console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][CHECKPOINT] [regenerate-error] " + error.message);
        console.log(new Date().toISOString() + " [REGENERATE-RELANCES-WITH-STATUS][ERROR] Erreur: " + error.message);
        throw error;
    }
});

console.log("✅ Mega-function regenerate-relances-with-status chargée");
