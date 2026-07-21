---
id: contacts-export
type: frontend
folder: specs/workflows/frontend/contacts/
description: Exporte les contacts visibles (filtrés ou tous)
depends_on: [contacts-load-all]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-export : Exporter les contacts

## Description

Exporte les contacts actuellement visibles (respecte le filtre de recherche actuel)
en fichier Excel/CSV. Les contacts blacklistés sont inclus dans l'export.

## Élément déclencheur

Bouton "Exporter" dans la barre d'outils en haut de la page.

## Flow du Workflow

```javascript
/**
 * @action Lancer l'export
 * @checkpoint export-requested
 * API: POST /api/contacts/export
 * Payload: { 
 *   search: this.searchQuery,
 *   includeBlacklist: true  // Toujours inclus
 * }
 * Response: { downloadUrl: '...', filename: 'contacts_2024.xlsx' }
 * 
 * Success:
 *   - Téléchargement automatique du fichier
 *   - Toast success
 * Error:
 *   - Toast error
 */
```

## API

| Méthode | Endpoint | Payload | Response |
|---------|----------|---------|----------|
| POST | `/api/contacts/export` | `{ search: string, includeBlacklist: boolean }` | `{ downloadUrl: string, filename: string }` |

## State

```javascript
exportData() {
  // Afficher spinner ou état de chargement
  // Appel API
  // Téléchargement automatique
}
```

## Colonnes exportées

| Colonne | Description |
|---------|-------------|
| Nom | Nom complet du contact |
| Type | M (Entreprise) ou P (Personne) |
| Email | Email principal |
| Email forcé | Email de relance (si défini) |
| Téléphone | Numéro de téléphone |
| Fonction | Rôle/fonction (personnes) |
| Entreprise | Nom de l'entreprise liée (personnes) |
| Impayés | Nombre de factures impayées |
| Statut | Actif / BlackListé |
| Relation | Description de la relation (tutelle, époux...) |

## Checkpoints attendus

1. `export-requested` → Export demandé et en cours
2. `export-completed` → Export terminé, fichier téléchargé
3. `export-error` → Erreur lors de l'export

## Fichiers liés

- Mockup: `specs/mockups/contacts.html`
- Composant: `app/templates/contacts/workflows/export.html`
