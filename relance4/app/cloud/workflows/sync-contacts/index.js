// backend/cloud/workflows/sync-contacts/index.js
// Workflow de synchronisation des contacts Parse → sync.db

const Database = require("better-sqlite3");
const { info, warn, error } = require("../../utils/logger");

// Toujours importer Parse pour s'assurer qu'il est correctement initialisé
const Parse = require("parse/node");

// Si Parse n'est pas initialisé, l'initialiser avec les variables d'environnement
if (!Parse.serverURL) {
    Parse.initialize(
        process.env.PARSE_APP_ID,
        process.env.PARSE_JAVASCRIPT_KEY,
        process.env.PARSE_MASTER_KEY,
    );
    Parse.serverURL = process.env.PARSE_SERVER_URL;
    Parse.Cloud.useMasterKey();
}

/**
 * Étape 1: Récupération des contacts depuis Parse
 * @checkpoint sync-contacts-parse-loaded
 */
async function fetchContactsFromParse(since) {
    info("Étape 1: Récupération des contacts depuis Parse", "sync-contacts", "fetchContactsFromParse");

    const Contact = Parse.Object.extend("Contact");
    const query = new Parse.Query(Contact);

    query.equalTo("source", "db_externe");
    query.exists("externe_id");

    if (since) {
        query.greaterThan("updatedAt", since);
    }

    query.limit(10000);
    query.select([
        "externe_id", "nom", "prenom", "type_personne", "civilite",
        "email", "telephone", "adresse", "code_postal", "ville",
        "updatedAt", "lastSyncAt"
    ]);

    const contacts = await query.find({ useMasterKey: true });

    info(`✅ ${contacts.length} contacts récupérés depuis Parse`, "sync-contacts", "fetchContactsFromParse", { count: contacts.length });

    return contacts;
}

/**
 * Étape 2: Validation des IDs dans sync.db
 * @checkpoint sync-contacts-db-validated
 */
async function validateContactsInDb(contacts) {
    info("Étape 2: Validation des IDs dans sync.db", "sync-contacts", "validateContactsInDb");

    const dbPath = process.env.SYNC_DB_PATH || "/home/arthur/adti/sync.db";
    const db = new Database(dbPath);

    try {
        const externeIds = contacts.map(c => c.get("externe_id"));
        const placeholders = externeIds.map(() => "?").join(",");

        const existingRows = db.prepare(`
            SELECT idInterlocuteur FROM _ADN_RG_Interlocuteur
            WHERE idInterlocuteur IN (${placeholders})
        `).all(externeIds);

        const existingIdsSet = new Set(existingRows.map(r => String(r.idInterlocuteur)));

        info(`✅ ${existingIdsSet.size} contacts trouvés dans sync.db`, "sync-contacts", "validateContactsInDb", { count: existingIdsSet.size });

        return existingIdsSet;
    } finally {
        db.close();
    }
}

/**
 * Étape 3 & 4: Mise à jour des interlocuteurs dans sync.db
 * @checkpoint sync-contacts-db-updated
 */
async function updateInterlocuteursInDb(contacts, existingIdsSet, dryRun) {
    info("Étape 3-4: Mise à jour des interlocuteurs dans sync.db", "sync-contacts", "updateInterlocuteursInDb", { dryRun });

    if (dryRun) {
        info("Mode dryRun activé - aucune modification ne sera faite", "sync-contacts", "updateInterlocuteursInDb");
    }

    const dbPath = process.env.SYNC_DB_PATH || "/home/arthur/adti/sync.db";
    const db = new Database(dbPath);

    const stats = {
        updated: 0,
        failed: 0,
        failedDetails: []
    };

    const updatesToApply = [];
    const now = new Date().toISOString();

    for (const contact of contacts) {
        const externeId = contact.get("externe_id");

        if (!existingIdsSet.has(String(externeId))) {
            warn(`Contact orphelin ignoré: ${externeId} n'existe pas dans sync.db`, "sync-contacts", "updateInterlocuteursInDb", { externeId });
            continue;
        }

        updatesToApply.push({
            idInterlocuteur: externeId,
            typePersonne: contact.get("type_personne"),
            nom: contact.get("nom"),
            prenom: contact.get("prenom"),
            email: contact.get("email"),
            telephoneMobile: contact.get("telephone"),
            titre: contact.get("civilite"),
            adresse1: contact.get("adresse"),
            codePostal: contact.get("code_postal"),
            ville: contact.get("ville"),
            dateMaj: now,
            parseObjectId: contact.id
        });
    }

    if (dryRun) {
        info(`Mode dryRun: ${updatesToApply.length} mises à jour simulées`, "sync-contacts", "updateInterlocuteursInDb", { count: updatesToApply.length });
        return { stats: { ...stats, updated: updatesToApply.length }, updatesToApply };
    }

    const updateStmt = db.prepare(`
        UPDATE _ADN_RG_Interlocuteur SET
            typePersonne = COALESCE(?, typePersonne),
            nom = COALESCE(?, nom),
            prenom = COALESCE(?, prenom),
            email = COALESCE(?, email),
            telephoneMobile = COALESCE(?, telephoneMobile),
            titre = COALESCE(?, titre),
            adresse1 = COALESCE(?, adresse1),
            codePostal = COALESCE(?, codePostal),
            ville = COALESCE(?, ville),
            dateMaj = ?
        WHERE idInterlocuteur = ?
    `);

    const transaction = db.transaction((updates) => {
        for (const update of updates) {
            try {
                const result = updateStmt.run(
                    update.typePersonne,
                    update.nom,
                    update.prenom,
                    update.email,
                    update.telephoneMobile,
                    update.titre,
                    update.adresse1,
                    update.codePostal,
                    update.ville,
                    update.dateMaj,
                    update.idInterlocuteur
                );
                if (result.changes > 0) {
                    stats.updated++;
                }
            } catch (err) {
                stats.failed++;
                stats.failedDetails.push({
                    idInterlocuteur: update.idInterlocuteur,
                    error: err.message
                });
                error(`Échec mise à jour ${update.idInterlocuteur}: ${err.message}`, "sync-contacts", "updateInterlocuteursInDb", { idInterlocuteur: update.idInterlocuteur, error: err.message });
            }
        }
    });

    try {
        transaction(updatesToApply);
        info(`✅ ${stats.updated} interlocuteurs mis à jour dans sync.db`, "sync-contacts", "updateInterlocuteursInDb", { updated: stats.updated, failed: stats.failed });
    } finally {
        db.close();
    }

    return { stats, updatesToApply };
}

/**
 * Étape 5: Mise à jour du lastSyncAt dans Parse
 * @checkpoint sync-contacts-marked-synced
 */
async function markContactsAsSynced(updatesToApply, failedDetails, dryRun) {
    info("Étape 5: Marquage des contacts comme synchronisés", "sync-contacts", "markContactsAsSynced", { dryRun });

    if (dryRun) {
        info("Mode dryRun: pas de marquage des contacts", "sync-contacts", "markContactsAsSynced");
        return { marked: 0 };
    }

    const failedIds = new Set(failedDetails.map(f => String(f.idInterlocuteur)));
    const contactsToMark = updatesToApply.filter(u => !failedIds.has(String(u.idInterlocuteur)));

    if (contactsToMark.length === 0) {
        info("Aucun contact à marquer comme synchronisé", "sync-contacts", "markContactsAsSynced");
        return { marked: 0 };
    }

    const syncTimestamp = new Date();
    const contactsToSave = [];

    const Contact = Parse.Object.extend("Contact");

    for (const update of contactsToMark) {
        const contact = new Contact();
        contact.id = update.parseObjectId;
        contact.set("lastSyncAt", syncTimestamp);
        contactsToSave.push(contact);
    }

    try {
        await Parse.Object.saveAll(contactsToSave, { useMasterKey: true, batchSize: 50 });
        info(`✅ ${contactsToSave.length} contacts marqués comme synchronisés`, "sync-contacts", "markContactsAsSynced", { marked: contactsToSave.length });
        return { marked: contactsToSave.length };
    } catch (err) {
        error(`Échec du marquage des contacts: ${err.message}`, "sync-contacts", "markContactsAsSynced", { error: err.message });
        return { marked: 0, error: err.message };
    }
}

/**
 * Étape 7: Logging dans Activite
 */
async function logActivity(stats, durationMs, dryRun) {
    info("Étape 7: Logging de l'activité", "sync-contacts", "logActivity");

    try {
        const Activite = Parse.Object.extend("Activite");
        const activite = new Activite();

        activite.set("type", "sync_contacts_interlocuteurs");
        activite.set("details", `Sync contacts Parse → sync.db: ${stats.updated} mis à jour`);
        activite.set("metadata", {
            updatedInDb: stats.updated,
            failedInDb: stats.failed,
            duration: `${durationMs}ms`,
            dryRun: dryRun
        });
        activite.set("isSystem", true);

        await activite.save(null, { useMasterKey: true });
        info("✅ Activité loggée", "sync-contacts", "logActivity");
    } catch (err) {
        error(`Échec du logging: ${err.message}`, "sync-contacts", "logActivity", { error: err.message });
    }
}

/**
 * Orchestrateur principal du workflow sync-contacts
 * @checkpoint sync-contacts-completed / sync-contacts-failed
 */
async function syncContactsMaster(options = {}) {
    const startedAt = new Date();
    const { dryRun = false, since = null, contactId = null } = options;

    info("========================================", "sync-contacts", "syncContactsMaster");
    info("DÉMARRAGE sync-contacts", "sync-contacts", "syncContactsMaster", { dryRun, since, contactId });
    info("========================================", "sync-contacts", "syncContactsMaster");

    const result = {
        success: true,
        dryRun,
        stats: {
            contactsLoaded: 0,
            updatedInDb: 0,
            failedInDb: 0,
            markedAsSynced: 0
        },
        duration: 0,
        timestamp: startedAt.toISOString(),
        errors: []
    };

    try {
        // Étape 1: Récupération des contacts
        const contacts = await fetchContactsFromParse(since);
        result.stats.contactsLoaded = contacts.length;

        if (contacts.length === 0) {
            info("Aucun contact à synchroniser", "sync-contacts", "syncContactsMaster");
            result.duration = new Date() - startedAt;
            return result;
        }

        // Si contactId spécifique, filtrer
        const filteredContacts = contactId
            ? contacts.filter(c => c.id === contactId || c.get("externe_id") === contactId)
            : contacts;

        if (contactId && filteredContacts.length === 0) {
            warn(`Contact ${contactId} non trouvé`, "sync-contacts", "syncContactsMaster");
            result.stats.contactsLoaded = 0;
            result.duration = new Date() - startedAt;
            return result;
        }

        // Étape 2: Validation des IDs
        const existingIdsSet = await validateContactsInDb(filteredContacts);

        // Étape 3-4: Mise à jour dans sync.db
        const { stats: dbStats, updatesToApply } = await updateInterlocuteursInDb(filteredContacts, existingIdsSet, dryRun);
        result.stats.updatedInDb = dbStats.updated;
        result.stats.failedInDb = dbStats.failed;

        // Étape 5: Marquage comme synchronisé
        const { marked } = await markContactsAsSynced(updatesToApply, dbStats.failedDetails || [], dryRun);
        result.stats.markedAsSynced = marked;

        // Étape 7: Logging
        const durationMs = new Date() - startedAt;
        await logActivity(result.stats, durationMs, dryRun);

        info("========================================", "sync-contacts", "syncContactsMaster");
        info("SYNCHRONISATION TERMINÉE", "sync-contacts", "syncContactsMaster", result.stats);
        info("========================================", "sync-contacts", "syncContactsMaster");

    } catch (err) {
        error(`ERREUR FATALE: ${err.message}`, "sync-contacts", "syncContactsMaster", { error: err.message, stack: err.stack });
        result.success = false;
        result.errors.push({ error: err.message, stack: err.stack?.substring(0, 500) });
    }

    result.duration = new Date() - startedAt;
    return result;
}

module.exports = syncContactsMaster;

// Cloud Function pour déclencher la synchronisation (si Parse Cloud est disponible)
if (typeof Parse !== "undefined" && Parse.Cloud && typeof Parse.Cloud.define === "function") {
    Parse.Cloud.define("syncContacts", async (request) => {
        const { dryRun = false, since = null, contactId = null } = request.params;

        info("Cloud Function syncContacts appelée", "sync-contacts", "syncContacts", {
            user: request.user?.id,
            master: request.master,
            params: { dryRun, since, contactId }
        });

        if (!request.master && !request.user) {
            throw new Error("Non autorisé - cette fonction nécessite un utilisateur authentifié ou le master key");
        }

        const result = await syncContactsMaster({ dryRun, since, contactId });
        return result;
    });
}

// Exécution directe si appelé en CLI
if (require.main === module) {
    const dryRun = process.argv.includes("--dry-run");
    const contactId = process.argv.find(arg => arg.startsWith("--contact-id="))?.split("=")[1];

    syncContactsMaster({ trigger: "cli", dryRun, contactId })
        .then((result) => {
            info("Workflow sync-contacts terminé via CLI", "sync-contacts", "syncContactsMaster", {
                success: result.success,
                stats: result.stats,
                duration: `${result.duration}ms`
            });
            process.exit(result.success ? 0 : 1);
        })
        .catch((err) => {
            error(`Erreur fatale: ${err.message}`, "sync-contacts", "syncContactsMaster", { error: err.message });
            process.exit(1);
        });
}
