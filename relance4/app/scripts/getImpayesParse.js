require("dotenv").config();
const Parse = require("parse/node");

// Configuration Parse Server depuis .env
Parse.initialize(
    process.env.PARSE_APP_ID,
    process.env.PARSE_JAVASCRIPT_KEY,
    process.env.PARSE_MASTER_KEY,
);
Parse.serverURL = process.env.PARSE_SERVER_URL;

// Liste des ref_piece à filtrer
const refPieces = [
    "FA260317 50628",
    "FA260318 50641",
    "FA260401 50723",
    "FA260423 50828",
    "FA260424 50838",
    "FA260511 50908",
    "FA260513 50926",
    "FA260520 50981",
    "FA260522 50991",
    "FA260528 51023",
    "FA260601 51059",
    "FA260602 51066",
    "FA260605 51089",
    "FA260609 51102",
    "FA260610 51104",
    "FA260615 51128",
    "FA260616 51132",
    "FA260616 51138",
    "FA260617 51144",
    "FA260618 51152",
    "FA260618 51155",
];

// Nom de la classe Parse (à adapter si nécessaire)
const ImpayeClass = Parse.Object.extend("Impaye"); // Remplacez "Impaye" par le nom réel de votre classe

async function getImpayes() {
    try {
        // Créer la requête
        const query = new Parse.Query(ImpayeClass);
        query.containedIn("ref_piece", refPieces);
        query.select(["ref_piece", "reste_a_payer", "facture_soldee"]);

        const results = await query.find();

        // Afficher les résultats
        results.forEach((impaye) => {
            const refPiece = impaye.get("ref_piece") || "";
            const restAPayer = impaye.get("reste_a_payer") || "";
            const factureSolde = impaye.get("facture_soldee") || "";
            console.log(`${refPiece}\t${restAPayer}\t${factureSolde}`);
        });
    } catch (error) {
        console.error("Erreur lors de la requête Parse:", error);
    }
}

// Exécuter
getImpayes();
