# F-010 : Génération Automatique des Relances

**Personas** : Agent de recouvrement, Responsable commercial
**Contexte** : Les relances doivent être générées automatiquement à partir des impayés selon des règles métier et des séquences configurées (J+15, J+30, etc.).

## User Stories

### US-010-1
En tant qu'agent de recouvrement
Je veux que le système génère automatiquement les relances à effectuer
Afin de ne pas avoir à les créer manuellement une par une.

### US-010-2
En tant que responsable commercial
Je veux configurer les seuils de génération des relances (J+X)
Afin d'adapter la cadence aux pratiques de mon entreprise.

### US-010-3
En tant qu'agent de recouvrement
Je veux voir un récapitulatif des relances générées
Afin de savoir combien de clients vont être relancés aujourd'hui.

### US-010-4
En tant qu'agent de recouvrement
Je veux que les impayés déjà relancés récemment soient exclus
Afin d'éviter de spammer les clients.

### US-010-5
En tant qu'agent de recouvrement
Je veux que les contacts et impayés blacklistés soient exclus
Afin de respecter les litiges et arrangements en cours.

## Critères d'acceptation

- Le workflow `generate-relances` s'exécute quotidiement ou sur demande
- Seuls les impayés avec séquence de type "relances" sont concernés
- Les impayés déjà relancés dans le délai de la séquence sont exclus
- Les contacts blacklistés sont exclus
- Les impayés blacklistés sont exclus
- Les impayés sans email valide sont exclus
- Une relance est créée par contact (regroupement des impayés)
- Le sujet et corps sont générés à partir du template de la séquence
- Un log `[CHECKPOINT] relances-generated` est émis avec le nombre créé
- Un log `[CHECKPOINT] relances-generation-failed` est émis en cas d'erreur
- Les relances générées ont le statut `valide: false` (à valider)

---

## Modèle de Données

### Classe `Relance` (nouvelle)

```javascript
{
  "contact": Pointer(Contact),           // Contact à relancer
  "impayes": Array<Pointer(Impaye)>,    // Impayés concernés
  "sequence": Pointer(SequenceRelance),  // Séquence utilisée
  "sujet": String,                       // Objet de l'email
  "contenu": String,                     // Corps HTML de l'email
  "cc": String,                          // Destinataires en copie
  "valide": Boolean,                     // Validée par l'agent ?
  "envoyee": Boolean,                    // Email envoyé ?
  "dateEnvoi": Date,                     // Date d'envoi effectif
  "envoyeePar": Pointer(User),           // Agent ayant validé/envoyé
  "createdAt": Date,                     // Date de création
  "updatedAt": Date                      // Date de modification
}
```

### Classe `SequenceRelance` (nouvelle)

```javascript
{
  "nom": String,                         // Nom de la séquence
  "type": String,                        // "relances" ou "suivi"
  "niveau": Number,                      // Niveau 1, 2, 3...
  "delaiJours": Number,                  // J+X après échéance
  "templateSujet": String,               // Template de l'objet
  "templateCorps": String,               // Template HTML du corps
  "estActive": Boolean,                  // Séquence active ?
  "createdAt": Date,
  "updatedAt": Date
}
```

---

## Workflow Backend : generate-relances

### Étape 1 : Récupération des séquences

```javascript
// Récupérer toutes les séquences actives de type "relances"
const SequenceRelance = Parse.Object.extend('SequenceRelance');
const query = new Parse.Query(SequenceRelance);
query.equalTo('estActive', true);
query.equalTo('type', 'relances');
query.ascending('niveau');
const sequences = await query.find();
```

### Étape 2 : Pour chaque séquence, identifier les impayés éligibles

```javascript
const maintenant = new Date();
const delaiJours = sequence.get('delaiJours');
const dateLimite = new Date(maintenant);
dateLimite.setDate(dateLimite.getDate() - delaiJours);

// Récupérer les impayés éligibles
const Impaye = Parse.Object.extend('Impaye');
const impayeQuery = new Parse.Query(Impaye);

// Filtre 1 : Date d'échéance dépassée de delaiJours
impayeQuery.lessThanOrEqualTo('date_echeance', dateLimite);

// Filtre 2 : Non soldé
impayeQuery.greaterThan('reste_a_payer', 0);

// Filtre 3 : Séquence assignée
impayeQuery.equalTo('sequence', sequence);

// Include pour accès aux relations
impayeQuery.include(['payeur', 'contact_relance']);

const impayes = await impayeQuery.find();
```

### Étape 3 : Filtres de sécurité

```javascript
let impayesFiltres = impayes;

// Filtre 1.5 : Exclusion contacts blacklistés
impayesFiltres = impayesFiltres.filter((impaye) => {
    const contact = impaye.get('contact_relance') || impaye.get('payeur');
    return contact && contact.get('isBlacklisted') !== true;
});

// Filtre 1.6 : Exclusion impayés blacklistés
impayesFiltres = impayesFiltres.filter((impaye) => {
    return impaye.get('isBlacklisted') !== true;
});

// Filtre 2 : Exclusion déjà relancés récemment
const Relance = Parse.Object.extend('Relance');
const relanceQuery = new Parse.Query(Relance);
relanceQuery.equalTo('sequence', sequence);
relanceQuery.greaterThan('createdAt', dateLimite);
const relancesRecentes = await relanceQuery.find();

const contactsRelances = new Set(relancesRecentes.map(r => r.get('contact')?.id));

impayesFiltres = impayesFiltres.filter((impaye) => {
    const contact = impaye.get('contact_relance') || impaye.get('payeur');
    return !contactsRelances.has(contact?.id);
});

// Filtre 2bis : Exclusion sans email
impayesFiltres = impayesFiltres.filter((impaye) => {
    const contact = impaye.get('contact_relance') || impaye.get('payeur');
    return contact && contact.get('email') && contact.get('email').length > 0;
});
```

### Étape 4 : Regroupement par contact

```javascript
const relancesParContact = new Map();

for (const impaye of impayesFiltres) {
    const contact = impaye.get('contact_relance') || impaye.get('payeur');
    if (!contact) continue;
    
    const contactId = contact.id;
    
    if (!relancesParContact.has(contactId)) {
        relancesParContact.set(contactId, {
            contact: contact,
            impayes: [],
            montantTotal: 0
        });
    }
    
    const groupe = relancesParContact.get(contactId);
    groupe.impayes.push(impaye);
    groupe.montantTotal += impaye.get('reste_a_payer') || 0;
}
```

### Étape 5 : Création des relances

```javascript
const relancesCrees = [];

for (const [contactId, groupe] of relancesParContact) {
    const templateSujet = sequence.get('templateSujet');
    const templateCorps = sequence.get('templateCorps');
    
    // Substitution des variables
    const variables = {
        '{{contact_nom}}': groupe.contact.get('nom'),
        '{{contact_email}}': groupe.contact.get('email'),
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
    
    // Créer la relance
    const Relance = Parse.Object.extend('Relance');
    const relance = new Relance();
    
    relance.set('contact', groupe.contact);
    relance.set('impayes', groupe.impayes);
    relance.set('sequence', sequence);
    relance.set('sujet', sujet);
    relance.set('contenu', corps);
    relance.set('cc', '');
    relance.set('valide', false);
    relance.set('envoyee', false);
    
    await relance.save();
    relancesCrees.push(relance);
}

// Checkpoint de succès
console.log(`[CHECKPOINT] relances-generated { count: ${relancesCrees.length}, sequence: "${sequence.get('nom')}" }`);
```

---

## API Endpoints Cloud Functions

### `generateRelances`

```javascript
Parse.Cloud.define("generateRelances", async (request) => {
    const { force = false } = request.params;
    
    try {
        const resultats = [];
        
        // Récupérer les séquences actives
        const SequenceRelance = Parse.Object.extend('SequenceRelance');
        const query = new Parse.Query(SequenceRelance);
        query.equalTo('estActive', true);
        query.equalTo('type', 'relances');
        query.ascending('niveau');
        const sequences = await query.find();
        
        for (const sequence of sequences) {
            const relances = await genererRelancesPourSequence(sequence);
            resultats.push({
                sequence: sequence.get('nom'),
                count: relances.length
            });
        }
        
        const total = resultats.reduce((sum, r) => sum + r.count, 0);
        
        console.log('[CHECKPOINT] relances-generated', { 
            total, 
            sequences: resultats 
        });
        
        return { success: true, total, details: resultats };
        
    } catch (error) {
        console.error('[CHECKPOINT] relances-generation-failed', { error: error.message });
        throw new Error(`Échec génération relances: ${error.message}`);
    }
});
```

---

## UI/UX - Vue Déclenchement

### Bouton de génération manuelle (Tableau de bord)

```
┌─────────────────────────────────────────────────────────────┐
│  Relances du jour                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Dernière génération : 30/06/2024 à 08:00                   │
│  Relances en attente : 12                                  │
│                                                             │
│  [🔄 Générer les relances maintenant]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Modal de confirmation

```
┌─────────────────────────────────────────────┐
│  Générer les relances                        │
├─────────────────────────────────────────────┤
│                                             │
│  Cette action va analyser tous les impayés  │
│  et créer les relances à effectuer.         │
│                                             │
│  ⚠️ Les relances créées devront être        │
│     validées avant envoi.                   │
│                                             │
│  [Annuler]        [Générer]                 │
│                                             │
└─────────────────────────────────────────────┘
```

### Toast de résultat

```
┌────────────────────────────────────────────────────┐
│ ✅  Génération terminée                              │
│    15 relances créées (Niveau 1: 12, Niveau 2: 3)   │
│                                                 [×] │
└────────────────────────────────────────────────────┘
```

---

## Logs et Monitoring

### Checkpoints applicatifs

```
[CHECKPOINT] relances-generated { total: 15, sequences: [...] }
[CHECKPOINT] relances-generation-failed { error: "..." }
[CHECKPOINT] relance-created { id: "abc123", contact: "...", montant: 12500 }
```

### Métriques

- Nombre de relances générées par jour
- Taux d'exclusion (blacklist, déjà relancés, sans email)
- Montant total des relances générées
- Temps d'exécution du workflow

---

## Planification (CRON)

```javascript
// Parse Cloud Job pour exécution quotidienne
Parse.Cloud.job("generateRelancesDaily", async (request) => {
    const { params, message, log } = request;
    
    log.info('Démarrage génération quotidienne des relances');
    
    try {
        const result = await Parse.Cloud.run('generateRelances');
        log.success(`${result.total} relances générées`);
        return result;
    } catch (error) {
        log.error(`Échec: ${error.message}`);
        throw error;
    }
});
```

Configuration CRON : `0 8 * * *` (tous les jours à 8h)
