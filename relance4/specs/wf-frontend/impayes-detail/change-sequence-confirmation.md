# Workflow Frontend : Change Sequence Confirmation

## Écran
`/impayes/:id` - Section Actions - Bloc Séquence

## Description
Affiche une popup de confirmation lors du changement de séquence, permettant à l'utilisateur de choisir entre recommencer la séquence à zéro ou continuer depuis la dernière relance envoyée.

## Élément déclencheur
Sélecteur de séquence (`<select>`) avec `@change="onSequenceChange($event)"`

## Data Model Alpine.js

```javascript
{
  // Props
  impaye: { id, sequence_id, ... },
  sequences: [],
  
  // State popup
  showSequenceConfirm: false,
  pendingSequenceId: null,
  pendingSequenceName: null,
  
  // State loading
  loading: false,
  error: null
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
- **Recommencer** : Supprime les relances non envoyées et recrée toutes les relances de la nouvelle séquence depuis le début
- **Continuer** : Supprime les relances non envoyées et recrée uniquement les relances manquantes (après le dernier email envoyé)

### 3. Appel API selon le mode

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
    
    const token = localStorage.getItem('marki_token');
    
    const response = await fetch(`/api/impayes/${this.impaye.id}/change-sequence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sequence_id: this.pendingSequenceId,
        mode: mode // 'restart' | 'continue'
      })
    });
    
    // Gestion 401
    if (response.status === 401) {
      log.warn('AUTH_TOKEN_EXPIRED', { workflowId });
      localStorage.removeItem('marki_token');
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors du changement de séquence');
    }
    
    // Update local
    this.impaye.sequence_id = this.pendingSequenceId;
    
    // Recharger les relances depuis l'API
    await this.loadRelances(this.impaye.payer_id);
    
    // Rafraîchir l'historique
    await this.loadEvents(this.impaye.id);
    this.mergeHistorique();
    
    // Fermer popup
    this.showSequenceConfirm = false;
    this.pendingSequenceId = null;
    this.pendingSequenceName = null;
    
    log.info('WORKFLOW_SUCCESS', { 
      workflowId,
      relancesCreated: data.relances_created,
      relancesDeleted: data.relances_deleted
    });
    
    // Toast succès
    Alpine.store('toast').add({
      message: `Séquence mise à jour. ${data.relances_created} relance(s) créée(s).`,
      type: 'success'
    });
    
  } catch (error) {
    log.error('WORKFLOW_ERROR', { workflowId, error: error.message });
    this.error = error.message;
    Alpine.store('toast').add({
      message: error.message,
      type: 'error'
    });
  } finally {
    this.loading = false;
  }
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
- @checkpoint api-call-started : Appel API `/api/impayes/:id/change-sequence` lancé
- @checkpoint api-success : Séquence mise à jour, relances créées
- @checkpoint relances-reloaded : Liste des relances rechargée depuis l'API
- @checkpoint historique-updated : Historique fusionné mis à jour
- @checkpoint modal-closed : Popup fermée, retour à l'écran normal

## Error Handling

| Erreur | Message affiché |
|--------|-----------------|
| 401 | Redirection vers /login |
| 404 | "Impayé non trouvé" |
| 400 (séquence invalide) | "Séquence invalide" |
| 500 | "Erreur serveur, veuillez réessayer" |
| Timeout | "Délai dépassé, veuillez réessayer" |

## Dépendances

- API Endpoint : `POST /api/impayes/:id/change-sequence`
- Workflow backend : `change-sequence-restart` et `change-sequence-continue`
- Statut relance : `brouillon` (pour les relances créées dans les 2 modes)

## Fichiers concernés

- `/app/templates/impayes-detail/index.html` (modal UI)
- `/app/templates/impayes-detail/workflows/change-sequence.html` (logique workflow)
