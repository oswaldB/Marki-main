# Modèle: Relance (Parse)

**Classe** : `Relance`  
**Feature** : F-007, F-009, F-012  

## Description

Représente une relance envoyée ou à envoyer à un client pour ses impayés.

## Champs

### Identification

| Champ | Type | Description |
|-------|------|-------------|
| `objectId` | String | ID unique (généré par Parse) |
| `createdAt` | Date | Date de création |
| `updatedAt` | Date | Date de dernière modification |

### Relations

| Champ | Type | Description |
|-------|------|-------------|
| `contact` | Pointer(Contact) | Destinataire de la relance |
| `impayes` | Array<Pointer(Impaye)> | Impayés concernés |
| `sequence` | Pointer(SequenceRelance) | Séquence d'origine |
| `validePar` | Pointer(User) | Utilisateur ayant validé |
| `envoyeePar` | Pointer(User) | Utilisateur ayant envoyé |

### Contenu

| Champ | Type | Description |
|-------|------|-------------|
| `sujet` | String | Objet de l'email |
| `contenu` | String | Corps HTML de l'email |
| `cc` | String | Destinataires en copie |

### Statut

| Champ | Type | Description |
|-------|------|-------------|
| `statut` | String | "brouillon" | "valide" | "envoyee" | "annulee" | "echec" |
| `valide` | Boolean | Marquée comme validée |
| `envoyee` | Boolean | Email envoyé |
| `dateValidation` | Date | Date de validation |
| `dateEnvoi` | Date | Date d'envoi |
| `dateAnnulation` | Date | Date d'annulation |
| `motifAnnulation` | String | Raison de l'annulation |
| `erreurEnvoi` | String | Message d'erreur SMTP |

### Tracking (optionnel)

| Champ | Type | Description |
|-------|------|-------------|
| `ouvertureEmail` | Boolean | Email ouvert par le destinataire |
| `dateOuverture` | Date | Date d'ouverture |
| `clics` | Number | Nombre de clics sur liens |

## Indexes

```javascript
// Requêtes fréquentes à optimiser
query.equalTo('contact', contact)
query.equalTo('sequence', sequence)
query.equalTo('statut', 'brouillon')
query.descending('createdAt')
```

## Hooks

### Avant sauvegarde

```javascript
Parse.Cloud.beforeSave('Relance', (request) => {
  const relance = request.object
  
  // Validation
  if (relance.get('statut') === 'envoyee' && !relance.get('valide')) {
    throw new Error('Une relance doit être validée avant envoi')
  }
})
```

## Requêtes typiques

### Relances à valider

```javascript
const query = new Parse.Query('Relance')
query.equalTo('statut', 'brouillon')
query.equalTo('valide', false)
query.include('contact')
query.descending('createdAt')
```

### Relances envoyées par période

```javascript
const query = new Parse.Query('Relance')
query.equalTo('statut', 'envoyee')
query.greaterThanOrEqualTo('dateEnvoi', dateDebut)
query.lessThanOrEqualTo('dateEnvoi', dateFin)
```

### Relances par client

```javascript
const query = new Parse.Query('Relance')
query.equalTo('contact', contact)
query.include('sequence')
```
