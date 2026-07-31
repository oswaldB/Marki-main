#!/usr/bin/env node

/**
 * Script de correction des fautes de frappe "rest à payer" → "reste à payer"
 * dans le corps des relances qui n'ont pas encore été envoyées.
 *
 * Usage: node backend/scripts/fix-reste-a-payer-typo.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

// Configuration Parse
const PARSE_APP_ID = process.env.PARSE_APP_ID || "adti-marki";
const PARSE_MASTER_KEY =
    process.env.PARSE_MASTER_KEY ||
    "e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9";
const PARSE_SERVER_URL =
    process.env.PARSE_SERVER_URL || "https://dev.markidiags.com/api/parse";

// Headers pour les requêtes Parse
function getHeaders() {
    return {
        "X-Parse-Application-Id": PARSE_APP_ID,
        "X-Parse-Master-Key": PARSE_MASTER_KEY,
        "Content-Type": "application/json",
    };
}

/**
 * Récupère les relances non envoyées qui contiennent "rest à payer" ou "Rest à payer"
 */
async function getRelancesToFix() {
    console.log("Recherche des relances avec la faute de frappe...");

    // Requête pour trouver les relances non envoyées
    // On utilise une regex pour chercher "rest à payer" (insensible à la casse)
    const query = {
        statut: { $ne: "Envoyée" },
        corps: { $regex: "rest[ ]+à payer", $options: "i" },
    };

    try {
        const response = await fetch(
            `${PARSE_SERVER_URL}/classes/Relance?where=${encodeURIComponent(JSON.stringify(query))}&limit=1000`,
            {
                method: "GET",
                headers: getHeaders(),
            },
        );

        if (!response.ok) {
            throw new Error(
                `Erreur API: ${response.status} - ${response.statusText}`,
            );
        }

        const data = await response.json();
        const relances = data.results || [];

        console.log(
            `Relances trouvées avec potentielle faute: ${relances.length}`,
        );

        // Filtrer pour ne garder que celles qui contiennent vraiment la faute
        const relancesToFix = relances.filter((relance) => {
            const corps = relance.corps || "";
            // Cherche "rest à payer" ou "Rest à payer" mais pas déjà "reste à payer"
            return (
                /\b[Rr]est à payer\b/.test(corps) &&
                !/\b[Rr]este à payer\b/.test(corps)
            );
        });

        console.log(`Relances à corriger: ${relancesToFix.length}`);

        if (relancesToFix.length > 0) {
            console.log("\nListe des relances à corriger:");
            relancesToFix.forEach((relance, index) => {
                const numero = relance.numero || relance.objectId;
                const statut = relance.statut || "N/A";
                const preview = (relance.corps || "")
                    .substring(0, 100)
                    .replace(/\n/g, "\\n");
                console.log(
                    `   ${index + 1}. Relance #${numero} - statut: ${statut}`,
                );
                console.log(`      Aperçu: ${preview}...`);
            });
        }

        return relancesToFix;
    } catch (error) {
        console.error("Erreur lors de la récupération:", error.message);
        throw error;
    }
}

/**
 * Corrige le corps d'une relance
 * Remplace "rest à payer" → "reste à payer" et "Rest à payer" → "Reste à payer"
 */
function fixCorps(corps) {
    if (!corps) return corps;

    // Remplacement insensible à la casse mais préservant la casse de la première lettre
    // "rest à payer" → "reste à payer"
    // "Rest à payer" → "Reste à payer"
    // "REST À PAYER" → "RESTE À PAYER"
    return corps.replace(/\brest à payer\b/gi, (match) => {
        // Conserve la casse de la première lettre
        if (match[0] === match[0].toUpperCase()) {
            return "Reste à payer";
        }
        return "reste à payer";
    });
}

/**
 * Met à jour une relance avec le corps corrigé
 */
async function updateRelance(objectId, corpsCorrige) {
    try {
        const response = await fetch(
            `${PARSE_SERVER_URL}/classes/Relance/${objectId}`,
            {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify({ corps: corpsCorrige }),
            },
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                `Erreur mise à jour: ${response.status} - ${errorData.error || "Unknown error"}`,
            );
        }

        return true;
    } catch (error) {
        console.error(`   Erreur mise à jour de ${objectId}:`, error.message);
        return false;
    }
}

/**
 * Fonction principale
 */
async function fixRelances() {
    try {
        const relances = await getRelancesToFix();

        if (relances.length === 0) {
            console.log("\n✓ Aucune relance à corriger.");
            return { updatedCount: 0, cancelled: false };
        }

        // Afficher un aperçu des corrections
        console.log("\n--- Aperçu des corrections ---");
        relances.forEach((relance, index) => {
            const numero = relance.numero || relance.objectId;
            const original = relance.corps || "";
            const corrige = fixCorps(original);

            // Trouver la différence pour l'affichage
            const regex = /\b[Rr]est à payer\b/g;
            const matches = [...original.matchAll(regex)];

            console.log(`\n${index + 1}. Relance #${numero}:`);
            matches.forEach((match) => {
                const start = Math.max(0, match.index - 30);
                const end = Math.min(
                    original.length,
                    match.index + match[0].length + 30,
                );
                const contextAvant = original.substring(start, match.index);
                const contextApres = original.substring(
                    match.index + match[0].length,
                    end,
                );
                console.log(
                    `   "...${contextAvant}[${match[0]} → ${match[0] === "Rest" ? "Reste" : "reste"}]${contextApres}..."`,
                );
            });
        });

        // Demander confirmation
        const readline = require("readline").createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const answer = await new Promise((resolve) => {
            readline.question(
                `\nVous êtes sur le point de corriger ${relances.length} relance(s). Confirmez-vous ? (oui/non): `,
                (answer) => {
                    readline.close();
                    resolve(answer.trim().toLowerCase());
                },
            );
        });

        if (
            answer !== "oui" &&
            answer !== "yes" &&
            answer !== "o" &&
            answer !== "y"
        ) {
            console.log("Opération annulée.");
            return { updatedCount: 0, cancelled: true };
        }

        // Correction par lots
        const BATCH_SIZE = 20;
        let updatedCount = 0;
        const updatedIds = [];
        const failedIds = [];

        console.log("\nCorrection en cours...");

        for (let i = 0; i < relances.length; i += BATCH_SIZE) {
            const batch = relances.slice(i, i + BATCH_SIZE);

            const updatePromises = batch.map(async (relance) => {
                const objectId = relance.objectId;
                const corpsOriginal = relance.corps;
                const corpsCorrige = fixCorps(corpsOriginal);

                const success = await updateRelance(objectId, corpsCorrige);
                if (success) {
                    updatedIds.push(objectId);
                } else {
                    failedIds.push(objectId);
                }
                return success;
            });

            const results = await Promise.all(updatePromises);
            const batchUpdated = results.filter((r) => r).length;
            updatedCount += batchUpdated;

            console.log(
                `   Lot ${Math.floor(i / BATCH_SIZE) + 1}: ${batchUpdated}/${batch.length} corrigé(s)`,
            );
        }

        console.log(
            `\n✓ Correction terminée: ${updatedCount}/${relances.length} relance(s) corrigée(s)`,
        );

        if (failedIds.length > 0) {
            console.log(
                `   ⚠️  Échecs: ${failedIds.length} relance(s) - IDs: ${failedIds.join(", ")}`,
            );
        }

        return {
            updatedCount,
            totalFound: relances.length,
            failedCount: failedIds.length,
            relanceIds: updatedIds,
        };
    } catch (error) {
        console.error("\n❌ Erreur lors de la correction:", error.message);
        throw error;
    }
}

// Exécuter le script
fixRelances()
    .then((result) => {
        if (result.cancelled) {
            process.exit(0);
        }
        console.log("\nRésultat:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Script terminé avec erreur:", error.message);
        process.exit(1);
    });
