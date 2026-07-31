// backend/cloud/workflows/import-invoice/02-fetchStatuts.js
// Étape 2 : Récupère les statuts des dossiers
// Retourne : { statutsMap: {} }

const Database = require("better-sqlite3");

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

// Requête : Statuts des dossiers
const QUERY_STATUTS = `
  SELECT idStatut, intitule FROM _ADN_DIAG__StatutDossier
`;

/**
 * Étape 2 : Récupère les statuts
 * @returns {Promise<Object>} { statutsMap: {} }
 */
async function fetchStatuts() {
    const dbPath =
        process.env.NODE_ENV === "test" && process.env.TEST_DB_PATH
            ? process.env.TEST_DB_PATH
            : "/home/arthur/adti/sync.db";

    const db = new Database(dbPath);

    try {
        info(
            "Étape 2: Récupération des statuts",
            "import-invoice",
            "fetchStatuts",
        );

        const statutsRows = db.prepare(QUERY_STATUTS).all();
        const statutsMap = {};
        statutsRows.forEach((s) => {
            statutsMap[s.idStatut] = s.intitule;
        });

        info(
            `Statuts chargés: ${Object.keys(statutsMap).length}`,
            "import-invoice",
            "fetchStatuts",
            { count: Object.keys(statutsMap).length },
        );

        return {
            statutsMap,
        };
    } catch (err) {
        error(
            `Erreur Étape 2: ${err.message}`,
            "import-invoice",
            "fetchStatuts",
            { error: err.message },
        );
        throw err;
    } finally {
        db.close();
    }
}

module.exports = fetchStatuts;
