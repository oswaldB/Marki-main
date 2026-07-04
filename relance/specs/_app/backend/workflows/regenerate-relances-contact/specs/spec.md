# Workflow Backend: regenerate-relances-contact

**Feature** : F-008 Blacklist des Impayés  
**Type** : Backend (API endpoint)  
**Architecture** : Flat Files (LokiJS + YAML)

## Description

Régénère les relances d'un contact après un changement de statut blacklist d'un de ses impayés. Supprime les relances brouillons existantes et recalcule les relances selon les nouveaux critères.

## Input

```javascript
{
  contactId: Number,        // ID du contact concerné
  excludeImpayeId: Number     // ID de l'impayé à exclure (si blacklist), null si unblacklist
}
```

## Étapes

### 1. Récupération du contact et de ses impayés

```javascript
const contact = db.getCollection('contacts').findOne({ id: contactId });

if (!contact) {
  throw new Error('Contact non trouvé');
}

// Récupérer les impayés non soldés du payer
const impayes = db.getCollection('impayes').find({
  payer_id: contact.payer_id,
  reste_a_payer: { $gt: 0 },
  is_blacklisted: false
});

// Si excludeImpayeId fourni, exclure cet impayé
const filteredImpayes = excludeImpayeId 
  ? impayes.filter(i => i.id !== excludeImpayeId)
  : impayes;
```

**CHECKPOINT**: `regenerate-contact-loaded`
```json
{ 
  "contactId": 1, 
  "impayesCount": 5,
  "excludedImpayeId": 3
}
```

### 2. Récupération des relances brouillons

```javascript
const brouillons = db.getCollection('relances').find({
  contact_id: contactId,
  statut: { $in: ['brouillon', 'valide'] },
  envoyee: false
});
```

**CHECKPOINT**: `regenerate-contact-brouillons-found`
```json
{ "count": 3 }
```

### 3. Suppression des relances brouillons (YAML)

```javascript
if (brouillons.length > 0) {
  for (const relance of brouillons) {
    // Supprimer du système de fichiers
    await deleteYaml('relances', relance.id);
    
    // Supprimer de LokiJS
    db.getCollection('relances').remove(relance);
  }
}
```

**CHECKPOINT**: `regenerate-contact-brouillons-deleted`
```json
{ "deletedCount": 3 }
```

### 4. Cas d'arrêt - Pas d'impayés à relancer

```javascript
// Si aucun impayé à relancer (tous blacklistés ou soldés)
if (filteredImpayes.length === 0) {
  return {
    success: true,
    contactId,
    deletedCount: brouillons.length,
    createdCount: 0,
    reason: 'no_impayes_to_relance'
  };
}
```

**CHECKPOINT**: `regenerate-contact-no-impayes`
```json
{ "reason": "no_impayes_to_relance" }
```

### 5. Déclenchement de la génération des relances

```javascript
// Appeler generate-relances pour ce contact spécifiquement
const result = await generateRelancesForContact({
  contactId,
  impayes: filteredImpayes
});
```

**CHECKPOINT**: `regenerate-contact-generated`
```json
{ 
  "contactId": 1,
  "createdCount": 2
}
```

### 6. Journalisation (YAML)

```javascript
const logEntry = {
  id: generateNextId('logs'),
  type: 'activity_log',
  activity_type: 'relances_regenerees_contact',
  details: 'Régénération des relances après blacklist/unblacklist',
  metadata: { 
    deletedCount: brouillons.length,
    createdCount: result.createdCount,
    excludedImpayeId: excludeImpayeId,
    contactId: contactId
  },
  created_at: new Date().toISOString()
};

db.getCollection('logs').insert(logEntry);
await saveToYaml('logs', logEntry);
```

**CHECKPOINT**: `regenerate-contact-completed`

## Output

```javascript
{
  success: true,
  contactId: 1,
  deletedCount: 3,      // Relances brouillons supprimées
  createdCount: 2,      // Nouvelles relances créées
  reason: null          // Si arrêt prématuré (no_impayes_to_relance)
}
```

## Règles métier

- Les relances **déjà envoyées** ne sont jamais touchées
- Les relances **annulées** ne sont pas supprimées
- Seules les relances en **brouillon** ou **validées** mais non envoyées sont supprimées
- Si `excludeImpayeId` est fourni, cet impayé est exclu de la nouvelle génération
- Si aucun impayé n'est éligible après filtrage, aucune nouvelle relance n'est créée

## Gestion des erreurs

```javascript
{
  success: false,
  error: "Contact non trouvé",
  code: "CONTACT_NOT_FOUND"
}

{
  success: false,
  error: "Erreur lors de la suppression des relances",
  code: "DELETE_ERROR"
}

{
  success: false,
  error: "Lock timeout lors de la suppression",
  code: "LOCK_ERROR"
}
```

## Helpers

### Suppression YAML avec lock
```javascript
async function deleteYaml(type, id) {
  const lockfile = require('proper-lockfile');
  const fs = require('fs');
  const path = require('path');
  
  const filePath = path.join(DATA_DIR, type, `${type}_${id}.yml`);
  const lockPath = `${filePath}.lock`;
  
  await lockfile.lock(lockPath, { stale: 5000 });
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } finally {
    await lockfile.unlock(lockPath).catch(() => {});
  }
}
```

---

## Scénarios de test

### Scénario 1 : Blacklist avec relances existantes
**Given** : Contact avec 3 impayés (A, B, C), relances brouillons existantes  
**When** : `regenerateRelancesForContact(contactId, impayeA.id)` appelé  
**Then** :
1. Relances brouillons supprimées (3)
2. Nouvelles relances générées pour B et C uniquement (2)
3. Impaye A exclu

### Scénario 2 : Unblacklist
**Given** : Contact avec impayés B, C (A était blacklisté, maintenant déblacklisté)  
**When** : `regenerateRelancesForContact(contactId, null)` appelé  
**Then** :
1. Relances brouillons supprimées
2. Nouvelles relances générées pour A, B, C (3)
3. Aucun impayé exclu

### Scénario 3 : Tous les impayés blacklistés
**Given** : Contact avec 2 impayés, tous les deux blacklistés  
**When** : Appel avec exclusion d'un impayé  
**Then** :
1. Relances brouillons supprimées (2)
2. Pas de nouvelles relances créées
3. Retour avec `reason: 'no_impayes_to_relance'`

### Scénario 4 : Pas de relances existantes
**Given** : Contact sans relances brouillons  
**When** : Appel régénération  
**Then** :
1. `deletedCount: 0`
2. Relances générées normalement
3. Pas d'erreur
