# Modèle: Contact (YAML Flat Files)

**Type** : YAML  
**Fichier** : `contact_{id}.yml`  
**Feature** : F-007 (Email de relance)

---

## Description

Représente un contact (personne ou email de relance) associé à un payer.

---

## Structure YAML

```yaml
id: 1
type: "contact"
payer_id: 1                    # Référence vers le payer

# Identification
nom: "Jean Dupont"
email: "jean.dupont@alpha.com"
telephone: "+33123456789"

# Type de contact
est_contact_relance: true      # true = contact pour envoi relances
est_contact_principal: false   # true = contact principal du payer

# Email de relance (si différent du principal)
contact_principal_id: null     # Si cet email est un email de relance, référence vers contact principal

# Utilisation
nombre_utilisations: 5
derniere_utilisation: "2026-06-25T10:00:00Z"

# Statut blacklist
is_blacklisted: false
blacklisted_at: null
blacklist_motif: null

# Métadonnées
created_at: "2026-06-20T10:00:00Z"
updated_at: "2026-06-25T10:00:00Z"
```

---

## Relations

### Contact → Payer (Many-to-One)
```yaml
# contact_1.yml
id: 1
payer_id: 1
nom: "Jean Dupont"
est_contact_relance: true

# payer_1.yml
id: 1
nom: "Société Alpha"
contact_principal_id: 1  # Référence vers contact principal
```

### Contact principal → Emails de relance (One-to-Many)
```yaml
# contact_1.yml (principal)
id: 1
payer_id: 1
nom: "Société Alpha"
est_contact_principal: true

# contact_2.yml (email de relance)
id: 2
payer_id: 1
nom: "Comptable"
email: "compta@alpha.com"
est_contact_relance: true
est_contact_principal: false
contact_principal_id: 1
```

---

## Requêtes LokiJS

### Tous les contacts d'un payer
```javascript
db.getCollection('contacts').find({ payer_id: 1 });
```

### Contacts de relance disponibles
```javascript
db.getCollection('contacts').find({
  est_contact_relance: true,
  email: { $exists: true },
  is_blacklisted: false
});
```

### Contact avec ses emails de relance
```javascript
const contact = db.getCollection('contacts').findOne({ id: 1 });
const emailsRelance = db.getCollection('contacts').find({
  contact_principal_id: 1
});
```

---

## Validation (avant sauvegarde)

```javascript
function validateContact(data) {
  // Email de relance doit avoir un email valide
  if (data.est_contact_relance && (!data.email || data.email.length < 5)) {
    throw new Error('Contact de relance doit avoir un email valide');
  }
  
  // Référence payer_id obligatoire
  if (!data.payer_id) {
    throw new Error('Contact doit être associé à un payer');
  }
  
  return true;
}
```

---

## Index LokiJS

```javascript
const contacts = db.addCollection('contacts', {
  indices: ['id', 'payer_id', 'email', 'est_contact_relance'],
  unique: ['id']
});
```
