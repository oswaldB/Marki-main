# Data Models - Documentation

> Généré automatiquement depuis `/backend/data`

---

## Enums

### ContactStatut
| Valeur | Description |
|--------|-------------|
| `actif` | Contact actif |

### ContactTypePersonne
| Valeur | Description |
|--------|-------------|
| `M` | Personne morale (Morale) |
| `P` | Personne physique (Physique) |

### ImpayeStatut
| Valeur | Description |
|--------|-------------|
| `non_payee` | Facture non payée |
| `payee` | (implicite, via `facture_soldee: true`) |

### ImpayePayeurType
| Valeur | Description |
|--------|-------------|
| `Propriétaire` | Le propriétaire du bien est payeur |
| `Apporteur d'affaire` | L'apporteur d'affaire est payeur |
| `Autre` | Autre type de payeur |

### RelanceStatut
| Valeur | Description |
|--------|-------------|
| `brouillon` | En cours de rédaction |
| `pret pour envoi` | Prête à être envoyée |
| `Envoyée` | Déjà envoyée |
| `planifiee` | Planifiée pour envoi futur |
| `en_cours_envoi` | En cours d'envoi |
| `erreur_envoi` | Erreur lors de l'envoi |
| `suspendue` | Suspendue (impayé lié suspendu) |
| `annulee` | Annulée par l'utilisateur |

### RelanceScenario
Type de scénario appliqué à une relance spécifique (déterminé automatiquement selon le contexte).

| Valeur | Description |
|--------|-------------|
| `single` | Relance d'une seule facture |
| `multiple` | Relance de plusieurs factures |
| `broker` | Relance via l'apporteur d'affaire |
| `both` | Relance combinée (propriétaire + apporteur) |

### SequenceType
| Valeur | Description |
|--------|-------------|
| `relances` | Séquence de relances clients |
| `suivi` | Séquence de suivi agences |

### ScenarioFormat
Format du template d'email dans la configuration d'une séquence (défini dans les paramètres de l'email).

| Valeur | Description |
|--------|-------------|
| `single` | Template pour facture unique |
| `multiple` | Template pour factures multiples |
| `both` | Template mixte |
| `broker` | Template pour apporteur d'affaire |

### UserRole
| Valeur | Description |
|--------|-------------|
| `admin` | Administrateur système |
| `user` | Utilisateur standard |
| `client` | Client externe (accès limité) |

### SmtpSecure
| Valeur | Description |
|--------|-------------|
| `false` | STARTTLS (port 587) |
| `true` | SSL/TLS (port 465) |

---

## Modèles de Données

### Contact (`contact`)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique (préfixe `cont_`) |
| `type` | string | ✅ | Toujours `"contact"` |
| `nom` | string | ✅ | Nom du contact |
| `prenom` | string | | Prénom du contact |
| `civilite` | string\|null | | Civilité (M., Mme, etc.) |
| `type_personne` | ContactTypePersonne | ✅ | Type de personne (`M` = morale, `P` = physique) |
| `email` | string\|null | | Adresse email |
| `telephone` | string\|null | | Numéro de téléphone |
| `societe` | string\|null | | Nom de la société |
| `activite_societe` | string\|null | | Activité de la société |
| `code` | string\|null | | Code client interne |
| `adresse_rue` | string\|null | | Rue |
| `adresse_ville` | string\|null | | Ville |
| `adresse_code_postal` | string\|null | | Code postal |
| `adresse_pays` | string\|null | | Pays (défaut: "France") |
| `statut` | ContactStatut | ✅ | `actif` |
| `is_blacklisted` | boolean | ✅ | Contact en liste noire |
| `blacklist_date` | ISO date\|null | | Date de mise en liste noire |
| `blacklist_motif` | string\|null | | Motif de blacklist |
| `impaye_ids` | string[] | ✅ | IDs des impayés liés |
| `relance_ids` | string[] | ✅ | IDs des relances liées |
| `created_at` | ISO date | ✅ | Date de création |
| `updated_at` | ISO date | ✅ | Date de modification |

---

### Impaye (`impaye`)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique (préfixe `imp_`) |
| `type` | string | ✅ | Toujours `"impaye"` |
| `nfacture` | number | ✅ | Numéro de facture |
| `statut` | ImpayeStatut | ✅ | `non_payee` |
| `facture_soldee` | boolean | ✅ | Facture soldée (payée) |
| `montant_total` | number | ✅ | Montant total TTC |
| `total_ht` | number | ✅ | Total hors taxe |
| `total_ttc` | number | ✅ | Total TTC |
| `reste_a_payer` | number | ✅ | Reste à payer |
| `date_echeance` | ISO date | ✅ | Date d'échéance |
| `date_piece` | ISO date | ✅ | Date de la pièce comptable |
| `ref_piece` | string | ✅ | Référence pièce (ex: `FA241126 47855`) |
| `url_pdf` | string\|null | | Chemin vers le PDF |
| `commentaire_piece` | string | | Commentaire |
| `payeur_type` | ImpayePayeurType | ✅ | Type de payeur |
| `payeur_nom` | string | | Nom du payeur |
| `payeur_prenom` | string | | Prénom du payeur |
| `payeur_civilite` | string | | Civilité du payeur |
| `payeur_email` | string | | Email du payeur |
| `payeur_telephone` | string | | Téléphone du payeur |
| `proprietaire_id` | string\|null | | ID propriétaire (lien vers Contact) |
| `proprietaire_nom` | string\|null | | Nom propriétaire |
| `proprietaire_prenom` | string\|null | | Prénom propriétaire |
| `donneur_ordre_id` | string\|null | | ID donneur d'ordre (lien vers Contact) |
| `donneur_ordre_nom` | string\|null | | Nom donneur d'ordre |
| `donneur_ordre_prenom` | string\|null | | Prénom donneur d'ordre |
| `apporteur_id` | string\|null | | ID apporteur (lien vers Contact) |
| `apporteur_nom` | string\|null | | Nom apporteur |
| `apporteur_prenom` | string\|null | | Prénom apporteur |
| `apporteur_societe` | string\|null | | Société apporteur |
| `contact_relance_id` | string\|null | | ID contact de relance |
| `payer_id` | string\|null | | ID payeur (lien vers Contact) |
| `sequence_id` | string\|null | | ID séquence active |
| `numero_dossier` | string | | Numéro de dossier |
| `id_dossier` | string | | ID système du dossier |
| `reference` | string | | Référence externe |
| `adresse_bien` | string | | Adresse du bien |
| `code_postal` | string | | Code postal du bien |
| `ville` | string | | Ville du bien |
| `is_suspended` | boolean | ✅ | Impayé suspendu (masqué temporairement) |
| `suspension_date` | ISO date\|null | | Date de suspension |
| `suspension_motif` | string\|null | | Motif de suspension |
| `notes` | Note[] | ✅ | Notes/historique sur l'impayé (défaut: []) |
| `date_import` | ISO date | ✅ | Date d'import |
| `created_at` | ISO date | ✅ | Date de création |
| `updated_at` | ISO date | ✅ | Date de modification |

#### Note (nested - dans `notes`)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique de la note (préfixe `note_`) |
| `content` | string | ✅ | Contenu textuel de la note |
| `created_by` | string | ✅ | ID de l'utilisateur qui a créé la note |
| `created_by_name` | string | | Nom de l'utilisateur (dénormalisé) |
| `created_at` | ISO date | ✅ | Date de création de la note |

---

### Relance (`relance`)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique (préfixe `rel_`) |
| `type` | string | ✅ | Toujours `"relance"` |
| `contact_id` | string | ✅ | ID du contact concerné |
| `sequence_id` | string | ✅ | ID de la séquence |
| `impaye_ids` | string[] | ✅ | IDs des impayés liés |
| `statut` | RelanceStatut | ✅ | État de la relance |
| `scenario` | RelanceScenario | ✅ | `single`, `multiple`, `broker`, `both` |
| `objet` | string | ✅ | Objet de l'email |
| `corps` | string (HTML) | ✅ | Corps de l'email (HTML) |
| `corps_html` | string\|null | | Version HTML alternative |
| `email_index` | number | ✅ | Index de l'email dans la séquence |
| `smtp_profile_id` | string\|null | | Profil SMTP utilisé |
| `valide` | boolean | ✅ | Relance validée |
| `manuelle` | boolean | ✅ | Création manuelle |
| `cc` | string\|null | | Destinataires en copie |
| `bcc` | string\|null | | Destinataires en copie cachée |
| `date_creation` | ISO date | ✅ | Date de création |
| `date_envoi` | ISO date\|null | | Date d'envoi effectif |
| `planifiee_le` | ISO date\|null | | Date de planification |
| `date_ouverture` | ISO date\|null | | Date de première ouverture |
| `ouvert` | number | ✅ | Nombre de fois que l'email a été ouvert |
| `clicks` | number | ✅ | Nombre de clics |
| `updated_at` | ISO date | ✅ | Date de modification |

---

### Sequence (`sequence`)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique (préfixe `seq_`) |
| `type` | string | ✅ | Toujours `"sequence"` |
| `nom` | string | ✅ | Nom de la séquence |
| `type_sequence` | SequenceType | ✅ | `relances` ou `suivi` |
| `actif` | boolean | ✅ | Séquence active |
| `validation_obligatoire` | boolean | | Validation obligatoire avant envoi |
| `emails` | EmailConfig[] | ✅ | Configuration des emails |
| `created_at` | ISO date | ✅ | Date de création |
| `updated_at` | ISO date | ✅ | Date de modification |

#### EmailConfig (nested)

Configuration d'un email dans une séquence (niveau template).

| Champ | Type | Description |
|-------|------|-------------|
| `email_index` | number | Index de l'email (1-based) |
| `delai` | number | Délai en jours depuis le précédent (négatif = avant échéance) |
| `objet` | string | Template d'objet (peut contenir des variables) |
| `corps` | string (HTML) | Template du corps (HTML avec variables `[[var]]`) |
| `scenarios` | ScenarioConfig[] | Configurations par scénario/format |

#### ScenarioConfig (nested)

Configuration spécifique par format/scénario pour un email donné.

| Champ | Type | Description |
|-------|------|-------------|
| `active` | boolean | Scénario activé |
| `format` | ScenarioFormat | `single`, `multiple`, `both`, `broker` |
| `objet` | string | Objet spécifique au scénario (surcharge) |
| `corps` | string (HTML) | Corps spécifique au scénario (surcharge) |
| `cc` | string | Destinataires CC spécifiques |
| `bcc` | string | Destinataires BCC spécifiques |
| `smtp_profile_id` | string\|null | Profil SMTP spécifique |

**Variables disponibles dans les templates :**
- `[[payeur_civilite]]`, `[[payeur_nom]]`, `[[payeur_prenom]]`, `[[payeur_email]]`, `[[payeur_telephone]]`
- `[[proprietaire_nom]]`, `[[proprietaire_prenom]]`
- `[[apporteur_nom]]`, `[[apporteur_societe]]`
- `[[nfacture]]`, `[[montant_total]]`, `[[reste_a_payer]]`, `[[date_echeance]]`
- `[[numero_dossier]]`, `[[adresse_bien]]`, `[[code_postal]]`, `[[ville]]`
- `[[lien_pdf]]`, `[[lien_espace]]`
- `[[loop impayes]]` / `[[endloop]]` : pour itérer sur les impayés

---

### SmtpProfile (`smtp_profile`)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique (préfixe `smtp_`) |
| `type` | string | ✅ | Toujours `"smtp_profile"` |
| `nom` | string | ✅ | Nom du profil |
| `description` | string | | Description |
| `host` | string | ✅ | Serveur SMTP |
| `port` | number | ✅ | Port SMTP (587 ou 465) |
| `secure` | boolean | ✅ | `false` (STARTTLS) ou `true` (SSL) |
| `require_tls` | boolean | ✅ | TLS requis |
| `username` | string | ✅ | Identifiant SMTP |
| `password` | string | ✅ | Mot de passe (chiffré) |
| `from_email` | string | ✅ | Email d'expédition |
| `from_name` | string | | Nom d'affichage |
| `reply_to` | string | | Adresse de réponse |
| `display_name` | string | | Nom d'affichage du profil |
| `max_per_hour` | number | ✅ | Limite d'envoi/heure |
| `actif` | boolean | ✅ | Profil actif |
| `created_at` | ISO date | ✅ | Date de création |
| `updated_at` | ISO date | ✅ | Date de modification |

---

### User (`user`)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique (préfixe `user_`) |
| `type` | string | ✅ | Toujours `"user"` |
| `username` | string | ✅ | Nom d'utilisateur (unique) |
| `email` | string | ✅ | Email de l'utilisateur |
| `password_hash` | string | ✅ | Hash bcrypt du mot de passe |
| `role` | UserRole | ✅ | `admin`, `user` ou `client` |
| `is_active` | boolean | ✅ | Compte actif |
| `login_count` | number | ✅ | Nombre de connexions |
| `last_login` | ISO date\|null | | Dernière connexion |
| `created_at` | ISO date | ✅ | Date de création |
| `_acl` | ACL\|null | | Access Control List |

#### ACL (nested)

| Champ | Type | Description |
|-------|------|-------------|
| `owner` | string | Propriétaire du document |
| `created_by` | string | Créateur du document |
| `created_at` | ISO date | Date de création ACL |
| `updated_at` | ISO date | Date de mise à jour ACL |
| `permissions` | Permissions | Droits par rôle |

#### Permissions (nested)

| Champ | Type | Description |
|-------|------|-------------|
| `admin` | string[] | Droits admin (`read`, `write`, `delete`) |
| `user` | string[] | Droits utilisateur standard |

---

### Session (`session`)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique (préfixe `session_`) |
| `type` | string | ✅ | Toujours `"session"` |
| `user_id` | string | ✅ | ID de l'utilisateur |
| `token` | string | ✅ | Token JWT de session |
| `expires_at` | ISO date | ✅ | Date d'expiration |
| `created_at` | ISO date | ✅ | Date de création |
| `ip_address` | string\|null | | IP de connexion |
| `user_agent` | string\|null | | User-Agent du client |

---

### PaymentLink (`payment_link`)

Configuration des liens de paiement pour le portail client.

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique (préfixe `paylink_`) |
| `type` | string | ✅ | Toujours `"payment_link"` |
| `nom` | string | ✅ | Nom de la configuration (ex: "Stripe", "PayPal") |
| `actif` | boolean | ✅ | Configuration active |
| `payment_link_template` | string | ✅ | Template de l'URL avec variables `[[VAR]]` |
| `variables` | string[] | ✅ | Liste des variables disponibles |
| `description` | string\|null | | Description de la configuration |
| `created_at` | ISO date | ✅ | Date de création |
| `updated_at` | ISO date | ✅ | Date de modification |

#### Variables disponibles

| Variable | Description |
|----------|-------------|
| `[[MONTANT]]` | Montant TTC en centimes |
| `[[REFERENCE]]` | Numéro de facture (nfacture) |
| `[[EMAIL]]` | Email du client |
| `[[NOM_CLIENT]]` | Nom complet du client |
| `[[ID_FACTURE]]` | ID interne de la facture |

#### Exemple de template

```yaml
id: "paylink_default"
type: "payment_link"
nom: "Stripe"
actif: true
payment_link_template: "https://checkout.stripe.com/pay?amount=[[MONTANT]]&client_reference_id=[[ID_FACTURE]]"
variables:
  - "[[MONTANT]]"
  - "[[ID_FACTURE]]"
description: "Paiement via Stripe Checkout"
created_at: "2026-07-11T10:00:00Z"
updated_at: "2026-07-11T10:00:00Z"
```

## Indices et Contraintes

### Contacts
- **Indices**: `id`, `email`, `nom`, `type`, `is_blacklisted`
- **Unique**: `id`

### Impayes
- **Indices**: `id`, `payer_id`, `contact_relance_id`, `nfacture`, `date_echeance`, `statut`, `is_suspended`, `facture_soldee`, `apporteur_id`, `sequence_id`
- **Unique**: `id`

### Relances
- **Indices**: `id`, `contact_id`, `sequence_id`, `statut`, `date_envoi`
- **Unique**: `id`

### Sequences
- **Indices**: `id`, `type_sequence`, `actif`
- **Unique**: `id`

### SmtpProfiles
- **Indices**: `id`, `actif`
- **Unique**: `id`

### Users
- **Indices**: `id`, `username`, `email`, `role`, `is_active`
- **Unique**: `id`, `username`

### Sessions
- **Indices**: `id`, `user_id`, `expires_at`
- **Unique**: `id`

### PaymentLinks
- **Indices**: `id`, `actif`
- **Unique**: `id`
