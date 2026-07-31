// backend/cloud/workflows/import-invoice/04-fetchInterlocuteurs.js
// Étape 4 : Récupère les interlocuteurs par dossier
// Retourne : { interlocuteursByDossier: {} }

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

/**
 * Étape 4 : Récupère les interlocuteurs pour tous les dossiers
 * @param {Object} param0 - { pieces: [] }
 * @returns {Promise<Object>} { interlocuteursByDossier: {} }
 */
async function fetchInterlocuteurs({ pieces }) {
    const dbPath =
        process.env.NODE_ENV === "test" && process.env.TEST_DB_PATH
            ? process.env.TEST_DB_PATH
            : "/home/arthur/adti/sync.db";

    const db = new Database(dbPath);

    try {
        info(
            "Étape 4: Récupération des interlocuteurs par dossier",
            "import-invoice",
            "fetchInterlocuteurs",
        );

        // Extraire les dossierIds uniques des pièces
        const dossierIds = [
            ...new Set(
                pieces
                    .map((r) => r.dossier_id || r.idDossier)
                    .filter((id) => id != null),
            ),
        ];

        const interlocuteursByDossier = {};

        if (dossierIds.length > 0) {
            const interlocuteursRows = db
                .prepare(
                    `
        SELECT
          d.idDossier,
          di.idRole,
          di.idInterlocuteur as interlocuteur_id,
          di.idContact as contact_id,
          iloc.idInterlocuteur,
          iloc.typePersonne,
          iloc.nom,
          iloc.prenom,
          iloc.email,
          iloc.telephoneMobile as telephone,
          ilocContact.idInterlocuteur as contact_interlocuteur_id,
          ilocContact.typePersonne as contact_typePersonne,
          ilocContact.nom as contact_nom,
          ilocContact.prenom as contact_prenom,
          ilocContact.email as contact_email,
          role.intitule as role
        FROM _ADN_DIAG__Dossier d
        LEFT JOIN _ADN_DIAG__DossierInterlocuteur di ON d.idDossier = di.idDossier
        LEFT JOIN _ADN_RG_Interlocuteur iloc ON di.idInterlocuteur = iloc.idInterlocuteur
        LEFT JOIN _ADN_RG_Interlocuteur ilocContact ON di.idContact = ilocContact.idInterlocuteur
        LEFT JOIN _ADN_DIAG__RoleInterlocuteurDossier role ON di.idRole = role.idRole
        WHERE d.idDossier IN (${dossierIds.join(",")})
      `,
                )
                .all();

            interlocuteursRows.forEach((i) => {
                if (!interlocuteursByDossier[i.idDossier]) {
                    interlocuteursByDossier[i.idDossier] = [];
                }
                interlocuteursByDossier[i.idDossier].push(i);
            });
        }

        info(
            `Interlocuteurs chargés: ${Object.keys(interlocuteursByDossier).length} dossiers`,
            "import-invoice",
            "fetchInterlocuteurs",
            { dossiersCount: Object.keys(interlocuteursByDossier).length },
        );

        return {
            interlocuteursByDossier,
        };
    } catch (err) {
        error(
            `Erreur Étape 4: ${err.message}`,
            "import-invoice",
            "fetchInterlocuteurs",
            { error: err.message },
        );
        throw err;
    } finally {
        db.close();
    }
}

module.exports = fetchInterlocuteurs;
