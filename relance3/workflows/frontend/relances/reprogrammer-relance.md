---
id: relances-reprogrammer
type: frontend
folder: specs/workflows/frontend/relances/
description: Reprogrammer la date d'envoi d'une relance depuis PouchDB
depends_on: [relances-details]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-reprogrammer : Reprogrammer une relance (PouchDB)

## Description

Changer la date d'envoi programmée d'une relance existante (avant son envoi effectif). Les données sont lues et sauvegardées dans PouchDB.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Reprogrammer" d'une relance
 * @checkpoint reschedule-clicked, relance sélectionnée
 * @condition relance.statut IN ['brouillon', 'a_valider', 'programmee']
 */

/**
 * @action Ouvrir le modal de reprogrammation
 * @checkpoint modal-opened, date picker et options visibles
 */

/**
 * @action Récupérer la relance depuis PouchDB avec sa date actuelle
 * @checkpoint relance-fetched, date existante préremplie
 * 
 * **Query PouchDB** :
 * const relance = await db.get('relance:' + relanceId);
 * this.currentDate = relance.date_envoi_programmee;
 */

/**
 * @action Afficher les informations de la relance (récapitulatif)
 * @checkpoint relance-info-rendered, payeur, montant, séquence visibles
 * 
 * **Données depuis PouchDB** : payeur, montant, séquence déjà chargés
 */

/**
 * @action Permettre la sélection d'une nouvelle date
 * @checkpoint date-picker-active, calendrier interactif ouvert
 * 
 * Contraintes :
 * - Date minimum : aujourd'hui
 * - Date maximum : +6 mois (optionnel)
 * - Pas de week-end (option configurable)
 */

/**
 * @action Valider la nouvelle date sélectionnée
 * @checkpoint date-validated, format et cohérence vérifiés
 */

/**
 * @action Afficher le récapitulatif avant confirmation
 * @checkpoint confirmation-shown, ancienne vs nouvelle date visibles
 */

/**
 * @action Confirmer la reprogrammation
 * @checkpoint confirmed, utilisateur a validé le changement
 */

/**
 * @action Récupérer la relance depuis PouchDB avec sa révision
 * @checkpoint relance-fetched-with-rev, document prêt pour mise à jour
 * 
 * **Query PouchDB** :
 * const doc = await db.get('relance:' + relanceId);
 */

/**
 * @action Mettre à jour la date dans le document PouchDB
 * @checkpoint doc-updated, nouvelle date appliquée
 * 
 * **Code** :
 * doc.date_envoi_programmee = newDate;
 * doc.updated_at = new Date().toISOString();
 * if (doc.statut === 'a_valider') doc.statut = 'programmee';
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
 *   event_type: 'relance_rescheduled',
 *   title: 'Relance reprogrammée',
 *   description: `Date changée de ${oldDate} à ${newDate}`,
 *   created_at: new Date().toISOString(),
 *   by_marki: false,
 *   metadata: { 
 *     relance_id: relanceId,
 *     old_date: oldDate,
 *     new_date: newDate
 *   }
 * });
 */

/**
 * @action Mettre à jour la relance dans le store Alpine
 * @checkpoint store-updated, nouvelle date reflétée localement
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Relance reprogrammée"
 */

/**
 * @action Fermer le modal
 * @checkpoint modal-closed, retour à la liste
 */
```

## PouchDB Operations

### Chargement de la relance

```javascript
async openRescheduleModal(relanceId) {
  try {
    // Récupérer la relance depuis PouchDB
    const relance = await db.get('relance:' + relanceId);
    
    // Vérifier le statut
    if (!['brouillon', 'a_valider', 'programmee'].includes(relance.statut)) {
      throw new Error('Cette relance ne peut pas être reprogrammée');
    }
    
    this.reschedulingRelance = relance;
    this.currentDate = relance.date_envoi_programmee;
    this.newDate = null;
    
    // Afficher le modal
    this.showRescheduleModal = true;
    
  } catch (error) {
    console.error('Erreur chargement relance:', error);
    this.toast(error.message, 'error');
  }
}
```

### Sauvegarde de la reprogrammation

```javascript
async saveReschedule(relanceId, newDate) {
  this.saving = true;
  
  try {
    // 1. Récupérer avec révision
    const doc = await db.get('relance:' + relanceId);
    
    const oldDate = doc.date_envoi_programmee;
    
    // 2. Vérifier statut
    if (!['brouillon', 'a_valider', 'programmee'].includes(doc.statut)) {
      throw new Error('Cette relance ne peut plus être reprogrammée');
    }
    
    // 3. Valider la date
    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      throw new Error('La date doit être aujourd\'hui ou ultérieure');
    }
    
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    if (selectedDate > sixMonthsLater) {
      throw new Error('La date ne peut pas dépasser 6 mois');
    }
    
    // 4. Mettre à jour
    doc.date_envoi_programmee = newDate;
    doc.updated_at = new Date().toISOString();
    
    // Si était en 'a_valider', passer en 'programmee'
    if (doc.statut === 'a_valider') {
      doc.statut = 'programmee';
    }
    
    // 5. Sauvegarder
    const response = await db.put(doc);
    
    // 6. Créer l'event
    await dbEvents.put({
      _id: 'event:' + this.generateUUID(),
      type: 'event',
      event_type: 'relance_rescheduled',
      title: 'Relance reprogrammée',
      description: `Date changée`,
      created_at: new Date().toISOString(),
      by_marki: false,
      metadata: { 
        relance_id: relanceId,
        old_date: oldDate,
        new_date: newDate
      }
    });
    
    // 7. Mettre à jour l'UI
    const index = this.relances.findIndex(r => r._id === 'relance:' + relanceId);
    if (index !== -1) {
      this.relances[index] = { ...doc, _rev: response.rev };
    }
    
    this.showRescheduleModal = false;
    this.toast('Relance reprogrammée', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.saving = false;
  }
}

// Vérifier si proche de l'envoi
isCloseToSending(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = (date - now) / (1000 * 60 * 60);
  return diffHours <= 24;
}
```

## API Calls

**Aucun appel API** - Toutes les opérations sont effectuées dans PouchDB local.

## Validation des dates

| Règle | Message d'erreur |
|-------|------------------|
| Date >= aujourd'hui | "La date doit être aujourd'hui ou ultérieure" |
| Date <= +6 mois | "La date ne peut pas dépasser 6 mois" (optionnel) |
| Pas de week-end | "Les relances ne sont pas envoyées le week-end" (optionnel) |

## Affichage du récapitulatif

```
Reprogrammation de la relance REL-001

Payeur : ACME Corporation
Montant : 12 500,00 €
Séquence : Relance Standard - Étape 2

Ancienne date : 25/07/2026
Nouvelle date : 15/08/2026

Confirmer la reprogrammation ?
```

## Impact sur les notifications

Si la relance était proche de son envoi (ex: dans 24h) :
- ⚠️ Afficher un avertissement
- "Cette relance était prévue dans moins de 24h"

## Mockups de référence

- `specs/mockups/relances.html` (modal reprogrammation)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Chargement relance | `GET /api/relances/:id` | `db.get('relance:' + id)` |
| Sauvegarde | `PUT /api/relances/:id` | `db.get()` + `db.put()` |
| Réponse | `ApiResponse<Relance>` | `{ ok, id, rev }` |
| Historique | Backend automatique | `dbEvents.put()` côté client |
| Latence | ~200-500ms | ~20-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
