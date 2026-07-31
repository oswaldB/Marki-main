// backend/cloud/workflows/import-invoice/01-fetchPiecesAndDossiers.js
// Étape 1 : Récupère les pièces et dossiers depuis la DB SQLite externe
// Retourne : { pieces: [] }

const Database = require("better-sqlite3");

const { info, warn, error } = require("../../utils/logger");

// Initialiser Parse
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

// Requête : Pièces + Dossiers + Missions (agrégées en JSON)
const QUERY_PIECES = `
  SELECT
    p.idpiece,
    p.nfacture,
    p.datecre,
    p.datepiece,
    p.dateecheance,
    p.totalhtnet,
    p.totalttcnet,
    p.resteapayer,
    p.facturesoldee,
    p.commentaire as commentaire_piece,
    p.refpiece,
    pm.idmetier as dossier_id,
    d.idDossier,
    d.idStatut,
    d.contactPlace,
    d.reference,
    d.referenceExterne,
    d.numero,
    d.idEmployeIntervention,
    d.commentaire as commentaire_dossier,
    d.adresse,
    d.cptAdresse,
    d.codePostal,
    d.ville,
    d.numeroLot,
    d.etage,
    d.entree,
    d.escalier,
    d.porte,
    d.numVoie,
    d.cptNumVoie,
    d.typeVoie,
    d.dateDebutMission,
    d.idCadreMission,
    (
      SELECT json_group_array(
        json_object(
          'idMission', m.idMission,
          'idCategorieMission', m.idCategorieMission,
          'idTypeMission', m.idTypeMission,
          'intitule', m.intitule,
          'titreRapport', m.titreRapport,
          'dateDebut', m.dateDebut,
          'dateFin', m.dateFin,
          'conclusion', m.conclusion
        )
      )
      FROM _ADN_DIAG__Mission m
      WHERE m.idDossier = d.idDossier
    ) as missions_json
  FROM _GCO__GcoPiece p
  LEFT JOIN _GCO__GcoPieceMetier pm ON p.idpiece = pm.idpiece
  LEFT JOIN _ADN_DIAG__Dossier d ON pm.idmetier = d.idDossier
  WHERE p.nfacture IS NOT NULL
  AND p.datemaj >= datetime('now', '-24 hours')
  -- AND p.nfacture > 44432
  AND p.resteapayer >= 0
  AND p.valide = 1
  ORDER BY p.datepiece DESC
`;

/**
 * Étape 1 : Récupère les pièces et dossiers
 * @returns {Promise<Object>} { pieces }
 */
async function fetchPiecesAndDossiers() {
    // Charger le chemin de la DB
    const dbPath =
        process.env.NODE_ENV === "test" && process.env.TEST_DB_PATH
            ? process.env.TEST_DB_PATH
            : "/home/arthur/adti/sync.db";

    // Fonction pour ouvrir la DB avec retry
    async function openDatabaseWithRetry(
        path,
        maxRetries = 3,
        retryDelayMs = 60000,
    ) {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                const db = new Database(path);
                db.prepare("SELECT 1").get();
                return db;
            } catch (err) {
                retries++;
                if (
                    err.message.includes("database disk image is malformed") &&
                    retries < maxRetries
                ) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, retryDelayMs),
                    );
                } else {
                    throw err;
                }
            }
        }
        throw new Error(
            `Impossible d'ouvrir la DB après ${maxRetries} tentatives`,
        );
    }

    const db = await openDatabaseWithRetry(dbPath);

    try {
        info(
            "Étape 1: Récupération des pièces + dossiers",
            "import-invoice",
            "fetchPiecesAndDossiers",
        );
        const piecesRows = db.prepare(QUERY_PIECES).all();
        info(
            `${piecesRows.length} pièces récupérées depuis la base externe`,
            "import-invoice",
            "fetchPiecesAndDossiers",
            { count: piecesRows.length },
        );

        return {
            pieces: piecesRows,
        };
    } catch (err) {
        error(
            `Erreur Étape 1: ${err.message}`,
            "import-invoice",
            "fetchPiecesAndDossiers",
            { error: err.message },
        );
        throw err;
    } finally {
        db.close();
    }
}

module.exports = fetchPiecesAndDossiers;
