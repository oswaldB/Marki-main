# Data Models - Schéma SQLite

> Base de données: `backend/data/marki.db`
> Type: SQLite3
> Dernière mise à jour: 2026-07-14

---

## Vue d'ensemble

Marki utilise **SQLite** comme base de données principale. Le fichier `marki.db` se trouve dans `backend/data/`.

### Tables principales

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs du système (admin, user) |
| `sessions` | Sessions JWT actives |
| `contacts` | Contacts (propriétaires, apporteurs, payeurs) |
| `impayes` | Factures impayées importées |
| `relances` | Emails de relance générés |
| `sequences` | Séquences de relance configurables |
| `sequences_emails` | Emails dans chaque séquence |
| `smtp_profiles` | Profils de configuration SMTP |
| `events` | Événements et notifications système |

---

## Table: `users`

Utilisateurs authentifiés du système.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `user_`) |
| `username` | TEXT | NOT NULL, UNIQUE | Nom d'utilisateur |
| `email` | TEXT | NOT NULL | Email de l'utilisateur |
| `password_hash` | TEXT | NOT NULL | Hash bcrypt du mot de passe |
| `role` | TEXT | NOT NULL, DEFAULT 'user' | Rôle: `admin` ou `user` |
| `is_active` | INTEGER | NOT NULL, DEFAULT 1 | Compte actif (0/1) |
| `last_login` | TEXT | | Dernière connexion (ISO 8601) |
| `login_count` | INTEGER | NOT NULL, DEFAULT 0 | Nombre de connexions |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Date de création |
| `updated_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Date de modification |

### Exemple
```sql
INSERT INTO users (id, username, email, password_hash, role)
VALUES ('user_001', 'admin', 'admin@marki.fr', '$2b$10$...', 'admin');
```

---

## Table: `sessions`

Sessions JWT actives pour l'authentification.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `sess_`) |
| `user_id` | TEXT | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Utilisateur lié |
| `token` | TEXT | NOT NULL | Token JWT complet |
| `expires_at` | TEXT | NOT NULL | Date d'expiration (ISO 8601) |
| `ip_address` | TEXT | | Adresse IP de connexion |
| `user_agent` | TEXT | | User-Agent du navigateur |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Date de création |

### Relations
- **Many-to-One** avec `users` (via `user_id`)

---

## Table: `contacts`

Contacts du système (propriétaires, apporteurs d'affaire, payeurs).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `cont_`) |
| `nom` | TEXT | NOT NULL | Nom du contact |
| `prenom` | TEXT | | Prénom |
| `email` | TEXT | | Email principal |
| `telephone` | TEXT | | Numéro de téléphone |
| `type` | TEXT | | Type de contact (libre) |
| `type_personne` | TEXT | DEFAULT 'P' | `P`=physique, `M`=morale |
| `statut` | TEXT | DEFAULT 'actif' | `actif`, `inactif` |
| `is_blacklisted` | INTEGER | DEFAULT 0 | Liste noire (0/1) |
| `blacklist_date` | TEXT | | Date de mise en liste noire |
| `blacklist_motif` | TEXT | | Motif de blacklist |
| `civilite` | TEXT | | M., Mme, Mlle... |
| `code` | TEXT | | Code client interne |
| `societe` | TEXT | | Nom de la société |
| `activite_societe` | TEXT | | Activité/Secteur |
| `adresse_rue` | TEXT | | Rue |
| `adresse_ville` | TEXT | | Ville |
| `adresse_code_postal` | TEXT | | Code postal |
| `adresse_pays` | TEXT | DEFAULT 'France' | Pays |
| `notes` | TEXT | | **Notes JSON du contact** (voir format ci-dessous) |
| `externe_id` | TEXT | | ID externe du contact (import) |
| `created_at` | TEXT | NOT NULL | Date de création |
| `updated_at` | TEXT | NOT NULL | Date de modification |

### Format de `notes` (JSON) - Notes du Contact
```json
[
  {
    "id": "note_001",
    "content": "Note textuelle sur le contact",
    "type": "contact",
    "created_by": "user_001",
    "created_by_name": "Admin",
    "created_at": "2026-07-14T10:00:00Z"
  }
]
```

**Note importante :** Les notes du contact sont partagées entre tous les impayés de ce contact. Une modification sur la fiche contact est visible depuis tous les impayés du même payeur.

### Différence avec `impayes.notes_json`

| Colonne | Entité | Portée | Usage |
|---------|--------|--------|-------|
| `contacts.notes` | Contact | **Tous les impayés** du contact | Notes générales sur le payeur (mode de paiement préféré, historique relationnel, etc.) |
| `impayes.notes_json` | Impayé | **Uniquement cette facture** | Notes spécifiques à la facture (litige, échange sur cette facture précise, etc.) |

**Exemple d'utilisation :**
- Note contact : *"Client préfère être contacté par téléphone plutôt qu'email"*
- Note impayé : *"Client conteste le montant de la prestation, échange téléphonique le 15/07"*

### Index recommandés
```sql
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_nom ON contacts(nom);
CREATE INDEX idx_contacts_blacklist ON contacts(is_blacklisted);
```

---

## Table: `impayes`

Factures impayées importées depuis la comptabilité.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `imp_`) |
| **Contacts (Foreign Keys)** |
| `payer_id` | TEXT | FOREIGN KEY → contacts(id) | Contact payeur |
| `contact_relance_id` | TEXT | FOREIGN KEY → contacts(id) | Contact à relancer |
| `proprietaire_id` | TEXT | FOREIGN KEY → contacts(id) | Propriétaire du bien |
| `apporteur_id` | TEXT | FOREIGN KEY → contacts(id) | Apporteur d'affaire |
| `donneur_ordre_id` | TEXT | FOREIGN KEY → contacts(id) | Donneur d'ordre |
| `locataire_entrant_id` | TEXT | FOREIGN KEY → contacts(id) | Locataire entrant |
| `locataire_sortant_id` | TEXT | FOREIGN KEY → contacts(id) | Locataire sortant |
| `notaire_id` | TEXT | FOREIGN KEY → contacts(id) | Notaire |
| `syndic_id` | TEXT | FOREIGN KEY → contacts(id) | Syndic |
| `acquereur_id` | TEXT | FOREIGN KEY → contacts(id) | Acquéreur |
| **Séquence** |
| `sequence_id` | TEXT | FOREIGN KEY → sequences(id) | Séquence active |
| `email_index` | INTEGER | DEFAULT 0 | Index email dans séquence (0-3) |
| **Facturation** |
| `nfacture` | TEXT | NOT NULL | Numéro de facture |
| `date_facture` | TEXT | | Date de facture |
| `date_echeance` | TEXT | NOT NULL | Date d'échéance |
| `date_piece` | TEXT | | Date de la pièce comptable |
| `montant_ttc` | REAL | DEFAULT 0 | Montant TTC |
| `total_ht` | REAL | DEFAULT 0 | Montant HT |
| `reste_a_payer` | REAL | DEFAULT 0 | Reste à payer |
| **Statuts** |
| `statut` | TEXT | DEFAULT 'impaye' | `impaye`, `paye`, `annule` |
| `statut_dossier` | TEXT | | Statut du dossier |
| `facture_soldee` | INTEGER | DEFAULT 0 | Facture soldée (0/1) |
| `solde_le` | TEXT | | Date de solde |
| **Blacklist** |
| `is_blacklisted` | INTEGER | DEFAULT 0 | Blacklisté (0/1) |
| `blacklist_date` | TEXT | | Date de blacklist |
| `blacklist_motif` | TEXT | | Motif |
| **Dossier** |
| `id_dossier` | TEXT | | ID système du dossier |
| `numero_dossier` | TEXT | | Numéro de dossier affiché |
| `reference` | TEXT | | Référence |
| `reference_externe` | TEXT | | Référence externe |
| `cadre_mission` | TEXT | | Cadre de mission |
| `employe_intervention` | TEXT | | Employé d'intervention |
| **Adresse du bien** |
| `adresse_bien` | TEXT | | Adresse du bien concerné |
| `code_postal` | TEXT | | Code postal du bien |
| `ville` | TEXT | | Ville du bien |
| `etage` | TEXT | | Étage |
| `entree` | TEXT | | Entrée |
| `escalier` | TEXT | | Escalier |
| `porte` | TEXT | | Porte |
| `numero_lot` | TEXT | | Numéro de lot |
| **Payeur (dénormalisé)** |
| `payeur_nom` | TEXT | | Nom du payeur |
| `payeur_prenom` | TEXT | | Prénom |
| `payeur_email` | TEXT | | Email |
| `payeur_telephone` | TEXT | | Téléphone |
| `payeur_civilite` | TEXT | | Civilité |
| `payeur_type` | TEXT | | Type |
| `payeur_type_personne` | TEXT | | Type personne (P/M) |
| **Propriétaire (dénormalisé)** |
| `proprietaire_nom` | TEXT | | Nom |
| `proprietaire_prenom` | TEXT | | Prénom |
| `proprietaire_email` | TEXT | | Email |
| `proprietaire_telephone` | TEXT | | Téléphone |
| `proprietaire_civilite` | TEXT | | Civilité |
| `proprietaire_type_personne` | TEXT | | Type personne |
| **Apporteur (dénormalisé)** |
| `apporteur_nom` | TEXT | | Nom |
| `apporteur_prenom` | TEXT | | Prénom |
| `apporteur_email` | TEXT | | Email |
| `apporteur_telephone` | TEXT | | Téléphone |
| `apporteur_civilite` | TEXT | | Civilité |
| **Donneur d'ordre (dénormalisé)** |
| `donneur_ordre_nom` | TEXT | | Nom |
| `donneur_ordre_prenom` | TEXT | | Prénom |
| `donneur_ordre_email` | TEXT | | Email |
| `donneur_ordre_telephone` | TEXT | | Téléphone |
| `donneur_ordre_civilite` | TEXT | | Civilité |
| **Syndic (dénormalisé)** |
| `syndic_nom` | TEXT | | Nom |
| `syndic_prenom` | TEXT | | Prénom |
| `syndic_email` | TEXT | | Email |
| `syndic_telephone` | TEXT | | Téléphone |
| `syndic_civilite` | TEXT | | Civilité |
| **Notaire (dénormalisé)** |
| `notaire_nom` | TEXT | | Nom |
| `notaire_prenom` | TEXT | | Prénom |
| `notaire_email` | TEXT | | Email |
| `notaire_telephone` | TEXT | | Téléphone |
| `notaire_civilite` | TEXT | | Civilité |
| **Locataire entrant (dénormalisé)** |
| `locataire_entrant_nom` | TEXT | | Nom |
| `locataire_entrant_prenom` | TEXT | | Prénom |
| `locataire_entrant_email` | TEXT | | Email |
| `locataire_entrant_telephone` | TEXT | | Téléphone |
| `locataire_entrant_civilite` | TEXT | | Civilité |
| **Locataire sortant (dénormalisé)** |
| `locataire_sortant_nom` | TEXT | | Nom |
| `locataire_sortant_prenom` | TEXT | | Prénom |
| `locataire_sortant_email` | TEXT | | Email |
| `locataire_sortant_telephone` | TEXT | | Téléphone |
| `locataire_sortant_civilite` | TEXT | | Civilité |
| **Acquéreur (dénormalisé)** |
| `acquereur_nom` | TEXT | | Nom |
| `acquereur_prenom` | TEXT | | Prénom |
| `acquereur_email` | TEXT | | Email |
| `acquereur_telephone` | TEXT | | Téléphone |
| `acquereur_civilite` | TEXT | | Civilité |
| **PDF** |
| `url_pdf` | TEXT | | URL du PDF facture |
| `url_pdf_token` | TEXT | | Token d'accès au PDF |
| `url_pdf_token_expires` | TEXT | | Expiration du token |
| **Commentaires** |
| `commentaire_dossier` | TEXT | | Commentaire sur le dossier |
| `commentaire_piece` | TEXT | | Commentaire sur la pièce |
| `notes_json` | TEXT | | **Notes JSON de l'impayé** (format ci-dessous) |
| **Dates** |
| `date_import` | TEXT | | Date d'import dans Marki |
| `created_at` | TEXT | NOT NULL | Date de création |
| `updated_at` | TEXT | NOT NULL | Date de modification |

### Relations
- **Many-to-One** avec `contacts` (4 foreign keys différents)
- **Many-to-One** avec `sequences`

### Index recommandés
```sql
CREATE INDEX idx_impayes_payer ON impayes(payer_id);
CREATE INDEX idx_impayes_sequence ON impayes(sequence_id);
CREATE INDEX idx_impayes_echeance ON impayes(date_echeance);
CREATE INDEX idx_impayes_statut ON impayes(statut);
CREATE INDEX idx_impayes_soldee ON impayes(facture_soldee);
```

---

## Table: `relances`

Emails de relance générés pour les impayés.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `rel_`) |
| `contact_id` | TEXT | NOT NULL, FOREIGN KEY → contacts(id) | Contact concerné |
| `sequence_id` | TEXT | NOT NULL, FOREIGN KEY → sequences(id) | Séquence utilisée |
| `statut` | TEXT | DEFAULT 'brouillon' | `brouillon`, `pret pour envoi`, `Envoyée`, `planifiee`, `en_cours_envoi`, `erreur_envoi`, `suspendue`, `annulee` |
| `date_envoi` | TEXT | | Date d'envoi effectif |
| `date_programmation` | TEXT | | Date de planification d'envoi |
| `sujet` | TEXT | NOT NULL | Objet de l'email |
| `corps` | TEXT | NOT NULL | Corps HTML de l'email |
| `email_envoye_a` | TEXT | | Adresse email destinataire |
| `valide` | INTEGER | DEFAULT 0 | Validée par un utilisateur (0/1) |
| `manuelle` | INTEGER | DEFAULT 0 | Créée manuellement (0/1) |
| `smtp_profile_id` | TEXT | FOREIGN KEY → smtp_profiles(id) | Profil SMTP utilisé |
| `cc` | TEXT | | Destinataires en copie |
| `scenario` | TEXT | | Scénario utilisé |
| `email_index` | INTEGER | | Index de l'email dans la séquence |
| `email_sent` | INTEGER | DEFAULT 0 | Email envoyé (0/1) |
| `erreur_count` | INTEGER | DEFAULT 0 | Nombre d'erreurs d'envoi |
| `last_error` | TEXT | | Dernière erreur d'envoi |
| `created_at` | TEXT | NOT NULL | Date de création |
| `updated_at` | TEXT | NOT NULL | Date de modification |

### Relations
- **Many-to-One** avec `contacts`
- **Many-to-One** avec `sequences`

### Lien avec impayés
Les impayés liés à une relance sont stockés dans la table de liaison `relance_impayes`.

---

## Table: `relance_impayes`

Table de liaison many-to-many entre relances et impayés.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `relance_id` | TEXT | NOT NULL, FOREIGN KEY → relances(id) ON DELETE CASCADE | ID de la relance |
| `impaye_id` | TEXT | NOT NULL, FOREIGN KEY → impayes(id) ON DELETE CASCADE | ID de l'impayé |

### Contraintes
- **PRIMARY KEY** composite: (`relance_id`, `impaye_id`)

### Index recommandés
```sql
CREATE INDEX idx_relance_impayes_relance ON relance_impayes(relance_id);
CREATE INDEX idx_relance_impayes_impaye ON relance_impayes(impaye_id);
```

### Index recommandés
```sql
CREATE INDEX idx_relances_contact ON relances(contact_id);
CREATE INDEX idx_relances_statut ON relances(statut);
CREATE INDEX idx_relances_sequence ON relances(sequence_id);
```

---

## Table: `sequences`

Séquences de relance configurables (relances clients ou suivis agences).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `seq_`) |
| `nom` | TEXT | NOT NULL | Nom de la séquence |
| `type_sequence` | TEXT | NOT NULL | `relances` ou `suivi` |
| `niveau` | INTEGER | DEFAULT 0 | Niveau de la séquence (0-3) |
| `actif` | INTEGER | DEFAULT 1 | Séquence active (0/1) |
| `validation_obligatoire` | INTEGER | DEFAULT 0 | Validation requise avant envoi (0/1) |
| `created_at` | TEXT | NOT NULL | Date de création |
| `updated_at` | TEXT | NOT NULL | Date de modification |

### Index recommandés
```sql
CREATE INDEX idx_sequences_type ON sequences(type_sequence);
CREATE INDEX idx_sequences_actif ON sequences(actif);
```

---

## Table: `sequences_emails`

Emails configurés dans une séquence (templates).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `seqmail_`) |
| `sequence_id` | TEXT | NOT NULL, FOREIGN KEY → sequences(id) | Séquence parente |
| `email_index` | INTEGER | NOT NULL | Position dans la séquence (1, 2, 3...) |
| `delai` | INTEGER | | Délai en jours depuis l'étape précédente |
| `cc` | TEXT | | Destinataires en copie |
| `frequence` | TEXT | | `quotidien`, `hebdomadaire`, `mensuel` |
| `jour_envoi` | INTEGER | | Jour du mois (1-31) ou jour de la semaine (0-6) |
| `heure_envoi` | TEXT | | Heure d'envoi (HH:MM) |
| `created_at` | TEXT | NOT NULL | Date de création |
| `updated_at` | TEXT | NOT NULL | Date de modification |

**Note:** Le template de l'email (objet, corps HTML) est stocké dans la table `sequences_scenarios`.

---

## Table: `sequences_scenarios`

Templates de scénarios pour les emails de relance.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `seqscen_`) |
| `sequence_id` | TEXT | FOREIGN KEY → sequences(id) | Séquence parente |
| `email_index` | INTEGER | NOT NULL | Position dans la séquence (1, 2, 3...) |
| `format` | TEXT | | Format: 'single', 'multiple', 'both', 'broker' |
| `active` | INTEGER | DEFAULT 1 | Scénario actif (0/1) |
| `smtp` | TEXT | | Profil SMTP (legacy, voir smtp_profile_id) |
| `cc` | TEXT | | Destinataires en copie |
| `objet` | TEXT | | Objet de l'email |
| `corps` | TEXT | | Corps HTML de l'email |
| `created_at` | TEXT | NOT NULL | Date de création |
| `updated_at` | TEXT | NOT NULL | Date de modification |

### Relations
- **Many-to-One** avec `sequences` (via `sequence_id`)

---

## Table: `smtp_profiles`

Configuration des serveurs SMTP pour l'envoi d'emails.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `smtp_`) |
| `nom` | TEXT | NOT NULL | Nom du profil |
| `host` | TEXT | NOT NULL | Serveur SMTP |
| `port` | INTEGER | NOT NULL, DEFAULT 587 | Port SMTP |
| `secure` | INTEGER | DEFAULT 0 | SSL/TLS (0=STARTTLS/587, 1=SSL/465) |
| `username` | TEXT | NOT NULL | Identifiant SMTP |
| `password` | TEXT | NOT NULL | Mot de passe (chiffrer en production) |
| `from_email` | TEXT | NOT NULL | Email d'expédition |
| `from_name` | TEXT | NOT NULL | Nom d'affichage |
| `actif` | INTEGER | DEFAULT 1 | Profil actif (0/1) |
| `is_default` | INTEGER | DEFAULT 0 | Profil par défaut (0/1) |
| `created_at` | TEXT | NOT NULL | Date de création |
| `updated_at` | TEXT | NOT NULL | Date de modification |

### Index recommandés
```sql
CREATE INDEX idx_smtp_actif ON smtp_profiles(actif);
```

---

## Table: `events`

Événements et notifications système.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique (préfixe `evt_`) |
| `type` | TEXT | NOT NULL | `relance`, `suivi`, `system`, `import` |
| `titre` | TEXT | NOT NULL | Titre de l'événement |
| `description` | TEXT | | Description détaillée |
| `entity_type` | TEXT | | Type d'entité liée (`contact`, `impaye`, `relance`) |
| `entity_id` | TEXT | | ID de l'entité liée |
| `read` | INTEGER | DEFAULT 0 | Lu (0/1) |
| `who_id` | TEXT | | ID utilisateur ayant déclenché l'événement |
| `by_marki` | INTEGER | DEFAULT 0 | Événement automatique (0/1) |
| `metadata` | TEXT | | Métadonnées JSON |
| `icon` | TEXT | DEFAULT 'fa-bell' | Icône FontAwesome |
| `created_at` | TEXT | NOT NULL | Date de création |

### Index recommandés
```sql
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_read ON events(read);
CREATE INDEX idx_events_entity ON events(entity_type, entity_id);
```

---

## Diagramme des Relations

```
users ||--o{ sessions : "possède"
users ||--o{ events : "génère"

contacts ||--o{ impayes : "payer_id"
contacts ||--o{ impayes : "contact_relance_id"
contacts ||--o{ impayes : "proprietaire_id"
contacts ||--o{ impayes : "apporteur_id"
contacts ||--o{ relances : "contact_id"

sequences ||--o{ impayes : "sequence_id"
sequences ||--o{ relances : "sequence_id"
sequences ||--o{ sequences_emails : "contient"

smtp_profiles ||--o{ relances : "utilisé pour envoi"

relances }o--o{ impayes : "relances_impayes (liaison)"
suivis }o--o{ impayes : "suivi_impayes (liaison)"
```

---

## Table: `suivis`

Suivis/relances spécifiques (similaire à `relances` mais pour d'autres cas).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique |
| `statut` | TEXT | | Statut du suivi |
| `format` | TEXT | | Format |
| `email_index` | INTEGER | | Index de l'email |
| `valide` | INTEGER | | Validé (0/1) |
| `manuelle` | INTEGER | | Manuelle (0/1) |
| `corps` | TEXT | | Corps du message |
| `objet` | TEXT | | Objet du message |
| `emailSent` | INTEGER | | Email envoyé (0/1) - legacy |
| `contact_id` | TEXT | FOREIGN KEY → contacts(id) | Contact concerné |
| `sequence_id` | TEXT | FOREIGN KEY → sequences(id) | Séquence utilisée |
| `smtp_profile_id` | TEXT | FOREIGN KEY → smtp_profiles(id) | Profil SMTP |
| `date_envoi` | TEXT | | Date d'envoi |
| `date_programmation` | TEXT | | Date de programmation |
| `sujet` | TEXT | | Sujet (dénormalisé) |
| `cc` | TEXT | | Destinataires en copie |
| `scenario` | TEXT | | Scénario utilisé |
| `email_sent` | INTEGER | DEFAULT 0 | Email envoyé (0/1) |
| `erreur_count` | INTEGER | DEFAULT 0 | Nombre d'erreurs |
| `last_error` | TEXT | | Dernière erreur |
| `created_at` | TEXT | NOT NULL | Date de création |
| `updated_at` | TEXT | NOT NULL | Date de modification |

---

## Table: `suivi_impayes`

Table de liaison entre suivis et impayés (similaire à `relance_impayes`).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `suivi_id` | TEXT | NOT NULL, FOREIGN KEY → suivis(id) | ID du suivi |
| `impaye_id` | TEXT | NOT NULL, FOREIGN KEY → impayes(id) | ID de l'impayé |

**PRIMARY KEY**: (`suivi_id`, `impaye_id`)

---

## Table: `lien_paiements`

Liens de paiement générés (ex: paiement en ligne).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique |
| `nom` | TEXT | | Nom/description du lien |
| `url` | TEXT | | URL de paiement |
| `created_at` | TEXT | | Date de création |
| `updated_at` | TEXT | | Date de modification |

---

## Table: `options_dynamiques`

Options dynamiques configurables pour l'application.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Identifiant unique |
| `type` | TEXT | | Type d'option |
| `valeurs` | TEXT | | Valeurs (JSON) |
| `created_at` | TEXT | | Date de création |
| `updated_at` | TEXT | | Date de modification |

### Exemple d'utilisation
```json
// valeur stockée dans la colonne 'valeurs'
{
  "key": "delai_relance",
  "value": 7,
  "description": "Délai par défaut entre les relances"
}
```

---

## Conventions de nommage

### Préfixes d'ID
| Entité | Préfixe | Exemple |
|--------|---------|---------|
| Users | `user_` | `user_abc123` |
| Sessions | `sess_` | `sess_def456` |
| Contacts | `cont_` | `cont_ghi789` |
| Impayés | `imp_` | `imp_jkl012` |
| Relances | `rel_` | `rel_mno345` |
| Séquences | `seq_` | `seq_pqr678` |
| Séquences Emails | `seqmail_` | `seqmail_stu901` |
| SMTP Profiles | `smtp_` | `smtp_vwx234` |
| Events | `evt_` | `evt_yz5678` |

### Types de données
- **ID**: TEXT avec préfixe + suffixe aléatoire
- **Dates**: TEXT au format ISO 8601 (`2026-07-14T15:30:00Z`)
- **Booléens**: INTEGER (0 = false, 1 = true)
- **Montants**: REAL (euros avec décimales)
- **JSON**: TEXT (stocké comme chaîne JSON)

---

## Scripts SQL utiles

### Requêtes communes

```sql
-- Liste des impayés non soldés avec contact
SELECT i.*, c.nom, c.prenom, c.email
FROM impayes i
LEFT JOIN contacts c ON i.contact_relance_id = c.id
WHERE i.facture_soldee = 0
ORDER BY i.date_echeance;

-- Relances en attente de validation
SELECT r.*, c.nom, c.prenom, s.nom as sequence_nom
FROM relances r
JOIN contacts c ON r.contact_id = c.id
JOIN sequences s ON r.sequence_id = s.id
WHERE r.statut = 'brouillon' AND r.valide = 0;

-- Contacts avec impayés
SELECT c.*, COUNT(i.id) as nb_impayes, SUM(i.reste_a_payer) as total_du
FROM contacts c
LEFT JOIN impayes i ON c.id = i.contact_relance_id AND i.facture_soldee = 0
GROUP BY c.id
HAVING nb_impayes > 0;

-- Événements non lus
SELECT * FROM events WHERE read = 0 ORDER BY created_at DESC LIMIT 50;
```

### Maintenance

```sql
-- Supprimer les sessions expirées
DELETE FROM sessions WHERE expires_at < datetime('now');

-- Nettoyer les événements vieux de +90 jours
DELETE FROM events WHERE created_at < datetime('now', '-90 days');
```

---

## Migration depuis FlatFileDB

Les anciennes collections YAML sont remplacées par ces tables SQL:

| Ancienne collection (YAML) | Nouvelle table SQL |
|---------------------------|-------------------|
| `users` | `users` |
| `sessions` | `sessions` |
| `contacts` | `contacts` |
| `impayes` | `impayes` |
| `relances` | `relances` + `relances_impayes` |
| `sequences` | `sequences` + `sequences_emails` + `sequences_email_templates` |
| `smtp_profiles` | `smtp_profiles` |
| `events` | `events` |

**Note:** Les notes sont stockées en JSON dans `contacts.notes` (notes contact) et `impayes.notes_json` (notes impayés).
