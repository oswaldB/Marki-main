# Stratégie Workflows - Guide d'Architecture

**Date**: 2024-07-16
**Applicabilité**: Tous les développements frontend Marki

---

## Principe Fondamental

> **Un workflow n'est PAS une obligation. C'est un outil pour la logique métier complexe.**

Beaucoup d'actions peuvent être réalisées directement via les routes REST CRUD existantes.

---

## Arbre de Décision

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACTION UTILISATEUR                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────┐
│ 1. MODIFICATION STATE LOCAL ?   │
│    (tri, pagination, filtres) │
└──────────┬──────────────────────┘
           │ OUI
           ▼
    ┌─────────────────────┐
    │ Frontend uniquement │◄── Aucun appel API
    │ this.xxx = valeur   │    Logique dans getters
    └─────────────────────┘
           │
           │ NON
           ▼
┌─────────────────────────────────┐
│ 2. CRUD SIMPLE SUR ENTITÉ ?     │
│    (modifier statut, toggle)    │
└──────────┬──────────────────────┘
           │ OUI
           ▼
    ┌──────────────────────────┐
    │ Appel REST direct        │◄── fetch(`/api/xxx`)
    │ PUT/POST/DELETE          │    + update local
    └──────────────────────────┘
           │
           │ NON
           ▼
┌─────────────────────────────────┐
│ 3. LOGIQUE MÉTIER COMPLEXE ?    │
│    (génération, calcul, batch)  │
└──────────┬──────────────────────┘
           │ OUI
           ▼
    ┌──────────────────────────┐
    │ Workflow Python          │◄── POST /api/workflow/xxx
    │ Traitement serveur       │
    └──────────────────────────┘
           │
           │ NON
           ▼
    ┌──────────────────────────┐
    │ Cron Job                 │◄── Traitement async/planifié
    │ APScheduler              │
    └──────────────────────────┘
```

---

## Exemples par Catégorie

### 1. State Local (Frontend uniquement)

**Cas**: Tri, pagination, filtres, toggle UI

```javascript
// ❌ PAS BESOIN de workflow ni d'API
// ✅ Logique directe dans alpinejs.html

Alpine.data('impayes', () => ({
    sortColumn: 'date',
    sortDirection: 'desc',
    
    get sortedImpayes() {
        return this.impayes.sort((a, b) => {
            return this.sortDirection === 'asc' 
                ? a[this.sortColumn] - b[this.sortColumn]
                : b[this.sortColumn] - a[this.sortColumn];
        });
    },
    
    // Toggle simple
    toggleDirection() {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    }
}));
```

**Routes concernées**: Aucune

---

### 2. CRUD Simple (Appel REST direct)

**Cas**: Modifier un statut, toggle blacklist, mettre à jour des champs

```javascript
// ❌ ÉVITER: Workflow Python inutile
suspendViaWorkflow: async function(id) {
    await fetch('/api/workflow/impayes-suspend', {
        method: 'POST',
        body: JSON.stringify({id})
    });
}

// ✅ PRÉFÉRER: Appel REST direct
suspendDirect: async function(id) {
    const response = await fetch(`/api/impayes/${id}`, {
        method: 'PUT',
        headers: {Authorization: ...},
        body: JSON.stringify({statut: 'suspendu'})
    });
    
    if (response.ok) {
        // Update local uniquement si succès
        const idx = this.impayes.findIndex(i => i.id === id);
        this.impayes[idx].statut = 'suspendu';
    }
}
```

**Routes à utiliser**:
- `GET /api/impayes` - Liste
- `PUT /api/impayes/{id}` - Modifier
- `POST /api/contacts/{id}/blacklist` - Toggle
- `DELETE /api/relances/{id}` - Supprimer

---

### 3. Logique Métier Complexe (Workflow Python)

**Cas**: Calculs complexes, génération automatique, intégrations externes

```javascript
// ✅ NÉCESSAIRE: Workflow Python car logique complexe
generateRelances: async function() {
    const response = await fetch('/api/workflow/generate-relances', {
        method: 'POST',
        headers: {Authorization: ...},
        body: JSON.stringify({
            date_debut: this.dateDebut,
            auto_validate: false
        })
    });
    
    const result = await response.json();
    // Résultat calculé côté serveur
    this.relancesGenerees = result.data;
}
```

**Workflows existants**:
- `generate-relances` - Création automatique
- `send-emails` - Envoi SMTP + tracking
- `import-invoice` - Parsing + validation
- `sync-contacts` - Intégration CRM

---

### 4. Cron Jobs (Traitement planifié)

**Cas**: Actions récurrentes, batchs, nettoyages

```python
# Backend Python - cron/jobs.py
def cleanup_old_relances():
    """Exécuté automatiquement chaque nuit."""
    pass
```

**Configuration**: `cron/config.py`

---

## Tableau de Décision Rapide

| Action | Méthode | Exemple |
|--------|---------|---------|
| **Trier** | State local | `@click="sortColumn = 'nom'"` |
| **Paginer** | State local | `@click="currentPage++"` |
| **Filtrer** | Getter calculé | `get filtered() { return ... }` |
| **Modifier statut** | PUT direct | `fetch(\`/api/xxx/${id}\`, {method: 'PUT'})` |
| **Toggle booléen** | POST direct | `fetch(\`/api/xxx/${id}/toggle\`)` |
| **Créer entité** | POST direct | `fetch('/api/xxx', {method: 'POST'})` |
| **Générer données** | Workflow | `fetch('/api/workflow/generate-xxx')` |
| **Envoyer emails** | Workflow | `fetch('/api/workflow/send-emails')` |
| **Importer fichier** | Workflow | `fetch('/api/workflow/import-xxx')` |

---

## Checklist Avant de Créer un Workflow

Avant de créer un nouveau workflow dans `app/workflows/`, vérifiez:

- [ ] L'action nécessite-t-elle des calculs complexes côté serveur ?
- [ ] L'action implique-t-elle plusieurs tables avec transactions ?
- [ ] L'action nécessite-t-elle des appels API externes (SMTP, CRM) ?
- [ ] L'action doit-elle être exécutée de manière asynchrone ?
- [ ] L'action est-elle utilisée par un cron job ?

**Si NON à toutes ces questions → Utiliser un appel REST direct**

---

## Anti-Patterns à Éviter

### ❌ Workflow pour CRUD simple

```python
# workflows/toggle-blacklist.py - INUTILE
def main(contact_id):
    db.execute("UPDATE contacts SET blacklist = NOT blacklist WHERE id = ?", [contact_id])
    return {'success': True}
```

```javascript
// ❌ ÉVITER
await fetch('/api/workflow/toggle-blacklist', {method: 'POST', body: {contact_id}});
```

```javascript
// ✅ PRÉFÉRER
await fetch(`/api/contacts/${contact_id}/blacklist`, {method: 'POST'});
```

### ❌ Workflow pour tri/pagination

```python
# workflows/pagination.py - INUTILE
def main(page, per_page):
    return db.query("SELECT * LIMIT ? OFFSET ?", [per_page, page * per_page])
```

```javascript
// ❌ ÉVITER
await fetch('/api/workflow/pagination', ...);

// ✅ PRÉFÉRER
// Calcul local avec getters
get paginatedItems() {
    return this.items.slice((this.page - 1) * this.perPage, this.page * this.perPage);
}
```

---

## Bonnes Pratiques

### 1. Nommage

- **Routes REST**: `/api/{ressource}/{id}` (standard REST)
- **Workflows**: `{domaine}-{action}` (ex: `impayes-suspend`, `contacts-sync`)

### 2. Gestion des erreurs

```javascript
// Toujours gérer les erreurs
async function workflowExample() {
    try {
        const response = await fetch('/api/workflow/xxx', {...});
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        // Update UI
        
    } catch (error) {
        this.error = error.message;
        log.error('WORKFLOW_ERROR', {error: error.message});
    }
}
```

### 3. Update local après succès

```javascript
// ✅ Mettre à jour le state local APRÈS succès API
const response = await fetch(`/api/impayes/${id}`, {method: 'PUT', ...});

if (response.ok) {
    // Update local uniquement si succès
    const idx = this.impayes.findIndex(i => i.id === id);
    this.impayes[idx] = {...this.impayes[idx], ...newData};
}
```

---

## Migration en Cours

Les workflows suivants vont être migrés vers des appels REST directs:

| Workflow | Action | Nouvelle Route |
|----------|--------|----------------|
| `impayes/suspend-facture` | Suspendre | `PUT /api/impayes/{id}` |
| `impayes/unsuspend-facture` | Réactiver | `PUT /api/impayes/{id}` |
| `contacts/toggle-blacklist` | Blacklist | `POST /api/contacts/{id}/blacklist` |
| `relances/cancel` | Annuler | `PUT /api/relances/{id}` |
| `settings/save` | Sauvegarder | `PUT /api/settings/{id}` |

---

## Ressources

- [Routes API](../routes/) - Documentation des routes REST
- [Workflows Python](../../app/workflows/) - Workflows serveur existants
- [Cron Jobs](../CRON.md) - Documentation cron
- [Dev Frontend](../rules/dev-frontend.md) - Règles frontend
