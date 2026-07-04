# Workflow Backend: send-sequence-test

**Feature** : F-007 Relances email  
**Type** : Backend (Cloud Function)  
**Cloud Function** : `sendSequenceTest`

## Description

Envoie une séquence complète de test à un email spécifique, en utilisant les données d'un payeur réel mais sans marquer les relances comme envoyées.

## Input

```javascript
{
  sequenceId: String,    // ID de la séquence à tester
  testEmail: String,       // Email de destination pour le test
  payeurId: String,        // ID du payeur (Contact)
  payeurData: Object,      // Données du payeur avec impayés
  emails: Array,           // Emails de la séquence (avec scenarios)
  userId: String,          // ID de l'utilisateur qui lance le test
  userEmail: String,       // Email de l'utilisateur
  userName: String         // Nom de l'utilisateur
}
```

## Étapes

### Étape 1: Validation

```javascript
if (!sequenceId || !testEmail || !payeurId) {
  throw new Error('Paramètres manquants')
}

// Vérifier que l'email est valide
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(testEmail)) {
  throw new Error('Email de test invalide')
}
```

**CHECKPOINT**: `send-sequence-test-validation`
```json
{ "sequenceId": "seq_xxx", "payeurId": "contact_xxx", "testEmail": "test@example.com" }
```

### Étape 2: Récupération des données

```javascript
// Séquence
const Sequence = Parse.Object.extend('SequenceRelance')
const sequence = await new Parse.Query(Sequence).get(sequenceId)

// Payeur
const Contact = Parse.Object.extend('Contact')
const payeur = await new Parse.Query(Contact).get(payeurId)

// Impayés
const Impaye = Parse.Object.extend('Impaye')
const impayesQuery = new Parse.Query(Impaye)
impayesQuery.equalTo('payeur', payeur)
impayesQuery.equalTo('facture_soldee', false)
const impayes = await impayesQuery.find()
```

### Étape 3: Compilation des templates

Pour chaque email de la séquence :

```javascript
const sentEmails = []

for (const emailConfig of request.params.emails) {
  // Déterminer le scénario actif
  const activeScenario = determineActiveScenario(emailConfig, impayes.length)
  
  const scenario = emailConfig.scenarios.find(s => s.format === activeScenario)
  
  // Compiler le template avec les données
  const compiledSubject = compileTemplate(scenario.objet, {
    payeur_nom: payeur.get('nom'),
    payeur_email: payeur.get('email'),
    nb_factures: impayes.length,
    montant_total: impayes.reduce((sum, i) => sum + i.get('reste_a_payer'), 0),
    // ... autres variables
  })
  
  const compiledBody = compileTemplate(scenario.corps, {
    // ... variables avec boucles pour impayés
  })
  
  // Envoi via SMTP
  await sendEmail({
    to: testEmail,
    cc: scenario.cc,
    subject: `[TEST] ${compiledSubject}`,
    html: compiledBody,
    smtp: scenario.smtp
  })
  
  sentEmails.push({
    delai: emailConfig.delai,
    objet: compiledSubject,
    scenario: activeScenario
  })
}
```

**CHECKPOINT**: `send-sequence-test-emails-sent`
```json
{
  "count": 3,
  "testEmail": "test@example.com",
  "payeur": "Dupont SARL"
}
```

### Étape 4: Logging

```javascript
const Activite = Parse.Object.extend('Activite')
const activite = new Activite()
activite.set('type', 'test_sequence_envoye')
activite.set('details', `Test de séquence envoyé à ${testEmail}`)
activite.set('sequence', sequence)
activite.set('payeur', payeur)
activite.set('user', user)
activite.set('metadata', { sentEmails: sentEmails.length })
await activite.save()
```

**CHECKPOINT**: `send-sequence-test-completed`

## Output

```javascript
{
  success: true,
  sentEmails: 3,
  payeur: "Dupont SARL",
  testEmail: "test@example.com"
}
```

## Gestion des erreurs

**CHECKPOINT**: `send-sequence-test-failed`
```json
{
  "error": "SMTP connection failed",
  "email": "test@example.com",
  "scenario": "single"
}
```

## Fonctions auxiliaires

### determineActiveScenario(emailConfig, impayesCount)

```javascript
function determineActiveScenario(emailConfig, impayesCount) {
  // Vérifier les scénarios dans l'ordre de priorité
  const scenarios = emailConfig.scenarios || []
  
  // Si plusieurs impayés
  if (impayesCount > 1) {
    const multiple = scenarios.find(s => s.format === 'multiple' && s.active)
    if (multiple) return 'multiple'
  }
  
  // Par défaut single
  const single = scenarios.find(s => s.format === 'single' && s.active)
  if (single) return 'single'
  
  // Fallback sur le premier actif
  return scenarios.find(s => s.active)?.format || 'single'
}
```

### compileTemplate(template, variables)

```javascript
function compileTemplate(template, variables) {
  let result = template
  
  // Remplacer les variables simples [[variable]]
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`[[${key}]]`, value)
  }
  
  // Gérer les boucles [[loop impayes]]...[[endloop]]
  result = processLoops(result, variables.impayes)
  
  // Gérer les dates [[date, date("format")]]
  result = processDates(result)
  
  return result
}
```
