# Format des Documents CouchDB marki2

Ce document décrit la structure complète des documents stockés dans la base CouchDB `marki2` après migration depuis SQLite.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Document `demande`](#document-demande)
3. [Document `contact`](#document-contact)
4. [Document `sequence`](#document-sequence)
5. [Document `smtp_profile`](#document-smtp_profile)
6. [Document `user`](#document-user)
7. [Relations entre documents](#relations-entre-documents)
8. [Exemples de requêtes](#exemples-de-requêtes)

---

## Vue d'ensemble

La migration transforme l'architecture relationnelle SQLite (10+ tables) en documents CouchDB agrégés (4 types principaux) :

| Type | ID Préfixe | Description | Nombre approx. |
|------|------------|-------------|----------------|
| `demande` | `demande:` | Document agrégat contenant factures, relances et events | ~7 400 |
| `contact` | `contact:` | Référentiel clients et apporteurs | ~6 900 |
| `sequence` | `sequence:` | Configurations de relances automatiques | ~2 |
| `smtp_profile` | `smtp:` | Configuration SMTP pour l'envoi d'emails | ~1 |
| `user` | `user:` | Utilisateurs système | ~1 |

---

## Document `demande`

Le document `demande` est le cœur du système. Il regroupe toutes les données liées à un dossier d'impayé : factures, relances, événements et métadonnées.

### Structure complète

```json
{
  "_id": "demande:{reference}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "demande",
  "reference": "string",           // Numéro de dossier (ex: "41987")
  "date_creation": "ISO8601",      // Date de création du dossier
  "statut": "string",              // "en_relance" | "solde"
  
  // Client (payeur) - Snapshot du contact
  "client": {
    "id": "contact:{id}",
    "nom": "string",
    "prenom": "string",
    "email": "string | null",
    "telephone": "string | null",
    "type": "string | null"        // Type de contact (client, etc.)
  },
  
  // Apporteur d'affaires - Snapshot
  "apporteur": {
    "id": "contact:{id}",
    "nom": "string",
    "commission": "number",        // Montant de la commission (10% du TTC) +> supprime.
    "commission_payee": "boolean"  // Statut du paiement de commission -> supprime.
  },

  +> un demande est constituée de dossiers et dans un dossier j'ai un bien et des missions. 
  // Adresse du bien concerné
  "bien": { +> il faut rajouté, étage; porte; lot.
    "adresse": "string",
    "code_postal": "string",
    "ville": "string"
  },
  
  // Factures liées à ce dossier
  "factures": [
    {
      "id": "facture:{uuid}",
      "nfacture": "string",        // Numéro de facture
      "date_facture": "ISO8601",
      "date_echeance": "ISO8601",
      "montant_ttc": "number",     // Montant TTC
      "reste_a_payer": "number",   // Reste dû
      "statut": "string",          // "solde" | "en_relance" | "impaye" +> pas besoin.
      "created_at": "ISO8601"
    }
  ],
  
  // Relances envoyées pour ce dossier
  "relances": [
    {
      "id": "relance:{uuid}",
      "sequence_id": "string | null",
      "date_envoi": "ISO8601",
      "statut": "string",          // "envoyee" | "programme"
      "sujet": "string" +> je veux aussi le corps du message en entier. et aussi si manuel ou automatique. la date de création.
      
    }
  ],
  
  // Événements liés à ce dossier
  "events": [
    {
      "type": "string",            // "sync_impaye" | "relance" | etc.
      "date": "ISO8601",
      "description": "string",
      "user_id": "string"
    }
  ],
  
  // Statistiques calculées
  "stats": {
    "nb_factures": "number",
    "nb_factures_impayees": "number", +>cad avec rest-a-payer > 0.
    "montant_total_du": "number",
    "nb_relances": "number",
    "date_derniere_relance": "ISO8601 | null"
  },
  
  // Métadonnées
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Exemple concret

```json
{
  "_id": "demande:41987",
  "type": "demande",
  "reference": "41987",
  "date_creation": "2026-06-24T16:30:45.927Z",
  "statut": "solde",
  "client": {
    "id": "contact:5cFvx0d8eI",
    "nom": "OLINDO",
    "prenom": "Naomie",
    "email": "caroleolindo@icloud.com",
    "telephone": null,
    "type": null
  },
  "apporteur": {
    "id": "contact:VqDFyeLGQl",
    "nom": "WRETMAN NICE",
    "commission": 95.95,
    "commission_payee": false
  },
  "bien": {
    "adresse": "124 chemin Vieux de Gairaut Les Berges de Gairaut",
    "code_postal": "06100",
    "ville": "NICE"
  },
  "factures": [
    {
      "id": "facture:OntqH4guHI",
      "nfacture": "51178",
      "date_facture": "2026-06-24T00:00:00.000Z",
      "date_echeance": "2026-07-01T00:00:00.000Z",
      "montant_ttc": 959.5,
      "reste_a_payer": 959.5,
      "statut": "solde",
      "created_at": "2026-06-24T16:30:45.927Z"
    }
  ],
  "relances": [],
  "events": [
    {
      "type": "sync_impaye",
      "date": "2026-06-24T20:54:20.995Z",
      "description": "",
      "user_id": ""
    }
  ],
  "stats": {
    "nb_factures": 1,
    "nb_factures_impayees": 0,
    "montant_total_du": 959.5,
    "nb_relances": 0,
    "date_derniere_relance": null
  },
  "created_at": "2026-06-24T16:30:45.927Z",
  "updated_at": "2026-07-28T09:16:53.318Z"
}
```

### Champs obligatoires

- `_id` : Format `demande:{reference}`
- `type` : Toujours `"demande"`
- `reference` : Identifiant unique du dossier
- `statut` : `"en_relance"` ou `"solde"`
- `client` : Objet client (peut être `null` si non trouvé)
- `factures` : Tableau (peut être vide)

### Notes

- Le `client` est un **snapshot** du contact au moment de la migration. Les modifications futures du document `contact` ne sont pas répercutées ici.
- Les factures sont regroupées par `id_dossier` ou `payer_id` lors de la migration.
- Les événements de type `sync_impaye` sont créés automatiquement lors des synchronisations avec le système source.

---

## Document `contact`

Référentiel central des contacts (clients, apporteurs, etc.).

### Structure complète

```json
{
  "_id": "contact:{id}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "contact",
  "nom": "string",                 // Nom de famille ou raison sociale
  "prenom": "string",              // Prénom (vide pour les sociétés)
  "email": "string | null",
  "telephone": "string | null",
  "type_contact": "string",        // "client" | "apporteur" | etc.
  
  // Adresse postale
  "adresse": {
    "rue": "string",
    "ville": "string",
    "code_postal": "string",
    "pays": "string"               // Ex: "France"
  },
  
  // Statistiques
  "nb_demandes_actives": "number", // Nombre de demandes en_relance
  
  // Métadonnées
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Exemple concret

```json
{
  "_id": "contact:98qyheyUph",
  "type": "contact",
  "nom": "AGENCE MENTON IMMO",
  "prenom": "",
  "email": "info@menton-immo.com",
  "telephone": "0607637016",
  "type_contact": "client",
  "adresse": {
    "rue": "",
    "ville": "",
    "code_postal": "",
    "pays": "France"
  },
  "nb_demandes_actives": 6,
  "created_at": "2026-06-24T16:25:34.182Z",
  "updated_at": "2026-07-15T02:00:31.783Z"
}
```

### Champs obligatoires

- `_id` : Format `contact:{id}`
- `type` : Toujours `"contact"`
- `nom` : Nom ou raison sociale

---

## Document `sequence`

Configuration des séquences de relances automatiques.

### Structure complète

```json
{
  "_id": "sequence:{id}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "sequence",
  "nom": "string",                 // Nom descriptif
  "type_sequence": "string",        // "relances" | ...
  "niveau": "number",               // Niveau de la séquence (1, 2, etc.)
  "actif": "boolean",
  "validation_obligatoire": "boolean",
  "attribution_automatique": "boolean",
  "scenario": "string",             // Scénario associé (optionnel)
  
  // Configuration des emails
  "emails": [
    {
      "email_index": "number",      // Ordre dans la séquence
      "delai": "number",            // Jours relatif (négatif = avant échéance)
      "smtp": "string",             // ID du profil SMTP
      "to": "string",               // Destinataire (avec variables)
      "cc": "string",
      "frequence": "string",        // "hebdomadaire" | etc.
      
      // Scénarios d'email (format single, multiple, etc.)
      "scenarios": [
        {
          "format": "string",       // "single" | "multiple" | "both" | "broker"
          "active": "boolean",
          "smtp": "string",
          "cc": "string",
          "objet": "string",        // Sujet avec variables [[...]]
          "corps": "string"         // HTML avec variables
        }
      ]
    }
  ],
  
  // Configuration des règles (optionnel)
  "regles": "object",
  "groupes_regles": "array",
  
  // Métadonnées
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Variables disponibles dans les templates

Les templates d'email utilisent des variables entourées de `[[...]]` :

| Variable | Description |
|----------|-------------|
| `[[payeur_nom]]` | Nom du client |
| `[[payeur_prenom]]` | Prénom du client |
| `[[payeur_email]]` | Email du client |
| `[[payeur_civilite]]` | Civilité (M., Mme, etc.) |
| `[[numero_dossier]]` | Numéro de dossier |
| `[[nfacture]]` | Numéro de facture |
| `[[date_echeance]]` | Date d'échéance (avec format) |
| `[[montant_total]]` | Montant TTC |
| `[[reste_a_payer]]` | Reste dû |
| `[[adresse_bien]]` | Adresse du bien |
| `[[code_postal]]` | Code postal |
| `[[ville]]` | Ville |
| `[[apporteur_nom]]` | Nom de l'apporteur |
| `[[lien_pdf]]` | Lien vers le PDF de la facture |

---

## Document `smtp_profile`

Configuration des serveurs SMTP pour l'envoi d'emails.

### Structure complète

```json
{
  "_id": "smtp:{id}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "smtp_profile",
  "nom": "string",                 // Nom descriptif
  "host": "string",                // Serveur SMTP
  "port": "number",                // Port (587, 465, etc.)
  "secure": "boolean",             // TLS/SSL
  "username": "string",            // Login SMTP
  "password_encrypted": "string",  // Mot de passe (chiffré ou placeholder)
  "from_email": "string",          // Adresse d'expédition
  "from_name": "string",           // Nom d'affichage
  "signature_html": "string",      // HTML de signature d'email
  "actif": "boolean",
  "is_default": "boolean",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Exemple concret

```json
{
  "_id": "smtp:YPsNANpWhC",
  "type": "smtp_profile",
  "nom": "EX'IM - comptabilité",
  "host": "mail.infomaniak.com",
  "port": 587,
  "secure": false,
  "username": "comptabilite@adti06.com",
  "password_encrypted": "[ENCRYPTED]",
  "from_email": "comptabilite@adti06.com",
  "from_name": "Service comptable",
  "signature_html": "<table>...</table>",
  "actif": true,
  "is_default": false,
  "created_at": "2026-03-16T20:13:28.346Z",
  "updated_at": "2026-05-26T20:27:06.710Z"
}
```

**⚠️ Important** : Le mot de passe est marqué comme `[ENCRYPTED]` ou `[MIGRATION_REQUISE]`. Une implémentation de chiffrement est nécessaire avant utilisation en production.

---

## Document `user`

Utilisateurs du système (authentification).

### Structure complète

```json
{
  "_id": "user:{id}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "user",
  "username": "string",
  "email": "string",
  "password_hash": "string",        // Haché ou placeholder
  "role": "string",                 // "admin" | "user" | etc.
  "is_active": "boolean",
  "last_login": "ISO8601 | null",
  "login_count": "number",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "must_reset_password": "boolean" // Force le changement de mot de passe
}
```

### Exemple concret

```json
{
  "_id": "user:admin",
  "type": "user",
  "username": "admin",
  "email": "admin@marki.local",
  "password_hash": "[MIGRATION_REQUISE]",
  "role": "admin",
  "is_active": true,
  "last_login": null,
  "login_count": 0,
  "created_at": "2026-07-28T09:17:08.368Z",
  "updated_at": "2026-07-28T09:17:08.368Z",
  "must_reset_password": true
}
```

**⚠️ Important** : Aucun utilisateur n'existait dans SQLite. Un utilisateur `admin` est créé par défaut avec `must_reset_password: true`. Il faut configurer les vrais utilisateurs avec des mots de passe sécurisés.

---

## Relations entre documents

### Modèle de données

```
┌─────────────────┐         ┌─────────────────┐
│   demande       │         │    contact      │
├─────────────────┤         ├─────────────────┤
│ client.id ──────┼────────►│ _id             │
│ apporteur.id ───┼────────►│ _id             │
└─────────────────┘         └─────────────────┘
         │                           ▲
         │                           │
         │                  ┌────────┴────────┐
         │                  │                 │
┌────────▼────────┐         │    ┌────────────┴──┐
│   factures[]    │         │    │   sequences     │
│   relances[]    │         │    ├─────────────────┤
│   events[]      │         │    │ emails[].smtp ──┼──► smtp_profile
└─────────────────┘         │    └─────────────────┘
                            │
                            │    ┌─────────────────┐
                            │    │  smtp_profile   │
                            │    ├─────────────────┤
                            │    │ _id             │
                            │    └─────────────────┘
                            │
                            │    ┌─────────────────┐
                            └───►│     user        │
                                 ├─────────────────┤
                                 │ _id             │
                                 └─────────────────┘
```

### Points clés

1. **Références par ID** : Les liens entre documents utilisent le format `{type}:{id}` (ex: `contact:5cFvx0d8eI`)

2. **Snapshots vs Références** :
   - Dans `demande.client` : Snapshot (données dupliquées pour performance)
   - Dans `demande.apporteur.id` : Référence vers le document contact

3. **Agrégation** : Une `demande` contient les tableaux `factures[]`, `relances[]` et `events[]` directement intégrés

---

## Exemples de requêtes

### Via HTTP (cURL)

#### Récupérer une demande spécifique
```bash
curl http://oswald:Citron6-Mustang8@localhost:5984/marki2/demande:41987 | jq '.'
```

#### Lister les demandes en relance
```bash
curl "http://oswald:Citron6-Mustang8@localhost:5984/marki2/_design/demandes/_view/par_statut?key='en_relance'" | jq '.'
```

#### Rechercher les demandes d'un client
```bash
curl "http://oswald:Citron6-Mustang8@localhost:5984/marki2/_design/demandes/_view/par_client?key='contact:5cFvx0d8eI'" | jq '.'
```

#### Compter les documents par type
```bash
curl "http://oswald:Citron6-Mustang8@localhost:5984/marki2/_all_docs?include_docs=true" | \
  jq '.rows | group_by(.doc.type) | map({type: .[0].doc.type, count: length})'
```

### Via PouchDB (JavaScript)

```javascript
const db = new PouchDB('http://localhost:5984/marki2');

// Récupérer une demande
const demande = await db.get('demande:41987');

// Requête avec vue
const result = await db.query('demandes/par_statut', {
  key: 'en_relance',
  include_docs: true
});

// Recherche par client
const clientDemandes = await db.find({
  selector: {
    type: 'demande',
    'client.id': 'contact:5cFvx0d8eI'
  }
});
```

---

## Index et Vues

### Design Document : `demandes`

| Vue | Description | Clé |
|-----|-------------|-----|
| `par_statut` | Demandes par statut | `statut` |
| `par_client` | Demandes par client | `client.id` |
| `par_reference` | Demandes par référence | `reference` |
| `par_date_creation` | Demandes par date | `date_creation` |
| `par_apporteur` | Demandes par apporteur | `apporteur.id` |
| `montant_total` | Somme des montants (reduce) | - |

### Design Document : `contacts`

| Vue | Description | Clé |
|-----|-------------|-----|
| `par_type` | Contacts par type | `type_contact` |
| `par_nom` | Contacts par nom | `nom` |
| `par_email` | Contacts par email | `email` |
| `avec_demandes_actives` | Contacts avec demandes actives | - |

---

## Migration depuis SQLite

### Mapping des tables

| Table SQLite | Document CouchDB | Transformation |
|--------------|------------------|----------------|
| `impayes` | `demande.factures[]` | Groupé par dossier |
| `contacts` | `contact` | 1:1 avec ajout stats |
| `relances` | `demande.relances[]` | Intégré dans demande |
| `events` | `demande.events[]` | Intégré dans demande |
| `sequences` | `sequence` | 1:1 avec parsing JSON |
| `smtp_profiles` | `smtp_profile` | 1:1 avec password placeholder |
| `users` | `user` | Créé par défaut (n'existait pas) |

---

## Validation et contraintes

### Règles de validation recommandées

1. **Demande** :
   - `reference` doit être unique
   - `statut` ∈ {"en_relance", "solde"}
   - `factures` doit être un tableau non null

2. **Contact** :
   - `email` doit être unique (si renseigné)
   - `type_contact` ∈ {"client", "apporteur", "prospect", ...}

3. **Sequence** :
   - `emails` doit être un tableau ordonné par `email_index`
   - `delai` en jours (négatif = avant échéance)

---

*Document généré le 29 juillet 2026 pour la base marki2*
