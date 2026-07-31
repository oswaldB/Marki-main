// verify-paid-invoices/00-master.js
// Workflow autonome pour vérifier et synchroniser le statut de paiement des factures
// entre la base SQLite externe et Parse, puis nettoyer les relances associées

require("dotenv").config({
    path: require("path").join(__dirname, "..", "..", ".env"),
});

const path = require("path");
const fs = require("fs");
const { log, info, warn, error, debug } = require("../../utils/logger");

// Chemin de la base SQLite
const DEFAULT_DB_PATH = "/home/arthur/adti/sync.db";

// Variables pour tracker le temps de démarrage
let workflowStartTime = null;

/**
 * Initialise le SDK Parse
 * @returns {Promise<Object>} Parse SDK initialisé
 */
async function initializeParse() {
    if (typeof Parse === "undefined") {
        const Parse = require("parse/node");
        global.Parse = Parse;
    }

    const appId = process.env.PARSE_APP_ID;
    const serverURL = process.env.PARSE_SERVER_URL;
    const masterKey = process.env.PARSE_MASTER_KEY;

    if (!appId || !serverURL || !masterKey) {
        throw new Error(
            "Missing Parse configuration: PARSE_APP_ID, PARSE_SERVER_URL, or PARSE_MASTER_KEY",
        );
    }

    Parse.initialize(appId, "", masterKey);
    Parse.serverURL = serverURL;
    Parse.masterKey = masterKey;

    return Parse;
}

/**
 * Obtient le chemin de la base SQLite
 * @param {string} trigger - Type de déclencheur
 * @returns {string} Chemin de la base SQLite
 */
function getDatabasePath(trigger) {
    if (trigger === "test" && process.env.TEST_DB_PATH) {
        return process.env.TEST_DB_PATH;
    }
    return DEFAULT_DB_PATH;
}

/**
 * Nettoie le répertoire des logs (sauf en mode test)
 * @param {string} trigger - Type de déclencheur
 */
function cleanupLogs(trigger) {
    if (trigger === "test") {
        debug(
            "Skipping log cleanup in test mode",
            "verify-paid-invoices",
            "cleanupLogs",
        );
        return;
    }

    const logsDir = path.join(__dirname, "logs");

    if (fs.existsSync(logsDir)) {
        try {
            const files = fs.readdirSync(logsDir);
            const now = Date.now();
            const oneDayInMs = 24 * 60 * 60 * 1000;

            files.forEach((file) => {
                const filePath = path.join(logsDir, file);
                const stat = fs.statSync(filePath);

                // Supprimer les fichiers de plus d'un jour
                if (now - stat.mtimeMs > oneDayInMs) {
                    try {
                        fs.unlinkSync(filePath);
                        debug(
                            `Deleted old log file: ${file}`,
                            "verify-paid-invoices",
                            "cleanupLogs",
                        );
                    } catch (err) {
                        warn(
                            `Failed to delete log file ${file}: ${err.message}`,
                            "verify-paid-invoices",
                            "cleanupLogs",
                        );
                    }
                }
            });

            info(
                "Log cleanup completed",
                "verify-paid-invoices",
                "cleanupLogs",
            );
        } catch (err) {
            warn(
                `Log cleanup error: ${err.message}`,
                "verify-paid-invoices",
                "cleanupLogs",
            );
        }
    }
}

/**
 * Ouvre la base SQLite avec logique de réessai
 * @param {string} dbPath - Chemin de la base SQLite
 * @param {number} maxRetries - Nombre maximal de tentatives
 * @param {number} retryDelay - Délai entre les tentatives en ms
 * @returns {Promise<Object>} Instance de la base SQLite
 */
async function openDatabaseWithRetry(
    dbPath,
    maxRetries = 3,
    retryDelay = 60000,
) {
    const Database = require("better-sqlite3");
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            info(
                `Attempting to open SQLite database (attempt ${attempt}/${maxRetries}): ${dbPath}`,
                "verify-paid-invoices",
                "openDatabaseWithRetry",
            );

            const db = new Database(dbPath);
            info(
                "SQLite database opened successfully",
                "verify-paid-invoices",
                "openDatabaseWithRetry",
            );
            return db;
        } catch (err) {
            lastError = err;
            warn(
                `Failed to open SQLite database (attempt ${attempt}/${maxRetries}): ${err.message}`,
                "verify-paid-invoices",
                "openDatabaseWithRetry",
            );

            if (attempt < maxRetries) {
                info(
                    `Retrying in ${retryDelay / 1000} seconds...`,
                    "verify-paid-invoices",
                    "openDatabaseWithRetry",
                );
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
        }
    }

    throw new Error(
        `Failed to open SQLite database after ${maxRetries} attempts: ${lastError.message}`,
    );
}

/**
 * Crée une entrée Activite dans Parse
 * @param {string} type - Type d'activité
 * @param {string} operation - Opération effectuée
 * @param {string} details - Détails supplémentaires
 * @param {Object} impaye - Objet Impaye associé
 * @returns {Promise<Object>} Entité Activite créée
 */
async function createActivite(type, operation, details, impaye = null) {
    try {
        const Activite = Parse.Object.extend("Activite");
        const activite = new Activite();

        activite.set("type", type);
        activite.set("operation", operation);
        activite.set("details", details);

        if (impaye) {
            activite.set("impaye", impaye);
        }

        const saved = await activite.save(null, { useMasterKey: true });
        debug(
            `Created Activite: ${saved.id}`,
            "verify-paid-invoices",
            "createActivite",
        );
        return saved;
    } catch (err) {
        error(
            `Failed to create Activite: ${err.message}`,
            "verify-paid-invoices",
            "createActivite",
            {
                type,
                operation,
                details,
            },
        );
        throw err;
    }
}

/**
 * Vérifie et met à jour les factures payées depuis SQLite vers Parse
 * @param {string} trigger - Type de déclencheur
 * @returns {Promise<Object>} Statistiques de la vérification
 */
async function verifyPaidInvoices(trigger) {
    const stats = {
        updated: 0,
        errors: [],
        skipped: 0,
        invoiceNumbers: [],
    };

    try {
        // Vérifier la disponibilité du SDK Parse
        if (typeof Parse === "undefined") {
            throw new Error("Parse SDK not initialized");
        }

        // Déterminer le chemin de la base SQLite
        const dbPath = getDatabasePath(trigger);
        info(
            `Using SQLite database: ${dbPath}`,
            "verify-paid-invoices",
            "verifyPaidInvoices",
        );

        // Ouvrir la base SQLite
        const db = await openDatabaseWithRetry(dbPath);

        try {
            // 1. Récupérer les factures impayées depuis Parse
            info(
                "Fetching unpaid invoices from Parse...",
                "verify-paid-invoices",
                "verifyPaidInvoices",
            );
            const unpaidQuery = new Parse.Query("Impaye");
            unpaidQuery.greaterThan("reste_a_payer", 0);
            unpaidQuery.limit(10000);

            const unpaidInvoices = await unpaidQuery.find({
                useMasterKey: true,
            });
            info(
                `Found ${unpaidInvoices.length} unpaid invoices in Parse`,
                "verify-paid-invoices",
                "verifyPaidInvoices",
            );

            if (unpaidInvoices.length === 0) {
                info(
                    "No unpaid invoices to verify",
                    "verify-paid-invoices",
                    "verifyPaidInvoices",
                );
                return stats;
            }

            // 2. Extraire les numéros de facture (nfacture)
            const invoiceNumbers = unpaidInvoices
                .map((inv) => inv.get("nfacture"))
                .filter((id) => id);
            info(
                `Extracted ${invoiceNumbers.length} nfacture to check in SQLite`,
                "verify-paid-invoices",
                "verifyPaidInvoices",
            );

            if (invoiceNumbers.length === 0) {
                warn(
                    "No valid nfacture found in unpaid invoices",
                    "verify-paid-invoices",
                    "verifyPaidInvoices",
                );
                return stats;
            }

            // 3. Construire et exécuter la requête SQL
            const placeholders = invoiceNumbers.map(() => "?").join(",");
            const sql = `
                SELECT p.nfacture, p.facturesoldee, p.resteapayer
                FROM _GCO__GcoPiece p
                WHERE p.facturesoldee = 1
                  AND p.resteapayer = 0
                  AND p.nfacture IN (${placeholders})
            `;

            info(
                "Executing SQL query to find paid invoices...",
                "verify-paid-invoices",
                "verifyPaidInvoices",
            );
            const stmt = db.prepare(sql);
            const sqliteResults = stmt.all(...invoiceNumbers);
            info(
                `SQLite returned ${sqliteResults.length} paid invoices`,
                "verify-paid-invoices",
                "verifyPaidInvoices",
            );

            // 4. Traitement des factures payées
            for (const row of sqliteResults) {
                const { nfacture, facturesoldee, resteapayer } = row;
                stats.invoiceNumbers.push(nfacture);

                // Trouver l'Impaye correspondant par nfacture
                const matchingInvoice = unpaidInvoices.find(
                    (inv) => inv.get("nfacture") === nfacture,
                );

                if (!matchingInvoice) {
                    warn(
                        `Impaye not found for nfacture: ${nfacture}`,
                        "verify-paid-invoices",
                        "verifyPaidInvoices",
                    );
                    stats.skipped++;
                    continue;
                }

                try {
                    // Mettre à jour l'Impaye
                    info(
                        `Updating Impaye for nfacture: ${nfacture}`,
                        "verify-paid-invoices",
                        "verifyPaidInvoices",
                    );
                    matchingInvoice.set("facture_soldee", true);
                    matchingInvoice.set("solde", true);
                    matchingInvoice.set("solde_le", new Date());
                    matchingInvoice.set("reste_a_payer", 0);

                    await matchingInvoice.save(null, { useMasterKey: true });
                    stats.updated++;

                    // Créer une entrée Activite pour tracer le paiement
                    await createActivite(
                        "payment",
                        "verifyPaidInvoices - invoice marked as paid",
                        `Invoice ${nfacture} marked as paid from SQLite verification. reste_a_payer: ${resteapayer}`,
                        matchingInvoice,
                    );

                    info(
                        `Successfully updated Impaye ${matchingInvoice.id} (nfacture: ${nfacture})`,
                        "verify-paid-invoices",
                        "verifyPaidInvoices",
                    );
                } catch (err) {
                    const errorMsg = `Failed to update Impaye for nfacture ${nfacture}: ${err.message}`;
                    error(
                        errorMsg,
                        "verify-paid-invoices",
                        "verifyPaidInvoices",
                        { nfacture, error: err.message },
                    );
                    stats.errors.push({
                        nfacture,
                        error: err.message,
                        timestamp: new Date().toISOString(),
                    });

                    // Créer une entrée Activite pour l'erreur
                    try {
                        await createActivite(
                            "error",
                            "verifyPaidInvoices - failed to update invoice",
                            errorMsg,
                            matchingInvoice,
                        );
                    } catch (actErr) {
                        error(
                            `Failed to create error Activite: ${actErr.message}`,
                            "verify-paid-invoices",
                            "verifyPaidInvoices",
                        );
                    }
                }
            }
        } finally {
            // Fermer la base SQLite
            db.close();
            info(
                "SQLite database closed",
                "verify-paid-invoices",
                "verifyPaidInvoices",
            );
        }
    } catch (err) {
        error(
            `Error in verifyPaidInvoices: ${err.message}`,
            "verify-paid-invoices",
            "verifyPaidInvoices",
            {
                stack: err.stack,
            },
        );
        stats.errors.push({
            type: "workflow_error",
            error: err.message,
            timestamp: new Date().toISOString(),
        });
    }

    return stats;
}

/**
 * Nettoie les relances pour les factures payées
 * @param {string} trigger - Type de déclencheur
 * @param {boolean} fullCleanup - Si true, nettoie toutes les relances des factures soldées (même anciennes)
 * @returns {Promise<Object>} Statistiques du nettoyage
 */
async function cleanupRelances(trigger, fullCleanup = false) {
    const stats = {
        deleted: 0,
        updated: 0,
        skipped: 0,
    };

    try {
        if (typeof Parse === "undefined") {
            throw new Error("Parse SDK not initialized");
        }

        if (!fullCleanup && !workflowStartTime) {
            warn(
                "workflowStartTime not set, cannot filter recently paid invoices",
                "verify-paid-invoices",
                "cleanupRelances",
            );
            return stats;
        }

        info(
            fullCleanup 
                ? "Searching for ALL paid invoices (full cleanup mode)..." 
                : "Searching for recently paid invoices...",
            "verify-paid-invoices",
            "cleanupRelances",
        );

        // 1. Rechercher les factures payées
        const paidQuery = new Parse.Query("Impaye");
        paidQuery.equalTo("facture_soldee", true);
        paidQuery.equalTo("solde", true);
        
        // Si pas en mode full cleanup, filtrer uniquement les factures soldées depuis le démarrage du workflow
        if (!fullCleanup && workflowStartTime) {
            paidQuery.greaterThanOrEqualTo("solde_le", workflowStartTime);
        }

        const paidInvoices = await paidQuery.find({ useMasterKey: true });
        info(
            `Found ${paidInvoices.length} paid invoices`,
            "verify-paid-invoices",
            "cleanupRelances",
        );

        if (paidInvoices.length === 0) {
            info(
                "No recently paid invoices found, skipping relance cleanup",
                "verify-paid-invoices",
                "cleanupRelances",
            );
            return stats;
        }

        // 2. Nettoyer les relances pour chaque facture payée
        for (const paidImpaye of paidInvoices) {
            try {
                const relanceQuery = new Parse.Query("Relance");
                // Le champ impayes est un tableau de pointeurs vers Impaye
                relanceQuery.containedIn("impayes", [paidImpaye]);

                const relances = await relanceQuery.find({
                    useMasterKey: true,
                });
                info(
                    `Found ${relances.length} relances for Impaye ${paidImpaye.id}`,
                    "verify-paid-invoices",
                    "cleanupRelances",
                );

                for (const relance of relances) {
                    const statut = relance.get("statut");
                    const relanceId = relance.id;

                    // Supprimer si le statut n'est PAS "Envoyée" (seul statut à conserver)
                    if (statut !== "Envoyée") {
                        try {
                            await relance.destroy({ useMasterKey: true });
                            stats.deleted++;
                            info(
                                `Deleted relance ${relanceId} for paid invoice (statut: ${statut})`,
                                "verify-paid-invoices",
                                "cleanupRelances",
                            );

                            // Créer une entrée Activite pour le nettoyage
                            await createActivite(
                                "cleanup",
                                "verifyPaidInvoices - relance deleted",
                                `Relance ${relanceId} deleted for paid invoice. Statut: ${statut}`,
                                paidImpaye,
                            );
                        } catch (err) {
                            error(
                                `Failed to delete relance ${relanceId}: ${err.message}`,
                                "verify-paid-invoices",
                                "cleanupRelances",
                            );
                            stats.errors.push({
                                relanceId,
                                error: err.message,
                                timestamp: new Date().toISOString(),
                            });
                        }
                    } else {
                        // Incrémenter le compteur des ignorées pour les autres statuts
                        stats.skipped++;
                        debug(
                            `Skipped relance ${relanceId} with statut: ${statut}`,
                            "verify-paid-invoices",
                            "cleanupRelances",
                        );
                    }
                }
            } catch (err) {
                error(
                    `Error processing relances for Impaye ${paidImpaye.id}: ${err.message}`,
                    "verify-paid-invoices",
                    "cleanupRelances",
                );
                stats.errors.push({
                    impayeId: paidImpaye.id,
                    error: err.message,
                    timestamp: new Date().toISOString(),
                });
            }
        }
    } catch (err) {
        error(
            `Error in cleanupRelances: ${err.message}`,
            "verify-paid-invoices",
            "cleanupRelances",
            {
                stack: err.stack,
            },
        );
        stats.errors.push({
            type: "cleanup_error",
            error: err.message,
            timestamp: new Date().toISOString(),
        });
    }

    return stats;
}

/**
 * Fonction principale de l'orchestrateur
 * @param {string} [trigger='manual'] - Type de déclencheur
 * @returns {Promise<Object>} Résultats complets du workflow
 */
async function verifyPaidInvoicesMaster(trigger = "manual") {
    workflowStartTime = new Date();

    const stats = {
        result: {},
        cleanup: {},
        generation: {},
        errors: [],
        total: {},
    };

    try {
        // Logger le démarrage
        info(
            `Starting verifyPaidInvoicesMaster workflow (trigger: ${trigger})`,
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
        );

        // Initialiser Parse
        await initializeParse();
        info(
            "Parse SDK initialized",
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
        );

        // Nettoyer les logs
        cleanupLogs(trigger);

        // Initialiser l'objet stats
        stats.total.startTime = workflowStartTime.toISOString();
        stats.total.trigger = trigger;

        // Exécuter la vérification des factures payées
        info(
            "Starting invoice verification...",
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
        );
        stats.result = await verifyPaidInvoices(trigger);
        info(
            `Invoice verification completed: ${JSON.stringify(stats.result)}`,
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
        );

        // Exécuter le nettoyage des relances pour les nouvelles factures payées
        info(
            "Starting relance cleanup for newly paid invoices...",
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
        );
        const newCleanupStats = await cleanupRelances(trigger, false);
        info(
            `New relance cleanup completed: ${JSON.stringify(newCleanupStats)}`,
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
        );

        // Exécuter le nettoyage complet des relances orphelines (toutes les factures soldées)
        info(
            "Starting FULL relance cleanup for ALL paid invoices (orphan cleanup)...",
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
        );
        const fullCleanupStats = await cleanupRelances(trigger, true);
        info(
            `Full relance cleanup completed: ${JSON.stringify(fullCleanupStats)}`,
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
        );

        // Combiner les statistiques de nettoyage
        stats.cleanup = {
            newlyPaid: newCleanupStats,
            allPaid: fullCleanupStats,
            deleted: (newCleanupStats.deleted || 0) + (fullCleanupStats.deleted || 0),
            skipped: (newCleanupStats.skipped || 0) + (fullCleanupStats.skipped || 0),
        };

        // Calculer les statistiques globales
        stats.total.updatedInvoices = stats.result.updated || 0;
        stats.total.deletedRelances = stats.cleanup.deleted || 0;
        stats.total.skipped =
            (stats.result.skipped || 0) + (stats.cleanup.skipped || 0);
        stats.total.errors = [
            ...(stats.result.errors || []),
            ...(stats.cleanup.newlyPaid?.errors || []),
            ...(stats.cleanup.allPaid?.errors || []),
        ];
        stats.total.invoiceNumbers = stats.result.invoiceNumbers || [];
        stats.total.endTime = new Date().toISOString();
        stats.total.durationMs = new Date() - workflowStartTime;

        info(
            "Workflow completed successfully",
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
            {
                total: stats.total,
            },
        );
    } catch (err) {
        error(
            `Workflow failed: ${err.message}`,
            "verify-paid-invoices",
            "verifyPaidInvoicesMaster",
            {
                stack: err.stack,
            },
        );
        stats.errors.push({
            type: "master_error",
            error: err.message,
            timestamp: new Date().toISOString(),
        });
        stats.total.error = err.message;
    } finally {
        // Toujours registrer la fin
        stats.total.endTime = new Date().toISOString();
        stats.total.durationMs = new Date() - workflowStartTime;
    }

    return stats;
}

// Enregistrer la Cloud Function
try {
    Parse.Cloud.define("verifyPaidInvoicesNow", async (request) => {
        const { trigger = "manual" } = request.params;

        info(
            `Cloud Function verifyPaidInvoicesNow called (trigger: ${trigger})`,
            "verify-paid-invoices",
            "CloudFunction",
        );

        try {
            const result = await verifyPaidInvoicesMaster(trigger);
            info(
                "Cloud Function verifyPaidInvoicesNow completed",
                "verify-paid-invoices",
                "CloudFunction",
            );
            return result;
        } catch (err) {
            error(
                `Cloud Function verifyPaidInvoicesNow failed: ${err.message}`,
                "verify-paid-invoices",
                "CloudFunction",
            );
            throw err;
        }
    });

    info(
        "Cloud Function verifyPaidInvoicesNow registered",
        "verify-paid-invoices",
        "CloudFunction",
    );
} catch (err) {
    // En mode CLI ou si Parse n'est pas encore initialisé, on peut exporter sans la Cloud Function
    debug(
        `Could not register Cloud Function (not in Parse Cloud environment?): ${err.message}`,
        "verify-paid-invoices",
        "CloudFunction",
    );
}

// Exporter la fonction principale pour utilisation programmatique
module.exports = verifyPaidInvoicesMaster;

// Si le script est exécuté directement en CLI
if (require.main === module) {
    (async () => {
        try {
            const trigger = process.argv[2] || "manual";
            const result = await verifyPaidInvoicesMaster(trigger);
            console.log("\n=== Workflow Result ===");
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
        } catch (err) {
            console.error("\n❌ Workflow Error:", err.message);
            console.error(err.stack);
            process.exit(1);
        }
    })();
}
