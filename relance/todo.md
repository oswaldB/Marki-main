# ✅ TODO Migration - Vérification de conformité

## ✅ Corriger et conforme aux specs

### 1. ✅ Login (`frontend/login.html`)
- [x] Label "Identifiant" (pas "Email")
- [x] `x-model="form.username"` (pas `email`)
- [x] `type="text"` (pas `email`)
- [x] `placeholder="Votre identifiant"`
- [x] Appel API avec `{username, password}`
- [x] Backend modifié pour accepter `username` (ou `email` pour compatibilité)

### 2. ✅ Backend (`backend/routes/api-routes.js`)
- [x] Route `/api/auth/login` accepte `username` ou `email`
- [x] Cherche d'abord par `getUserByUsername`, puis `getUserByEmail`
- [x] Réponse avec token JWT et user object

### 3. ✅ Dashboard (`frontend/dashboard.html`)
- [x] Structure HTML conforme au mockup
- [x] Chemins images corrigés: `./assets/marki-logo.png`
- [x] Sidebar component inclus
- [x] Auth check ajouté (nécessaire fonctionnellement)

### 4. ✅ Composants (`frontend/components/`)
- [x] `sidebar-nav-dual.js` créé avec navigation complète
- [x] Chemins corrigés vers `./assets/marki-logo.png`

### 5. ✅ Assets (`frontend/assets/`)
- [x] `marki-logo.png` copié depuis les specs

---

## Structure finale conforme

```
/home/ubuntu/marki/relance/
├── backend/
│   ├── api-server.js          # Port 5000
│   ├── routes/api-routes.js   # Login accepte username/email
│   └── ...
├── frontend/                   # Servi par Caddy
│   ├── index.html             # Redirection
│   ├── login.html             # Identifiant + mot de passe ✅
│   ├── dashboard.html         # Dashboard complet
│   ├── impayes.html           # Page impayés
│   ├── assets/
│   │   └── marki-logo.png     # Logo ✅
│   └── components/
│       └── sidebar-nav-dual.js # Navigation ✅
└── specs/mockups/             # Référence inchangée
```

---

## URLs configurées

| URL | Service |
|-----|---------|
| `dev.markidiags.com/api/*` | backend:5000 |
| `dev.markidiags.com/` | frontend/ |

---

## Conformité login - DÉTAIL

**Spec (specs/mockups/login.html):**
```html
<label>Identifiant</label>
<input type="text" x-model="form.username" placeholder="Votre identifiant">
```

**Implémentation (frontend/login.html):**
```html
<label class="block text-sm font-medium text-slate-700 mb-1.5">Identifiant</label>
<input type="text" x-model="form.username" placeholder="Votre identifiant" ...>
```

✅ **CONFORME** - Label "Identifiant", type="text", model="username"

---

## Test API login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"monidentifiant","password":"monmotdepasse"}'
```

Réponse attendue (si utilisateur existe):
```json
{"token":"...","user":{"id":"...","username":"...","email":"...","role":"..."}}
```
