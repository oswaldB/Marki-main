#!/usr/bin/env node

/**
 * Script standalone pour décaler de +1 jour les dateEnvoi des relances
 * créées le 25 juin 2026 qui n'ont pas encore été envoyées.
 *
 * Usage: node backend/scripts/decaler-relances-25-juin.js
 * Options:
 *   --dry-run : Affiche les relances concernées sans les modifier
 *   --force   : Exécute sans demander de confirmation
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

// Configuration Parse
const PARSE_APP_ID = process.env.PARSE_APP_ID;
const PARSE_MASTER_KEY = process.env.PARSE_MASTER_KEY;
const PARSE_SERVER_URL = process.env.PARSE_SERVER_URL;

if (!PARSE_APP_ID || !PARSE_MASTER_KEY || !PARSE_SERVER_URL) {
    console.error("❌ Configuration Parse manquante dans .env");
    console.error("   PARSE_APP_ID, PARSE_MASTER_KEY, PARSE_SERVER_URL requis");
    process.exit(1);
}

// Statuts considérés comme "non envoyés"
const STATUTS_NON_ENVOYES = [
    "En attente de génération",
    "pret pour envoi",
    "brouillon",
    "planifiée"
];

// Parse arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

/**
 * Headers pour les requêtes Parse
 */
function getHeaders() {
    return {
        "X-Parse-Application-Id": PARSE_APP_ID,
        "X-Parse-Master-Key": PARSE_MASTER_KEY,
        "Content-Type": "application/json"
    };
}

/**
 * Formate une date en ISO string pour Parse
 */
function formatDateForParse(date) {
    return date.toISOString();
}

/**
 * Récupère les relances créées le 25 juin 2026 avec statut non envoyé
 */
async function getRelancesToUpdate() {
    console.log("🔍 Recherche des relances créées le 25 juin 2026 (non envoyées)...\n");

    // Dates pour le 25 juin 2026 (UTC)
    const startOfDay = new Date("2026-06-25T00:00:00.000Z");
    const endOfDay = new Date("2026-06-25T23:59:59.999Z");

    console.log(`   Plage de création: ${startOfDay.toISOString()} → ${endOfDay.toISOString()}`);
    console.log(`   Statuts concernés: ${STATUTS_NON_ENVOYES.join(", ")}\n`);

    const query = {
        "createdAt": {
            "$gte": {
                "__type": "Date",
                "iso": formatDateForParse(startOfDay)
            },
            "$lte": {
                "__type": "Date",
                "iso": formatDateForParse(endOfDay)
            }
        },
        "statut": {
            "$in": STATUTS_NON_ENVOYES
        }
    };

    try {
        const response = await fetch(
            `${PARSE_SERVER_URL}/classes/Relance?where=${encodeURIComponent(JSON.stringify(query))}&limit=10000`,
            {
                method: "GET",
                headers: getHeaders()
            }
        );

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const relances = data.results || [];

        return relances;
    } catch (error) {
        console.error("❌ Erreur lors de la récupération:", error.message);
        throw error;
    }
}

/**
 * Met à jour la dateEnvoi d'une relance (+1 jour)
 */
async function updateRelanceDateEnvoi(relance) {
    const objectId = relance.objectId;
    const currentDateEnvoi = relance.dateEnvoi ? new Date(relance.dateEnvoi.iso || relance.dateEnvoi) : null;

    if (!currentDateEnvoi) {
        console.log(`   ⚠️  Relance ${objectId} : pas de dateEnvoi, ignorée`);
        return { success: false, reason: "no_dateEnvoi" };
    }

    // Calculer la nouvelle date (+1 jour)
    const newDateEnvoi = new Date(currentDateEnvoi);
    newDateEnvoi.setDate(newDateEnvoi.getDate() + 1);

    try {
        const response = await fetch(
            `${PARSE_SERVER_URL}/classes/Relance/${objectId}`,
            {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify({
                    dateEnvoi: {
                        __type: "Date",
                        iso: formatDateForParse(newDateEnvoi)
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Update failed");
        }

        return {
            success: true,
            oldDate: currentDateEnvoi,
            newDate: newDateEnvoi
        };
    } catch (error) {
        console.error(`   ❌ Erreur mise à jour ${objectId}:`, error.message);
        return { success: false, reason: error.message };
    }
}

/**
 * Fonction principale
 */
async function main() {
    console.log("=".repeat(60));
    console.log("📅 Décalage des dateEnvoi des relances du 25 juin 2026");
    console.log("=".repeat(60));

    if (DRY_RUN) {
        console.log("\n🔎 MODE DRY-RUN : Aucune modification ne sera effectuée\n");
    }

    try {
        const relances = await getRelancesToUpdate();

        if (relances.length === 0) {
            console.log("\n✅ Aucune relance trouvée correspondant aux critères.");
            process.exit(0);
        }

        console.log(`\n📊 ${relances.length} relance(s) trouvée(s):\n`);

        // Afficher les relances trouvées
        relances.forEach((relance, index) => {
            const numero = relance.numero || "N/A";
            const statut = relance.statut || "N/A";
            const dateEnvoi = relance.dateEnvoi
                ? new Date(relance.dateEnvoi.iso || relance.dateEnvoi).toLocaleString("fr-FR")
                : "N/A";
            const createdAt = new Date(relance.createdAt).toLocaleString("fr-FR");

            console.log(`   ${index + 1}. Relance #${numero}`);
            console.log(`      ObjectId: ${relance.objectId}`);
            console.log(`      Créée le: ${createdAt}`);
            console.log(`      Statut: ${statut}`);
            console.log(`      DateEnvoi actuelle: ${dateEnvoi}`);
            if (relance.dateEnvoi) {
                const newDate = new Date(relance.dateEnvoi.iso || relance.dateEnvoi);
                newDate.setDate(newDate.getDate() + 1);
                console.log(`      → Nouvelle dateEnvoi: ${newDate.toLocaleString("fr-FR")}`);
            }
            console.log("");
        });

        if (DRY_RUN) {
            console.log("\n✅ Fin du dry-run. Aucune modification effectuée.");
            console.log(`   Pour exécuter: node ${process.argv[1].split("/").pop()}`);
            process.exit(0);
        }

        // Demander confirmation si pas en mode force
        if (!FORCE) {
            const readline = require("readline").createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise((resolve) => {
                readline.question(
                    `\n⚠️  Vous allez décaler de +1 jour les dateEnvoi de ${relances.length} relance(s). Confirmer ? (oui/non): `,
                    (answer) => {
                        readline.close();
                        resolve(answer.trim().toLowerCase());
                    }
                );
            });

            if (answer !== "oui" && answer !== "yes" && answer !== "o" && answer !== "y") {
                console.log("\n❌ Opération annulée.");
                process.exit(0);
            }
        }

        // Exécuter les mises à jour
        console.log("\n📝 Mise à jour en cours...\n");

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < relances.length; i++) {
            const relance = relances[i];
            const result = await updateRelanceDateEnvoi(relance);

            if (result.success) {
                console.log(`   ✅ ${i + 1}/${relances.length} - ${relance.objectId}`);
                console.log(`      ${result.oldDate.toLocaleString("fr-FR")} → ${result.newDate.toLocaleString("fr-FR")}`);
                updatedCount++;
            } else if (result.reason === "no_dateEnvoi") {
                skippedCount++;
            } else {
                console.log(`   ❌ ${i + 1}/${relances.length} - ${relance.objectId} : ${result.reason}`);
                errorCount++;
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log("📈 RÉSULTATS");
        console.log("=".repeat(60));
        console.log(`   ✅ Mises à jour réussies: ${updatedCount}`);
        console.log(`   ⏭️  Ignorées (pas de dateEnvoi): ${skippedCount}`);
        console.log(`   ❌ Erreurs: ${errorCount}`);
        console.log("=".repeat(60) + "\n");

    } catch (error) {
        console.error("\n❌ Erreur fatale:", error.message);
        process.exit(1);
    }
}

// Exécuter
main();
