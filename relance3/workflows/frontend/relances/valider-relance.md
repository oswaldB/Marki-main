---
id: relances-valider
type: frontend
folder: specs/workflows/frontend/relances/
description: Valider une relance pour passage en statut programmée depuis PouchDB
depends_on: [relances-details, preview-relance]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-valider : Valider une relance (PouchDB)

## Description

Valider une relance en statut "à valider" pour la passer en statut "programmée" et la rendre prête à l'envoi automatique ou manuel. Les données sont lues et mises à jour dans PouchDB.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Valider" d'une relance
 * @checkpoint validate-clicked, relance sélectionnée pour validation
 * @condition relance.statut === 'a_valider'
 */

/**
 * @action Ouvrir le modal de validation avec récapitulatif
 * @checkpoint modal-opened, écran de validation affiché
 */

/**
 * @action Récupérer les données de la relance depuis PouchDB
 * @checkpoint relance-fetched, montant, payeur, séquence visibles
 * 
 * **Query PouchDB** :
 * const relance = await db.get('relance:' + relanceId);
 */

/**
 * @action Récupérer les informations du payeur depuis PouchDB
 * @checkpoint payeur-fetched, email et statut vérifiés
 * 
 * **Query PouchDB** :
 * const payeur = await dbContacts.get('contact:' + relance.contact_id);
 */

/**
 * @action Afficher la prévisualisation du message
 * @checkpoint preview-rendered, aperçu de l'email visible
 */

/**
 * @action Afficher la date d'envoi programmée
 * @checkpoint date-shown, date de relance visible
 */

/**
 * @action Vérifier la validité des données avant validation
 * @checkpoint data-validated, contrôles passés
 * - Email du payeur présent et valide
 * - Au moins un impayé lié
 * - Template non vide
 * - Date d'envoi future ou aujourd'hui
 */

/**
 * @action Afficher les alertes si problèmes détectés
 * @checkpoint alerts-shown, avertissements visibles si nécessaire
 * Ex: "Email non vérifié", "Payeur blacklisté", etc.
 */

/**
 * @action Demander confirmation finale
 * @checkpoint confirmation-requested, résumé des actions visibles
 */

/**
 * @action Confirmer la validation
 * @checkpoint validation-confirmed, utilisateur a validé
 */

/**
 * @action Récupérer la relance depuis PouchDB avec sa révision
 * @checkpoint relance-fetched-with-rev, document prêt pour mise à jour
 * 
 * **Query PouchDB** :
 * const doc = await db.get('relance:' + relanceId);
 */

/**
 * @action Mettre à jour le statut dans PouchDB
 * @checkpoint doc-updated, statut changé à 'programmee'
 * 
 * **Code** :
 * doc.statut = 'programmee';
 * doc.validated_at = new Date().toISOString();
 * doc.validated_by = user.id;
 * doc.updated_at = new Date().toISOString();
 */

/**
 * @action Sauvegarder la relance modifiée dans PouchDB
 * @checkpoint pouchdb-saved, document mis à jour avec nouvelle révision
 * 
 * **Query PouchDB** :
 * const response = await db.put(doc);
 * // response: { ok: true, id: 'relance:...', rev: '2-xxx...' }
 */

/**
 * @action Créer un event d'historique dans PouchDB
 * @checkpoint event-created, entrée d'audit créée
 * 
 * **Query PouchDB** :
 * await dbEvents.put({
 *   _id: 'event:' + generateUUID(),
 *   type: 'event',
 *   event_type: 'relance_validated',
 *   title: 'Relance validée',
 *   description: `Relance validée par ${user.name}`,
 *   created_at: new Date().toISOString(),
 *   by_marki: false,
 *   user_id: user.id,
 *   metadata: { 
 *     relance_id: relanceId,
 *     validated_at: doc.validated_at
 *   }
 * });
 */

/**
 * @action Mettre à jour le statut dans le store Alpine
 * @checkpoint status-updated, statut passé à 'programmee'
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Relance validée et programmée"
 */

/**
 * @action Fermer le modal
 * @checkpoint modal-closed, retour à la liste
 */

/**
 * @action Programmer la relance pour envoi automatique (si date future)
 * @checkpoint scheduled-for-send, tâche gérée par le backend via sync CouchDB
 * 
 * **Note** : La programmation de l'envoi se fait côté backend qui surveille
 * CouchDB et déclenche les envois aux dates programmées.
 */
```

## PouchDB Operations

### Chargement des données

```javascript
async openValidationModal(relanceId) {
  try {
    // 1. Récupérer la relance depuis PouchDB
    const relance = await db.get('relance:' + relanceId);
    
    // Vérifier le statut
    if (relance.statut !== 'a_valider') {
      throw new Error('Cette relance n\'est pas en attente de validation');
    }
    
    this.validatingRelance = relance;
    
    // 2. Récupérer le payeur
    const payeur = await dbContacts.get('contact:' + relance.contact_id);
    this.validatingPayeur = payeur;
    
    // 3. Valider les données
    this.validationErrors = this.validateRelanceData(relance, payeur);
    
    // 4. Afficher le modal
    this.showValidationModal = true;
    
  } catch (error) {
    console.error('Erreur chargement:', error);
    this.toast(error.message, 'error');
  }
}

validateRelanceData(relance, payeur) {
  const errors = [];
  
  if (!payeur.email) {
    errors.push({ field: 'email', message: 'Le payeur n\'a pas d\'email configuré', blocking: true });
  } else if (!this.isValidEmail(payeur.email)) {
    errors.push({ field: 'email', message: 'L\'email du payeur est invalide', blocking: true });
  }
  
  if (!relance.impaye_ids?.length) {
    errors.push({ field: 'impayes', message: 'Aucun impayé lié à cette relance', blocking: true });
  }
  
  if (!relance.template?.trim()) {
    errors.push({ field: 'template', message: 'Le template de message est vide', blocking: true });
  }
  
  if (relance.date_envoi_programmee) {
    const sendDate = new Date(relance.date_envoi_programmee);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (sendDate < today) {
      errors.push({ field: 'date', message: 'La date d\'envoi est dans le passé', blocking: true });
    }
  }
  
  if (payeur.is_blacklisted) {
    errors.push({ field: 'blacklist', message: '⚠️ Le payeur est blacklisté', blocking: false });
  }
  
  return errors;
}

isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### Validation et sauvegarde

```javascript
async validateRelance(relanceId) {
  this.validating = true;
  
  try {
    // 1. Récupérer avec révision
    const doc = await db.get('relance:' + relanceId);
    
    if (doc.statut !== 'a_valider') {
      throw new Error('Statut invalide pour validation');
    }
    
    // 2. Mettre à jour le statut
    doc.statut = 'programmee';
    doc.validated_at = new Date().toISOString();
    doc.validated_by = this.user?.id;
    doc.updated_at = new Date().toISOString();
    
    // 3. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    
    // 4. Créer l'event
    await dbEvents.put({
      _id: 'event:' + this.generateUUID(),
      type: 'event',
      event_type: 'relance_validated',
      title: 'Relance validée',
      description: `Relance ${doc.objet || relanceId} validée`,
      created_at: new Date().toISOString(),
      by_marki: false,
      user_id: this.user?.id,
      metadata: { 
        relance_id: relanceId,
        validated_at: doc.validated_at,
        previous_rev: doc._rev,
        new_rev: response.rev
      }
    });
    
    // 5. Mettre à jour l'UI
    const index = this.relances.findIndex(r => r._id === 'relance:' + relanceId);
    if (index !== -1) {
      this.relances[index] = { ...doc, _rev: response.rev };
    }
    
    this.showValidationModal = false;
    this.toast('Relance validée et programmée', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.validating = false;
  }
}

generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

## API Calls

**Aucun appel API** - Toutes les opérations sont effectuées dans PouchDB local.

## Validation préalable

| Vérification | Bloquant | Message |
|--------------|----------|---------|
| Email payeur présent | ✅ Oui | "Le payeur n'a pas d'email configuré" |
| Email format valide | ✅ Oui | "L'email du payeur est invalide" |
| Au moins 1 impayé | ✅ Oui | "Aucun impayé lié à cette relance" |
| Template non vide | ✅ Oui | "Le template de message est vide" |
| Date d'envoi >= aujourd'hui | ✅ Oui | "La date d'envoi est dans le passé" |
| Payeur non blacklisté | ⚠️ Non | "⚠️ Le payeur est blacklisté" |
| Email vérifié | ⚠️ Non | "⚠️ L'email n'a pas été vérifié" |

## Récapitulatif affiché

```
Validation de la relance

Payeur : ACME Corporation (contact@acme.com)
Montant total : 12 500,00 €
Nombre d'impayés : 3
Séquence : Relance Standard - Étape 2

Date d'envoi programmée : 25/07/2026 à 09:00

✅ Email valide
✅ Template complété
✅ Impayés sélectionnés

La relance sera envoyée automatiquement à la date programmée.
Vous pourrez l'annuler ou la reprogrammer jusqu'à l'envoi.

[Annuler]  [Valider et programmer]
```

## Changement de statut

```
a_valider ──validation──> programmee
```

Après validation :
- La relance apparaît dans "Relances programmées"
- Elle sera envoyée automatiquement à la date programmée
- L'utilisateur peut encore l'annuler ou la reprogrammer

## Mockups de référence

- `specs/mockups/relances.html` (modal validation)
- `specs/mockups/relances-validation.html` (interface validation spécifique)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Chargement relance | `GET /api/relances/:id` | `db.get('relance:' + id)` |
| Chargement payeur | `GET /api/payers/:id` | `dbContacts.get('contact:' + id)` |
| Validation | `POST /api/relances/:id/validate` | `db.get()` + `db.put()` |
| Réponse | `ApiResponse<Relance>` | `{ ok, id, rev }` |
| Historique | Backend automatique | `dbEvents.put()` côté client |
| Programmation envoi | Backend cron | Backend surveille CouchDB |
| Latence | ~300-800ms | ~30-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
