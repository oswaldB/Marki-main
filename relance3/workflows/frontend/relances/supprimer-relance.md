---
id: relances-supprimer
type: frontend
folder: specs/workflows/frontend/relances/
description: Supprimer une relance en brouillon ou à valider depuis PouchDB
depends_on: [relances-details]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-supprimer : Supprimer une relance (PouchDB)

## Description

Permettre la suppression définitive d'une relance en statut "brouillon" ou "à valider" depuis PouchDB, avec confirmation et vérification des impacts.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Supprimer" d'une relance
 * @checkpoint delete-clicked, relance sélectionnée pour suppression
 * @condition relance.statut IN ['brouillon', 'a_valider']
 * @note Les relances 'programmee', 'envoyee' ou 'annulee' ne peuvent pas être supprimées
 */

/**
 * @action Ouvrir le modal de confirmation
 * @checkpoint confirm-modal-opened, avertissement visible
 */

/**
 * @action Afficher le récapitulatif de la relance à supprimer
 * @checkpoint relance-summary-shown, montant, payeur, date visibles
 */

/**
 * @action Vérifier s'il y a des dépendances dans PouchDB (impayés liés uniquement à cette relance)
 * @checkpoint dependencies-checked, vérification effectuée
 * 
 * **Query PouchDB** :
 * const impayesLie = await db.allDocs({
 *   startkey: 'facture:',
 *   endkey: 'facture:\ufff0',
 *   include_docs: true
 * });
 * const dependants = impayesLie.rows
 *   .map(r => r.doc)
 *   .filter(f => f.relance_id === relanceId);
 * 
 * Si des impayés sont liés uniquement à cette relance :
 * - Afficher un avertissement
 * - Proposer de les détacher ou d'annuler la suppression
 */

/**
 * @action Afficher le message d'avertissement irréversible
 * @checkpoint warning-shown, mention "Action irréversible" visible
 */

/**
 * @action Demander la confirmation explicite (checkbox ou saisie)
 * @checkpoint explicit-confirmation-required, utilisateur doit confirmer
 * Ex: "Tapez SUPPRIMER pour confirmer" ou checkbox "Je confirme la suppression"
 */

/**
 * @action Valider la confirmation
 * @checkpoint deletion-confirmed, utilisateur a confirmé explicitement
 */

/**
 * @action Supprimer la relance de PouchDB
 * @checkpoint pouchdb-deleted, suppression locale effectuée
 * 
 * **Code** :
 * const doc = await db.get('relance:' + id);
 * await db.remove(doc);
 */

/**
 * @action Mettre à jour les impayés liés (détacher la relance)
 * @checkpoint impayes-updated, relance_id retiré des factures
 * 
 * **Code** :
 * for (const impaye of dependants) {
 *   delete impaye.relance_id;
 *   await db.put(impaye);
 * }
 */

/**
 * @action Supprimer la relance du store Alpine
 * @checkpoint store-updated, liste locale mise à jour sans rechargement
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Relance supprimée"
 */

/**
 * @action Fermer le modal
 * @checkpoint modal-closed, retour à la liste
 */

/**
 * @action Créer un event dans PouchDB pour l'historique
 * @checkpoint event-created, entrée d'audit créée
 * 
 * **Code** :
 * await dbEvents.put({
 *   _id: 'event:' + generateUUID(),
 *   type: 'event',
 *   event_type: 'relance_deleted',
 *   title: 'Relance supprimée',
 *   description: `Relance ${relanceId} supprimée`,
 *   created_at: new Date().toISOString(),
 *   metadata: { relance_id: relanceId }
 * });
 */
```

## PouchDB Operations

### Suppression de la relance

```javascript
async supprimerRelance(id) {
  try {
    // 1. Récupérer le document avec sa révision
    const doc = await db.get('relance:' + id);
    
    // 2. Vérifier le statut
    if (!['brouillon', 'a_valider'].includes(doc.statut)) {
      throw new Error('Cette relance ne peut pas être supprimée');
    }
    
    // 3. Récupérer les impayés liés
    const result = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    
    const dependants = result.rows
      .map(r => r.doc)
      .filter(f => f.relance_id === id);
    
    // 4. Supprimer la relance
    await db.remove(doc);
    
    // 5. Détacher les impayés
    for (const impaye of dependants) {
      delete impaye.relance_id;
      impaye.updated_at = new Date().toISOString();
      await db.put(impaye);
    }
    
    // 6. Créer un event d'historique
    await dbEvents.put({
      _id: 'event:' + this.generateUUID(),
      type: 'event',
      event_type: 'relance_deleted',
      title: 'Relance supprimée',
      description: `Relance ${doc.objet || id} supprimée`,
      created_at: new Date().toISOString(),
      by_marki: false,
      metadata: { 
        relance_id: id,
        impayes_detached: dependants.length
      }
    });
    
    // 7. Mettre à jour l'UI
    this.relances = this.relances.filter(r => r._id !== 'relance:' + id);
    
    return { success: true };
    
  } catch (error) {
    if (error.status === 409) {
      throw new Error('Conflit de version, veuillez réessayer');
    }
    throw error;
  }
}
```

## Conditions de suppression

| Statut | Suppression possible | Raison si non |
|--------|---------------------|---------------|
| brouillon | ✅ | - |
| a_valider | ✅ | - |
| programmee | ❌ | "La relance est déjà programmée" |
| envoyee | ❌ | "La relance a déjà été envoyée" |
| annulee | ❌ | "Conserver pour l'historique" |

## Message de confirmation

```
⚠️ Suppression définitive

Vous êtes sur le point de supprimer la relance suivante :

ID : REL-001
Payeur : ACME Corporation
Montant : 12 500,00 €
Date création : 15/07/2026

Cette action est irréversible. Les impayés liés seront détachés
mais conservés dans le système.

[  ] Je confirme vouloir supprimer cette relance

[Annuler]  [Supprimer définitivement]
```

## Impact sur les impayés liés

Lors de la suppression :
- Les impayés liés perdent leur association à cette relance (`relance_id` supprimé)
- Ils redeviennent disponibles pour une nouvelle relance
- Leur statut revient à "non relancé"
- Les modifications sont synchronisées avec CouchDB

## Mockups de référence

- `specs/mockups/relances.html` (modal suppression)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Suppression relance | `DELETE /api/relances/:id` | `db.get()` + `db.remove()` |
| Vérification dépendances | `GET /api/impayes?relance_id=:id` | `db.allDocs()` + filtrage côté client |
| Mise à jour impayés | Backend automatique | `db.put()` pour chaque impayé |
| Historique | Backend automatique | `dbEvents.put()` côté client |
| Latence | ~200-500ms | ~50-100ms (local + bulk updates) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
