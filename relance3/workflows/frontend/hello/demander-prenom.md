# Workflow Frontend : Demander Prénom (PouchDB)

## Objectif
Afficher une popup pour demander le prénom de l'utilisateur et afficher un message de bienvenue personnalisé.

## Écran associé
- **Écran** : `hello`
- **Template** : `templates/hello/index.html`

## Déclencheur
- Click sur le bouton "Demander prénom"
- Événement Alpine.js : `@click="demanderPrenom()"`

## Props utilisées

| Prop | Type | Initial | Description |
|------|------|---------|-------------|
| `prenom` | string | `null` | Prénom saisi par l'utilisateur |
| `loading` | boolean | `false` | État de chargement du workflow |

## Déroulement du workflow

```
┌─────────────────┐
│  CLICK BOUTON   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  WORKFLOW_START │────▶│  Generer UUID   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  PROMPT()       │
│  "Quel est      │
│   votre prénom?"│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────┐
│  OK   │ │  Annuler  │
│prénom  │ │  (null)   │
└───┬───┘ └─────┬─────┘
    │           │
    ▼           ▼
┌───────────┐ ┌───────────────┐
│STATE_UPDATE│ │WORKFLOW_CANCELLED│
│prenom=X   │ └───────────────┘
└─────┬─────┘
      │
      ▼
┌─────────────┐
│WORKFLOW_    │
│   SUCCESS   │
└─────────────┘
```

## Logs générés

| Étape | Événement | Data |
|-------|-----------|------|
| Début | `WORKFLOW_START` | `{ workflowId, workflow: 'demanderPrenom' }` |
| Validation | `STATE_UPDATE` | `{ prenom }` |
| Annulation | `WORKFLOW_CANCELLED` | `{ workflowId }` |
| Succès | `WORKFLOW_SUCCESS` | `{ workflowId, duration }` |
| Erreur | `WORKFLOW_ERROR` | `{ workflowId, error }` |

## Code du workflow

```javascript
// workflows/demander-prenom.html
demanderPrenom: async function() {
    const workflowId = crypto.randomUUID();
    const startTime = Date.now();
    
    log.info('WORKFLOW_START', { 
        workflowId, 
        workflow: 'demanderPrenom',
        page: 'helloPage'
    });
    
    this.loading = true;
    
    try {
        const prenomSaisi = prompt('Quel est votre prénom ?');
        
        if (prenomSaisi && prenomSaisi.trim()) {
            this.prenom = prenomSaisi.trim();
            log.info('STATE_UPDATE', { 
                prenom: this.prenom,
                workflowId 
            });
        } else if (prenomSaisi !== null) {
            log.warn('VALIDATION_ERROR', { 
                reason: 'empty_prenom',
                workflowId 
            });
        } else {
            log.info('WORKFLOW_CANCELLED', { workflowId });
        }
        
        log.info('WORKFLOW_SUCCESS', { 
            workflowId,
            duration: Date.now() - startTime
        });
        
    } catch (error) {
        log.error('WORKFLOW_ERROR', {
            workflowId,
            error: error.message
        });
    } finally {
        this.loading = false;
    }
}
```

## Affichage conditionnel

Le message "Hello {prénom}" s'affiche uniquement si `prenom` est défini :

```html
<div x-show="prenom" x-transition class="mt-8 p-6 bg-white rounded-lg shadow-lg">
    <p class="text-2xl text-green-600 font-semibold">
        Hello <span x-text="prenom"></span> !
    </p>
</div>
```

## Dépendances
- Aucune API call
- Aucune opération PouchDB (UI uniquement)
- Utilise uniquement `prompt()` natif du navigateur

## PouchDB Operations

**Aucun** - Ce workflow est purement une interaction UI sans persistance.

## Anti-patterns à éviter
- ❌ Ne pas appeler d'API externe pour ce workflow simple
- ❌ Ne pas utiliser de modal custom (utiliser `prompt()`)
- ❌ Ne pas stocker le prénom en localStorage (state éphémère)
- ❌ Ne pas persister dans PouchDB (state temporaire uniquement)

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | **Conservé** - Côté client |
| Persistance | Non persistante | **Conservé** - Non persistante |
| Latence | Instantanée | Instantanée |
| Offline | ✅ Oui | ✅ Oui |
