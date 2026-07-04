# Workflow Backend: generate-relances

**Feature** : F-010 Génération automatique des relances  
**Type** : Backend (CRON quotidien)  
**Architecture** : Flat Files (LokiJS + YAML)

---

## Description

Workflow backend quotidien qui génère automatiquement les relances à partir des impayés selon les séquences configurées (J+15, J+30, etc.).

## Déclencheurs

- **CRON** : Tous les jours à 08:00 (`0 8 * * *`)
- **Manuel** : Via endpoint `POST /api/relances/generate`

## Input

```javascript
{
  force: Boolean  // Force la régénération même si déjà exécuté aujourd'hui
}
```

---

## Étapes / Checkpoints

### Étape 1: Récupération des séquences actives

**Code**:
```javascript
const sequences = db.getCollection('sequences')
  .find({ est_active: true })
  .sort((a, b) => a.niveau - b.niveau);
```

**CHECKPOINT**: `generate-relances-sequences-loaded`
```json
{ "count": 3, "sequences": ["Relance J+15", "Relance J+30", "Mise en demeure"] }
```

---

### Étape 2: Pour chaque séquence, identifier les impayés éligibles

**Code**:
```javascript
const maintenant = new Date();

for (const sequence of sequences) {
  const dateLimite = new Date(maintenant);
  dateLimite.setDate(dateLimite.getDate() - sequence.delai_jours);
  
  // Query LokiJS avec index
  let impayes = db.getCollection('impayes').find({
    date_echeance: { $lte: dateLimite.toISOString().split('T')[0] },
    est_en_retard: true
  });
```

---

### Étape 3: Application des filtres

**Filtre 1** : Exclusion des impayés blacklistés
```javascript
impayes = impayes.filter(impaye => !impaye.is_blacklisted);
```

**Filtre 2** : Exclusion des contacts blacklistés
```javascript
impayes = impayes.filter(impaye => {
  const contact = db.getCollection('contacts').findOne({ 
    payer_id: impaye.payer_id,
    est_contact_relance: true 
  });
  return contact && !contact.is_blacklisted;
});
```

**Filtre 3** : Exclusion des déjà relancés
```javascript
// Vérifier si une relance existe déjà pour ce contact/séquence/récent
const recentRelances = db.getCollection('relances').find({
  sequence_id: sequence.id,
  created_at: { $gte: dateLimite.toISOString() }
});

const contactsAlreadyRelanced = new Set(recentRelances.map(r => r.contact_id));

impayes = impayes.filter(impaye => {
  const contact = db.getCollection('contacts').findOne({ 
    payer_id: impaye.payer_id,
    est_contact_relance: true 
  });
  return !contactsAlreadyRelanced.has(contact?.id);
});
```

**Filtre 4** : Exclusion sans email
```javascript
impayes = impayes.filter(impaye => {
  const contact = db.getCollection('contacts').findOne({ 
    payer_id: impaye.payer_id,
    est_contact_relance: true 
  });
  return contact?.email;
});
```

**CHECKPOINT**: `generate-relances-filters-applied`
```json
{ 
  "sequence": "Relance J+15",
  "beforeFilter": 45,
  "afterFilter": 12
}
```

---

### Étape 4: Regroupement par contact

```javascript
const relancesParContact = new Map();

for (const impaye of impayes) {
  const contact = db.getCollection('contacts').findOne({ 
    payer_id: impaye.payer_id,
    est_contact_relance: true 
  });
  if (!contact) continue;
  
  const contactId = contact.id;
  if (!relancesParContact.has(contactId)) {
    const payer = db.getCollection('payers').findOne({ id: impaye.payer_id });
    relancesParContact.set(contactId, {
      contact,
      payer,
      impayes: [],
      montantTotal: 0
    });
  }
  
  const groupe = relancesParContact.get(contactId);
  groupe.impayes.push(impaye);
  groupe.montantTotal += impaye.reste_a_payer || 0;
}
```

---

### Étape 5: Création des relances (YAML)

```javascript
for (const [contactId, groupe] of relancesParContact) {
  // Génération du contenu avec templates
  const templateSujet = sequence.template_sujet;
  const templateCorps = sequence.template_corps;
  
  const variables = {
    '{{contact_nom}}': groupe.payer?.nom || groupe.contact.nom,
    '{{montant_total}}': groupe.montantTotal.toFixed(2),
    '{{nb_factures}}': groupe.impayes.length,
    '{{date_jour}}': new Date().toLocaleDateString('fr-FR')
  };
  
  let sujet = templateSujet;
  let corps = templateCorps;
  
  for (const [key, value] of Object.entries(variables)) {
    sujet = sujet.replaceAll(key, value);
    corps = corps.replaceAll(key, value);
  }
  
  // Générer ID
  const relanceId = generateNextId('relances');
  
  // Créer objet relance
  const relance = {
    id: relanceId,
    type: 'relance',
    contact_id: parseInt(contactId),
    impaye_ids: groupe.impayes.map(i => i.id),
    sequence_id: sequence.id,
    sujet,
    contenu: corps,
    cc: '',
    valide: false,
    envoyee: false,
    statut: 'brouillon',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Insertion LokiJS
  db.getCollection('relances').insert(relance);
  
  // Sauvegarde YAML avec lock
  await saveToYaml('relances', relance);
}
```

**CHECKPOINT**: `relances-generated`
```json
{ 
  "count": 12, 
  "sequence": "Relance J+15",
  "montantTotal": 152340.50
}
```

---

### Étape 6: Notification (optionnel)

```javascript
// Log de l'activité
const logEntry = {
  id: generateNextId('logs'),
  type: 'activity_log',
  activity_type: 'relances_generees',
  details: `${totalRelances} relances générées`,
  metadata: { 
    sequences: resultats,
    date: new Date().toISOString()
  },
  created_at: new Date().toISOString()
};

db.getCollection('logs').insert(logEntry);
await saveToYaml('logs', logEntry);
```

**CHECKPOINT**: `generate-relances-completed`
```json
{ 
  "totalRelances": 34,
  "bySequence": [
    { "sequence": "Relance J+15", "count": 12 },
    { "sequence": "Relance J+30", "count": 18 },
    { "sequence": "Mise en demeure", "count": 4 }
  ],
  "duration": "2.3s"
}
```

---

## Output

```javascript
{
  success: true,
  total: 34,
  details: [
    { sequence: 'Relance J+15', count: 12 },
    { sequence: 'Relance J+30', count: 18 },
    { sequence: 'Mise en demeure', count: 4 }
  ]
}
```

---

## Gestion des erreurs

**CHECKPOINT**: `generate-relances-failed`
```json
{
  "error": "Lock timeout",
  "sequence": "Relance J+15",
  "step": "creating-relances",
  "partialCount": 5
}
```

---

## Helpers

### Génération d'ID
```javascript
function generateNextId(collection) {
  const docs = db.getCollection(collection).find();
  const maxId = docs.reduce((max, doc) => Math.max(max, doc.id || 0), 0);
  return maxId + 1;
}
```

### Sauvegarde YAML avec lock
```javascript
async function saveToYaml(type, data) {
  const lockfile = require('proper-lockfile');
  const yaml = require('js-yaml');
  const fs = require('fs');
  const path = require('path');
  
  const filePath = path.join(DATA_DIR, type, `${type}_${data.id}.yml`);
  const lockPath = `${filePath}.lock`;
  
  await lockfile.lock(lockPath, { stale: 5000 });
  try {
    fs.writeFileSync(filePath, yaml.dump(data, { sortKeys: true }));
  } finally {
    await lockfile.unlock(lockPath).catch(() => {});
  }
}
```

---

## Métriques

- Nombre de relances générées par jour
- Taux d'exclusion par filtre
- Temps d'exécution moyen
- Montant total des relances générées
- Erreurs de locking
