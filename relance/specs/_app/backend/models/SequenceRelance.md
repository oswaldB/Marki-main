# Modèle: SequenceRelance (Parse)

**Classe** : `SequenceRelance`  
**Feature** : F-011  

## Description

Représente une séquence de relances configurée (J+15, J+30, etc.) avec ses templates d'email.

## Champs

### Identification

| Champ | Type | Description |
|-------|------|-------------|
| `objectId` | String | ID unique |
| `createdAt` | Date | Date de création |
| `updatedAt` | Date | Date de modification |

### Configuration

| Champ | Type | Description |
|-------|------|-------------|
| `nom` | String | Nom affiché (ex: "Relance amicale") |
| `type` | String | "relances" ou "suivi" |
| `niveau` | Number | Ordre dans la séquence (1, 2, 3...) |
| `delaiJours` | Number | Jours après échéance (pour relances) |
| `frequence` | Object | { type, hour, dayOfWeek, dayOfMonth } (pour suivi) |

### Templates

| Champ | Type | Description |
|-------|------|-------------|
| `templateSujet` | String | Template de l'objet avec variables |
| `templateCorps` | String | Template HTML du corps |

### Configuration avancée

| Champ | Type | Description |
|-------|------|-------------|
| `emails` | Array | Liste des emails avec scénarios (voir structure ci-dessous) |
| `groupesRegles` | Array | Règles d'attribution automatique (suivi) |
| `attributionAutomatique` | Boolean | Attribution auto activée |

### Statut

| Champ | Type | Description |
|-------|------|-------------|
| `estActive` | Boolean | Séquence active/inactive |
| `description` | String | Description interne |

## Structure des emails

```javascript
{
  delai: 15,
  to: '<%= payeur_email %>',
  activeScenario: 'single',
  scenarios: [
    {
      format: 'single',
      active: true,
      smtp: 'smtp_xxx',
      cc: '',
      objet: 'Rappel facture...',
      corps: '<p>Bonjour...</p>'
    },
    {
      format: 'multiple',
      active: true,
      smtp: 'smtp_xxx',
      cc: '',
      objet: '...',
      corps: '...'
    },
    {
      format: 'both',
      active: false,
      smtp: null,
      cc: '',
      objet: '',
      corps: ''
    },
    {
      format: 'broker',
      active: false,
      smtp: null,
      cc: '',
      objet: '',
      corps: ''
    }
  ]
}
```

## Structure des règles d'attribution

```javascript
{
  logique: 'ET', // ou 'OU'
  regles: [
    {
      champ: 'payeur_type',
      operateur: 'egal',
      valeur: ['entreprise', 'particulier'],
      options: [...] // Options dynamiques
    }
  ]
}
```

## Indexes

```javascript
// Par type et niveau (pour ordre d'affichage)
query.ascending('type', 'niveau')

// Actives seulement
query.equalTo('estActive', true)
```

## Hooks

### Avant suppression

```javascript
Parse.Cloud.beforeDelete('SequenceRelance', async (request) => {
  const sequence = request.object
  
  // Vérifier si des relances utilisent cette séquence
  const Relance = Parse.Object.extend('Relance')
  const query = new Parse.Query(Relance)
  query.equalTo('sequence', sequence)
  const count = await query.count()
  
  if (count > 0) {
    throw new Error(`Impossible de supprimer: ${count} relances liées`)
  }
})
```

## Requêtes typiques

### Séquences actives par type

```javascript
const query = new Parse.Query('SequenceRelance')
query.equalTo('estActive', true)
query.equalTo('type', 'relances')
query.ascending('niveau')
```
