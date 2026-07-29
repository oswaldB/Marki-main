# Document `contact`

Référentiel central des contacts (clients, apporteurs, propriétaires, etc.). Un contact peut être une personne physique ou une société.

## Structure JSON complète

```json
{
  "_id": "contact:{id}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "contact",
  "nom": "string",
  "prenom": "string",
  "email": "string | null",
  "telephone": "string | null",
  "type_contact": "string",
  "adresse": {
    "rue": "string",
    "ville": "string",
    "code_postal": "string",
    "pays": "string"
  },
  "nb_demandes_actives": "number",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Description des champs

### Identification

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | `string` | Format: `contact:{id}` (ex: `contact:98qyheyUph`) |
| `type` | `string` | Toujours `"contact"` |

### Informations générales

| Champ | Type | Description |
|-------|------|-------------|
| `nom` | `string` | Nom de famille ou raison sociale |
| `prenom` | `string` | Prénom (vide pour les sociétés) |
| `email` | `string\|null` | Adresse email principale |
| `telephone` | `string\|null` | Numéro de téléphone |
| `type_contact` | `string` | Catégorie: `"client"`, `"apporteur"`, `"prospect"`, etc. |

### Adresse

| Champ | Type | Description |
|-------|------|-------------|
| `adresse.rue` | `string` | Rue et numéro |
| `adresse.ville` | `string` | Ville |
| `adresse.code_postal` | `string` | Code postal |
| `adresse.pays` | `string` | Pays (ex: `"France"`) |

### Statistiques

| Champ | Type | Description |
|-------|------|-------------|
| `nb_demandes_actives` | `number` | Nombre de demandes avec statut `"en_relance"` liées à ce contact |

### Métadonnées

| Champ | Type | Description |
|-------|------|-------------|
| `created_at` | `ISO8601` | Date de création dans le système |
| `updated_at` | `ISO8601` | Date de dernière modification |

## Exemple concret

### Contact société

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
    "rue": "15 rue de la République",
    "ville": "MENTON",
    "code_postal": "06500",
    "pays": "France"
  },
  "nb_demandes_actives": 6,
  "created_at": "2026-06-24T16:25:34.182Z",
  "updated_at": "2026-07-15T02:00:31.783Z"
}
```

### Contact personne physique

```json
{
  "_id": "contact:5cFvx0d8eI",
  "type": "contact",
  "nom": "OLINDO",
  "prenom": "Naomie",
  "email": "caroleolindo@icloud.com",
  "telephone": "0687654321",
  "type_contact": "client",
  "adresse": {
    "rue": "124 chemin Vieux de Gairaut",
    "ville": "NICE",
    "code_postal": "06100",
    "pays": "France"
  },
  "nb_demandes_actives": 1,
  "created_at": "2026-06-24T16:25:34.182Z",
  "updated_at": "2026-07-15T02:00:31.783Z"
}
```

## Champs obligatoires

- `_id` : Format `contact:{id}`
- `type` : `"contact"`
- `nom` : Nom ou raison sociale (non vide)

## Types de contact

Valeurs courantes pour `type_contact` :

| Valeur | Description |
|--------|-------------|
| `"client"` | Client payeur (factures à son nom) |
| `"apporteur"` | Apporteur d'affaires (agence immobilière, etc.) |
| `"prospect"` | Prospect non encore client |
| `"proprietaire"` | Propriétaire du bien |
| `"mandataire"` | Mandataire / représentant légal |

## Relations

Les contacts sont référencés depuis :

- `demande.client.id` → Contact payeur
- `demande.apporteur.id` → Contact apporteur

## Notes importantes

1. **Unicité** : L'email, lorsqu'il est renseigné, doit être unique dans le système.

2. **Snapshot dans demande** : Les documents `demande` contiennent des snapshots du contact (dans `client` et `apporteur`). Modifier un `contact` ne met pas à jour automatiquement les demandes existantes.

3. **Mise à jour de `nb_demandes_actives`** : Ce compteur doit être recalculé lorsque :
   - Une demande passe de `"en_relance"` à `"solde"`
   - Une nouvelle demande est créée avec le statut `"en_relance"`

---

*Document généré pour marki2*
