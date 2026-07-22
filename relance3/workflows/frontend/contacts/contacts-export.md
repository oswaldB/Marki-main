---
id: contacts-export
type: frontend
folder: specs/workflows/frontend/contacts/
description: Exporte les contacts visibles (filtrés ou tous) depuis PouchDB
depends_on: [contacts-load-all]
screen: contacts
global: false
mockup_entry: specs/mockups/contacts.html
---

# contacts-export : Exporter les contacts

## Description

Exporte les contacts actuellement visibles (respecte le filtre de recherche actuel)
en fichier Excel/CSV. Les contacts sont lus depuis **PouchDB local** et générés côté client.
Les contacts blacklistés sont inclus dans l'export.

## Élément déclencheur

Bouton "Exporter" dans la barre d'outils en haut de la page.

## Flow du Workflow

```javascript
/**
 * @action Lancer l'export
 * @checkpoint export-requested
 * 
 * PouchDB:
 * 1. Récupérer tous les contacts: db.allDocs({ startkey: 'contact:', endkey: 'contact:\ufff0' })
 * 2. Appliquer le filtre searchQuery côté client
 * 3. Transformer en format CSV/Excel
 * 4. Générer le fichier Blob et déclencher le téléchargement
 * 
 * Success:
 *   - Téléchargement automatique du fichier
 *   - Toast success
 * Error:
 *   - Toast error
 */
```

## PouchDB Operations

### Récupérer les contacts à exporter

```javascript
// Récupérer tous les contacts depuis PouchDB
const result = await db.allDocs({
  startkey: 'contact:',
  endkey: 'contact:\ufff0',
  include_docs: true
});

let contacts = result.rows.map(row => row.doc);

// Appliquer le filtre de recherche actuel (côté client)
if (this.searchQuery) {
  const query = this.searchQuery.toLowerCase();
  contacts = contacts.filter(c => 
    c.nomComplet?.toLowerCase().includes(query) ||
    c.email?.toLowerCase().includes(query) ||
    c.societesLiees?.toLowerCase().includes(query)
  );
}

// Toujours inclure les blacklistés
```

### Génération CSV côté client

```javascript
function exportToCSV(contacts) {
  const headers = [
    'Nom', 'Type', 'Email', 'Email forcé', 'Téléphone', 
    'Fonction', 'Entreprise', 'Impayés', 'Statut', 'Relation'
  ];
  
  const rows = contacts.map(c => ([
    c.nomComplet || '',
    c.typePersonne || '',
    c.email || '',
    c.emailForce || '',
    c.telephone || '',
    c.fonction || '',
    c.societesLiees || '',
    c.impayesCount || 0,
    c.statut === 'blacklist' ? 'BlackListé' : 'Actif',
    c.descriptionRelation || ''
  ]));
  
  // Convertir en CSV
  const csvContent = [
    headers.join(';'),
    ...rows.map(r => r.join(';'))
  ].join('\n');
  
  // Créer le Blob et télécharger
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### Génération Excel côté client (avec SheetJS)

```javascript
// Option: utiliser SheetJS (xlsx.js) pour Excel
// CDN: https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js

function exportToExcel(contacts) {
  const data = contacts.map(c => ({
    'Nom': c.nomComplet || '',
    'Type': c.typePersonne || '',
    'Email': c.email || '',
    'Email forcé': c.emailForce || '',
    'Téléphone': c.telephone || '',
    'Fonction': c.fonction || '',
    'Entreprise': c.societesLiees || '',
    'Impayés': c.impayesCount || 0,
    'Statut': c.statut === 'blacklist' ? 'BlackListé' : 'Actif',
    'Relation': c.descriptionRelation || ''
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
  
  const filename = `contacts_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}
```

## State

```javascript
async exportData() {
  try {
    this.exportLoading = true;
    
    // 1. Récupérer depuis PouchDB
    const result = await db.allDocs({
      startkey: 'contact:',
      endkey: 'contact:\ufff0',
      include_docs: true
    });
    
    let contacts = result.rows.map(row => row.doc);
    
    // 2. Appliquer filtre si présent
    if (this.searchQuery?.trim()) {
      const q = this.searchQuery.toLowerCase();
      contacts = contacts.filter(c => 
        (c.nomComplet?.toLowerCase().includes(q)) ||
        (c.email?.toLowerCase().includes(q))
      );
    }
    
    // 3. Générer et télécharger
    exportToCSV(contacts); // ou exportToExcel(contacts)
    
    this.toast(`${contacts.length} contacts exportés`);
    
  } catch (err) {
    this.toast('Erreur export: ' + err.message, 'error');
  } finally {
    this.exportLoading = false;
  }
}
```

## Colonnes exportées

| Colonne | Description | Champ PouchDB |
|---------|-------------|---------------|
| Nom | Nom complet du contact | `nomComplet` |
| Type | M (Entreprise) ou P (Personne) | `typePersonne` |
| Email | Email principal | `email` |
| Email forcé | Email de relance (si défini) | `emailForce` |
| Téléphone | Numéro de téléphone | `telephone` |
| Fonction | Rôle/fonction (personnes) | `fonction` |
| Entreprise | Nom de l'entreprise liée (personnes) | `societesLiees` |
| Impayés | Nombre de factures impayées | `impayesCount` |
| Statut | Actif / BlackListé | `statut` |
| Relation | Description de la relation | `descriptionRelation` |

## Checkpoints attendus

1. `export-requested` → Export demandé, lecture PouchDB en cours
2. `export-completed` → Export terminé, fichier téléchargé
3. `export-error` → Erreur lors de l'export

## Dépendances

- PouchDB pour la lecture des contacts
- Option CSV: natif (Blob + URL.createObjectURL)
- Option Excel: SheetJS (`xlsx` library) - CDN ou npm

## Fichiers liés

- Mockup: `specs/mockups/contacts.html`
- Composant: `app/templates/contacts/workflows/export.html`

---

## Migration depuis l'ancienne API

| Avant (API) | Après (PouchDB + Client) |
|-------------|--------------------------|
| `POST /api/contacts/export` | `db.allDocs()` pour récupérer les données |
| Génération Excel côté serveur | Génération CSV/Excel côté client |
| `downloadUrl` renvoyée | `URL.createObjectURL()` pour téléchargement |
| Filtrage côté serveur | Filtrage côté client sur les données PouchDB |
| Serveur requis pour export | Fonctionne offline grâce à PouchDB |
