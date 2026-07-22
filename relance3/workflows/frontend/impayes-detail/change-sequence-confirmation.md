# Workflow Frontend : Change Sequence Confirmation (PouchDB)

## Écran
`/impayes/:id` - Section Actions - Bloc Séquence

## Description
Affiche une popup de confirmation lors du changement de séquence, permettant à l'utilisateur de choisir entre recommencer la séquence à zéro ou continuer depuis la dernière relance envoyée. Les opérations sont effectuées localement dans PouchDB puis synchronisées avec CouchDB.

## Élément déclencheur
Sélecteur de séquence (`<select>`) avec `@change="onSequenceChange($event)"`

## Data Model Alpine.js

```javascript
{
  // Props depuis PouchDB
  impaye: { _id, id, sequence_id, ... },
  sequences: [], // Chargées depuis PouchDB
  
  // State popup
  showSequenceConfirm: false,
  pendingSequenceId: null,
  pendingSequenceName: null,
  
  // State loading
  loading: false,
  error: null,
  
  // PouchDB
  db: null, // Instance PouchDB
  dbRelances: null
}
```

## Flow

### 1. Détection changement séquence
```javascript
onSequenceChange(event) {
  const newSequenceId = event.target.value;
  const newSequence = this.sequences.find(s => s.id === newSequenceId);
  
  if (newSequenceId === this.impaye.sequence_id) return;
  
  // Stocker la sélection en attente
  this.pendingSequenceId = newSequenceId;
  this.pendingSequenceName = newSequence?.nom || 'Nouvelle séquence';
  
  // Afficher popup
  this.showSequenceConfirm = true;
  
  // Reset le select visuellement
  event.target.value = this.impaye.sequence_id;
}
```

### 2. Popup de confirmation

**Titre** : "Changer de séquence de relance"

**Message** :
"Vous allez passer à la séquence **{pendingSequenceName}**."
"Comment souhaitez-vous gérer les relances existantes ?"

**Boutons** :
- **"Recommencer à zéro"** (variant: primary) → `confirmChangeSequence('restart')`
- **"Continuer depuis l'envoi précédent"** (variant: secondary) → `confirmChangeSequence('continue')`
- **"Annuler"** (variant: ghost) → `cancelChangeSequence()`

**Explications** :
- **Recommencer** : Supprime les relances non envoyées et recrée toutes les relances de la nouvelle séquence depuis le début (côté client dans PouchDB)
- **Continuer** : Supprime les relances non envoyées et recrée uniquement les relances manquantes (après le dernier email envoyé) dans PouchDB

### 3. Opérations PouchDB selon le mode

```javascript
async confirmChangeSequence(mode) {
  this.loading = true;
  this.error = null;
  
  const workflowId = crypto.randomUUID();
  
  try {
    log.info('WORKFLOW_START', { 
      workflowId, 
      workflow: 'changeSequence',
      mode,
      impayeId: this.impaye.id,
      sequenceId: this.pendingSequenceId
    });
    
    // 1. Récupérer le document impayé depuis PouchDB
    const impayeDoc = await db.get(this.impaye._id);
    
    // 2. Récupérer les relances existantes non envoyées
    const existingRelances = await this.getPendingRelances(this.impaye.id);
    
    // 3. Supprimer les relances non envoyées en bulk
    if (existingRelances.length > 0) {
      const docsToDelete = existingRelances.map(r => ({
        _id: r._id,
        _rev: r._rev,
        _deleted: true
      }));
      await dbRelances.bulkDocs(docsToDelete);
    }
    
    // 4. Récupérer la nouvelle séquence depuis PouchDB
    const newSequence = await dbSequences.get('sequence:' + this.pendingSequenceId);
    
    // 5. Créer les nouvelles relances selon le mode
    let relancesToCreate = [];
    
    if (mode === 'restart') {
      // Mode restart: créer toutes les relances depuis le début
      relancesToCreate = this.generateRelancesFromStart(newSequence, impayeDoc);
    } else {
      // Mode continue: reprendre après la dernière relance envoyée
      const lastSentRelance = await this.getLastSentRelance(this.impaye.id);
      relancesToCreate = this.generateRelancesContinue(newSequence, impayeDoc, lastSentRelance);
    }
    
    // 6. Insérer les nouvelles relances en bulk
    if (relancesToCreate.length > 0) {
      await dbRelances.bulkDocs(relancesToCreate);
    }
    
    // 7. Mettre à jour la séquence sur l'impayé
    impayeDoc.sequence_id = this.pendingSequenceId;
    impayeDoc.updated_at = new Date().toISOString();
    await db.put(impayeDoc);
    
    // 8. Créer un event de changement de séquence
    const eventDoc = {
      _id: `event:${crypto.randomUUID()}`,
      type: 'event',
      event_type: 'sequence_change',
      title: 'Changement de séquence',
      description: `Passage à la séquence ${this.pendingSequenceName} (mode: ${mode})`,
      impaye_id: this.impaye.id,
      sequence_id: this.pendingSequenceId,
      mode: mode,
      relances_created: relancesToCreate.length,
      relances_deleted: existingRelances.length,
      created_at: new Date().toISOString(),
      by_marki: false,
      user_id: this.user?.id
    };
    await dbEvents.put(eventDoc);
    
    // 9. Update local
    this.impaye.sequence_id = this.pendingSequenceId;
    
    // 10. Recharger les relances depuis PouchDB
    await this.loadRelances(this.impaye.payer_id);
    
    // 11. Rafraîchir l'historique
    await this.loadEvents(this.impaye.id);
    this.mergeHistorique();
    
    // 12. Fermer popup
    this.showSequenceConfirm = false;
    this.pendingSequenceId = null;
    this.pendingSequenceName = null;
    
    log.info('WORKFLOW_SUCCESS', { 
      workflowId,
      relancesCreated: relancesToCreate.length,
      relancesDeleted: existingRelances.length
    });
    
    // Toast succès
    Alpine.store('toast').add({
      message: `Séquence mise à jour. ${relancesToCreate.length} relance(s) créée(s).`,
      type: 'success'
    });
    
  } catch (error) {
    log.error('WORKFLOW_ERROR', { workflowId, error: error.message });
    this.error = error.message;
    
    if (error.status === 409) {
      this.error = 'Conflit de version détecté. Veuillez rafraîchir et réessayer.';
    }
    
    Alpine.store('toast').add({
      message: this.error,
      type: 'error'
    });
  } finally {
    this.loading = false;
  }
}

// Méthodes utilitaires

async getPendingRelances(impayeId) {
  const result = await dbRelances.find({
    selector: {
      type: { $eq: 'relance' },
      impaye_id: { $eq: impayeId },
      statut: { $in: ['brouillon', 'pending'] }
    }
  });
  return result.docs;
}

async getLastSentRelance(impayeId) {
  const result = await dbRelances.find({
    selector: {
      type: { $eq: 'relance' },
      impaye_id: { $eq: impayeId },
      statut: { $eq: 'sent' }
    },
    sort: [{ date_envoi: 'desc' }],
    limit: 1
  });
  return result.docs[0] || null;
}

generateRelancesFromStart(sequence, impayeDoc) {
  const relances = [];
  const now = new Date();
  
  sequence.etapes.forEach((etape, index) => {
    const dateProgrammation = new Date(now);
    dateProgrammation.setDate(dateProgrammation.getDate() + etape.delai_jours);
    
    relances.push({
      _id: `relance:${crypto.randomUUID()}`,
      type: 'relance',
      impaye_id: impayeDoc.id,
      facture_id: impayeDoc.facture_id,
      sequence_id: sequence.id,
      niveau: etape.niveau,
      statut: 'brouillon',
      date_programmation: dateProgrammation.toISOString(),
      template_id: etape.template_id,
      created_at: now.toISOString()
    });
  });
  
  return relances;
}

generateRelancesContinue(sequence, impayeDoc, lastSentRelance) {
  const relances = [];
  const now = new Date();
  
  // Trouver l'index de la dernière étape envoyée
  let startIndex = 0;
  if (lastSentRelance) {
    startIndex = sequence.etapes.findIndex(e => e.niveau > lastSentRelance.niveau);
    if (startIndex === -1) startIndex = sequence.etapes.length; // Tout envoyé
  }
  
  // Créer uniquement les relances restantes
  sequence.etapes.slice(startIndex).forEach((etape, index) => {
    const dateProgrammation = new Date(now);
    dateProgrammation.setDate(dateProgrammation.getDate() + etape.delai_jours);
    
    relances.push({
      _id: `relance:${crypto.randomUUID()}`,
      type: 'relance',
      impaye_id: impayeDoc.id,
      facture_id: impayeDoc.facture_id,
      sequence_id: sequence.id,
      niveau: etape.niveau,
      statut: 'brouillon',
      date_programmation: dateProgrammation.toISOString(),
      template_id: etape.template_id,
      created_at: now.toISOString()
    });
  });
  
  return relances;
}
```

### 4. Annulation
```javascript
cancelChangeSequence() {
  this.showSequenceConfirm = false;
  this.pendingSequenceId = null;
  this.pendingSequenceName = null;
  this.error = null;
}
```

## UI - Template Modal

```html
<!-- Modal Confirmation Changement Séquence -->
<div x-show="showSequenceConfirm" x-cloak
     class="fixed inset-0 z-50 flex items-center justify-center p-4"
     x-transition:enter="transition ease-out duration-200"
     x-transition:enter-start="opacity-0"
     x-transition:enter-end="opacity-100"
     x-transition:leave="transition ease-in duration-150"
     x-transition:leave-start="opacity-100"
     x-transition:leave-end="opacity-0">
  
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-slate-500/75" @click="cancelChangeSequence()"></div>
  
  <!-- Modal -->
  <div class="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
       x-transition:enter="transform ease-out duration-200"
       x-transition:enter-start="scale-95 opacity-0"
       x-transition:enter-end="scale-100 opacity-100">
    
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
        <i class="fas fa-exchange-alt text-indigo-600"></i>
      </div>
      <h3 class="text-lg font-semibold text-slate-900">Changer de séquence</h3>
    </div>
    
    <!-- Message -->
    <p class="text-slate-600 mb-2">
      Vous allez passer à la séquence <strong x-text="pendingSequenceName" class="text-slate-900"></strong>.
    </p>
    <p class="text-slate-600 mb-6">Comment souhaitez-vous gérer les relances existantes ?</p>
    
    <!-- Options -->
    <div class="space-y-3 mb-6">
      <!-- Option Recommencer -->
      <button @click="confirmChangeSequence('restart')"
              :disabled="loading"
              class="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-200">
            <i class="fas fa-redo text-indigo-600"></i>
          </div>
          <div>
            <div class="font-medium text-slate-900">Recommencer à zéro</div>
            <div class="text-sm text-slate-500">Supprime les relances en attente et recrée toutes les relances depuis le début</div>
          </div>
        </div>
      </button>
      
      <!-- Option Continuer -->
      <button @click="confirmChangeSequence('continue')"
              :disabled="loading"
              class="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200">
            <i class="fas fa-play text-emerald-600"></i>
          </div>
          <div>
            <div class="font-medium text-slate-900">Continuer depuis l'envoi précédent</div>
            <div class="text-sm text-slate-500">Reprend là où la séquence précédente s'est arrêtée</div>
          </div>
        </div>
      </button>
    </div>
    
    <!-- Error message -->
    <div x-show="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" x-text="error"></div>
    
    <!-- Footer -->
    <div class="flex justify-end">
      <button @click="cancelSequence()" 
              :disabled="loading"
              class="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
        Annuler
      </button>
    </div>
    
    <!-- Loading overlay -->
    <div x-show="loading" class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
      <div class="flex items-center gap-2 text-slate-600">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Mise à jour en cours...</span>
      </div>
    </div>
  </div>
</div>
```

## Checkpoints

- @checkpoint sequence-select-opened : Popup affichée avec la séquence choisie
- @checkpoint mode-restart-selected : Utilisateur a choisi "Recommencer à zéro"
- @checkpoint mode-continue-selected : Utilisateur a choisi "Continuer"
- @checkpoint pouchdb-fetch-started : Récupération documents depuis PouchDB
- @checkpoint pending-relances-deleted : Relances non envoyées supprimées en bulk
- @checkpoint new-relances-generated : Nouvelles relances générées
- @checkpoint new-relances-inserted : Nouvelles relances insérées en bulk
- @checkpoint impaye-updated : Séquence mise à jour dans PouchDB
- @checkpoint event-created : Event de changement créé dans PouchDB
- @checkpoint relances-reloaded : Liste des relances rechargée depuis PouchDB
- @checkpoint historique-updated : Historique fusionné mis à jour
- @checkpoint modal-closed : Popup fermée, retour à l'écran normal

## Error Handling

| Erreur | Message affiché | Action |
|--------|-----------------|--------|
| 409 (conflit) | "Conflit de version détecté. Veuillez rafraîchir et réessayer." | Retry possible |
| PouchDB unavailable | "Base de données locale non disponible" | Alert |
| Document not found | "Document introuvable dans PouchDB" | Alert |
| Timeout | "Opération trop longue, veuillez réessayer" | Retry |

## Dépendances PouchDB

- **db** : Base PouchDB principale (factures/impayés)
- **dbRelances** : Base PouchDB des relances
- **dbSequences** : Base PouchDB des séquences
- **dbEvents** : Base PouchDB des events

## Fichiers concernés

- `/app/templates/impayes-detail/index.html` (modal UI)
- `/app/templates/impayes-detail/workflows/change-sequence.html` (logique workflow PouchDB)

## Migration depuis l'API

| Aspect | API (ancien) | PouchDB (nouveau) |
|--------|--------------|-------------------|
| Endpoint | `POST /api/impayes/:id/change-sequence` | Opérations locales PouchDB |
| Backend workflows | `change-sequence-restart`, `change-sequence-continue` | Logique côté client |
| Suppression relances | API DELETE | `bulkDocs` avec `_deleted: true` |
| Création relances | API POST | `bulkDocs` insertion |
| Event création | Backend automatique | `dbEvents.put()` local |
| Latence | ~500ms-2s | ~50-200ms (local) |
| Offline | ❌ Bloquant | ✅ Fonctionne offline |
