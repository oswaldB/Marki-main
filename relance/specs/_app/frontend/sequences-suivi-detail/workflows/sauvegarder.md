# Workflow : Sauvegarder séquence suivi

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="sauvegarder()"`

## Action
Enregistrer les modifications de la séquence de suivi

## Description
- Persiste tous les changements
- Envoie à l'API backend
- Affiche confirmation

## Data Model

**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:**
- `saving` passe à `true` pendant la sauvegarde
- Toast 'Sauvegarde en cours...' (info) au début
- Toast 'Séquence sauvegardée' (succès) ou message d'erreur
- `saving` passe à `false` à la fin
- `hasChanges` passe à `false` si succès

## API Calls

**Sauvegarde de la séquence** via `PUT /api/sequences/:id` :

| Méthode | Endpoint | Body | Description |
|---------|----------|------|-------------|
| `PUT` | `/api/sequences/:id` | `{ nom, validationObligatoire, emails, type_suivi }` | Met à jour la séquence de suivi avec ses emails |

**Données sauvegardées** (persistées via flat-file-db dans la table "suivi") :
- `sequence.nom` : Nom de la séquence de suivi
- `sequence.validationObligatoire` : Booléen
- `sequence.type_suivi` : Type de suivi (formation, audit, etc.)
- `sequence.emails[]` : Tableau des emails avec leurs scénarios
  - `email_index` (number) : Position de l'email dans la séquence
  - `delai` (number) : Délai en jours (négatif = avant échéance)
  - `objet` (string) : Template d'objet avec variables
  - `corps` (string) : Template HTML du corps
  - `scenarios[]` (array) : Les scénarios de suivi
    - `active` (boolean) : Scénario activé
    - `format` (enum) : 'nouveau' | 'existant' | 'relance'
    - `objet` (string|null) : Objet spécifique au scénario
    - `corps` (string|null) : Corps spécifique au scénario
    - `cc` (string) : Destinataires en copie
    - `bcc` (string) : Destinataires en copie cachée
    - `smtp_profile_id` (string|null) : Profil SMTP spécifique

**Note** : Les liens de paiement ne sont pas applicables aux séquences de suivi (contrairement aux relances).

**Réponse** : `{ success: boolean, sequence: object, message?: string }`



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── sauvegarder.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/sauvegarder.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/sauvegarder.js
export function sauvegarder() {
  // Implementation du workflow
}
```

## Implementation

```javascript
// Implémentation personnalisée requise
// Page: sequences-suivi-detail
// Entité: sequence

async function sauvegarder() {
  // 1. Set state
  this.saving = true;
  Alpine.store('ui').addToast('Sauvegarde en cours...', 'info');
  
  try {
    // 2. Call API - sauvegarde dans la table "suivi"
    const response = await fetch(`/api/sequences/${this.sequence.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: this.sequence.nom,
        validationObligatoire: this.sequence.validationObligatoire,
        type_suivi: this.sequence.type_suivi,
        emails: this.sequence.emails.map(email => ({
          email_index: email.email_index,
          delai: email.delai,
          objet: email.objet,
          corps: email.corps,
          scenarios: email.scenarios.map(sc => ({
            active: sc.active,
            format: sc.format,
            objet: sc.objet,
            corps: sc.corps,
            cc: sc.cc,
            bcc: sc.bcc,
            smtp_profile_id: sc.smtp_profile_id
          }))
        }))
      })
    });
    
    const data = await response.json();
    
    // 3. Handle response
    if (data.success) {
      this.hasChanges = false;
      Alpine.store('ui').addToast('Séquence de suivi sauvegardée', 'success');
    } else {
      throw new Error(data.message || 'Erreur lors de la sauvegarde');
    }
    
  } catch (error) {
    // 4. Handle error
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    // 5. Reset state
    this.saving = false;
  }
}
```
