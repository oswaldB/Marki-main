#!/usr/bin/env node

/**
 * Script de nettoyage des relances avec contact.email nul
 * Supprime toutes les relances dont le champ contact.email est null
 * (où contact est un pointer vers un autre objet)
 *
 * Usage: node backend/scripts/cleanup-relances-null-email.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

// Configuration Parse
const PARSE_APP_ID = process.env.PARSE_APP_ID || "adti-marki";
const PARSE_MASTER_KEY = process.env.PARSE_MASTER_KEY || "e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9";
const PARSE_SERVER_URL = process.env.PARSE_SERVER_URL || "https://dev.markidiags.com/api/parse";

// Headers pour les requêtes Parse
function getHeaders() {
  return {
    "X-Parse-Application-Id": PARSE_APP_ID,
    "X-Parse-Master-Key": PARSE_MASTER_KEY,
    "Content-Type": "application/json"
  };
}

async function getRelancesWithNullContactEmail() {
  console.log("Recherche des relances avec contact.email nul...");

  // Requête pour trouver les relances où contact existe mais contact.email est null
  const query = {
    "contact": { "$ne": null },
    "contact.email": null
  };

  try {
    const response = await fetch(
      `${PARSE_SERVER_URL}/classes/Relance?where=${encodeURIComponent(JSON.stringify(query))}&limit=1000`,
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

    console.log(`Relances trouvées: ${relances.length}`);

    if (relances.length === 0) {
      console.log("Aucune relance à supprimer.");
      return [];
    }

    // Afficher les relances trouvées
    console.log("\nListe des relances à supprimer:");
    relances.forEach((relance, index) => {
      const numero = relance.numero || relance.objectId;
      const contactId = relance.contact ? relance.contact.objectId : 'N/A';
      console.log(`   ${index + 1}. Relance #${numero} - contact: ${contactId}`);
    });

    return relances;
  } catch (error) {
    console.error("Erreur lors de la récupération:", error.message);
    throw error;
  }
}

async function deleteRelance(objectId) {
  try {
    const response = await fetch(
      `${PARSE_SERVER_URL}/classes/Relance/${objectId}`,
      {
        method: "DELETE",
        headers: getHeaders()
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erreur suppression: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    return true;
  } catch (error) {
    console.error(`   Erreur suppression de ${objectId}: ${error.message}`);
    return false;
  }
}

async function cleanupRelances() {
  try {
    const relances = await getRelancesWithNullContactEmail();

    if (relances.length === 0) {
      return { deletedCount: 0, cancelled: false };
    }

    // Demander confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      readline.question(
        `\nVous êtes sur le point de supprimer ${relances.length} relance(s). Confirmez-vous ? (oui/non): `,
        (answer) => {
          readline.close();
          resolve(answer.trim().toLowerCase());
        }
      );
    });

    if (answer !== 'oui' && answer !== 'yes' && answer !== 'o' && answer !== 'y') {
      console.log("Opération annulée.");
      return { deletedCount: 0, cancelled: true };
    }

    // Suppression par lots pour éviter les timeouts
    const BATCH_SIZE = 20;
    let deletedCount = 0;
    const deletedIds = [];

    console.log("\nSuppression en cours...");

    for (let i = 0; i < relances.length; i += BATCH_SIZE) {
      const batch = relances.slice(i, i + BATCH_SIZE);

      // Supprimer par lot
      const deletePromises = batch.map(async (relance) => {
        const objectId = relance.objectId;
        const success = await deleteRelance(objectId);
        if (success) {
          deletedIds.push(objectId);
        }
        return success;
      });

      const results = await Promise.all(deletePromises);
      const batchDeleted = results.filter(r => r).length;
      deletedCount += batchDeleted;

      console.log(`   Lot ${i/BATCH_SIZE + 1}: ${batchDeleted}/${batch.length} supprimé(s)`);
    }

    console.log(`\nNettoyage terminé: ${deletedCount}/${relances.length} relance(s) supprimée(s)`);

    return {
      deletedCount,
      totalFound: relances.length,
      relanceIds: deletedIds
    };

  } catch (error) {
    console.error("Erreur lors du nettoyage:", error.message);
    throw error;
  }
}

// Exécuter le script
cleanupRelances()
  .then((result) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script terminé avec erreur:", error.message);
    process.exit(1);
  });
