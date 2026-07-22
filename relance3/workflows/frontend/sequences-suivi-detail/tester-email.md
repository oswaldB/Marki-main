# Workflow : Tester email suivi (PouchDB + API Backend)

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="testerEmail(idx)"`

## Action
Envoyer un email de test

## Description

Envoie un email de test pour vérifier le rendu sans impact sur les destinataires réels.

**Workflow backend** : `test-single-suivi`
- Le frontend appelle le workflow backend `test-single-suivi`
- Le backend récupère les données depuis PouchDB (via réplication)
- Le backend génère l'email avec les variables du contact (agence) sélectionné
- Le backend envoie l'email à l'adresse de test fournie
- Retour : confirmation d'envoi ou erreur

**Note** : L'appel API backend est **conservé** car l'envoi d'email nécessite un serveur SMTP et ne peut pas être fait côté client.

## Data Model

**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `testEmailConfig` : `{ destinataire: string, contactId: string, emailIndex: number, scenarioType: string }`
- `envoiEnCours`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `envoiEnCours`

## State Changes

**Modifications:**
- `envoiEnCours` passe à `true` pendant l'envoi
- Toast 'Envoi en cours...' (info) au début
- Toast 'Email de test envoyé' (succès) ou message d'erreur
- `envoiEnCours` passe à `false` à la fin

## PouchDB Operations

**Lecture uniquement** - Les données de la séquence sont lues depuis PouchDB et envoyées au backend pour génération de l'email.

**Note** : L'appel API est conservé car l'envoi d'email nécessite un serveur SMTP.

## API Calls

**Workflow backend** : `test-single-suivi`

**Conservé** car l'envoi d'email nécessite:
- Un serveur SMTP
- Des credentials sécurisés
- Un traitement côté serveur

| Méthode | Endpoint | Body | Description |
|---------|----------|------|-------------|
| `POST` | `/api/test/suivi` | `{ sequenceId: string, testEmail: string, contactId: string, emailIndex: number, scenarioType: string, sequenceData: object }` | Envoie un email de test de suivi |

**Données envoyées** :
- `sequenceId` (string) : ID de la séquence de suivi
- `testEmail` (string) : Adresse email de test (destinataire)
- `contactId` (string) : ID du contact (agence)
- `emailIndex` (number) : Index de l'email dans la séquence
- `scenarioType` (string) : Type de scénario (`suivi_agence`, `suivi_proprietaire`, etc.)
- `sequenceData` (object) : Données complètes de la séquence depuis PouchDB

**Réponse** : `{ status: number, data?: object, error?: string }`

**Structure de la réponse** :
```javascript
{
  "status": 200,
  "data": {
    "emailSent": true,
    "from": "Test (Test Suivi) <comptabilite@adti06.com>",
    "to": "test@example.com",
    "smtpProfile": "EX'IM - comptabilité",
    "metadata": {
      "sequenceId": "seq_xxx",
      "emailIndex": 0,
      "contactId": "cont_xxx",
      "typeSequence": "suivi",
      "scenarioType": "suivi_agence",
      "impayesCount": 17,
      "sentAt": "2026-07-10T14:30:00.000Z",
      "messageId": "<abc123@mail.infomaniak.com>"
    }
  }
}
```

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── tester-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/tester-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/tester-email.js
export async function testerEmail() {
  // Implementation avec PouchDB + API backend
}
```

## Implementation (PouchDB + API)

```javascript
async testerEmail(idx) {
  // 1. Set testing state
  this.envoiEnCours = true;
  this.currentEmailIndex = idx;
  
  try {
    // 2. Récupérer les données depuis PouchDB
    const sequence = await db.get('sequence:' + this.sequenceId);
    
    // 3. Préparer les données pour le backend
    const testData = {
      sequenceId: this.sequenceId,
      testEmail: this.testEmailConfig.destinataire,
      contactId: this.testEmailConfig.contactId,
      emailIndex: idx,
      scenarioType: sequence.emails[idx].activeScenario || 'suivi_agence',
      sequenceData: {
        nom: sequence.nom,
        emails: sequence.emails,
        modeles_email: sequence.modeles_email
      }
    };
    
    // 4. Appeler le workflow backend (conservé - nécessite serveur SMTP)
    const response = await fetch('/api/test/suivi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    
    // 5. Handle response
    if (data.status === 200 && data.data?.emailSent) {
      this.toast(
        `Email de test envoyé à ${data.data.to}`, 
        'success'
      );
    } else {
      throw new Error(data.error || 'Erreur lors de l\'envoi');
    }
    
  } catch (error) {
    this.toast(error.message, 'error');
  } finally {
    // 6. Reset state
    this.envoiEnCours = false;
  }
}
```

## Notes

- **API conservée** : L'envoi d'email nécessite un serveur SMTP côté backend
- **Données depuis PouchDB** : Les données de la séquence sont lues localement avant envoi
- **Pas de modification** : Ce workflow ne modifie pas PouchDB, il lit seulement

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB + API) |
|--------|-------|----------------------|
| Source données | API backend | PouchDB local |
| Envoi email | `POST /api/test/suivi` | **Conservé** - Nécessite backend |
| Latence | ~500ms-2s | ~10-50ms (lecture) + ~500ms-2s (envoi) |
| Offline | ❌ Impossible | ⚠️ Test nécessite connexion |
