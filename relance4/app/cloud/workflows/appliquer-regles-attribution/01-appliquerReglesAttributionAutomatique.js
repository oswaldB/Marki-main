// Fonction pour appliquer les règles d'attribution automatique des séquences
// Ce fichier contient la logique métier d'attribution des séquences aux impayés

const { info, warn, error } = require("../../utils/logger");

/**
 * Applique les règles d'attribution automatique des séquences à un impayé
 * @param {Object} impaye - L'impayé Parse à évaluer
 * @param {Object} options - Options
 * @param {boolean} options.logActivity - Activer la journalisation (défaut: true)
 * @returns {Promise<Object|null>} La séquence attribuée ou null
 */
async function appliquerReglesAttributionAutomatique(
    impaye,
    { logActivity = true } = {},
) {
    if (typeof Parse === "undefined") {
        throw new Error("Parse SDK not initialized");
    }

    const startedAt = new Date();
    info(
        `[appliquerReglesAttributionAutomatique] Traitement impayé ${impaye.id}`,
        "appliquer-regles-attribution",
        "appliquerReglesAttributionAutomatique",
    );

    // 1. Vérifier si l'impayé a déjà une séquence
    if (impaye.get("sequence")) {
        info(
            `[appliquerReglesAttributionAutomatique] Impayé ${impaye.id} a déjà une séquence`,
            "appliquer-regles-attribution",
            "appliquerReglesAttributionAutomatique",
        );
        return null;
    }

    // 2. Récupérer les séquences avec attribution automatique activée
    const Sequence = Parse.Object.extend("Sequence");
    const sequenceQuery = new Parse.Query(Sequence);
    sequenceQuery.equalTo("attribution_automatique", true);
    sequenceQuery.equalTo("publiee", true); // Seulement les séquences publiées

    const sequences = await sequenceQuery.find({ useMasterKey: true });

    if (sequences.length === 0) {
        info(
            `[appliquerReglesAttributionAutomatique] Aucune séquence avec attribution automatique trouvée`,
            "appliquer-regles-attribution",
            "appliquerReglesAttributionAutomatique",
        );
        return null;
    }

    // 3. Parcourir les séquences et leurs groupes de règles
    for (const sequence of sequences) {
        const groupesRegles = sequence.get("groupes_regles") || [];

        info(
            `[appliquerReglesAttributionAutomatique] Test séquence ${sequence.id} (${groupesRegles.length} groupes de règles)`,
            "appliquer-regles-attribution",
            "appliquerReglesAttributionAutomatique",
        );

        // 4. Appliquer les groupes de règles
        let tousGroupesValides = true;

        for (const groupe of groupesRegles) {
            const logiqueGroupe = groupe.logique || "ET"; // "ET" ou "OU"
            const regles = groupe.regles || [];

            info(
                `[appliquerReglesAttributionAutomatique] Groupe ${logiqueGroupe} avec ${regles.length} règles`,
                "appliquer-regles-attribution",
                "appliquerReglesAttributionAutomatique",
            );

            // 5. Évaluer chaque règle du groupe
            let groupeValide = false;

            if (logiqueGroupe === "ET") {
                groupeValide = true; // Commence à vrai, une règle fausse invalide le groupe

                for (const regle of regles) {
                    const champ = regle.champ;
                    const operateur = regle.operateur || "egal";
                    const valeur = regle.valeur || [];

                    // Récupérer la valeur de l'impayé
                    const valeurImpaye = impaye.get(champ);

                    info(
                        `[appliquerReglesAttributionAutomatique] Règle: ${champ} ${operateur} ${JSON.stringify(valeur)} (valeur impayé: ${valeurImpaye})`,
                        "appliquer-regles-attribution",
                        "appliquerReglesAttributionAutomatique",
                    );

                    // Appliquer l'opérateur
                    let regleValide = false;

                    if (operateur === "egal") {
                        regleValide = valeur.includes(valeurImpaye);
                    } else if (operateur === "different") {
                        regleValide = !valeur.includes(valeurImpaye);
                    } else if (operateur === "supérieur") {
                        regleValide = valeurImpaye > valeur[0];
                    } else if (operateur === "inférieur") {
                        regleValide = valeurImpaye < valeur[0];
                    }

                    if (!regleValide) {
                        groupeValide = false;
                        info(
                            `[appliquerReglesAttributionAutomatique] Règle non validée`,
                            "appliquer-regles-attribution",
                            "appliquerReglesAttributionAutomatique",
                        );
                        break; // Sortir de la boucle si une règle du ET est fausse
                    }
                }
            } else if (logiqueGroupe === "OU") {
                groupeValide = false; // Commence à faux, une règle vraie valide le groupe

                for (const regle of regles) {
                    const champ = regle.champ;
                    const operateur = regle.operateur || "egal";
                    const valeur = regle.valeur || [];
                    const valeurImpaye = impaye.get(champ);

                    let regleValide = false;

                    if (operateur === "egal") {
                        regleValide = valeur.includes(valeurImpaye);
                    } else if (operateur === "different") {
                        regleValide = !valeur.includes(valeurImpaye);
                    }

                    if (regleValide) {
                        groupeValide = true;
                        break; // Sortir de la boucle si une règle du OU est vraie
                    }
                }
            }

            // 6. Mettre à jour la validation globale
            if (logiqueGroupe === "ET" && !groupeValide) {
                tousGroupesValides = false;
                break; // Si un groupe ET est invalide, la séquence ne correspond pas
            } else if (logiqueGroupe === "OU" && groupeValide) {
                tousGroupesValides = true;
                break; // Si un groupe OU est valide, la séquence correspond
            }
        }

        // 7. Si tous les groupes sont valides, attribuer la séquence
        if (tousGroupesValides) {
            info(
                `[appliquerReglesAttributionAutomatique] Tous les groupes validés - attribution séquence ${sequence.id}`,
                "appliquer-regles-attribution",
                "appliquerReglesAttributionAutomatique",
            );

            impaye.set("sequence", sequence);
            await impaye.save(null, { useMasterKey: true });

            // Persistance du log dans Parse
            try {
                if (logActivity && process.env.NODE_ENV !== "test") {
                    const finishedAt = new Date();
                    const log = new Parse.Object(
                        "AppliquerReglesAttributionAutomatiqueLog",
                    );
                    log.set("startedAt", startedAt);
                    log.set("finishedAt", finishedAt);
                    log.set("durationMs", finishedAt - startedAt);
                    log.set("impayeId", impaye.id);
                    log.set("sequenceId", sequence.id);
                    log.set("status", "success");
                    await log.save(null, { useMasterKey: true });
                }
            } catch (logErr) {
                error(
                    `[appliquerReglesAttributionAutomatique] Impossible d'écrire le log: ${logErr.message}`,
                    "appliquer-regles-attribution",
                    "appliquerReglesAttributionAutomatique",
                );
            }

            return sequence;
        } else {
            info(
                `[appliquerReglesAttributionAutomatique] Séquence ${sequence.id} non applicable`,
                "appliquer-regles-attribution",
                "appliquerReglesAttributionAutomatique",
            );
        }
    }

    info(
        `[appliquerReglesAttributionAutomatique] Aucune règle ne correspond pour l'impayé ${impaye.id}`,
        "appliquer-regles-attribution",
        "appliquerReglesAttributionAutomatique",
    );

    // Persistance du log d'échec dans Parse
    try {
        if (logActivity && process.env.NODE_ENV !== "test") {
            const finishedAt = new Date();
            const log = new Parse.Object(
                "AppliquerReglesAttributionAutomatiqueLog",
            );
            log.set("startedAt", startedAt);
            log.set("finishedAt", finishedAt);
            log.set("durationMs", finishedAt - startedAt);
            log.set("impayeId", impaye.id);
            log.set("status", "failed");
            log.set("message", "Aucune règle correspondante");
            await log.save(null, { useMasterKey: true });
        }
    } catch (logErr) {
        error(
            `[appliquerReglesAttributionAutomatique] Impossible d'écrire le log: ${logErr.message}`,
            "appliquer-regles-attribution",
            "appliquerReglesAttributionAutomatique",
        );
    }

    return null;
}

// Exporter la fonction
module.exports = {
    appliquerReglesAttributionAutomatique,
};
