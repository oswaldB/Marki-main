# Document `demande`

Le document `demande` est le cœur du système. Il regroupe toutes les données liées à un client (payeur) : ses dossiers (biens/missions), les factures impayées, les relances envoyées et l'historique des événements.

## Structure conceptuelle

```
Demande (niveau client/payeur)
├── Client (payeur) - snapshot
├── Apporteur d'affaires - snapshot (sans commission)
├── Dossiers[] (un dossier = un bien + une mission)
│   └── Dossier
│       ├── Référence dossier
│       ├── Mission
│       │   ├── contexte (LOC, AVV...)
│       │   ├── type_intervention (amiante, carrez, plomb...)
│       │   ├── date_intervention
│       │   ├── intervenant
│       │   └── personne_sur_place
│       └── Bien (adresse complète + étage/porte/lot)
├── Factures[] - Toutes les factures du client
│   └── Facture
│       ├── numéro
│       ├── payeur (snapshot)
│       ├── dates
│       └── montants
├── Relances[] - emails envoyés
├── Events[] - historique des actions
└── Stats calculées
```

## Structure JSON complète

```json
{
  "_id": "demande:{reference}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "demande",
  "reference": "string",
  "date_creation": "ISO8601",
  "statut": "string",
  
  "client": {
    "id": "contact:{id}",
    "nom": "string",
    "prenom": "string",
    "email": "string | null",
    "telephone": "string | null",
    "type": "string | null"
  },
  
  "apporteur": {
    "id": "contact:{id}",
    "nom": "string"
  },
  
  "apporteur_payeur": "boolean",
  
  "dossiers": [
    {
      "id": "string",
      "id_externe": "string",
      "reference": "number",
      "mission": {
        "contexte": "string",
        "type_intervention": "string",
        "date_intervention": "ISO8601 | null",
        "intervenant": "string | null",
        "personne_sur_place": "string | null"
      },
      "bien": {
        "adresse": "string",
        "code_postal": "string",
        "ville": "string",
        "etage": "string | null",
        "porte": "string | null",
        "lot": "string | null"
      }
    }
  ],
  
  "factures": [
    {
      "id": "facture:{uuid}",
      "nfacture": "string",
      "payeur": {
        "nom": "string",
        "prenom": "string",
        "email": "string | null",
        "telephone": "string | null",
        "adresse": "string | null"
      },
      "date_facture": "ISO8601",
      "date_echeance": "ISO8601",
      "montant_ttc": "number",
      "reste_a_payer": "number",
      "created_at": "ISO8601"
    }
  ],
  
  "relances": [
    {
      "id": "relance:{uuid}",
      "dossier_id": "string | null",
      "sequence_id": "string | null",
      "date_envoi": "ISO8601",
      "date_creation": "ISO8601",
      "statut": "string",
      "sujet": "string",
      "corps": "string",
      "mode": "string"
    }
  ],
  
  "events": [
    {
      "type": "string",
      "date": "ISO8601",
      "description": "string",
      "user_id": "string"
    }
  ],
  
  "stats": {
    "nb_dossiers": "number",
    "nb_factures": "number",
    "nb_factures_impayees": "number",
    "montant_total_du": "number",
    "nb_relances": "number",
    "date_derniere_relance": "ISO8601 | null"
  },
  
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Description des champs

### Identification

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | `string` | Format: `demande:{reference}` (ex: `demande:41987`) |
| `type` | `string` | Toujours `"demande"` |
| `reference` | `string` | Numéro unique de la demande |
| `date_creation` | `ISO8601` | Date de création de la demande |
| `statut` | `string` | `"en_relance"` ou `"solde"` |

### Client (payeur)

Snapshot des informations du client au moment de la création de la demande.

| Champ | Type | Description |
|-------|------|-------------|
| `client.id` | `string` | Référence vers `contact:{id}` |
| `client.nom` | `string` | Nom de famille ou raison sociale |
| `client.prenom` | `string` | Prénom (vide pour société) |
| `client.email` | `string\|null` | Email principal |
| `client.telephone` | `string\|null` | Téléphone |
| `client.type` | `string\|null` | Type de contact |

### Apporteur

Snapshot de l'apporteur d'affaires (celui qui a apporté le client).

| Champ | Type | Description |
|-------|------|-------------|
| `apporteur.id` | `string` | Référence vers `contact:{id}` |
| `apporteur.nom` | `string` | Nom de l'apporteur/agence |
| `apporteur_payeur` | `boolean` | `true` si l'apporteur est aussi le payeur (client.id = apporteur.id) |

> **Note** : Les champs `commission` et `commission_payee` ont été supprimés - à gérer dans un système de comptabilité externe. Le champ `apporteur_payeur` permet d'identifier les cas où l'apporteur est aussi le client payeur.

### Dossiers

Tableau des dossiers liés à ce client. Chaque dossier représente un bien avec sa mission associée.

| Champ | Type | Description |
|-------|------|-------------|
| `dossiers[].id` | `string` | Identifiant unique interne (UUID) |
| `dossiers[].id_externe` | `string` | ID du dossier dans la base externe (ex: `id_dossier` SQLite) |
| `dossiers[].reference` | `number` | Numéro de référence du dossier (ex: `numero_dossier`) |
| `dossiers[].mission.contexte` | `string` | Contexte: `"LOC"` (location), `"AVV"` (vente), `"SCI"`, etc. |
| `dossiers[].mission.type_intervention` | `string` | Type: `"amiante"`, `"carrez"`, `"plomb"`, `"termites"`, etc. |
| `dossiers[].mission.date_intervention` | `ISO8601\|null` | Date prévue ou réalisée de l'intervention |
| `dossiers[].mission.intervenant` | `string\|null` | Nom de l'intervenant (technicien) |
| `dossiers[].mission.personne_sur_place` | `string\|null` | Nom de la personne présente sur place |
| `dossiers[].bien.adresse` | `string` | Rue et numéro |
| `dossiers[].bien.code_postal` | `string` | Code postal |
| `dossiers[].bien.ville` | `string` | Ville |
| `dossiers[].bien.etage` | `string\|null` | Étage (ex: "3ème", "RDC") |
| `dossiers[].bien.porte` | `string\|null` | Numéro de porte/appartement |
| `dossiers[].bien.lot` | `string\|null` | Numéro de lot (copropriété) |

### Factures

Tableau de toutes les factures du client, attachées directement à la demande.

| Champ | Type | Description |
|-------|------|-------------|
| `factures[].id` | `string` | Identifiant unique de la facture |
| `factures[].nfacture` | `string` | Numéro de facture affiché |
| `factures[].payeur.nom` | `string` | Nom du payeur (snapshot) |
| `factures[].payeur.prenom` | `string` | Prénom du payeur |
| `factures[].payeur.email` | `string\|null` | Email du payeur |
| `factures[].payeur.telephone` | `string\|null` | Téléphone du payeur |
| `factures[].payeur.adresse` | `string\|null` | Adresse du payeur |
| `factures[].date_facture` | `ISO8601` | Date d'émission |
| `factures[].date_echeance` | `ISO8601` | Date limite de paiement |
| `factures[].montant_ttc` | `number` | Montant total TTC |
| `factures[].reste_a_payer` | `number` | Montant restant dû |
| `factures[].created_at` | `ISO8601` | Date de création dans le système |

> **Note** : Pas de `dossier_id` dans la facture - les factures sont rattachées directement à la demande.
> 
> **Note** : Pas de champ `statut` - une facture est impayée si `reste_a_payer > 0`.

### Relances

Historique des emails de relance envoyés pour cette demande.

| Champ | Type | Description |
|-------|------|-------------|
| `relances[].id` | `string` | Identifiant unique de la relance |
| `relances[].dossier_id` | `string\|null` | Dossier concerné (si spécifique) |
| `relances[].sequence_id` | `string\|null` | ID de la séquence si envoyée via séquence automatique |
| `relances[].date_envoi` | `ISO8601` | Date d'envoi effectif |
| `relances[].date_creation` | `ISO8601` | Date de création/préparation |
| `relances[].statut` | `string` | `"envoyee"` ou `"programme"` |
| `relances[].sujet` | `string` | Sujet de l'email |
| `relances[].corps` | `string` | Corps complet du message (HTML) |
| `relances[].mode` | `string` | `"manuel"` ou `"automatique"` |

### Events

Journal des événements liés à la demande.

| Champ | Type | Description |
|-------|------|-------------|
| `events[].type` | `string` | Type d'événement (`sync_impaye`, `relance`, etc.) |
| `events[].date` | `ISO8601` | Date de l'événement |
| `events[].description` | `string` | Description détaillée |
| `events[].user_id` | `string` | ID de l'utilisateur ayant déclenché l'action |

### Statistiques

| Champ | Type | Description |
|-------|------|-------------|
| `stats.nb_dossiers` | `number` | Nombre de dossiers (biens) distincts |
| `stats.nb_factures` | `number` | Nombre total de factures |
| `stats.nb_factures_impayees` | `number` | Nombre de factures avec `reste_a_payer > 0` |
| `stats.montant_total_du` | `number` | Somme des `reste_a_payer` de toutes les factures |
| `stats.nb_relances` | `number` | Nombre de relances envoyées |
| `stats.date_derniere_relance` | `ISO8601\|null` | Date de la dernière relance envoyée |

## Exemple concret

```json
{
  "_id": "demande:CLIENT_001",
  "type": "demande",
  "reference": "CLIENT_001",
  "date_creation": "2026-06-24T16:30:45.927Z",
  "statut": "en_relance",
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
    "nom": "WRETMAN NICE"
  },
  "apporteur_payeur": false,
    {
      "id": "dos_abc123",
      "id_externe": "41987",
      "reference": 55993,
      "mission": {
        "contexte": "LOC",
        "type_intervention": "amiante",
        "date_intervention": "2026-06-15T09:00:00.000Z",
        "intervenant": "Jean Dupont",
        "personne_sur_place": "Mme Martin"
      },
      "bien": {
        "adresse": "124 chemin Vieux de Gairaut Les Berges de Gairaut",
        "code_postal": "06100",
        "ville": "NICE",
        "etage": "2ème",
        "porte": "42",
        "lot": "123"
      }
    }
  ],
  "factures": [
    {
      "id": "facture:OntqH4guHI",
      "nfacture": "51178",
      "payeur": {
        "nom": "OLINDO",
        "prenom": "Naomie",
        "email": "caroleolindo@icloud.com",
        "telephone": null,
        "adresse": "124 chemin Vieux de Gairaut, 06100 NICE"
      },
      "date_facture": "2026-06-24T00:00:00.000Z",
      "date_echeance": "2026-07-01T00:00:00.000Z",
      "montant_ttc": 959.5,
      "reste_a_payer": 959.5,
      "created_at": "2026-06-24T16:30:45.927Z"
    }
  ],
  "relances": [
    {
      "id": "relance:abc123",
      "dossier_id": "dos_abc123",
      "sequence_id": "sequence:zgPKAlVH65",
      "date_envoi": "2026-06-25T10:00:00.000Z",
      "date_creation": "2026-06-25T09:00:00.000Z",
      "statut": "envoyee",
      "sujet": "EX'IM - Dossier 41987 - Rappel de règlement",
      "corps": "<p>Bonjour...</p>",
      "mode": "automatique"
    }
  ],
  "events": [
    {
      "type": "sync_impaye",
      "date": "2026-06-24T20:54:20.995Z",
      "description": "Synchronisation depuis Sage",
      "user_id": "system"
    }
  ],
  "stats": {
    "nb_dossiers": 1,
    "nb_factures": 1,
    "nb_factures_impayees": 1,
    "montant_total_du": 959.5,
    "nb_relances": 1,
    "date_derniere_relance": "2026-06-25T10:00:00.000Z"
  },
  "created_at": "2026-06-24T16:30:45.927Z",
  "updated_at": "2026-07-28T09:16:53.318Z"
}
```

## Champs obligatoires

- `_id` : Format `demande:{reference}`
- `type` : `"demande"`
- `reference` : Identifiant unique
- `statut` : `"en_relance"` ou `"solde"`
- `client` : Objet client (peut être `null`)
- `dossiers` : Tableau (peut être vide `[]`)
- `factures` : Tableau (peut être vide `[]`)

## Notes importantes

1. **Hiérarchie** : Une demande regroupe les factures d'un même client, avec ses dossiers (biens + missions).

2. **Dossier** : Chaque dossier a un `id` interne (UUID) et un `id_externe` (référence dans la base source).

3. **Mission** : Objet complet avec contexte (LOC/AVV), type d'intervention, dates et personnes.

4. **Factures** : Rattachées directement à la demande, avec snapshot du payeur (peut différer du client de la demande).

5. **Client et Apporteur** : Ce sont des **snapshots** des contacts au moment de la migration.

6. **Factures impayées** : Une facture est impayée si `reste_a_payer > 0`.

7. **Relances** : Une relance peut être liée à un dossier spécifique via `dossier_id` (qui référence `dossiers[].id`).

---

*Document généré pour marki2*
