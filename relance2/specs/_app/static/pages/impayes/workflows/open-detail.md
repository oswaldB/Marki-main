# Workflow : Ouvrir détail facture

## Écran
`impayes.html`

## Élément déclencheur
Ligne avec `@click="openDetail(impaye)"`

## Action
Ouvrir le panneau de détail d'un impayé

## Description
- Affiche le panneau latéral (slideover) avec les détails complets
- Charge les informations de l'impayé sélectionné
- Affiche l'historique des notes et les actions possibles
- **Gère aussi l'ouverture du modal de suspension si l'impayé est suspendu**

## Gestion de la suspension

Quand on ouvre le détail d'un impayé **suspendu** (`is_suspended: true`) :
- Affiche un avertissement/bandeau indiquant la suspension
- Montre le motif et la date de suspension
- Propose l'action "Réactiver" (voir workflow `unsuspend-facture`)

Quand on ouvre le détail d'un impayé **actif** (`is_suspended: false`) :
- Affiche normalement les informations
- Propose l'action "Suspendre" (voir workflow `suspend-facture`)

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés
- `selectedImpaye` - impayé sélectionné pour affichage
- `showDetailPanel` - affichage du slideover

**États UI:**
- `loading`
- `error`
- `showDetailPanel` - contrôle du slideover
- `selectedImpaye` - données affichées

## State Changes

**Modifications:**
- `selectedImpaye` ← impayé cliqué
- `showDetailPanel` ← `true`

## API Calls

**Pas d'appel API supplémentaire** - Les données sont déjà chargées dans `impayes[]`

**Note:** Si besoin de données complémentaires (historique complet, relances liées), appeler :
- `GET /api/impayes?facture_soldee=0&statut=impaye
- `GET /api/relancesimpaye_ids=:id` - Relances liées

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes/
        ├── index.html
        └── js/
            └── open-detail.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/open-detail.js`

```javascript
// frontend/app/impayes/js/open-detail.js
export function openDetail() {
  // Implementation du workflow
}
```

## Implementation

```javascript
openDetail(impaye) {
  // 1. Set selected item
  this.selectedImpaye = impaye;
  
  // 2. Show detail panel (slideover)
  this.showDetailPanel = true;
  
  // 3. Check suspension status for UI adaptation
  if (impaye.is_suspended) {
    // Le template affichera un bandeau d'avertissement
    // avec le motif : impaye.suspension_motif
    // et la date : impaye.suspension_date
  }
}

// Fermer le panneau
closeDetail() {
  this.showDetailPanel = false;
  this.selectedImpaye = null;
}
```

## Template UI (extrait)

```html
<!-- Slideover détail -->
<div x-show="showDetailPanel" x-cloak class="fixed inset-y-0 right-0 w-96 bg-white shadow-xl">
  
  <!-- Avertissement si suspendu -->
  <div x-show="selectedImpaye?.is_suspended" class="bg-amber-50 border-l-4 border-amber-500 p-4">
    <p class="font-medium text-amber-800">Facture suspendue</p>
    <p class="text-sm text-amber-600" x-text="selectedImpaye?.suspension_motif"></p>
    <p class="text-xs text-amber-500" x-text="formatDate(selectedImpaye?.suspension_date)"></p>
    <button @click="unsuspendFacture(selectedImpaye.id)" class="mt-2 text-amber-700 underline">
      Réactiver
    </button>
  </div>
  
  <!-- Actions si actif -->
  <div x-show="!selectedImpaye?.is_suspended" class="p-4">
    <button @click="openSuspendModal(selectedImpaye)" class="text-red-600">
      Suspendre
    </button>
  </div>
  
  <!-- Détails de l'impayé -->
  <div class="p-4">
    <h3 x-text="selectedImpaye?.nfacture"></h3>
    <p x-text="selectedImpaye?.payeur_nom"></p>
    <p x-text="formatMoney(selectedImpaye?.reste_a_payer)"></p>
    
    <!-- Historique des notes -->
    <div x-show="selectedImpaye?.notes?.length">
      <h4>Notes</h4>
      <template x-for="note in selectedImpaye.notes" :key="note.id">
        <div class="border-b py-2">
          <p x-text="note.content"></p>
          <p class="text-xs text-gray-500" x-text="note.created_by_name + ' - ' + formatDate(note.created_at)"></p>
        </div>
      </template>
    </div>
  </div>
</div>
```

## Navigation

- **Cible** : Panneau détail (slideover droite)
- **Fermeture** : Bouton X, clic sur overlay, ou touche Escape
- **Actions liées** : Voir `suspend-facture.md` et `unsuspend-facture.md`

## Notes

- Le panneau de détail est un **slideover** (pas un modal) qui s'ouvre depuis la droite
- La suspension est affichée comme un **avertissement** dans le détail, pas comme un écran bloquant
- Les actions Suspendre/Réactiver sont accessibles depuis ce panneau

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-open-detail] START: Ouverture du slideover détail impayé')` |
| `navigation` | `console.log('[WORKFLOW.impayes-open-detail] STEP: Ligne impayé cliquée', {id: impaye.id, nfacture: impaye.nfacture})` |
| `suspension-check` | `console.log('[WORKFLOW.impayes-open-detail] STEP: Vérification statut suspension', {is_suspended: impaye.is_suspended})` |
| `detail-loaded` | `console.log('[WORKFLOW.impayes-open-detail] DATA: Détails impayé chargés:', {nfacture, payeur_nom, reste_a_payer, notes_count})` |
| `end` | `console.log('[WORKFLOW.impayes-open-detail] SUCCESS: Slideover détail ouvert en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-open-detail] ERROR:', error)` |
