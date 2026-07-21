/**
 * Configuration CouchDB locale
 * 
 * Modifiez ce fichier avec vos paramètres CouchDB natif
 */

module.exports = {
  // URL CouchDB Marki
  // Format: https://username:password@host/chemin
  url: process.env.COUCHDB_URL || 'https://admin:admin@dev.markidiags.com/data',
  
  // Nom de la base de données
  dbName: process.env.COUCHDB_DB || 'marki',
  
  // Options de connexion
  requestDefaults: {
    timeout: 30000,
    // Pour self-signed certs en dev:
    // strictSSL: false
  }
};

// Exemple avec auth:
// url: 'http://admin:secret@localhost:5984'

// Exemple avec HTTPS:
// url: 'https://admin:secret@couchdb.example.com:6984'
