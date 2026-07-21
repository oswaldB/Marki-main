-- Migration: Ajout email_force et table contact_relations
-- Date: 2024-07-19

-- 1. Ajouter email_force à contacts
ALTER TABLE contacts ADD COLUMN email_force TEXT;

-- 2. Créer la table des relations entre contacts
CREATE TABLE IF NOT EXISTS contact_relations (
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

-- Index pour performances
CREATE INDEX idx_contact_relations_source ON contact_relations(contact_source_id);
CREATE INDEX idx_contact_relations_cible ON contact_relations(contact_cible_id);
CREATE INDEX idx_contact_relations_type ON contact_relations(type_relation);
CREATE INDEX idx_contact_relations_actif ON contact_relations(est_actif);

-- 3. Table des types de relations (référentiel)
CREATE TABLE IF NOT EXISTS contact_relation_types (
    code TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT,
    categorie TEXT,                        -- 'professionnel', 'familial', 'autre'
    ordre_affichage INTEGER DEFAULT 0
);

-- Insertion des types de relations courants
INSERT OR IGNORE INTO contact_relation_types (code, nom, description, categorie, ordre_affichage) VALUES
-- Professionnels
('employe', 'Employé', 'Personne employée par la société', 'professionnel', 1),
('dg', 'Directeur Général', 'DG de la société', 'professionnel', 2),
('directeur_financier', 'Directeur Financier', 'Responsable financier', 'professionnel', 3),
('responsable_comptable', 'Responsable Comptable', 'Responsable comptable', 'professionnel', 4),
('responsable_paie', 'Responsable Paie', 'Responsable paie', 'professionnel', 5),
('tresorier', 'Trésorier', 'Trésorier', 'professionnel', 6),
('administrateur', 'Administrateur', 'Administrateur', 'professionnel', 7),
('gerant', 'Gérant', 'Gérant', 'professionnel', 8),
('president', 'Président', 'Président', 'professionnel', 9),
('associe', 'Associé', 'Associé', 'professionnel', 10),
('representant_legal', 'Représentant Légal', 'Représentant légal', 'professionnel', 11),
('contact_facturation', 'Contact Facturation', 'Contact pour facturation', 'professionnel', 12),

-- Familiaux
('epoux', 'Époux/Épouse', 'Conjoint', 'familial', 20),
('frere', 'Frère/Sœur', 'Frère ou sœur', 'familial', 21),
('parent', 'Parent', 'Père ou mère', 'familial', 22),
('enfant', 'Enfant', 'Enfant', 'familial', 23),
('representant_legal_pp', 'Représentant Légal', 'Tuteur/Curateur', 'familial', 24),

-- Autres
('mandataire', 'Mandataire', 'Mandataire', 'autre', 30),
('contact', 'Contact', 'Contact générique', 'autre', 31);
