# Workflow Backend: send-relance-email

**Feature** : F-007 Relances email  
**Type** : Backend (Cloud Function)  
**Cloud Function** : `sendRelanceEmail`

## Description

Envoie réel une ou plusieurs relances validées via SMTP. Met à jour le statut et journalise l'envoi.

## Input

```javascript
{
  relanceIds: Array<String>,  // IDs des relances à envoyer
  userId: String               // ID de l'utilisateur qui envoie
}
```

## Validation

```javascript
for (const id of relanceIds) {
  const relance = await new Parse.Query('Relance').get(id)
  
  if (!relance.get('valide')) {
    throw new Error(`Relance ${id}: non validée`)
  }
  
  if (relance.get('envoyee')) {
    throw new Error(`Relance ${id}: déjà envoyée`)
  }
}
```

**CHECKPOINT**: `send-relance-validation-ok`

## Envoi SMTP

Pour chaque relance :

```javascript
const results = { sent: [], failed: [] }

for (const relance of relances) {
  try {
    const contact = relance.get('contact')
    const smtp = await getSMTPConfig(relance)
    
    // Envoi
    await sendEmail({
      from: smtp.from,
      to: contact.get('email'),
      cc: relance.get('cc'),
      subject: relance.get('sujet'),
      html: relance.get('contenu'),
      attachments: await getAttachments(relance)
    })
    
    // Mise à jour
    relance.set('envoyee', true)
    relance.set('dateEnvoi', new Date())
    relance.set('envoyeePar', user)
    relance.set('statut', 'envoyee')
    await relance.save()
    
    results.sent.push(relance.id)
    
  } catch (error) {
    results.failed.push({ id: relance.id, error: error.message })
  }
}
```

**CHECKPOINT**: `send-relance-smtp-results`
```json
{
  "sent": ["rel_1", "rel_2", "rel_3"],
  "failed": [],
  "duration": "2.5s"
}
```

## Journalisation

```javascript
const Activite = Parse.Object.extend('Activite')
const activite = new Activite()
activite.set('type', 'relances_envoyees')
activite.set('details', `${results.sent.length} relances envoyées`)
activite.set('user', user)
activite.set('metadata', results)
await activite.save()
```

**CHECKPOINT**: `send-relance-logged`

## Output

```javascript
{
  success: true,
  sentCount: 3,
  failedCount: 0,
  failed: []
}
```

## Gestion erreurs

**CHECKPOINT**: `send-relance-error`
```json
{
  "relanceId": "rel_abc",
  "error": "SMTP authentication failed",
  "smtp": "smtp.example.com"
}
```
