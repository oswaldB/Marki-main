# Modèle: Relance (YAML Flat Files)

**Type** : YAML  
**Fichier** : `relance_{id}.yml`  
**Feature** : F-007, F-009, F-012

---

## Description

Représente une relance envoyée ou à envoyer à un contact pour ses impayés.

---

## Structure YAML

```yaml
id: 1
type: "relance"

# Relations
contact_id: 1                # Destinataire de la relance
impaye_ids: [1, 2, 3]        # Liste des IDs des impayés concernés
sequence_id: 1               # Séquence d'origine
valide_par: null             # user_id qui a validé
envoyee_par: null            # user_id qui a envoyé

# Contenu de l'email
sujet: "Relance facture impayée"
contenu: "<p>Bonjour,</p><p>Nous vous rappelons..."
cc: "manager@example.com"

# Statut
statut: "brouillon"          # brouillon, valide, envoyee, annulee, echec
valide: false
envoyee: false

# Dates importantes
date_validation: null
date_envoi: null
date_annulation: null
date_echec: null

# Motif d'annulation
motif_annulation: null

# Erreur d'envoi
erreur_envoi: null           # Message d'erreur SMTP

# Tracking (optionnel)
email_ouvert: false
date_ouverture: null
nombre_clics: 0

# Montants
count_impayes: 3
montant_total: 3500.00

# Métadonnées
created_at: "2026-06-20T10:00:00Z"
updated_at: "2026-06-20T10:00:00Z"
```

---

## Statuts possibles

| Statut | Description |
|--------|-------------|
| `brouillon` | Créée automatiquement, en attente de validation |
| `valide` | Validée par un agent, prête à être envoyée |
| `envoyee` | Email envoyé avec succès |
| `annulee` | Annulée avant envoi |
| `echec` | Échec d'envoi (erreur SMTP) |

---

## Validation (avant sauvegarde)

```javascript
function validateRelance(data) {
  // Une relance envoyée doit être validée
  if (data.statut === 'envoyee' && !data.valide) {
    throw new Error('Une relance doit être validée avant envoi');
  }
  
  // Une relance envoyée doit avoir une date d'envoi
  if (data.statut === 'envoyee' && !data.date_envoi) {
    data.date_envoi = new Date().toISOString();
  }
  
  // Au moins un impayé requis
  if (!data.impaye_ids || data.impaye_ids.length === 0) {
    throw new Error('Une relance doit concerner au moins un impayé');
  }
  
  // Contact requis
  if (!data.contact_id) {
    throw new Error('Une relance doit avoir un contact destinataire');
  }
  
  return data;
}
```

---

## Requêtes LokiJS

### Relances à valider (brouillons)
```javascript
db.getCollection('relances').find({
  statut: 'brouillon',
  valide: false
}).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
```

### Relances envoyées par période
```javascript
db.getCollection('relances').find({
  statut: 'envoyee',
  date_envoi: {
    $gte: '2026-06-01',
    $lte: '2026-06-30'
  }
});
```

### Relances par contact
```javascript
db.getCollection('relances').find({
  contact_id: 1
}).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
```

### Relances à envoyer (validées mais pas envoyées)
```javascript
db.getCollection('relances').find({
  statut: 'valide',
  envoyee: false
});
```

---

## Index LokiJS

```javascript
const relances = db.addCollection('relances', {
  indices: ['id', 'contact_id', 'sequence_id', 'statut', 'envoyee', 'date_envoi'],
  unique: ['id']
});
```

---

## Helpers

### Calcul des montants
```javascript
function calculateRelanceAmounts(relance) {
  const impayes = db.getCollection('impayes').find({
    id: { $in: relance.impaye_ids }
  });
  
  return {
    count: impayes.length,
    total: impayes.reduce((sum, i) => sum + (i.reste_a_payer || 0), 0)
  };
}
```

### Vérification avant suppression
```javascript
function canDeleteRelance(relanceId) {
  const relance = db.getCollection('relances').findOne({ id: relanceId });
  
  // Ne pas supprimer si déjà envoyée
  if (relance.envoyee) {
    throw new Error('Impossible de supprimer une relance déjà envoyée');
  }
  
  return true;
}
```
