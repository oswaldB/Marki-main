# Routes API Flask - Marki Relance

**Stack** : Flask + SQLite (sqlite3 natif) + Alpine.js (static pages)  
**Date** : 2026-07-15  
**Approche** : Static-First - Flask sert les HTML statiques, le JS gère les URLs dynamiques

---

## Structure Flask Projet Complet (Static-First)

```
marki-relance/
├── app/                          # Application Flask
│   ├── app.py                   # Point d'entrée Flask
│   ├── requirements.txt         # flask, bcrypt, PyJWT
│   ├── data/
│   │   └── marki.db            # Base SQLite
│   │
│   ├── routes/                  # Blueprints API + Pages
│   │   ├── auth.py             # /api/auth/*
│   │   ├── users.py            # /api/users/*
│   │   ├── contacts.py         # /api/contacts/*
│   │   ├── impayes.py          # /api/impayes/*
│   │   ├── relances.py         # /api/relances/*
│   │   ├── sequences.py        # /api/sequences/*
│   │   ├── smtp.py             # /api/smtp-profiles/*
│   │   ├── portail.py          # /api/portail/*
│   │   ├── tokens.py           # /api/tokens/*
│   │   ├── events.py           # /api/events/*
│   │   ├── import.py           # /api/import/*
│   │   ├── workflow.py         # /api/workflow/* (tout le métier)
│   │   └── pages.py            # Routes HTML (send_from_directory)
│   │
│   ├── workflows/               # Logique métier Python
│   │   ├── __init__.py
│   │   ├── auth-login.py
│   │   ├── contacts-blacklist.py
│   │   ├── generate-relances.py
│   │   └── ... (23 workflows)
│   │
│   ├── static/                  # TOUT le frontend statique
│   │   ├── css/
│   │   │   └── app.css
│   │   │
│   │   └── pages/               # Pages statiques (HTML + JS)
│   │       ├── login/
│   │       │   ├── index.html              # Page HTML unique
│   │       │   ├── store/
│   │       │   │   └── store.js            # Store Alpine.js
│   │       │   └── workflows/
│   │       │       ├── initial-load.js
│   │       │       └── auth-submit.js
│   │       │
│   │       ├── dashboard/
│   │       │   ├── index.html
│   │       │   ├── store/
│   │       │   │   └── store.js
│   │       │   └── workflows/
│   │       │       ├── initial-load.js
│   │       │       └── refresh-stats.js
│   │       │
│   │       ├── impayes/
│   │       │   ├── index.html              # /impayes
│   │       │   ├── store/
│   │       │   │   └── store.js
│   │       │   └── workflows/
│   │       │       ├── initial-load.js
│   │       │       ├── filter-by-status.js
│   │       │       └── ... (11 workflows)
│   │       │
│   │       ├── impayes-detail/           # /impayes/:id
│   │       │   ├── index.html
│   │       │   ├── store/
│   │       │   │   └── store.js
│   │       │   └── workflows/
│   │       │       ├── initial-load.js
│   │       │       └── load-impaye.js
│   │       │
│   │       ├── impayes-reparer/          # /impayes/:id/reparer
│   │       │   ├── index.html
│   │       │   ├── store/
│   │       │   │   └── store.js
│   │       │   └── workflows/
│   │       │       └── reparer-impaye.js
│   │       │
│   │       ├── relances/
│   │       ├── relances-detail/          # /relances/:id
│   │       ├── sequences/
│   │       ├── sequences-suivi-detail/   # /sequences/:id/suivi
│   │       ├── contacts/
│   │       ├── settings/
│   │       ├── settings-smtp-detail/     # /settings/smtp/:id
│   │       ├── portail/
│   │       ├── portail-client/           # /portail/:token
│   │       ├── evenements/
│   │       └── smart-marki/
│   │
│   └── db.py                    # SQLite helper
│
└── specs/                       # Spécifications workflows
```

### Principes

- **Plus de `templates/`** : Tout est dans `static/pages/`
- **Une page = un dossier** : `static/pages/nom-page/index.html`
- **Store isolé** : `static/pages/nom-page/store/store.js` (un store par page)
- **Workflows par page** : `static/pages/nom-page/workflows/*.js`
- **Routing côté client** : Le JS lit `window.location.pathname` pour extraire les IDs
- **Routes Flask minimales** : Juste pour servir les bons fichiers selon l'URL

---

## 🔐 Authentification (API)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Authentification utilisateur (JWT) |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Profil utilisateur connecté |

---

## 👥 Utilisateurs (API)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/users` | Liste paginée |
| GET | `/api/users/:id` | Détail utilisateur |
| POST | `/api/users` | Créer utilisateur (admin) |
| PUT | `/api/users/:id` | Modifier utilisateur |
| DELETE | `/api/users/:id` | Désactiver utilisateur |
| POST | `/api/users/:id/reset-password` | Reset mot de passe |

---

## 📋 Contacts (API)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/contacts` | Liste contacts |
| GET | `/api/contacts/:id` | Détail contact |
| POST | `/api/contacts` | Créer contact |
| PUT | `/api/contacts/:id` | Modifier contact |
| DELETE | `/api/contacts/:id` | Supprimer contact |
| GET | `/api/contacts/:id/impayes` | Impayés du contact |

---

## 💶 Impayés (API)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/impayes` | Liste impayés |
| GET | `/api/impayes/:id` | Détail impayé |
| POST | `/api/impayes` | Créer impayé |
| PUT | `/api/impayes/:id` | Modifier impayé |

---

## 📧 Relances (API)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/relances` | Liste relances |
| GET | `/api/relances/:id` | Détail relance |
| POST | `/api/relances` | Créer relance |
| PUT | `/api/relances/:id` | Modifier relance |
| DELETE | `/api/relances/:id` | Supprimer relance |

---

## 🔄 Séquences (API)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/sequences` | Liste séquences |
| GET | `/api/sequences/:id` | Détail séquence |
| POST | `/api/sequences` | Créer séquence |
| PUT | `/api/sequences/:id` | Modifier séquence |
| DELETE | `/api/sequences/:id` | Supprimer séquence |

---

## ⚙️ SMTP (API)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/smtp-profiles` | Liste profils |
| GET | `/api/smtp-profiles/:id` | Détail profil |
| POST | `/api/smtp-profiles` | Créer profil |
| PUT | `/api/smtp-profiles/:id` | Modifier profil |
| DELETE | `/api/smtp-profiles/:id` | Supprimer profil |

---

## 📊 Événements (API)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/events` | Liste événements |

**Note** : Pas de route `/api/dashboard/*`. Le dashboard calcule ses stats côté frontend en appelant `/api/impayes`, `/api/relances`, `/api/contacts`.

---

## 🔧 Workflows (API)

Tous les workflows sont en **POST** sur `/api/workflow/nom-workflow` :

| Route | Workflow Python | Description |
|-------|-----------------|-------------|
| POST | `/api/workflow/auth-login` | Authentification |
| POST | `/api/workflow/contacts-blacklist` | Blacklist contact |
| POST | `/api/workflow/generate-relances` | Générer relances |
| POST | `/api/workflow/generate-suivi` | Générer suivis |
| POST | `/api/workflow/send-emails` | Envoyer emails |
| POST | `/api/workflow/send-suivi` | Envoyer suivis |
| POST | `/api/workflow/impayes-suspend` | Suspendre impayé |
| POST | `/api/workflow/impayes-unsuspend` | Réactiver impayé |
| POST | `/api/workflow/import-invoice` | Importer factures |
| POST | `/api/workflow/cleanup-relances-contact-blackliste` | Cleanup blacklist |
| POST | `/api/workflow/cleanup-all-relances-contact-blackliste` | Cleanup all blacklist |
| POST | `/api/workflow/cleanup-all-relances-paid-impayes` | Cleanup payés |
| POST | `/api/workflow/cleanup-orphan-relances` | Cleanup orphelins |
| POST | `/api/workflow/regenerate-relances-contact` | Régénérer contact |
| POST | `/api/workflow/regenerate-relances-with-status` | Régénérer avec statut |
| POST | `/api/workflow/generate-contact-token` | Token contact |
| POST | `/api/workflow/generate-pdf-links` | Lien PDF |
| POST | `/api/workflow/appliquer-regles-attribution` | Attribution |
| POST | `/api/workflow/users-management` | Gestion users |
| POST | `/api/workflow/get-contact-impayes` | Impayés contact |
| POST | `/api/workflow/sync-contacts` | Sync contacts |
| POST | `/api/workflow/verify-paid-invoices` | Vérifier payés |
| POST | `/api/workflow/portail-client` | Portail client |

---

## 🎨 Routes Pages (Frontend Static)

Flask sert les fichiers HTML statiques selon l'URL. Le client extrait les IDs depuis `window.location.pathname`.

### Routes Simples (sans paramètres)

| Méthode | Route | Fichier servi | Description |
|---------|-------|---------------|-------------|
| GET | `/` | `static/pages/login/index.html` | Redirection vers login |
| GET | `/login` | `static/pages/login/index.html` | Page connexion |
| GET | `/dashboard` | `static/pages/dashboard/index.html` | Dashboard |
| GET | `/impayes` | `static/pages/impayes/index.html` | Liste impayés |
| GET | `/relances` | `static/pages/relances/index.html` | Liste relances |
| GET | `/sequences` | `static/pages/sequences/index.html` | Liste séquences |
| GET | `/contacts` | `static/pages/contacts/index.html` | Liste contacts |
| GET | `/settings` | `static/pages/settings/index.html` | Paramètres |
| GET | `/portail` | `static/pages/portail/index.html` | Portail admin |
| GET | `/evenements` | `static/pages/evenements/index.html` | Événements |
| GET | `/smart-marki` | `static/pages/smart-marki/index.html` | Smart Marki |

### Routes Dynamiques (avec paramètres)

Le même fichier HTML statique est servi pour toutes les valeurs de paramètres. Le JS extrait l'ID de l'URL.

| Méthode | Route | Fichier servi | Paramètre JS |
|---------|-------|---------------|--------------|
| GET | `/impayes/<int:impaye_id>` | `static/pages/impayes-detail/index.html` | `extractId('/impayes/:id')` |
| GET | `/impayes/<int:impaye_id>/reparer` | `static/pages/impayes-reparer/index.html` | `extractId('/impayes/:id/reparer')` |
| GET | `/impayes/payeur` | `static/pages/impayes-payeur/index.html` | - |
| GET | `/impayes/suspendus` | `static/pages/impayes-suspendus/index.html` | - |
| GET | `/relances/<int:relance_id>` | `static/pages/relances-detail/index.html` | `extractId('/relances/:id')` |
| GET | `/relances/calendrier` | `static/pages/relances-calendrier/index.html` | - |
| GET | `/relances/validation` | `static/pages/relances-validation/index.html` | - |
| GET | `/sequences/<int:sequence_id>/suivi` | `static/pages/sequences-suivi-detail/index.html` | `extractId('/sequences/:id/suivi')` |
| GET | `/settings/smtp/<int:profil_id>` | `static/pages/settings-smtp-detail/index.html` | `extractId('/settings/smtp/:id')` |
| GET | `/portail/<token>` | `static/pages/portail-client/index.html` | `extractToken('/portail/:token')` |

### Exemple d'implémentation Flask (routes/pages.py)

```python
"""Routes pages - Static-First avec URLs dynamiques."""
from flask import Blueprint, send_from_directory
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_DIR = os.path.join(BASE_DIR, 'static', 'pages')

pages_bp = Blueprint('pages', __name__)


def serve_page(page_name):
    """Sert le fichier index.html d'une page."""
    return send_from_directory(os.path.join(PAGES_DIR, page_name), 'index.html')


# ========== ROUTES SIMPLES ==========

@pages_bp.route('/')
def index():
    return serve_page('login')

@pages_bp.route('/login')
def login():
    return serve_page('login')

@pages_bp.route('/dashboard')
def dashboard():
    return serve_page('dashboard')

@pages_bp.route('/impayes')
def impayes_list():
    return serve_page('impayes')

@pages_bp.route('/relances')
def relances_list():
    return serve_page('relances')

@pages_bp.route('/sequences')
def sequences_list():
    return serve_page('sequences')

@pages_bp.route('/contacts')
def contacts_list():
    return serve_page('contacts')

@pages_bp.route('/settings')
def settings():
    return serve_page('settings')

@pages_bp.route('/portail')
def portail():
    return serve_page('portail')

@pages_bp.route('/evenements')
def evenements():
    return serve_page('evenements')

@pages_bp.route('/smart-marki')
def smart_marki():
    return serve_page('smart-marki')


# ========== ROUTES DYNAMIQUES ==========
# Le fichier HTML est statique, le JS lit l'ID dans l'URL

@pages_bp.route('/impayes/<int:impaye_id>')
def impayes_detail(impaye_id):
    """URL: /impayes/123 -> Sert impayes-detail/index.html"""
    return serve_page('impayes-detail')

@pages_bp.route('/impayes/<int:impaye_id>/reparer')
def impayes_reparer(impaye_id):
    """URL: /impayes/123/reparer -> Sert impayes-reparer/index.html"""
    return serve_page('impayes-reparer')

@pages_bp.route('/relances/<int:relance_id>')
def relances_detail(relance_id):
    """URL: /relances/456"""
    return serve_page('relances-detail')

@pages_bp.route('/sequences/<int:sequence_id>/suivi')
def sequences_suivi_detail(sequence_id):
    """URL: /sequences/789/suivi"""
    return serve_page('sequences-suivi-detail')

@pages_bp.route('/settings/smtp/<int:profil_id>')
def settings_smtp_detail(profil_id):
    """URL: /settings/smtp/3"""
    return serve_page('settings-smtp-detail')

@pages_bp.route('/portail/<token>')
def portail_client(token):
    """URL: /portail/abc123... (token JWT)"""
    return serve_page('portail-client')
```

---

## 📝 Extraction des IDs côté client

### Helper JS réutilisable (à mettre dans `static/js/url-helper.js`)

```javascript
/**
 * Extrait un paramètre d'URL depuis le pathname
 * 
 * @param {string} pattern - Pattern avec :param (ex: '/impayes/:id')
 * @returns {string|null} - La valeur extraite ou null
 * 
 * Exemples:
 *   extractUrlParam('/impayes/:id')              // "123" pour /impayes/123
 *   extractUrlParam('/impayes/:id/reparer')      // "123" pour /impayes/123/reparer
 *   extractUrlParam('/sequences/:id/suivi')      // "456" pour /sequences/456/suivi
 *   extractUrlParam('/settings/smtp/:id')        // "3" pour /settings/smtp/3
 */
function extractUrlParam(pattern) {
  const pathname = window.location.pathname;
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      return pathParts[i] || null;
    }
  }
  return null;
}

// Helper spécifique pour tokens (alphanumériques)
function extractToken(pattern) {
  return extractUrlParam(pattern);
}
```

### Usage dans un store (ex: impayes-detail)

```javascript
// static/pages/impayes-detail/store/store.js
function impayeDetailStore() {
  return {
    id: null,
    data: null,
    loading: true,
    
    init() {
      // Extrait l'ID depuis /impayes/123
      this.id = extractUrlParam('/impayes/:id');
      this.loadData();
    },
    
    async loadData() {
      try {
        const res = await fetch(`/api/impayes/${this.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        this.data = await res.json();
      } catch (e) {
        console.error('Erreur:', e);
      } finally {
        this.loading = false;
      }
    }
  }
}
```

### HTML correspondant

```html
<!-- static/pages/impayes-detail/index.html -->
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Détail Impayé</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="/js/url-helper.js"></script>
</head>
<body x-data="impayeDetailStore()" x-init="init()">
  <div class="p-6">
    <h1>Impayé #<span x-text="id"></span></h1>
    <div x-show="loading">Chargement...</div>
    <div x-show="!loading && data">
      Montant: <span x-text="data.montant"></span>€
    </div>
  </div>
  
  <script src="./store/store.js"></script>
  <script src="./workflows/initial-load.js"></script>
</body>
</html>
```

---

## 📁 Structure complète d'une page

Exemple avec `impayes-detail` :

```
static/pages/impayes-detail/
├── index.html                      # Page HTML statique
├── store/
│   └── store.js                    # Store Alpine.js
└── workflows/
    ├── initial-load.js             # Chargement initial
    ├── load-impaye.js              # Charger les données
    ├── update-status.js            # Modifier statut
    └── navigate-back.js            # Retour liste
```

### Navigation entre pages

```html
<!-- Lien vers un autre écran -->
<a href="/impayes" class="text-blue-600">Retour liste</a>

<!-- Lien vers un détail dynamique -->
<a :href="`/impayes/${item.id}`" class="text-blue-600">Voir détail</a>

<!-- Ou avec window.location -->
<button @click="window.location.href = `/impayes/${id}/reparer`">
  Réparer
</button>
```

---

## 📊 Récapitulatif

| Catégorie | Nombre | Fichiers |
|-----------|--------|----------|
| Routes API | 50+ | `app/routes/*.py` |
| Routes Workflow | 23 | `/api/workflow/*` → `app/workflows/*.py` |
| Routes Pages | 17 | `app/routes/pages.py` |
| Pages HTML | 17 | `static/pages/*/index.html` |
| Stores JS | 17 | `static/pages/*/store/store.js` |
| Workflows JS | 162 | `static/pages/*/workflows/*.js` |
| Specs | 162 | `specs/**/*.md` |

### Différences avec l'ancienne architecture

| Avant | Après |
|-------|-------|
| `templates/login.html` | `static/pages/login/index.html` |
| `templates/impayes.html` | `static/pages/impayes/index.html` |
| Pas de dossier par page | Chaque page a son dossier |
| `static/pages/login/store.js` | `static/pages/login/store/store.js` |
| `static/pages/login/workflow.js` | `static/pages/login/workflows/workflow.js` |
| `render_template('impayes.html')` | `send_from_directory('static/pages/impayes', 'index.html')` |
| URLs dynamiques via query params | URLs propres `/impayes/123` |

### Principes clés

1. **Static-First** : Flask ne fait que servir des fichiers statiques
2. **URLs propres** : `/impayes/123` pas `/impayes-detail.html?id=123`
3. **Routing client** : Le JS extrait les IDs de `window.location.pathname`
4. **Isolation** : Chaque page a son store et ses workflows dans son dossier
5. **Pas de Jinja2** : Plus de `{% extends %}`, `{% block %}`, juste du HTML pur

| GET | `/settings/smtp` | `static/pages/settings-smtp/index.html` | Gestion profils SMTP |
| GET | `/settings/users` | `static/pages/settings-users/index.html` | Gestion utilisateurs |
