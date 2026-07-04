# Modèle: SequenceRelance (YAML Flat Files)

**Type** : YAML  
**Fichier** : `sequence_{id}.yml`  
**Feature** : F-011

---

## Description

Représente une séquence de relances configurée (J+15, J+30, etc.) avec ses templates d'email.

---

## Structure YAML

```yaml
id: 1
type: "sequence"

# Identification
nom: "Relance J+15"
reference: "relance_j15"     # Identifiant technique

# Configuration
delai_jours: 15              # Jours après échéance pour déclencher
niveau: 1                    # Ordre dans la séquence (1, 2, 3...)
est_active: true

# Templates
template_sujet: "Relance {{contact_nom}} - {{nb_factures}} factures impayées"
template_corps: |
  <p>Bonjour {{contact_nom}},</p>
  <p>Nous vous rappelons que vous avez {{nb_factures}} factures impayées 
  pour un montant total de {{montant_total}}€.</p>
  <p>Nous vous prions de bien vouloir régulariser votre situation.</p>
  <p>Cordialement,</p>

# Variables disponibles
# {{contact_nom}} - Nom du payer/contact
# {{montant_total}} - Montant total des impayés
# {{nb_factures}} - Nombre de factures impayées
# {{date_jour}} - Date du jour
# {{date_echeance}} - Date d'échéance la plus ancienne

# Emails configurés (optionnel, pour séquences avancées)
emails:
  - delai: 15
    to: "{{contact_email}}"
    active_scenario: "single"
    scenarios:
      - format: "single"
        active: true
        smtp: "default"
        objet: "Relance facture"
        corps: "<p>Bonjour..."

# Description interne
description: "Première relance amicale envoyée 15 jours après échéance"

# Métadonnées
created_at: "2026-06-01T10:00:00Z"
updated_at: "2026-06-15T14:30:00Z"
```

---

## Validation (avant sauvegarde)

```javascript
function validateSequence(data) {
  // Nom obligatoire
  if (!data.nom || data.nom.trim() === '') {
    throw new Error('Le nom de la séquence est obligatoire');
  }
  
  // Délai obligatoire et positif
  if (typeof data.delai_jours !== 'number' || data.delai_jours < 0) {
    throw new Error('Le délai en jours doit être un nombre positif');
  }
  
  // Niveau obligatoire
  if (typeof data.niveau !== 'number' || data.niveau < 1) {
    throw new Error('Le niveau doit être un nombre entier positif');
  }
  
  // Templates obligatoires
  if (!data.template_sujet || !data.template_corps) {
    throw new Error('Les templates de sujet et corps sont obligatoires');
  }
  
  return data;
}
```

---

## Requêtes LokiJS

### Séquences actives par ordre
```javascript
db.getCollection('sequences')
  .find({ est_active: true })
  .sort((a, b) => a.niveau - b.niveau);
```

### Séquence par référence
```javascript
db.getCollection('sequences').findOne({ reference: 'relance_j15' });
```

### Séquences par niveau
```javascript
db.getCollection('sequences').find({ niveau: 1 });
```

---

## Index LokiJS

```javascript
const sequences = db.addCollection('sequences', {
  indices: ['id', 'niveau', 'est_active', 'reference'],
  unique: ['id']
});
```

---

## Vérification avant suppression

```javascript
function canDeleteSequence(sequenceId) {
  // Vérifier si des relances utilisent cette séquence
  const relances = db.getCollection('relances').find({
    sequence_id: sequenceId
  });
  
  if (relances.length > 0) {
    throw new Error(`Impossible de supprimer: ${relances.length} relances liées`);
  }
  
  // Vérifier si des impayés sont assignés à cette séquence
  const impayes = db.getCollection('impayes').find({
    sequence_id: sequenceId
  });
  
  if (impayes.length > 0) {
    throw new Error(`Impossible de supprimer: ${impayes.length} impayés assignés`);
  }
  
  return true;
}
```

---

## Réordonner les séquences

```javascript
async function reorderSequences(orderedIds) {
  const collection = db.getCollection('sequences');
  
  for (let i = 0; i < orderedIds.length; i++) {
    const sequence = collection.findOne({ id: orderedIds[i] });
    if (sequence) {
      sequence.niveau = i + 1;
      sequence.updated_at = new Date().toISOString();
      collection.update(sequence);
      await saveToYaml('sequences', sequence);
    }
  }
}
```
