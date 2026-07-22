CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login TEXT,
      login_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE sequences (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      type_sequence TEXT NOT NULL,
      niveau INTEGER DEFAULT 0,
      actif INTEGER DEFAULT 1,
      validation_obligatoire INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    , scenario TEXT, emails_json TEXT, regles_json TEXT, groupes_regles_json TEXT, attribution_automatique INTEGER DEFAULT 0, lien_paiement TEXT);
CREATE TABLE sequences_emails (
      id TEXT PRIMARY KEY,
      sequence_id TEXT NOT NULL REFERENCES sequences(id),
      email_index INTEGER NOT NULL,
      delai INTEGER,
      cc TEXT,
      frequence TEXT,
      jour_envoi INTEGER,
      heure_envoi TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
CREATE TABLE smtp_profiles (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 587,
      secure INTEGER DEFAULT 0,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      from_email TEXT NOT NULL,
      from_name TEXT NOT NULL,
      actif INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    , signature_html TEXT);
CREATE TABLE relances (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      sequence_id TEXT NOT NULL REFERENCES sequences(id),
      statut TEXT DEFAULT 'brouillon',
      date_envoi TEXT,
      date_programmation TEXT,
      sujet TEXT NOT NULL,
      corps TEXT NOT NULL,
      email_envoye_a TEXT,
      valide INTEGER DEFAULT 0,
      manuelle INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    , smtp_profile_id TEXT REFERENCES smtp_profiles(id), cc TEXT, scenario TEXT, email_index INTEGER, email_sent INTEGER DEFAULT 0, erreur_count INTEGER DEFAULT 0, last_error TEXT);
CREATE TABLE events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      titre TEXT NOT NULL,
      description TEXT,
      entity_type TEXT,
      entity_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    , who_id TEXT REFERENCES contacts(id), by_marki INTEGER DEFAULT 0, metadata TEXT, icon TEXT DEFAULT 'fa-bell');
CREATE TABLE relance_impayes (
                relance_id TEXT REFERENCES relances(id) ON DELETE CASCADE,
                impaye_id TEXT REFERENCES impayes(id) ON DELETE CASCADE,
                PRIMARY KEY (relance_id, impaye_id)
            );
CREATE TABLE sequences_scenarios (
                id TEXT PRIMARY KEY,
                sequence_id TEXT REFERENCES sequences(id) ON DELETE CASCADE,
                email_index INTEGER NOT NULL,
                format TEXT,
                active INTEGER DEFAULT 1,
                smtp TEXT,
                cc TEXT,
                objet TEXT,
                corps TEXT,
                created_at TEXT,
                updated_at TEXT
            );
CREATE TABLE lien_paiements (
                    id TEXT PRIMARY KEY,
                    nom TEXT,
                    url TEXT,
                    created_at TEXT,
                    updated_at TEXT
                );
CREATE TABLE options_dynamiques (
                    id TEXT PRIMARY KEY,
                    type TEXT,
                    valeurs TEXT,
                    created_at TEXT,
                    updated_at TEXT
                );
CREATE TABLE suivis (
                    id TEXT PRIMARY KEY,
                    statut TEXT,
                    format TEXT,
                    email_index INTEGER,
                    valide INTEGER,
                    manuelle INTEGER,
                    corps TEXT,
                    objet TEXT,
                    emailSent INTEGER,
                    created_at TEXT,
                    updated_at TEXT
                , contact_id TEXT REFERENCES contacts(id), sequence_id TEXT REFERENCES sequences(id), smtp_profile_id TEXT REFERENCES smtp_profiles(id), date_envoi TEXT, date_programmation TEXT, sujet TEXT, cc TEXT, scenario TEXT, email_sent INTEGER DEFAULT 0, erreur_count INTEGER DEFAULT 0, last_error TEXT);
CREATE TABLE suivi_impayes (
                suivi_id TEXT REFERENCES suivis(id) ON DELETE CASCADE,
                impaye_id TEXT REFERENCES impayes(id) ON DELETE CASCADE,
                PRIMARY KEY (suivi_id, impaye_id)
            );
CREATE TABLE IF NOT EXISTS "impayes" (
      id TEXT PRIMARY KEY,
      payer_id TEXT REFERENCES contacts(id),
      contact_relance_id TEXT REFERENCES contacts(id),
      proprietaire_id TEXT REFERENCES contacts(id),
      apporteur_id TEXT REFERENCES contacts(id),
      sequence_id TEXT REFERENCES sequences(id),
      nfacture TEXT NOT NULL,
      date_facture TEXT,
      date_echeance TEXT NOT NULL,
      date_piece TEXT,
      montant_ttc REAL DEFAULT 0,
      reste_a_payer REAL DEFAULT 0,
      statut TEXT DEFAULT 'impaye',
      is_blacklisted INTEGER DEFAULT 0,
      blacklist_date TEXT,
      blacklist_motif TEXT,
      facture_soldee INTEGER DEFAULT 0,
      id_dossier TEXT,
      numero_dossier TEXT,
      adresse_bien TEXT,
      code_postal TEXT,
      ville TEXT,
      payeur_nom TEXT,
      payeur_prenom TEXT,
      payeur_email TEXT,
      payeur_telephone TEXT,
      url_pdf TEXT,
      url_pdf_token TEXT,
      email_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      donneur_ordre_id TEXT REFERENCES contacts(id),
      locataire_entrant_id TEXT REFERENCES contacts(id),
      locataire_sortant_id TEXT REFERENCES contacts(id),
      notaire_id TEXT REFERENCES contacts(id),
      syndic_id TEXT REFERENCES contacts(id),
      acquereur_id TEXT REFERENCES contacts(id),
      total_ht REAL DEFAULT 0,
      reference TEXT,
      reference_externe TEXT,
      statut_dossier TEXT,
      etage TEXT,
      entree TEXT,
      escalier TEXT,
      porte TEXT,
      numero_lot TEXT,
      payeur_civilite TEXT,
      payeur_type TEXT,
      proprietaire_nom TEXT,
      proprietaire_prenom TEXT,
      proprietaire_email TEXT,
      proprietaire_telephone TEXT,
      proprietaire_civilite TEXT,
      proprietaire_type_personne TEXT,
      apporteur_prenom TEXT,
      apporteur_civilite TEXT,
      donneur_ordre_nom TEXT,
      donneur_ordre_prenom TEXT,
      donneur_ordre_email TEXT,
      donneur_ordre_telephone TEXT,
      donneur_ordre_civilite TEXT,
      syndic_nom TEXT,
      syndic_prenom TEXT,
      syndic_email TEXT,
      syndic_telephone TEXT,
      syndic_civilite TEXT,
      notaire_nom TEXT,
      notaire_prenom TEXT,
      notaire_email TEXT,
      notaire_telephone TEXT,
      notaire_civilite TEXT,
      locataire_entrant_nom TEXT,
      locataire_entrant_prenom TEXT,
      locataire_entrant_email TEXT,
      locataire_entrant_telephone TEXT,
      locataire_entrant_civilite TEXT,
      locataire_sortant_nom TEXT,
      locataire_sortant_prenom TEXT,
      locataire_sortant_email TEXT,
      locataire_sortant_telephone TEXT,
      locataire_sortant_civilite TEXT,
      acquereur_nom TEXT,
      acquereur_prenom TEXT,
      acquereur_email TEXT,
      acquereur_telephone TEXT,
      acquereur_civilite TEXT,
      employe_intervention TEXT,
      commentaire_dossier TEXT,
      commentaire_piece TEXT,
      cadre_mission TEXT,
      solde_le TEXT,
      payeur_type_personne TEXT,
      apporteur_nom TEXT,
      apporteur_email TEXT,
      apporteur_telephone TEXT,
      notes_json TEXT
, url_pdf_token_expires TEXT);
CREATE TABLE contact_relations (
    id TEXT PRIMARY KEY,
    contact_source_id TEXT NOT NULL,      -- Contact "propriétaire" de la relation
    contact_cible_id TEXT NOT NULL,       -- Contact lié
    type_relation TEXT NOT NULL,          -- Type de relation
    date_debut TEXT,                       -- Date début relation (ISO 8601)
    date_fin TEXT,                         -- Date fin relation (ISO 8601)
    est_actif INTEGER DEFAULT 1,           -- 1 = actif, 0 = inactif
    notes TEXT,                            -- Notes sur la relation
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    FOREIGN KEY (contact_source_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_cible_id) REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Contrainte: pas de relation avec soi-même
    CHECK (contact_source_id != contact_cible_id)
);
CREATE INDEX idx_contact_relations_source ON contact_relations(contact_source_id);
CREATE INDEX idx_contact_relations_cible ON contact_relations(contact_cible_id);
CREATE INDEX idx_contact_relations_type ON contact_relations(type_relation);
CREATE INDEX idx_contact_relations_actif ON contact_relations(est_actif);
CREATE TABLE contact_relation_types (
    code TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT,
    categorie TEXT,                        -- 'professionnel', 'familial', 'autre'
    ordre_affichage INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "contacts" (
    id TEXT PRIMARY KEY,
    nom TEXT,
    prenom TEXT,
    email TEXT,
    telephone TEXT,
    type TEXT,
    type_personne TEXT,
    statut TEXT,
    is_blacklisted INTEGER DEFAULT 0,
    blacklist_date TEXT,
    blacklist_motif TEXT,
    civilite TEXT,
    code TEXT,
    activite_societe TEXT,
    adresse_rue TEXT,
    adresse_ville TEXT,
    adresse_code_postal TEXT,
    adresse_pays TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT,
    externe_id TEXT,
    email_force TEXT
, lastSyncAt TEXT);
