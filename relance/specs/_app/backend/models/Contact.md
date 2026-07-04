# Modèle: Contact (Parse) - Complément

**Classe** : `Contact`  
**Feature** : F-007 (Email de relance)  

## Description

Complément du modèle Contact avec les champs pour la gestion des emails de relance.

## Nouveaux champs

### Email de relance

| Champ | Type | Description |
|-------|------|-------------|
| `email_relance` | Pointer(Contact) | Référence vers un contact qui sert d'email de relance |
| `estEmailRelance` | Boolean | Indique si ce contact est utilisé comme email de relance |
| `contactPrincipal` | Pointer(Contact) | Contact principal pour lequel c'est un email de relance |

### Utilisation

| Champ | Type | Description |
|-------|------|-------------|
| `nombreUtilisations` | Number | Compteur d'utilisations comme email de relance |
| `derniereUtilisation` | Date | Dernière utilisation |

## Relations

### One-to-many : Contact → Emails de relance

Un contact principal peut avoir plusieurs emails de relance associés :

```javascript
// Récupérer les emails de relance d'un contact
const Contact = Parse.Object.extend('Contact')
const query = new Parse.Query(Contact)
query.equalTo('contactPrincipal', contactPrincipal)
query.equalTo('estEmailRelance', true)
```

### Many-to-one : Email de relance → Contact principal

```javascript
// Récupérer le contact principal d'un email de relance
const emailRelance = await query.get(emailId)
const contactPrincipal = emailRelance.get('contactPrincipal')
```

## Hooks

### Avant sauvegarde

```javascript
Parse.Cloud.beforeSave('Contact', (request) => {
  const contact = request.object
  
  // Si défini comme email de relance, vérifier l'email
  if (contact.get('estEmailRelance')) {
    if (!contact.get('email') || contact.get('email').length < 5) {
      throw new Error('Email de relance doit avoir un email valide')
    }
  }
})
```

## Requêtes typiques

### Tous les emails de relance disponibles

```javascript
const query = new Parse.Query('Contact')
query.equalTo('estEmailRelance', true)
query.exists('email')
query.notEqualTo('email', '')
```

### Contact avec ses emails de relance

```javascript
const query = new Parse.Query('Contact')
query.include('email_relance') // Email de relance préféré
```

## Structure recommandée

```javascript
// Contact principal (payeur)
{
  objectId: "contact_001",
  nom: "Dupont SARL",
  email: "contact@dupont.com",
  email_relance: { pointer to: "contact_002" }, // Email de relance préféré
  estEmailRelance: false
}

// Email de relance associé
{
  objectId: "contact_002",
  nom: "Comptable Dupont",
  email: "compta@dupont.com",
  contactPrincipal: { pointer to: "contact_001" },
  estEmailRelance: true,
  nombreUtilisations: 5
}
```
