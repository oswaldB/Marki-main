# F-009 : Bouton Enregistrer - Vue Validation des Relances

**Personas** : Agent de recouvrement
**Contexte** : Dans la vue validation des relances, l'agent peut modifier le contenu de l'email (corps, objet) avant validation. Actuellement, seul un bouton "Valider" existe, ce qui valide et sauvegarde en une seule action. L'agent a besoin de pouvoir sauvegarder ses modifications sans valider la relance, notamment pour reprendre plus tard ou faire une pause.

## User Stories

### US-009-1
En tant qu'agent de recouvrement
Je veux enregistrer les modifications apportées à une relance sans la valider
Afin de pouvoir reprendre la validation plus tard sans perdre mon travail.

### US-009-2
En tant qu'agent de recouvrement
Je veux visualiser l'état de sauvegarde de la relance en cours d'édition
Afin de savoir si mes modifications ont été enregistrées.

### US-009-3
En tant qu'agent de recouvrement
Je veux recevoir une confirmation visuelle après l'enregistrement
Afin d'être certain que mes modifications ont bien été sauvegardées.

## Critères d'acceptation

- Un bouton "Enregistrer" est présent dans la vue validation, à côté du bouton "Valider"
- Le bouton "Enregistrer" sauvegarde les modifications (objet, corps, cc) sans changer le statut `valide`
- Un log `[CHECKPOINT] relance-saved` est émis après enregistrement réussi
- Un log `[CHECKPOINT] relance-save-failed` est émis en cas d'erreur
- Un toast de confirmation s'affiche après l'enregistrement : "Modifications enregistrées"
- Le bouton "Enregistrer" passe en état `loading` pendant la sauvegarde
- Les modifications sont persistées dans Parse (champs `sujet`, `contenu`, `cc`)
- La relance reste dans la liste "À valider" après l'enregistrement
- L'éditeur ToastUI reste ouvert après l'enregistrement
- L'utilisateur peut continuer à modifier après l'enregistrement

---

## Modèle de Données

### Champs modifiés sur la classe `Relance`

```javascript
{
  "sujet": String,        // Objet de l'email (déjà existant, modifiable)
  "contenu": String,      // Corps HTML de l'email (déjà existant, modifiable)
  "cc": String,           // Destinataires en copie (déjà existant, modifiable)
  "valide": Boolean,      // Statut de validation (inchangé par l'enregistrement)
  "updatedAt": Date       // Parse met à jour automatiquement
}
```

---

## UI/UX - Vue Validation

### Header de la carte de validation (après modification)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Validation de la relance                                    [Enregistrer] [Valider ▼] │
│                                                              (outline)    (primary)   │
│                                                             [secondary]  [primary]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Disposition des boutons** (ordre de gauche à droite) :
1. **Enregistrer** (`color="neutral" variant="outline"`) - sauvegarde sans validation
2. **Valider** (`color="primary"`) - sauvegarde ET valide
3. **Actions** (dropdown) - Passer, Blacklister, Supprimer

### États du bouton Enregistrer

| État | Apparence | Comportement |
|------|-----------|--------------|
| `idle` | Outline, icône 💾 | Clic possible |
| `loading` | Spinner, texte "Enregistrement..." | Désactivé, requête en cours |
| `disabled` | Grisé | Aucune modification détectée |

### Toast de confirmation

```
┌────────────────────────────────────────┐
│ ✅  Modifications enregistrées         │
│                                    [×] │
└────────────────────────────────────────┘
        ↑ s'affiche en haut à droite
```

### Détection des modifications non sauvegardées

Si l'utilisateur tente de changer de relance sans enregistrer :
```
┌─────────────────────────────────────────┐
│  ⚠️ Modifications non enregistrées      │
├─────────────────────────────────────────┤
│                                         │
│  Vous avez des modifications non        │
│  sauvegardées. Voulez-vous les          │
│  enregistrer avant de continuer ?       │
│                                         │
│  [Abandonner]  [Annuler]  [Enregistrer] │
│                                         │
└─────────────────────────────────────────┘
```

---

## Workflow Frontend

### Fonction `enregistrerRelance()`

```javascript
async function enregistrerRelance() {
  if (!relanceCourante.value) return

  saving.value = true
  try {
    const row = relanceCourante.value
    const r = row._parse

    // Récupérer le contenu de l'éditeur ToastUI
    const corpsHtml = editorRef.value?.getInstance().getHTML() || row.corps

    // Mise à jour des champs modifiables
    r.set('sujet', row.objet)
    r.set('contenu', corpsHtml)
    r.set('cc', row.cc)
    // NOTE: on ne touche PAS à 'valide'

    await r.save()

    // Mettre à jour l'état local
    row.corps = corpsHtml
    row.modified = false

    // Checkpoint de succès
    console.log('[CHECKPOINT] relance-saved', { relanceId: row.id })

    toast.add({
      title: 'Modifications enregistrées',
      color: 'green'
    })

  } catch (err) {
    console.error('[CHECKPOINT] relance-save-failed', {
      relanceId: relanceCourante.value?.id,
      error: err.message
    })

    toast.add({
      title: 'Erreur',
      description: err.message,
      color: 'red'
    })
  } finally {
    saving.value = false
  }
}
```

### Détection des modifications

```javascript
// Computed pour savoir si des modifications sont présentes
const hasUnsavedChanges = computed(() => {
  if (!relanceCourante.value) return false
  
  const currentCorps = editorRef.value?.getInstance().getHTML() || relanceCourante.value.corps
  const originalCorps = relanceCourante.value._parse.get('contenu')
  
  return relanceCourante.value.objet !== relanceCourante.value._parse.get('sujet') ||
         currentCorps !== originalCorps ||
         relanceCourante.value.cc !== relanceCourante.value._parse.get('cc')
})

// Watch pour marquer comme modifié
watch(() => [relanceCourante.value?.objet, relanceCourante.value?.cc], () => {
  if (relanceCourante.value) {
    relanceCourante.value.modified = true
  }
}, { deep: true })
```

### Gestion du changement de relance

```javascript
async function selectionnerRelancePourValidation(relance) {
  // Vérifier s'il y a des modifications non sauvegardées
  if (hasUnsavedChanges.value) {
    const shouldSave = await confirmUnsavedChanges()
    if (shouldSave === 'cancel') return
    if (shouldSave === 'save') await enregistrerRelance()
    // if 'discard' → continuer sans sauvegarder
  }
  
  relanceCourante.value = relance
}
```

---

## Intégration dans la page existante

### Modification du template (vue validation)

```vue
<template #header>
  <div class="flex items-center justify-between">
    <span class="font-semibold">Validation de la relance</span>
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-500">
        {{ positionRelanceCourante }} / {{ relancesAValider.length }}
      </span>
      
      <!-- NOUVEAU: Bouton Enregistrer -->
      <UButton
        color="neutral"
        variant="outline"
        icon="i-heroicons-document-arrow-down"
        :loading="saving"
        :disabled="!hasUnsavedChanges"
        @click="enregistrerRelance"
      >
        Enregistrer
      </UButton>
      
      <UButton
        color="primary"
        :loading="validating"
        @click="validerRelanceWorkflow"
        :disabled="!relanceCourante"
      >
        Valider
      </UButton>
      
      <UDropdownMenu :items="actionItems">
        <UButton
          color="neutral"
          variant="outline"
          trailing-icon="i-heroicons-chevron-down"
        >
          Actions
        </UButton>
      </UDropdownMenu>
    </div>
  </div>
</template>
```

---

## Checkpoints

### Logs de succès
```
[CHECKPOINT] relance-saved { relanceId: "abc123", userId: "user456" }
```

### Logs d'erreur
```
[CHECKPOINT] relance-save-failed { 
  relanceId: "abc123", 
  error: "Network error",
  userId: "user456"
}
```

---

## Tests de validation

### Scénario 1: Enregistrement simple
1. Sélectionner une relance à valider
2. Modifier le corps de l'email dans ToastUI
3. Cliquer sur "Enregistrer"
4. **Attendu**: Toast vert, relance toujours dans la liste, modifications conservées

### Scénario 2: Changement de relance sans enregistrer
1. Modifier une relance
2. Cliquer sur une autre relance
3. **Attendu**: Modal de confirmation avec 3 options

### Scénario 3: Rechargement après enregistrement
1. Enregistrer des modifications
2. Rafraîchir la page
3. Sélectionner la même relance
4. **Attendu**: Les modifications sont présentes

### Scénario 4: Enregistrement vs Validation
1. Modifier une relance
2. Cliquer "Valider" (pas "Enregistrer")
3. **Attendu**: Les modifications sont sauvegardées ET la relance est validée

---

## Notes d'implémentation

- Le bouton "Valider" existant doit continuer de sauvegarder avant de valider (comportement inchangé)
- L'état `saving` doit être distinct de `validating` pour éviter les conflits visuels
- L'éditeur ToastUI doit être accessible via une `ref` pour récupérer son contenu
- Les modifications doivent être détectées au niveau du DOM de l'éditeur (via `@change` event)
