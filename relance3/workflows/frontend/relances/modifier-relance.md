---
id: relances-modifier
type: frontend
folder: specs/workflows/frontend/relances/
description: Modifier une relance existante (brouillon ou à valider) depuis PouchDB
depends_on: [relances-details]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-modifier : Modifier une relance (PouchDB)

## Description

Permettre la modification d'une relance en statut "brouillon" ou "à valider", avec édition des impayés associés, du template et de la date d'envoi. Les données sont lues et sauvegardées dans PouchDB.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Modifier" d'une relance
 * @checkpoint edit-clicked, relance sélectionnée pour modification
 * @condition relance.statut IN ['brouillon', 'a_valider']
 */

/**
 * @action Ouvrir le modal d'édition avec préchargement des données depuis PouchDB
 * @checkpoint modal-opened, formulaire prérempli avec données actuelles
 * 
 * **Query PouchDB** :
 * const relance = await db.get('relance:' + relanceId);
 * const impayes = await db.allDocs({ keys: relance.impaye_ids, include_docs: true });
 */

/**
 * @action Afficher les impayés actuellement liés
 * @checkpoint impayes-rendered, liste des impayés avec montants visibles
 */

/**
 * @action Permettre l'ajout/suppression d'impayés
 * @checkpoint impayes-editable, checkboxes actives pour sélection/désélection
 */

/**
 * @action Recalculer le montant total lors du changement d'impayés
 * @checkpoint total-recalculated, montant mis à jour en temps réel
 */

/**
 * @action Afficher l'éditeur de template d'email
 * @checkpoint template-editor-shown, textarea avec contenu actuel
 */

/**
 * @action Permettre la modification de la date d'envoi programmée
 * @checkpoint date-editable, date picker actif
 */

/**
 * @action Valider le formulaire avant sauvegarde
 * @checkpoint form-validated, contrôles de saisie passés
 * - Au moins un impayé sélectionné
 * - Email du payeur valide
 * - Template non vide
 * - Date d'envoi valide (future ou aujourd'hui)
 */

/**
 * @action Désactiver le bouton de sauvegarde et afficher le loader
 * @checkpoint saving-state, spinner visible, bouton disabled
 */

/**
 * @action Récupérer la relance depuis PouchDB avec sa révision
 * @checkpoint relance-fetched, document avec _rev récupéré
 * 
 * **Query PouchDB** :
 * const doc = await db.get('relance:' + relanceId);
 */

/**
 * @action Mettre à jour les champs modifiés dans le document PouchDB
 * @checkpoint doc-updated, champs modifiés appliqués
 * 
 * **Code** :
 * doc.impaye_ids = formData.impayes_ids;
 * doc.template = formData.template;
 * doc.date_envoi_programmee = formData.date_envoi;
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
 * @checkpoint event-created, entrée d'historique créée
 * 
 * **Query PouchDB** :
 * await dbEvents.put({
 *   _id: 'event:' + generateUUID(),
 *   type: 'event',
 *   event_type: 'relance_modified',
 *   title: 'Relance modifiée',
 *   description: `Relance ${relanceId} modifiée`,
 *   created_at: new Date().toISOString(),
 *   by_marki: false,
 *   metadata: { relance_id: relanceId, changes: [...] }
 * });
 */

/**
 * @action Mettre à jour la relance dans le store Alpine
 * @checkpoint store-updated, données locales synchronisées
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Relance mise à jour"
 */

/**
 * @action Fermer le modal et rafraîchir la liste
 * @checkpoint modal-closed, liste affichée avec données à jour
 */
```

## PouchDB Operations

### Chargement des données pour édition

```javascript
async loadRelanceForEdit(relanceId) {
  try {
    // 1. Relance
    const relance = await db.get('relance:' + relanceId);
    this.editingRelance = { ...relance };
    
    // 2. Impayés liés
    if (relance.impaye_ids?.length) {
      const impayesResult = await db.allDocs({
        keys: relance.impaye_ids,
        include_docs: true
      });
      this.linkedImpayers = impayesResult.rows.map(r => r.doc);
    }
    
    // 3. Impayés disponibles du même payeur
    const availableResult = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    this.availableImpayers = availableResult.rows
      .map(r => r.doc)
      .filter(f => f.contact_id === relance.contact_id && f.facture_soldee === 0);
      
  } catch (error) {
    console.error('Erreur chargement relance:', error);
    this.error = error.message;
  }
}
```

### Sauvegarde des modifications

```javascript
async saveRelance(relanceId, formData) {
  this.saving = true;
  
  try {
    // 1. Récupérer avec révision
    const doc = await db.get('relance:' + relanceId);
    
    // 2. Vérifier le statut
    if (!['brouillon', 'a_valider'].includes(doc.statut)) {
      throw new Error('Cette relance ne peut plus être modifiée');
    }
    
    // 3. Mettre à jour les champs
    doc.impaye_ids = formData.impayes_ids;
    doc.template = formData.template;
    doc.date_envoi_programmee = formData.date_envoi_programmee;
    doc.objet = formData.objet;
    doc.corps = formData.corps;
    doc.updated_at = new Date().toISOString();
    
    // 4. Sauvegarder
    const response = await db.put(doc);
    
    // 5. Créer l'event
    await dbEvents.put({
      _id: 'event:' + this.generateUUID(),
      type: 'event',
      event_type: 'relance_modified',
      title: 'Relance modifiée',
      description: `Relance ${doc.objet || relanceId} modifiée`,
      created_at: new Date().toISOString(),
      by_marki: false,
      metadata: { 
        relance_id: relanceId,
        previous_rev: doc._rev,
        new_rev: response.rev
      }
    });
    
    // 6. Mettre à jour l'UI
    const index = this.relances.findIndex(r => r._id === 'relance:' + relanceId);
    if (index !== -1) {
      this.relances[index] = { ...doc, _rev: response.rev };
    }
    
    this.showEditModal = false;
    this.toast('Relance mise à jour', 'success');
    
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
```

## API Calls

**Aucun appel API** - Toutes les opérations sont effectuées dans PouchDB local.

## Validation du formulaire

| Champ | Règle | Message d'erreur |
|-------|-------|------------------|
| impayes_ids | min: 1 | "Sélectionnez au moins un impayé" |
| template | non vide | "Le template ne peut pas être vide" |
| date_envoi_programmee | >= aujourd'hui | "La date doit être aujourd'hui ou future" |
| email_destinataire | format valide | "Email invalide" |

## Champs modifiables selon statut

| Champ | Brouillon | À valider | Programmée | Envoyée |
|-------|-----------|-----------|------------|---------|
| Impayés | ✅ | ✅ | ❌ | ❌ |
| Template | ✅ | ✅ | ❌ | ❌ |
| Date envoi | ✅ | ✅ | ❌ | ❌ |
| Email destinataire | ✅ | ✅ | ❌ | ❌ |

## Mockups de référence

- `specs/mockups/relances.html` (modal édition relance)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Chargement relance | `GET /api/relances/:id` | `db.get('relance:' + id)` |
| Impayés liés | `GET /api/impayes?relance_id=:id` | `db.allDocs({ keys: [...] })` |
| Impayés disponibles | `GET /api/impayes?payeur_id=:id` | `db.allDocs()` + filtrage |
| Sauvegarde | `PUT /api/relances/:id` | `db.get()` + `db.put()` |
| Historique | Backend automatique | `dbEvents.put()` côté client |
| Latence | ~300-800ms | ~50-100ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
