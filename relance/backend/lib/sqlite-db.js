/**
 * Module SQLite pour Marki
 * Wrapper better-sqlite3 avec méthodes CRUD pour toutes les entités
 */

const Database = require('better-sqlite3');
const path = require('path');

class SQLiteDB {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, '../data/marki.db');
    this.db = null;
    this.init();
  }

  /**
   * Initialise la connexion à la base de données
   */
  init() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      console.log('✅ Connexion SQLite établie:', this.dbPath);
    } catch (err) {
      console.error('❌ Erreur connexion SQLite:', err.message);
      throw err;
    }
  }

  /**
   * Ferme la connexion à la base de données
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('🔒 Connexion SQLite fermée');
    }
  }

  // ============================================================================
  // MÉTHODES GÉNÉRIQUES CRUD
  // ============================================================================

  /**
   * Crée un enregistrement dans une table
   * @param {string} table - Nom de la table
   * @param {Object} data - Données à insérer
   * @returns {Object} - Enregistrement créé
   */
  create(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values);
      
      return {
        ...data,
        rowid: result.lastInsertRowid,
        changes: result.changes
      };
    } catch (err) {
      console.error(`❌ Erreur create ${table}:`, err.message);
      throw err;
    }
  }

  /**
   * Récupère un enregistrement par son ID
   * @param {string} table - Nom de la table
   * @param {string} id - Identifiant
   * @returns {Object|null} - Enregistrement ou null
   */
  read(table, id) {
    const sql = `SELECT * FROM ${table} WHERE id = ?`;
    
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(id) || null;
    } catch (err) {
      console.error(`❌ Erreur read ${table}:`, err.message);
      throw err;
    }
  }

  /**
   * Met à jour un enregistrement
   * @param {string} table - Nom de la table
   * @param {string} id - Identifiant
   * @param {Object} updates - Champs à mettre à jour
   * @returns {Object} - Résultat de la mise à jour
   */
  update(table, id, updates) {
    const columns = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const sql = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values, id);
      
      return {
        changes: result.changes,
        id
      };
    } catch (err) {
      console.error(`❌ Erreur update ${table}:`, err.message);
      throw err;
    }
  }

  /**
   * Supprime un enregistrement
   * @param {string} table - Nom de la table
   * @param {string} id - Identifiant
   * @returns {Object} - Résultat de la suppression
   */
  delete(table, id) {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(id);
      
      return {
        deleted: result.changes > 0,
        changes: result.changes,
        id
      };
    } catch (err) {
      console.error(`❌ Erreur delete ${table}:`, err.message);
      throw err;
    }
  }

  /**
   * Recherche avec filtres et pagination
   * @param {string} table - Nom de la table
   * @param {Object} options - Options de recherche
   * @returns {Object} - Résultats et métadonnées
   */
  search(table, options = {}) {
    const {
      where = {},
      orderBy = null,
      order = 'ASC',
      limit = null,
      offset = 0
    } = options;

    let sql = `SELECT * FROM ${table}`;
    const values = [];

    // Clause WHERE
    if (Object.keys(where).length > 0) {
      const conditions = [];
      for (const [key, value] of Object.entries(where)) {
        if (value === null) {
          conditions.push(`${key} IS NULL`);
        } else if (Array.isArray(value)) {
          conditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
          values.push(...value);
        } else {
          conditions.push(`${key} = ?`);
          values.push(value);
        }
      }
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Clause ORDER BY
    if (orderBy) {
      sql += ` ORDER BY ${orderBy} ${order}`;
    }

    // Clause LIMIT/OFFSET
    if (limit) {
      sql += ` LIMIT ? OFFSET ?`;
      values.push(limit, offset);
    }

    try {
      const stmt = this.db.prepare(sql);
      const data = stmt.all(...values);
      
      // Compter le total
      let countSql = `SELECT COUNT(*) as total FROM ${table}`;
      if (Object.keys(where).length > 0) {
        const conditions = [];
        const countValues = [];
        for (const [key, value] of Object.entries(where)) {
          if (value === null) {
            conditions.push(`${key} IS NULL`);
          } else if (Array.isArray(value)) {
            conditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
            countValues.push(...value);
          } else {
            conditions.push(`${key} = ?`);
            countValues.push(value);
          }
        }
        countSql += ` WHERE ${conditions.join(' AND ')}`;
        const countStmt = this.db.prepare(countSql);
        const { total } = countStmt.get(...countValues);
        return { data, total, limit, offset };
      }
      
      const countStmt = this.db.prepare(countSql);
      const { total } = countStmt.get();
      
      return { data, total, limit, offset };
    } catch (err) {
      console.error(`❌ Erreur search ${table}:`, err.message);
      throw err;
    }
  }

  /**
   * Exécute une requête SQL personnalisée (SELECT)
   * @param {string} sql - Requête SQL
   * @param {Array} params - Paramètres
   * @returns {Array} - Résultats
   */
  query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params);
    } catch (err) {
      console.error('❌ Erreur query:', err.message);
      throw err;
    }
  }

  /**
   * Exécute une requête SQL personnalisée (single result)
   * @param {string} sql - Requête SQL
   * @param {Array} params - Paramètres
   * @returns {Object|null} - Résultat unique
   */
  queryOne(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(...params) || null;
    } catch (err) {
      console.error('❌ Erreur queryOne:', err.message);
      throw err;
    }
  }

  /**
   * Exécute une commande SQL (INSERT, UPDATE, DELETE)
   * @param {string} sql - Requête SQL
   * @param {Array} params - Paramètres
   * @returns {Object} - Résultat de l'exécution
   */
  run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    } catch (err) {
      console.error('❌ Erreur run:', err.message);
      throw err;
    }
  }

  // ============================================================================
  // MÉTHODES SPÉCIFIQUES - USERS
  // ============================================================================

  getUserByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const stmt = this.db.prepare(sql);
    return stmt.get(username) || null;
  }

  getUserByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const stmt = this.db.prepare(sql);
    return stmt.get(email) || null;
  }

  getActiveUsers() {
    const sql = 'SELECT * FROM users WHERE is_active = 1 ORDER BY username';
    const stmt = this.db.prepare(sql);
    return stmt.all();
  }

  // ============================================================================
  // MÉTHODES SPÉCIFIQUES - SESSIONS
  // ============================================================================

  getSessionByToken(token) {
    const sql = 'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")';
    const stmt = this.db.prepare(sql);
    return stmt.get(token) || null;
  }

  getSessionsByUser(userId) {
    const sql = 'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC';
    const stmt = this.db.prepare(sql);
    return stmt.all(userId);
  }

  deleteExpiredSessions() {
    const sql = 'DELETE FROM sessions WHERE expires_at < datetime("now")';
    const stmt = this.db.prepare(sql);
    return stmt.run();
  }

  // ============================================================================
  // MÉTHODES SPÉCIFIQUES - CONTACTS
  // ============================================================================

  getContactsWithImpayes(options = {}) {
    const { statut = null, isBlacklisted = null, limit = 50, offset = 0 } = options;
    
    let sql = `
      SELECT c.*, 
             COUNT(i.id) as nb_impayes, 
             COALESCE(SUM(i.reste_a_payer), 0) as total_du
      FROM contacts c
      LEFT JOIN impayes i ON c.id = i.contact_relance_id 
        AND i.facture_soldee = 0 
        AND i.statut = 'impaye'
    `;
    
    const conditions = [];
    const values = [];
    
    if (statut) {
      conditions.push('c.statut = ?');
      values.push(statut);
    }
    
    if (isBlacklisted !== null) {
      conditions.push('c.is_blacklisted = ?');
      values.push(isBlacklisted ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' GROUP BY c.id HAVING nb_impayes > 0 ORDER BY total_du DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...values);
  }

  getContactFull(id) {
    const sql = `
      SELECT c.*,
             COUNT(i.id) as nb_impayes,
             COALESCE(SUM(CASE WHEN i.facture_soldee = 0 THEN i.reste_a_payer ELSE 0 END), 0) as total_du
      FROM contacts c
      LEFT JOIN impayes i ON c.id = i.contact_relance_id
      WHERE c.id = ?
      GROUP BY c.id
    `;
    const stmt = this.db.prepare(sql);
    return stmt.get(id) || null;
  }

  // ============================================================================
  // MÉTHODES SPÉCIFIQUES - IMPAYES
  // ============================================================================

  getImpayesWithContacts(options = {}) {
    const { 
      statut = 'impaye', 
      factureSoldee = 0, 
      isBlacklisted = 0,
      isSuspended = 0,
      limit = 50, 
      offset = 0,
      orderBy = 'date_echeance',
      order = 'ASC'
    } = options;
    
    const sql = `
      SELECT i.*, 
             c.nom as contact_nom, 
             c.prenom as contact_prenom, 
             c.email as contact_email,
             c.telephone as contact_telephone
      FROM impayes i
      LEFT JOIN contacts c ON i.contact_relance_id = c.id
      WHERE i.statut = ? 
        AND i.facture_soldee = ?
        AND i.is_blacklisted = ?
      ORDER BY i.${orderBy} ${order}
      LIMIT ? OFFSET ?
    `;
    
    const stmt = this.db.prepare(sql);
    return stmt.all(statut, factureSoldee ? 1 : 0, isBlacklisted ? 1 : 0, limit, offset);
  }

  getImpayesByContact(contactId, options = {}) {
    const { factureSoldee = null } = options;
    
    let sql = 'SELECT * FROM impayes WHERE contact_relance_id = ?';
    const values = [contactId];
    
    if (factureSoldee !== null) {
      sql += ' AND facture_soldee = ?';
      values.push(factureSoldee ? 1 : 0);
    }
    
    sql += ' ORDER BY date_echeance ASC';
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...values);
  }

  getImpayesForRelance(options = {}) {
    const { dateEcheanceBefore = null, sequenceId = null } = options;
    
    let sql = `
      SELECT i.*, c.nom, c.prenom, c.email, c.type_personne
      FROM impayes i
      JOIN contacts c ON i.contact_relance_id = c.id
      WHERE i.facture_soldee = 0 
        AND i.statut = 'impaye'
        AND c.is_blacklisted = 0
        AND i.sequence_id IS NULL
    `;
    const values = [];
    
    if (dateEcheanceBefore) {
      sql += ' AND i.date_echeance <= ?';
      values.push(dateEcheanceBefore);
    }
    
    if (sequenceId) {
      sql += ' AND (i.sequence_id IS NULL OR i.sequence_id = ?)';
      values.push(sequenceId);
    }
    
    sql += ' ORDER BY i.date_echeance ASC';
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...values);
  }

  // ============================================================================
  // MÉTHODES SPÉCIFIQUES - RELANCES
  // ============================================================================

  getRelancesWithDetails(options = {}) {
    const { statut = null, valide = null, limit = 50, offset = 0 } = options;
    
    let sql = `
      SELECT r.*, 
             c.nom as contact_nom, 
             c.prenom as contact_prenom, 
             c.email as contact_email,
             s.nom as sequence_nom,
             s.type_sequence
      FROM relances r
      JOIN contacts c ON r.contact_id = c.id
      JOIN sequences s ON r.sequence_id = s.id
    `;
    
    const conditions = [];
    const values = [];
    
    if (statut) {
      conditions.push('r.statut = ?');
      values.push(statut);
    }
    
    if (valide !== null) {
      conditions.push('r.valide = ?');
      values.push(valide ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...values);
  }

  getRelancesAValider() {
    const sql = `
      SELECT r.*, c.nom, c.prenom, c.email, s.nom as sequence_nom
      FROM relances r
      JOIN contacts c ON r.contact_id = c.id
      JOIN sequences s ON r.sequence_id = s.id
      WHERE r.statut = 'brouillon' AND r.valide = 0
      ORDER BY r.created_at DESC
    `;
    const stmt = this.db.prepare(sql);
    return stmt.all();
  }

  getRelancesAEnvoyer() {
    const sql = `
      SELECT r.*, c.nom, c.prenom, c.email, s.nom as sequence_nom
      FROM relances r
      JOIN contacts c ON r.contact_id = c.id
      JOIN sequences s ON r.sequence_id = s.id
      WHERE r.statut IN ('pret pour envoi', 'planifiee')
        AND (r.date_programmation IS NULL OR r.date_programmation <= datetime('now'))
      ORDER BY r.date_programmation ASC
    `;
    const stmt = this.db.prepare(sql);
    return stmt.all();
  }

  getRelancesByContact(contactId) {
    const sql = `
      SELECT r.*, s.nom as sequence_nom
      FROM relances r
      JOIN sequences s ON r.sequence_id = s.id
      WHERE r.contact_id = ?
      ORDER BY r.created_at DESC
    `;
    const stmt = this.db.prepare(sql);
    return stmt.all(contactId);
  }

  // ============================================================================
  // MÉTHODES SPÉCIFIQUES - SEQUENCES
  // ============================================================================

  getSequencesActives(typeSequence = null) {
    let sql = 'SELECT * FROM sequences WHERE actif = 1';
    const values = [];
    
    if (typeSequence) {
      sql += ' AND type_sequence = ?';
      values.push(typeSequence);
    }
    
    sql += ' ORDER BY niveau ASC, nom ASC';
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...values);
  }

  getSequenceWithEmails(id) {
    const sequenceSql = 'SELECT * FROM sequences WHERE id = ?';
    const sequenceStmt = this.db.prepare(sequenceSql);
    const sequence = sequenceStmt.get(id);
    
    if (!sequence) return null;
    
    const emailsSql = 'SELECT * FROM sequences_emails WHERE sequence_id = ? ORDER BY email_index ASC';
    const emailsStmt = this.db.prepare(emailsSql);
    const emails = emailsStmt.all(id);
    
    return { ...sequence, emails };
  }

  // ============================================================================
  // MÉTHODES SPÉCIFIQUES - SMTP PROFILES
  // ============================================================================

  getSmtpProfilesActifs() {
    const sql = 'SELECT * FROM smtp_profiles WHERE actif = 1 ORDER BY nom';
    const stmt = this.db.prepare(sql);
    return stmt.all();
  }

  getSmtpProfileDefault() {
    const sql = 'SELECT * FROM smtp_profiles WHERE is_default = 1 AND actif = 1 LIMIT 1';
    const stmt = this.db.prepare(sql);
    return stmt.get() || null;
  }

  // ============================================================================
  // MÉTHODES SPÉCIFIQUES - EVENTS
  // ============================================================================

  getEventsNonLus(limit = 50) {
    const sql = `
      SELECT * FROM events 
      WHERE read = 0 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    const stmt = this.db.prepare(sql);
    return stmt.all(limit);
  }

  getEventsByEntity(entityType, entityId, limit = 20) {
    const sql = `
      SELECT * FROM events 
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    const stmt = this.db.prepare(sql);
    return stmt.all(entityType, entityId, limit);
  }

  marquerEventsLus(ids) {
    const sql = `UPDATE events SET read = 1 WHERE id IN (${ids.map(() => '?').join(',')})`;
    const stmt = this.db.prepare(sql);
    return stmt.run(...ids);
  }

  // ============================================================================
  // MÉTHODES SPÉCIFIQUES - TABLEAU DE BORD
  // ============================================================================

  getDashboardStats() {
    const statsSql = `
      SELECT 
        (SELECT COUNT(*) FROM impayes WHERE facture_soldee = 0 AND statut = 'impaye') as total_impayes,
        (SELECT COALESCE(SUM(reste_a_payer), 0) FROM impayes WHERE facture_soldee = 0 AND statut = 'impaye') as montant_total_du,
        (SELECT COUNT(*) FROM relances WHERE statut = 'brouillon' AND valide = 0) as relances_a_valider,
        (SELECT COUNT(*) FROM relances WHERE statut IN ('pret pour envoi', 'planifiee')) as relances_a_envoyer,
        (SELECT COUNT(*) FROM contacts WHERE is_blacklisted = 1) as contacts_blacklistes,
        (SELECT COUNT(*) FROM events WHERE read = 0) as events_non_lus
    `;
    const statsStmt = this.db.prepare(statsSql);
    const stats = statsStmt.get();
    
    // Top 5 impayés
    const topImpayesSql = `
      SELECT i.*, c.nom, c.prenom
      FROM impayes i
      JOIN contacts c ON i.contact_relance_id = c.id
      WHERE i.facture_soldee = 0 AND i.statut = 'impaye'
      ORDER BY i.reste_a_payer DESC
      LIMIT 5
    `;
    const topImpayesStmt = this.db.prepare(topImpayesSql);
    const topImpayes = topImpayesStmt.all();
    
    // Relances récentes
    const recentRelancesSql = `
      SELECT r.*, c.nom, c.prenom
      FROM relances r
      JOIN contacts c ON r.contact_id = c.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `;
    const recentRelancesStmt = this.db.prepare(recentRelancesSql);
    const recentRelances = recentRelancesStmt.all();
    
    return {
      stats,
      topImpayes,
      recentRelances
    };
  }

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================

  beginTransaction() {
    return this.db.transaction;
  }

  transaction(fn) {
    const transaction = this.db.transaction(fn);
    return transaction();
  }
}

module.exports = SQLiteDB;
