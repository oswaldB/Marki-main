# Modèle: Impaye (YAML Flat Files)

**Type** : YAML  
**Fichier** : `impaye_{id}.yml`  
**Feature** : F-008 (Blacklist)

---

## Description

Représente un impayé (facture non payée après échéance) avec gestion de la blacklist.

---

## Structure YAML

```yaml
id: 1
type: "impaye"

# Relations
facture_id: 1
payer_id: 1

# Montants
montant_initial: 1000.00
reste_a_payer: 1000.00

# Dates
date_emission: "2026-06-01"
date_echeance: "2026-07-01"
jours_retard: 15

# Statut
est_en_retard: true
est_solde: false

# Blacklist (F-008)
is_blacklisted: false
blacklisted_at: null
blacklist_motif: null                      # Description libre
blacklist_motif_type: null                 # litige, arrangement, contestation, procedure, annulation, autre
blacklisted_by: null                       # user_id
unblacklisted_at: null
unblacklisted_by: null                     # user_id

# Séquence assignée
sequence_id: 1
date_assignation_sequence: "2026-06-15"

# Métadonnées
created_at: "2026-06-15T10:00:00Z"
updated_at: "2026-06-15T10:00:00Z"
```

---

## Types de motifs blacklist

| Type | Description |
|------|-------------|
| `litige` | Litige commercial en cours |
| `arrangement` | Accord de paiement personnalisé |
| `contestation` | Facture contestée par le client |
| `procedure` | En cours de procédure judiciaire |
| `annulation` | Facture annulée/résiliée |
| `autre` | Autre motif (préciser dans motif) |

---

## Validation (avant sauvegarde)

```javascript
function validateImpaye(data) {
  // Si mise en blacklist, motif obligatoire
  if (data.is_blacklisted) {
    if (!data.blacklist_motif && !data.blacklist_motif_type) {
      throw new Error('Motif de blacklist obligatoire');
    }
    // Définir la date si non fournie
    if (!data.blacklisted_at) {
      data.blacklisted_at = new Date().toISOString();
    }
  }
  
  // Si retrait de blacklist
  if (!data.is_blacklisted && data.blacklisted_at) {
    data.unblacklisted_at = new Date().toISOString();
    data.blacklist_motif = null;
    data.blacklist_motif_type = null;
  }
  
  return data;
}
```

---

## Requêtes LokiJS

### Impayés non blacklistés
```javascript
db.getCollection('impayes').find({
  is_blacklisted: false,
  est_solde: false
});
```

### Impayés blacklistés
```javascript
db.getCollection('impayes')
  .find({ is_blacklisted: true })
  .sort((a, b) => new Date(b.blacklisted_at) - new Date(a.blacklisted_at));
```

### Impayés par motif
```javascript
db.getCollection('impayes').find({
  blacklist_motif_type: 'litige'
});
```

### Impayés éligibles relance (pour generate-relances)
```javascript
db.getCollection('impayes').find({
  date_echeance: { $lte: '2026-06-15' },
  is_blacklisted: false,
  est_en_retard: true,
  reste_a_payer: { $gt: 0 }
});
```

---

## Index LokiJS

```javascript
const impayes = db.addCollection('impayes', {
  indices: ['id', 'payer_id', 'facture_id', 'is_blacklisted', 'est_en_retard', 'sequence_id'],
  unique: ['id']
});
```

---

## Vérification avant relance

```javascript
function canRelancer(impayeId) {
  const impaye = db.getCollection('impayes').findOne({ id: impayeId });
  
  if (!impaye) {
    throw new Error('Impayé non trouvé');
  }
  
  if (impaye.is_blacklisted) {
    const motif = impaye.blacklist_motif || 'Non spécifié';
    throw new Error(`Impayé blacklisté: ${motif}`);
  }
  
  if (impaye.reste_a_payer <= 0) {
    throw new Error('Impayé déjà soldé');
  }
  
  return true;
}
```
