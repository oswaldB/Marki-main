# Audit Complet - Spécifications _app/

**Date**: 2024-07-16
**Auditeur**: Assistant Marki
**Statut**: ✅ Terminé - Actions requises identifiées

---

## 1. Vue d'ensemble des Incohérences

| Catégorie | Problème | Gravité | Fichiers concernés |
|-----------|----------|---------|------------------|
| 🗂️ **Structure** | Dossier `static/pages/` obsolète | 🔴 Haute | 95 dossiers, 2.1M |
| 🗂️ **Structure** | Fichiers `store.md` obsolètes | 🔴 Haute | 22 fichiers |
| 🗂️ **Structure** | Components dans `static/` | 🟡 Moyenne | Déplacer vers layouts |
| ⚡ **Workflows** | Workflows CRUD simplifiables | 🟡 Moyenne | ~30 workflows |
| ⚡ **Workflows** | Workflows frontend vs backend | 🟢 Info | Architecture à clarifier |
| 📚 **Documentation** | Specs cronjobs existent | ✅ OK | CRON.md complet |
| 📚 **Documentation** | Routes REST complètes | ✅ OK | 13 fichiers routes |

---

## 2. Problèmes Détaillés

### 2.1 Dossier `static/pages/` - À SUPPRIMER

**Problème**: Le dossier `specs/_app/static/pages/` contient l'ancienne architecture avec :
- Des stores (obsolètes)
- Des mockups (dupliqués dans templates/)
- Des workflows .md (dupliqués)

**Statistiques**:
```bash
95 dossiers
2.1 Mo de données
22 fichiers store.md
~150 workflows .md obsolètes
```

**Action**: 🔴 **SUPPRIMER** tout le dossier `static/pages/`

```bash
rm -rf specs/_app/static/pages/
```

**Pages déjà migrées dans `templates/`**:
- ✅ login, dashboard, impayes, contacts
- ✅ relances, sequences, evenements
- ✅ settings_*, portail_*, smart_marki

---

### 2.2 Fichiers `store.md` - Obsolètes

**Exemple** (`static/pages/dashboard/store/store.md`):
```javascript
// ANCIENNE ARCHITECTURE - Plus valide
function dashboardStore() {
  return {
    impayes: [],  // ← Maintenant dans alpinejs.html
    stats: {},    // ← Maintenant calculé côté frontend
    init() {...}  // ← Remplacé par workflow-init.html
  }
}
```

**Nouvelle architecture**:
- Props définies dans `alpinejs.html` directement
- Getters calculés dans l'objet Alpine.data()
- Pas de store séparé

**Action**: 🔴 **SUPPRIMER** tous les `store/store.md`

---

### 2.3 Components dans `static/` - À Déplacer

**Actuel**:
```
specs/_app/static/components/
├── sidebar-nav-dual.js    ← Web Component
├── sidebar-nav-dual.md    ← Documentation
└── sidebar-nav.js
```

**Problème**: Les components sont des layouts, pas des ressources statiques.

**Nouvelle structure proposée**:
```
specs/_app/layouts/
├── components/            ← NOUVEAU DOSSIER
│   ├── sidebar-nav-dual.js
│   ├── sidebar-nav-dual.md
│   └── sidebar-nav.js
├── layout_app.md
├── layout_portail.md
└── README.md
```

**Action**: 🟡 **DÉPLACER** les components dans `layouts/components/`

---

## 3. Analyse des Workflows

### 3.1 Architecture Actuelle

```
Frontend (Alpine.js)          Backend (Flask)
┌─────────────────┐           ┌─────────────────┐
│ workflows/*.html│ ─────────►│ /api/workflow/* │
│ (mega-functions)│   fetch() │ (Python scripts)│
└─────────────────┘           └─────────────────┘
           │                           │
           │                           ▼
           │                   ┌─────────────────┐
           │                   │ CRUD direct     │
           │                   │ ou Logique métier│
           │                   └─────────────────┘
           │                           │
           ▼                           ▼
   ┌─────────────────┐       ┌─────────────────┐
   │ Mise à jour UI  │◄──────│ Base de données │
   │ (this.xxx = y)  │       │                 │
   └─────────────────┘       └─────────────────┘
```

### 3.2 Workflows Simplifiables

Certains workflows frontend pourraient être remplacés par des appels directs aux routes REST CRUD.

#### Cas 1: Workflows CRUD Simples (à simplifier)

| Workflow | Actuel | Proposition | Route REST existante |
|----------|--------|-------------|---------------------|
| `suspend-facture` | Workflow → API workflow | ✅ Appel direct PUT | `/api/impayes/{id}` |
| `toggle-blacklist` | Workflow → API workflow | ✅ Appel direct POST | `/api/contacts/{id}/blacklist` |
| `pagination-*` | Changement state local | ✅ Garder tel quel | Pas d'API nécessaire |
| `sort-by-*` | Tri state local | ✅ Garder tel quel | Pas d'API nécessaire |
| `initial-load` | Fetch données | ✅ Garder | `/api/xxx` |

**Exemple de simplification**:

```javascript
// AVANT (workflow complexe)
suspendFacture: async function(id) {
    const workflowId = crypto.randomUUID();
    log.info('WORKFLOW_START', {...});
    
    const response = await fetch(`/api/workflow/impayes-suspend`, {
        method: 'POST',
        headers: {...},
        body: JSON.stringify({id})
    });
    // ...
}

// APRÈS (appel REST direct)
suspendFacture: async function(id) {
    const response = await fetch(`/api/impayes/${id}`, {
        method: 'PUT',
        headers: {Authorization: ...},
        body: JSON.stringify({statut: 'suspendu'})
    });
    
    if (response.ok) {
        const idx = this.impayes.findIndex(i => i.id === id);
        this.impayes[idx].statut = 'suspendu';
    }
}
```

#### Cas 2: Workflows Complexes (à garder)

| Workflow | Pourquoi garder ? |
|----------|------------------|
| `generate-relances` | Logique métier complexe (création automatique) |
| `send-emails` | Envoi SMTP + tracking |
| `import-invoice` | Parsing + validation |
| `sync-contacts` | Intégration externe (CRM) |
| `cleanup-*` | Traitement batch |

---

## 4. État de la Documentation

### 4.1 ✅ Documentation Complète

| Fichier | Statut | Description |
|---------|--------|-------------|
| `CRON.md` | ✅ OK | Système de cron avec APScheduler |
| `routes/*.md` | ✅ OK | 13 fichiers de routes REST |
| `layouts/*.md` | ✅ OK | Layouts app et portail |
| `db.md` | ✅ OK | Schéma base de données |
| `requirements.md` | ✅ OK | Dépendances Python |

### 4.2 🔴 Documentation Obsolète

| Fichier | Problème | Action |
|---------|----------|--------|
| `static/pages/*/store/*.md` | Architecture remplacée | SUPPRIMER |
| `static/pages/*/workflows/*.md` | Dupliqué dans templates/ | SUPPRIMER |
| `static/pages/*/mockups/*.html` | Dupliqué | SUPPRIMER |

---

## 5. Recommandations d'Actions

### Priorité 1: Nettoyage (Cette semaine)

```bash
# 1. Supprimer static/pages/
rm -rf specs/_app/static/pages/

# 2. Déplacer components vers layouts/
mkdir -p specs/_app/layouts/components/
mv specs/_app/static/components/* specs/_app/layouts/components/
rmdir specs/_app/static/components/

# 3. Mettre à jour README.md racine
```

### Priorité 2: Simplification Workflows (Prochain sprint)

**Workflows à migrer vers appels REST directs**:

1. **impayes/suspend-facture** → `PUT /api/impayes/{id}`
2. **impayes/unsuspend-facture** → `PUT /api/impayes/{id}`
3. **contacts/toggle-blacklist** → `POST /api/contacts/{id}/blacklist`
4. **relances/cancel-relance** → `PUT /api/relances/{id}`
5. **settings/*/save-changes** → `PUT /api/settings/{id}`

**Gains attendus**:
- Moins de fichiers workflow (169 → ~120)
- Moins de latence (pas de couche workflow Python)
- Code plus simple à maintenir

### Priorité 3: Documentation (Cette semaine)

1. Créer `specs/_app/workflow-strategy.md`:
   - Quand utiliser un workflow Python ?
   - Quand faire un appel REST direct ?
   - Quand garder la logique frontend uniquement ?

---

## 6. Architecture Workflow Recommandée

### Règles de Décision

```
Action utilisateur
       │
       ▼
┌──────────────┐
│ Modification │────► Logique frontend (pagination, tri, filtres)
│ state local ?│       │
└──────────────┘       ▼
       │          Pas d'appel API
       │ Non
       ▼
┌──────────────┐
│ CRUD simple  │────► Appel REST direct (/api/xxx)
│ sur entité ? │       │
└──────────────┘       ▼
       │          PUT/POST/DELETE + update local
       │ Non
       ▼
┌──────────────┐
│ Logique      │────► Workflow Python (/api/workflow/xxx)
│ métier       │       │
│ complexe ?   │       ▼
└──────────────┘   Traitement métier
       │ Non
       ▼
   Cron job
```

### Exemples par Catégorie

| Catégorie | Exemple | Implémentation |
|-----------|---------|----------------|
| **State local** | Pagination, tri, filtres | Frontend uniquement |
| **CRUD simple** | Modifier statut, toggle flag | `fetch()` direct vers `/api/xxx` |
| **Workflow métier** | Générer relances, envoyer emails | `POST /api/workflow/xxx` |
| **Batch/Async** | Cleanup, imports massifs | Cron job + workflow |

---

## 7. Synthèse des Actions Requises

### Actions Immédiates (Avant prochain commit)

- [ ] 🔴 Supprimer `specs/_app/static/pages/` (2.1M de données obsolètes)
- [ ] 🔴 Supprimer `specs/_app/static/components/` (déplacer vers layouts/)
- [ ] 🟡 Mettre à jour `specs/_app/README.md` (structure actualisée)
- [ ] 🟢 Créer `specs/_app/workflow-strategy.md` (guide d'architecture)

### Actions Prochain Sprint

- [ ] 🟡 Simplifier workflows CRUD (30 workflows → appels REST directs)
- [ ] 🟡 Documenter règles workflow dans dev-frontend.md

### Architecture Validée ✅

- [x] Routes REST CRUD complètes
- [x] Workflows Python pour logique métier
- [x] Cron jobs configurés
- [x] Layouts app et portail définis
- [x] Props dans alpinejs.html (pas de stores)

---

**Conclusion**: Les spécifications sont globalement cohérentes mais nécessitent un nettoyage majeur des fichiers obsolètes dans `static/pages/` et `static/components/`.
