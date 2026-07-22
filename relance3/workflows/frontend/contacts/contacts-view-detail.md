---
id: contacts-view-detail
type: frontend
folder: specs/workflows/frontend/contacts/
description: Affiche le détail d'un contact (entreprise ou personne) depuis PouchDB
depends_on: [contacts-load-all]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-view-detail : Voir le détail d'un contact

## Description

Affiche une modale avec les informations détaillées d'un contact sélectionné.
Les données sont récupérées depuis **PouchDB local** (chargées par `contacts-load-all`).

**Note importante:** Ce workflow est optionnel car toutes les informations
sont déjà visibles dans les cards. La modale de détail peut être utilisée
pour une vue complète ou supprimée au profit d'une navigation vers une page dédiée.

## Élément déclencheur

- Click sur une card de contact (entreprise ou personne)
- OU: Bouton "Voir" explicite (si présent)

## Flow du Workflow

```javascript
/**
 * @action Ouvrir la modale de détail
 * @param {Object} contact - Le contact sélectionné (depuis PouchDB)
 * @checkpoint view-detail-opened
 * State: {
 *   selectedContact: contact,
 *   showDetailModal: true
 * }
 */

/**
 * @action Fermer la modale
 * @checkpoint view-detail-closed
 * State: {
 *   selectedContact: null,
 *   showDetailModal: false
 * }
 */
```

## State

```javascript
viewContact(contact) {
  // Le contact est passé directement depuis la liste (déjà en mémoire)
  this.selectedContact = contact;
  this.showDetailModal = true;
}

closeDetailModal() {
  this.showDetailModal = false;
  this.selectedContact = null;
}
```

## Chargement de données complémentaires (optionnel)

Si besoin de données supplémentaires non chargées par `contacts-load-all` :

```javascript
// Charger des détails supplémentaires depuis PouchDB
async loadContactDetails(contactId) {
  try {
    const doc = await db.get('contact:' + contactId);
    // OU charger des documents liés (impayés, relances...)
    const impayes = await db.find({
      selector: { 
        type: 'impaye',
        contactId: contactId 
      }
    });
    return { contact: doc, impayes: impayes.docs };
  } catch (err) {
    console.error('Erreur chargement détail:', err);
    return null;
  }
}
```

## UI - Structure de la modale

```
┌─────────────────────────────────────┐
│  DÉTAIL DU CONTACT              [X] │
├─────────────────────────────────────┤
│                                     │
│  ┌─────┐                            │
│  │🏢 ou👤│  Nom du Contact           │
│  └─────┘    Type (Entreprise ou    │
│              Personne physique)     │
│                                     │
│  ───────────────────────────────────│
│                                     │
│  📧 Email: email@contact.com        │
│  📞 Téléphone: 01 23 45 67 89       │
│                                     │
│  Fonction: Directeur Financier      │
│                                     │
│  ───────────────────────────────────│
│                                     │
│  Impayés: 3 (12 500 €)              │
│                                     │
│  Statut: Actif / BlackListé         │
│                                     │
│  Email forcé: pro@email.com         │  ← Si défini
│                                     │
├─────────────────────────────────────┤
│  [Email forcé]        [Fermer]     │
└─────────────────────────────────────┘
```

## Checkpoints attendus

1. `view-detail-opened` → Modale ouverte avec les détails du contact (depuis PouchDB)
2. `view-detail-closed` → Modale fermée

## Alternative: Navigation vers page dédiée

Au lieu d'une modale, on peut naviguer vers :
- `/contacts/{id}` - Page détail contact
- `/contacts/{id}/edit` - Page édition contact

Dans ce cas, les workflows deviendraient:
- `contacts-navigate-detail`
- `contacts-navigate-edit`

## Fichiers liés

- Mockup: `specs/mockups/contacts.html`
- Composant: `app/templates/contacts/workflows/view-detail.html`

---

## Source des données

| Source | Description |
|--------|-------------|
| Données contact | PouchDB local (chargé par `contacts-load-all`) |
| Mise à jour temps réel | Via `db.changes()` listener dans `contacts-load-all` |

**Note:** Pas d'appel API direct ici, les données proviennent de PouchDB local déjà synchronisé avec CouchDB.
