// backend/cloud/workflows/import-invoice/03-fetchEmployes.js
// Étape 3 : Récupère les employés
// Retourne : { employesMap: {} }

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

// Requête : Employés
const QUERY_EMPLOYES = `
  SELECT idEmploye, prenom, nom FROM _ADN_RG_Employe
`;

/**
 * Étape 3 : Récupère les employés
 * @returns {Promise<Object>} { employesMap: {} }
 */
async function fetchEmployes() {
    const dbPath =
        process.env.NODE_ENV === "test" && process.env.TEST_DB_PATH
            ? process.env.TEST_DB_PATH
            : "/home/arthur/adti/sync.db";

    const db = new Database(dbPath);

    try {
        info(
            "Étape 3: Récupération des employés",
            "import-invoice",
            "fetchEmployes",
        );

        const employesRows = db.prepare(QUERY_EMPLOYES).all();
        const employesMap = {};
        employesRows.forEach((e) => {
            employesMap[e.idEmploye] = e;
        });

        info(
            `Employés chargés: ${Object.keys(employesMap).length}`,
            "import-invoice",
            "fetchEmployes",
            { count: Object.keys(employesMap).length },
        );

        return {
            employesMap,
        };
    } catch (err) {
        error(
            `Erreur Étape 3: ${err.message}`,
            "import-invoice",
            "fetchEmployes",
            { error: err.message },
        );
        throw err;
    } finally {
        db.close();
    }
}

module.exports = fetchEmployes;
