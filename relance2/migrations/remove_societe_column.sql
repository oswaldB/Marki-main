-- Migration: Suppression de la colonne societe de la table contacts
-- Date: 2026-07-19
-- Rationale: Les entreprises sont maintenant gérées via contact_relations

-- SQLite ne supporte pas DROP COLUMN directement, il faut recréer la table
-- ETAPE 1: Créer une table temporaire sans la colonne societe
CREATE TABLE contacts_new (
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
);

-- ETAPE 2: Copier les données (sans societe)
INSERT INTO contacts_new (
    id, nom, prenom, email, telephone, type, type_personne, statut,
    is_blacklisted, blacklist_date, blacklist_motif, civilite, code,
    activite_societe, adresse_rue, adresse_ville, adresse_code_postal,
    adresse_pays, notes, created_at, updated_at, externe_id, email_force
)
SELECT 
    id, nom, prenom, email, telephone, type, type_personne, statut,
    is_blacklisted, blacklist_date, blacklist_motif, civilite, code,
    activite_societe, adresse_rue, adresse_ville, adresse_code_postal,
    adresse_pays, notes, created_at, updated_at, externe_id, email_force
FROM contacts;

-- ETAPE 3: Supprimer l'ancienne table
DROP TABLE contacts;

-- ETAPE 4: Renommer la nouvelle table
ALTER TABLE contacts_new RENAME TO contacts;

-- ETAPE 5: Recréer les index si nécessaire
-- (Les index sur les colonnes restantes sont préservés via la nouvelle table)
