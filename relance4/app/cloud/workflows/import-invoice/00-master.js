// backend/cloud/workflows/import-invoice/00-master.js
// Orchestre le processus d'importation des factures
// Les étapes 8 et 9 (création et génération des relances) ont été extraites
// dans un workflow autonome accessible via Cloud Function "generateRelances"

// Charger les variables d'environnement depuis .env
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
                        "import-invoice",
                        "clearLogs",
                    );
                }
            });
            info(
                `Répertoire logs vidé: ${files.length} fichiers supprimés`,
                "import-invoice",
                "importInvoicesMaster",
            );
        }
    } catch (err) {
        warn(
            `Impossible de vider le répertoire logs: ${err.message}`,
            "import-invoice",
            "importInvoicesMaster",
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

// Charger les scripts d'étape
const fetchPiecesAndDossiers = require("./01-fetchPiecesAndDossiers");
const fetchStatuts = require("./02-fetchStatuts");
const fetchEmployes = require("./03-fetchEmployes");
const fetchInterlocuteurs = require("./04-fetchInterlocuteurs");
const processAndSaveImpayes = require("./05-processAndSaveImpayes");
const assignSequences = require("./06-assignSequences");
const fetchImpayesWithSequence = require("./07-fetchImpayesWithSequence");

/**
 * Orchestrateur principal
 */
async function importInvoicesMaster({ trigger = "cron" } = {}) {
    const startedAt = new Date();

    // Règle 1: Vider le répertoire logs au début
    if (trigger !== "test") {
        clearLogs();
    }

    // Séparateur visuel
    info(
        "\n═════════════════════════════════════════════════════════════",
        "import-invoice",
        "importInvoicesMaster",
    );
    info(
        `🚀 DÉBUT: import-invoice (trigger: ${trigger})`,
        "import-invoice",
        "importInvoicesMaster",
        { trigger },
    );
    info(
        "═════════════════════════════════════════════════════════════",
        "import-invoice",
        "importInvoicesMaster",
    );

    const stats = {
        errors: [],
        total: {
            startedAt: startedAt.toISOString(),
            finishedAt: null,
            durationMs: 0,
        },
    };

    try {
        // ========== ÉTAPE 1: Récupération des pièces et dossiers ==========
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        info(
            "📄 ÉTAPE 1/7: Récupération des pièces et dossiers depuis SQLite...",
            "import-invoice",
            "importInvoicesMaster",
            { step: 1 },
        );
        let result = await fetchPiecesAndDossiers();
        const { pieces } = result;
        stats.etape1 = { piecesCount: pieces.length };
        info(
            `✅ ÉTAPE 1 TERMINÉE: ${pieces.length} pièces récupérées`,
            "import-invoice",
            "importInvoicesMaster",
            { step: 1, piecesCount: pieces.length },
        );
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );

        // ========== ÉTAPE 2: Récupération des statuts ==========
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        info(
            "📋 ÉTAPE 2/7: Récupération des statuts...",
            "import-invoice",
            "importInvoicesMaster",
            { step: 2 },
        );
        result = await fetchStatuts();
        const { statutsMap } = result;
        stats.etape2 = { statutsCount: Object.keys(statutsMap).length };
        info(
            `✅ ÉTAPE 2 TERMINÉE: ${Object.keys(statutsMap).length} statuts récupérés`,
            "import-invoice",
            "importInvoicesMaster",
            { step: 2, statutsCount: Object.keys(statutsMap).length },
        );
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );

        // ========== ÉTAPE 3: Récupération des employés ==========
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        info(
            "👥 ÉTAPE 3/7: Récupération des employés...",
            "import-invoice",
            "importInvoicesMaster",
            { step: 3 },
        );
        result = await fetchEmployes();
        const { employesMap } = result;
        stats.etape3 = { employesCount: Object.keys(employesMap).length };
        info(
            `✅ ÉTAPE 3 TERMINÉE: ${Object.keys(employesMap).length} employés récupérés`,
            "import-invoice",
            "importInvoicesMaster",
            { step: 3, employesCount: Object.keys(employesMap).length },
        );
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );

        // ========== ÉTAPE 4: Récupération des interlocuteurs ==========
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        info(
            "💬 ÉTAPE 4/7: Récupération des interlocuteurs...",
            "import-invoice",
            "importInvoicesMaster",
            { step: 4 },
        );
        result = await fetchInterlocuteurs({ pieces });
        const { interlocuteursByDossier } = result;
        stats.etape4 = {
            interlocuteursCount: Object.keys(interlocuteursByDossier).length,
        };
        info(
            `✅ ÉTAPE 4 TERMINÉE: ${Object.keys(interlocuteursByDossier).length} dossiers avec interlocuteurs`,
            "import-invoice",
            "importInvoicesMaster",
            {
                step: 4,
                dossiersCount: Object.keys(interlocuteursByDossier).length,
            },
        );
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );

        // ========== ÉTAPE 5: Traitement et sauvegarde des impayés ==========
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        info(
            "💾 ÉTAPE 5/7: Traitement et sauvegarde des impayés dans Parse...",
            "import-invoice",
            "importInvoicesMaster",
            { step: 5 },
        );
        // ÉTAPE 4.5: Créer les contacts et lier les employés aux entreprises
        const createContactsWithRelations = require("./04-createContactsWithRelations");
        const contactsResult = await createContactsWithRelations({
            interlocuteursByDossier,
        });

        result = await processAndSaveImpayes({
            pieces,
            statutsMap,
            employesMap,
            interlocuteursByDossier,
            contactsMap: contactsResult.contactsMap,
        });
        stats.etape5 = result.stats;
        info(
            `✅ ÉTAPE 5 TERMINÉE: ${result.stats.impayes_created || 0} créés, ${result.stats.impayes_updated || 0} mis à jour`,
            "import-invoice",
            "importInvoicesMaster",
            {
                step: 5,
                created: result.stats.impayes_created || 0,
                updated: result.stats.impayes_updated || 0,
            },
        );
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );

        // ========== ÉTAPE 6: Attribution des séquences ==========
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        info(
            "🔄 ÉTAPE 6/7: Attribution automatique des séquences...",
            "import-invoice",
            "importInvoicesMaster",
            { step: 6 },
        );
        result = await assignSequences();
        stats.etape6 = result.stats;
        info(
            `✅ ÉTAPE 6 TERMINÉE: ${result.stats.impayesTraites || 0} traités, ${result.stats.sequencesAttribuees || 0} séquences attribuées`,
            "import-invoice",
            "importInvoicesMaster",
            {
                step: 6,
                traites: result.stats.impayesTraites || 0,
                attribuées: result.stats.sequencesAttribuees || 0,
            },
        );
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );

        // ========== ÉTAPE 7: Récupération des impayés avec séquence ==========
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        info(
            "🔍 ÉTAPE 7/7: Récupération des impayés avec séquence...",
            "import-invoice",
            "importInvoicesMaster",
            { step: 7 },
        );
        result = await fetchImpayesWithSequence();
        stats.etape7 = result.stats;
        const { sansRelance, avecRelance } = result;
        info(
            `✅ ÉTAPE 7 TERMINÉE: ${result.stats.sansRelance || 0} sans relance, ${result.stats.avecRelance || 0} avec relance`,
            "import-invoice",
            "importInvoicesMaster",
            {
                step: 7,
                sansRelance: result.stats.sansRelance || 0,
                avecRelance: result.stats.avecRelance || 0,
            },
        );
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );

        // ========== APPEL WORKFLOW GENERATE-RELANCES (étapes 8-9) ==========
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        info(
            `🔄 APPEL: generateRelances pour ${sansRelance.length} sans relance, ${avecRelance.length} avec relance...`,
            "import-invoice",
            "importInvoicesMaster",
            {
                sansRelanceCount: sansRelance.length,
                avecRelanceCount: avecRelance.length,
            },
        );

        // NOTE: generateRelances est maintenant en mode autonome exclusif (pas de params)
        // Mais on garde l'appel pour compatibilité avec import-invoice
        try {
            const generateResult = await Parse.Cloud.run(
                "generateRelances",
                {
                    sansRelanceIds: sansRelance.map((i) => i.id),
                    avecRelance: avecRelance.map((r) => ({
                        impayeId: r.impaye?.id || r.impaye,
                        relanceId: r.relance?.id,
                    })),
                },
                { useMasterKey: true },
            );

            stats.generateRelances = generateResult.stats;
            info(
                `✅ GENERATE-RELANCES TERMINÉ: ${generateResult.stats.etape1?.relancesCreated || 0} créées, ${generateResult.stats.etape2?.processed || 0} générées`,
                "import-invoice",
                "importInvoicesMaster",
                {
                    created: generateResult.stats.etape1?.relancesCreated || 0,
                    generated: generateResult.stats.etape2?.processed || 0,
                },
            );
        } catch (cloudErr) {
            error(
                `❌ Erreur lors de l'appel à generateRelances: ${cloudErr.message}`,
                "import-invoice",
                "importInvoicesMaster",
                {
                    error: cloudErr.message,
                    stack: cloudErr.stack?.substring(0, 500),
                },
            );
            stats.errors.push({
                step: "generateRelances",
                error: cloudErr.message,
                stack: cloudErr.stack?.substring(0, 500),
            });
        }
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );

        // ========== FIN SUCCESS ==========
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        info(
            "✅ PROCESSUS TERMINÉ AVEC SUCCÈS",
            "import-invoice",
            "importInvoicesMaster",
            { errorsCount: 0 },
        );
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
    } catch (err) {
        info(
            "\n═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
        error(
            `❌ ERREUR DANS LE WORKFLOW: ${err.message}`,
            "import-invoice",
            "importInvoicesMaster",
            { error: err.message, stack: err.stack?.substring(0, 500) },
        );
        stats.errors.push({
            step: "importInvoicesMaster",
            error: err.message,
            stack: err.stack?.substring(0, 500),
        });

        warn(
            "❌ PROCESSUS TERMINÉ AVEC ERREUR",
            "import-invoice",
            "importInvoicesMaster",
            { errorsCount: stats.errors.length },
        );
        info(
            "═════════════════════════════════════════════════════════════",
            "import-invoice",
            "importInvoicesMaster",
        );
    }

    const finishedAt = new Date();
    stats.total.finishedAt = finishedAt.toISOString();
    stats.total.durationMs = finishedAt - startedAt;
    const durationSec = ((finishedAt - startedAt) / 1000).toFixed(2);

    info(
        "\n═════════════════════════════════════════════════════════════",
        "import-invoice",
        "importInvoicesMaster",
    );
    info(
        `⏱️  DURÉE TOTALE: ${durationSec} secondes`,
        "import-invoice",
        "importInvoicesMaster",
        { durationMs: stats.total.durationMs, durationSec },
    );
    info(
        "═════════════════════════════════════════════════════════════",
        "import-invoice",
        "importInvoicesMaster",
    );

    return { stats };
}

module.exports = importInvoicesMaster;

// Cloud Function pour déclencher l'importation via Parse
if (
    typeof Parse !== "undefined" &&
    Parse.Cloud &&
    typeof Parse.Cloud.define === "function"
) {
    Parse.Cloud.define("triggerImportInvoices", async (request) => {
        info(
            "🌐 Cloud Function triggerImportInvoices appelée",
            "import-invoice",
            "triggerImportInvoices",
            { user: request.user?.id, master: request.master },
        );

        if (!request.master && !request.user) {
            throw new Error(
                "Non autorisé - cette fonction nécessite un utilisateur authentifié",
            );
        }

        return await importInvoicesMaster({ trigger: "cloud-function" });
    });
}

// Exécution directe si appelé en CLI
if (require.main === module) {
    importInvoicesMaster({ trigger: "cli" })
        .then((result) => {
            info(
                "✅ Processus import-invoice terminé via CLI",
                "import-invoice",
                "importInvoicesMaster",
                {
                    errors: result.stats.errors.length,
                    durationMs: result.stats.total.durationMs,
                },
            );
            process.exit(result.stats.errors.length > 0 ? 1 : 0);
        })
        .catch((error) => {
            error(
                `❌ Erreur dans import-invoice/master: ${error.message}`,
                "import-invoice",
                "importInvoicesMaster",
                { error: error.message, stack: error.stack?.substring(0, 500) },
            );
            process.exit(1);
        });
}
