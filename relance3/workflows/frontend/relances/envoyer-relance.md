---
id: relances-envoyer
type: frontend
folder: specs/workflows/frontend/relances/
description: Envoyer une relance par email au payeur via PouchDB
depends_on: [relances-details, preview-relance]
screen: relances
global: false
mockup_entry: specs/mockups/relances.html
---

# relances-envoyer : Envoyer une relance (PouchDB)

## Description

Envoyer immédiatement une relance par email au payeur, avec confirmation et suivi de l'envoi. Les données sont récupérées depuis PouchDB, l'envoi passe par une API backend.

## Étapes

```javascript
/**
 * @action Cliquer sur le bouton "Envoyer maintenant"
 * @checkpoint send-clicked, intention d'envoi confirmée
 */

/**
 * @action Afficher la confirmation d'envoi (modal confirmation)
 * @checkpoint confirm-modal-shown, récapitulatif affiché
 */

/**
 * @action Confirmer l'envoi en cliquant "Oui, envoyer"
 * @checkpoint send-confirmed, envoi validé par utilisateur
 */

/**
 * @action Désactiver le bouton et afficher le loader d'envoi
 * @checkpoint sending-state, spinner visible, bouton disabled
 */

/**
 * @action Récupérer les données complètes depuis PouchDB pour l'envoi
 * @checkpoint data-fetched, relance + payeur + impayés chargés
 * 
 * **Code** :
 * const relance = await db.get('relance:' + relanceId);
 * const payeur = await dbContacts.get('contact:' + relance.contact_id);
 * const impayes = await getImpayerForRelance(relance.impaye_ids);
 */

/**
 * @action Appeler POST /api/relances/:id/send avec les données PouchDB
 * @checkpoint api-called, requête d'envoi envoyée
 * @api POST /api/relances/:id/send
 * @payload { 
 *   relance_id: relanceId,
 *   send_now: true,
 *   // Données depuis PouchDB
 *   payeur_email: payeur.email,
 *   payeur_nom: payeur.nom,
 *   relance_objet: relance.objet,
 *   relance_corps: relance.corps,
 *   impayes: impayes.map(i => ({ id: i._id, montant: i.reste_a_payer }))
 * }
 * @response { success: true, message_id, sent_at }
 */

/**
 * @action Traiter la réponse de l'API
 * @checkpoint response-handled, statut envoyée/erreur déterminé
 */

/**
 * @action Mettre à jour le statut de la relance dans PouchDB
 * @checkpoint relance-updated, statut 'envoyee' sauvegardé
 * 
 * **Code** :
 * relance.statut = 'envoyee';
 * relance.sent_at = new Date().toISOString();
 * relance.message_id = response.message_id;
 * await db.put(relance);
 */

/**
 * @action Créer un event d'historique dans PouchDB
 * @checkpoint event-created, entrée d'audit créée
 * 
 * **Code** :
 * await dbEvents.put({
 *   _id: 'event:' + generateUUID(),
 *   type: 'event',
 *   event_type: 'relance_sent',
 *   title: 'Relance envoyée',
 *   description: `Relance envoyée à ${payeur.nom}`,
 *   created_at: new Date().toISOString(),
 *   by_marki: false,
 *   metadata: { relance_id: relanceId, message_id: response.message_id }
 * });
 */

/**
 * @action Mettre à jour le store Alpine
 * @checkpoint status-updated, store Alpine mis à jour
 */

/**
 * @action Afficher la notification de succès
 * @checkpoint success-toast-shown, message "Email envoyé avec succès"
 */

/**
 * @action Fermer le modal et rafraîchir la liste
 * @checkpoint modal-closed, liste des relances rechargée
 */
```

## PouchDB Operations

### Chargement des données pour l'envoi

```javascript
async getRelanceDataForSending(relanceId) {
  // 1. Relance
  const relance = await db.get('relance:' + relanceId);
  
  // 2. Payeur
  const payeur = await dbContacts.get('contact:' + relance.contact_id);
  
  // 3. Impayés
  const impayes = [];
  for (const impayeId of relance.impaye_ids || []) {
    try {
      const impaye = await db.get(impayeId);
      impayes.push(impaye);
    } catch (e) {
      console.warn('Impaye non trouvé:', impayeId);
    }
  }
  
  return { relance, payeur, impayes };
}
```

### Mise à jour après envoi

```javascript
async updateRelanceAfterSending(relanceId, messageId) {
  // 1. Récupérer et mettre à jour
  const doc = await db.get('relance:' + relanceId);
  doc.statut = 'envoyee';
  doc.sent_at = new Date().toISOString();
  doc.message_id = messageId;
  doc.updated_at = new Date().toISOString();
  
  await db.put(doc);
  
  // 2. Créer l'event
  await dbEvents.put({
    _id: 'event:' + this.generateUUID(),
    type: 'event',
    event_type: 'relance_sent',
    title: 'Relance envoyée',
    description: `Relance ${doc.objet} envoyée`,
    created_at: new Date().toISOString(),
    by_marki: false,
    metadata: { relance_id: relanceId, message_id: messageId }
  });
}
```

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/relances/:id/send` | **Conservé** - Envoi effectif de l'email |

**Note** : L'API d'envoi d'email est **conservée** car l'envoi SMTP nécessite un serveur. Les données (relance, payeur, impayés) proviennent de PouchDB.

## Gestion des erreurs

| Erreur | Message affiché | Action |
|--------|-----------------|--------|
| 400 - Pas d'email | "Le payeur n'a pas d'email configuré" | Redirection vers fiche contact |
| 400 - Blacklisté | "Le contact est blacklisté" | Info avec lien gestion blacklist |
| 500 - SMTP | "Erreur d'envoi SMTP" | Retry disponible |
| 429 - Rate limit | "Trop d'envois, veuillez réessayer" | Attente recommandée |
| 409 - PouchDB | "Conflit de version" | Recharger et réessayer |

## Mockups de référence

- `specs/mockups/relances.html` (modal confirmation envoi)
- `specs/mockups/relances.html` (toast succès/erreur)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB + API) |
|--------|-------------|----------------------|
| Données relance | `GET /api/relances/:id` | `db.get('relance:' + id)` |
| Données payeur | `GET /api/payers/:id` | `dbContacts.get('contact:' + id)` |
| Données impayés | `GET /api/impayes?relance_id=:id` | `db.allDocs()` + filtrage |
| Envoi email | `POST /api/relances/:id/send` | **Conservé** - Nécessite serveur SMTP |
| Mise à jour statut | Backend automatique | `db.put()` côté client |
| Historique | Backend automatique | `dbEvents.put()` côté client |
| Latence totale | ~500-1000ms | ~100-200ms (chargement local) + envoi SMTP |
| Offline | ❌ Impossible | ✅ Préparation possible, envoi nécessite connexion |
