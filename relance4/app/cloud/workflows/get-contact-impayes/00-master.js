// backend/cloud/workflows/get-contact-impayes/00-master.js
// Orchestrateur du workflow de récupération des impayés par contact

// Charger les variables d'environnement depuis .env
require("dotenv").config({ path: "/home/ubuntu/prod/adti/.env" });

const { info, warn, error } = require("../../utils/logger");
const crypto = require("crypto");

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

const CONTACT_SIGNING_SECRET =
    process.env.CONTACT_SIGNING_SECRET ||
    process.env.PDF_SIGNING_SECRET ||
    "marki16-default-contact-secret-change-me";

/**
 * Récupère les impayés d'un contact avec vérification de signature
 * @param {Object} options - Options de configuration
 * @param {string} options.contactId - ID du contact
 * @param {string} options.sig - Signature
 * @param {string} options.expires - Timestamp d'expiration
 * @returns {Promise<Object>} Liste des impayés
 */
async function getContactImpayesMaster(options = {}) {
    const { contactId, sig, expires } = options;

    info(
        `[get-contact-impayes/master] Récupération des impayés pour contact: ${contactId}`,
        "get-contact-impayes",
        "getContactImpayesMaster",
        { contactId }
    );

    if (!contactId) {
        throw new Error("contactId est requis");
    }

    if (!sig || !expires) {
        throw new Error("Signature ou expiration manquante");
    }

    // Vérifier l'expiration
    const now = Math.floor(Date.now() / 1000);
    if (parseInt(expires) < now) {
        throw new Error("Lien expiré");
    }

    // Vérifier la signature
    const dataToSign = `${contactId}:${expires}:${CONTACT_SIGNING_SECRET}`;
    const expectedSig = crypto
        .createHmac("sha256", CONTACT_SIGNING_SECRET)
        .update(dataToSign)
        .digest("hex");

    if (sig !== expectedSig) {
        throw new Error("Lien invalide");
    }

    // Récupérer les impayés du contact (uniquement en tant que payeur)
    try {
        const Impaye = Parse.Object.extend("Impaye");
        
        // Query uniquement pour payeur avec reste à payer > 0
        const query = new Parse.Query(Impaye);
        query.equalTo("payeur", { __type: "Pointer", className: "Contact", objectId: contactId });
        query.notEqualTo("facture_soldee", true);
        query.greaterThan("reste_a_payer", 0);
        query.descending("createdAt");
        query.limit(1000);
        
        const impayes = await query.find({ useMasterKey: true });
        
        const result = impayes.map(impaye => ({
            id: impaye.id,
            nfacture: impaye.get("nfacture"),
            ref_piece: impaye.get("ref_piece"),
            reference_facture: impaye.get("reference_facture"),
            date_piece: impaye.get("date_piece"),
            date_facture: impaye.get("date_facture"),
            montant_total: impaye.get("total_ttc"),
            montant_total_facture: impaye.get("montant_total_facture"),
            reste_a_payer: impaye.get("reste_a_payer"),
            facture_soldee: impaye.get("facture_soldee"),
            date_echeance: impaye.get("date_echeance"),
            date_derniere_relance: impaye.get("date_derniere_relance"),
            nombre_relances: impaye.get("nombre_relances"),
            sequence_id: impaye.get("sequence_id"),
            source: impaye.get("source"),
            pdf_local_path: impaye.get("pdf_local_path"),
            numero_dossier: impaye.get("numero_dossier"),
            adresse_bien: impaye.get("adresse_bien"),
            code_postal: impaye.get("code_postal"),
            ville: impaye.get("ville"),
            commentaire_piece: impaye.get("commentaire_piece"),
            createdAt: impaye.createdAt,
            updatedAt: impaye.updatedAt,
        }));

        info(
            `[get-contact-impayes/master] ${result.length} impayés trouvés`,
            "get-contact-impayes",
            "getContactImpayesMaster",
            { count: result.length }
        );

        return { impayes: result };
    } catch (err) {
        error(
            `[get-contact-impayes/master] Erreur: ${err.message}`,
            "get-contact-impayes",
            "getContactImpayesMaster",
            { error: err.message }
        );
        throw new Error("Impossible de récupérer les impayés");
    }
}

module.exports = getContactImpayesMaster;

// Cloud Function pour récupérer les impayés d'un contact (publique avec vérification de signature)
Parse.Cloud.define("getContactImpayes", async (request) => {
    info(
        "Cloud Function getContactImpayes appelée",
        "get-contact-impayes",
        "getContactImpayes",
        { contactId: request.params.contactId },
    );

    // Cette fonction est publique mais protégée par signature
    const { contactId, sig, expires } = request.params;

    return await getContactImpayesMaster({ contactId, sig, expires });
});

// Exécution directe si appelé en CLI
// Usage: node 00-master.js <contactId> <sig> <expires>
if (require.main === module) {
    const contactId = process.argv[2];
    const sig = process.argv[3];
    const expires = process.argv[4];
    
    if (!contactId || !sig || !expires) {
        console.error("Usage: node 00-master.js <contactId> <sig> <expires>");
        process.exit(1);
    }
    
    getContactImpayesMaster({ contactId, sig, expires })
        .then((result) => {
            info(
                "Workflow get-contact-impayes terminé via CLI",
                "get-contact-impayes",
                "getContactImpayesMaster",
                { count: result.impayes.length }
            );
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch((error) => {
            error(
                `Erreur dans get-contact-impayes/master: ${error.message}`,
                "get-contact-impayes",
                "getContactImpayesMaster",
                { error: error.message, stack: error.stack?.substring(0, 500) },
            );
            console.error("Erreur:", error.message);
            process.exit(1);
        });
}
