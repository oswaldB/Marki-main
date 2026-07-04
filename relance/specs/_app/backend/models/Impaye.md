# Modèle: Impaye (Parse) - Complément

**Classe** : `Impaye`  
**Feature** : F-008 (Blacklist)  

## Description

Complément du modèle Impaye avec les champs ajoutés pour la gestion de la blacklist (F-008).

## Nouveaux champs (F-008)

### Blacklist

| Champ | Type | Description |
|-------|------|-------------|
| `isBlacklisted` | Boolean | Impayé exclu des relances |
| `blacklistedAt` | Date | Date de mise en blacklist |
| `blacklistMotif` | String | Raison détaillée |
| `blacklistMotifType` | String | Type prédéfini: "litige", "arrangement", "contestation", "procedure", "annulation", "autre" |
| `blacklistedBy` | Pointer(User) | Utilisateur ayant blacklisté |
| `unblacklistedAt` | Date | Date de retrait de la blacklist |
| `unblacklistedBy` | Pointer(User) | Utilisateur ayant déblacklisté |

### Séquence assignée

| Champ | Type | Description |
|-------|------|-------------|
| `sequence` | Pointer(SequenceRelance) | Séquence de relance assignée |
| `dateAssignationSequence` | Date | Date d'assignation |

## Hooks

### Avant sauvegarde (F-008)

```javascript
Parse.Cloud.beforeSave('Impaye', (request) => {
  const impaye = request.object
  
  // Si mise en blacklist
  if (impaye.dirty('isBlacklisted') && impaye.get('isBlacklisted')) {
    // Vérifier qu'un motif est fourni
    if (!impaye.get('blacklistMotif') && !impaye.get('blacklistMotifType')) {
      throw new Error('Motif de blacklist obligatoire')
    }
    
    // Définir la date si non fournie
    if (!impaye.get('blacklistedAt')) {
      impaye.set('blacklistedAt', new Date())
    }
  }
  
  // Si retrait de blacklist
  if (impaye.dirty('isBlacklisted') && !impaye.get('isBlacklisted')) {
    impaye.set('unblacklistedAt', new Date())
    impaye.unset('blacklistMotif')
    impaye.unset('blacklistMotifType')
  }
})
```

## Requêtes typiques (F-008)

### Impayés non blacklistés

```javascript
const query = new Parse.Query('Impaye')
query.notEqualTo('isBlacklisted', true)
query.equalTo('facture_soldee', false)
```

### Impayés blacklistés

```javascript
const query = new Parse.Query('Impaye')
query.equalTo('isBlacklisted', true)
query.descending('blacklistedAt')
```

### Impayés par motif

```javascript
const query = new Parse.Query('Impaye')
query.equalTo('blacklistMotifType', 'litige')
```

## Vérification avant relance

```javascript
async function canRelancer(impayeId) {
  const Impaye = Parse.Object.extend('Impaye')
  const impaye = await new Parse.Query(Impaye).get(impayeId)
  
  if (impaye.get('isBlacklisted')) {
    const motif = impaye.get('blacklistMotif') || 'Non spécifié'
    throw new Error(`Impayé blacklisté: ${motif}`)
  }
  
  return true
}
```
