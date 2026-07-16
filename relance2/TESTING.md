# Guide de Test - Marki

Ce document explique comment tester l'application Marki avec différentes approches.

---

## 🚀 Démarrage rapide

### 1. Test API avec authentification (recommandé)

```bash
python3 test_authenticated.py
```

**Ce que ça fait :**
- Démarre le serveur Flask
- Se connecte via `/api/auth/login`
- Obtient un token JWT
- Teste toutes les API protégées avec le token
- Affiche les résultats en temps réel

**Résultat attendu :**
```
✅ Connecté - Token: eyJ0eXAiOiJKV1Qi...
[API] GET /api/contacts
  Status: 200
  ✅ 45 éléments
```

---

### 2. Test complet avec Playwright (console logs + réseau)

```bash
# Installer les dépendances si nécessaire
pip install playwright requests
playwright install chromium

# Lancer le test
python3 test_full_playwright.py
```

**Ce que ça fait :**
- Démarre le serveur Flask
- Ouvre un navigateur Chromium headless
- Se connecte automatiquement
- Capture **tous les console logs** des pages
- Capture **tous les appels API réseau**
- Test les interactions (clics, tris)
- Génère un rapport JSON détaillé

**Résultat attendu :**
```
[PAGE] Dashboard
  Status: 200
  📝 Logs total: 45
  🔄 Logs workflow: 12
  ✅ Alpine.js chargé
```

**Rapport généré :** `TEST_PLAYWRIGHT_REPORT.json`

---

### 3. Test simple avec curl (sans auth)

```bash
python3 console_fetch.py
```

**Ce que ça fait :**
- Test les pages publiques (login)
- Test les API sans authentification
- Vérifie la structure HTML de base

---

## 📊 Middleware de Logging

Le middleware `app/middleware_logger.py` capture automatiquement tous les appels API :

```python
# Déjà intégré dans app.py
from .middleware_logger import init_logging
init_logging(app)
```

**Logs affichés :**
```
[API.REQUEST] GET /api/contacts
  ID: 20260116_143052_123456
  From: 127.0.0.1

[API.RESPONSE] ✅ 200 in 45.23ms
```

**Fichier de log :** `/tmp/marki_api.log`

---

## 🧪 Scénarios de test manuels

### Test d'une page spécifique avec authentification

```python
import requests

# 1. Login
resp = requests.post('http://localhost:5000/api/auth/login', json={
    'username': 'admin',
    'password': 'admin'
})
token = resp.json()['token']

# 2. Appel API protégé
headers = {'Authorization': f'Bearer {token}'}
resp = requests.get('http://localhost:5000/api/contacts', headers=headers)
print(resp.json())
```

### Test avec Playwright (manuel)

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    
    # Capture des logs
    page.on("console", lambda msg: print(f"[{msg.type}] {msg.text}"))
    
    # Navigation
    page.goto('http://localhost:5000/login')
    page.fill('input[name="username"]', 'admin')
    page.fill('input[name="password"]', 'admin')
    page.click('button[type="submit"]')
    
    browser.close()
```

---

## 🔧 Utilitaires de test

### Vérifier les workflows backend

```bash
# Lister tous les workflows
ls -la app/workflows/*.py | grep -v __pycache__

# Vérifier les exports
python3 -c "from app.workflows import *; print('OK')"
```

### Vérifier les routes

```bash
# Lister tous les endpoints
python3 -c "
from app import create_app
app = create_app()
for rule in app.url_map.iter_rules():
    print(f'{rule.methods} {rule.rule}')
" | grep -v OPTIONS | head -50
```

### Test base de données

```bash
# Vérifier les tables
sqlite3 app.db '.tables'

# Compter les enregistrements
sqlite3 app.db 'SELECT COUNT(*) FROM contacts;'
sqlite3 app.db 'SELECT COUNT(*) FROM impayes;'
sqlite3 app.db 'SELECT COUNT(*) FROM relances;'
```

---

## 📈 Analyse des résultats

### Rapport `TEST_PLAYWRIGHT_REPORT.json`

```json
{
  "timestamp": "2026-07-16T14:30:00",
  "summary": {
    "total_pages": 10,
    "ok_pages": 10,
    "error_pages": 0
  },
  "pages": [
    {
      "page": "Dashboard",
      "status": 200,
      "logs_count": 45,
      "workflow_logs": 12,
      "errors_count": 0,
      "has_alpine": true,
      "ok": true
    }
  ]
}
```

### Interprétation

| Métrique | Attendu | Signification |
|----------|---------|---------------|
| `logs_count` | > 0 | La page charge du JS |
| `workflow_logs` | > 0 | Les workflows s'initialisent |
| `errors_count` | 0 | Pas d'erreurs JavaScript |
| `has_alpine` | true | Alpine.js est chargé |

---

## 🐛 Débogage

### Voir les logs en temps réel

```bash
# Terminal 1: Lancer le serveur avec logs détaillés
cd /home/ubuntu/marki/relance2
python3 -m app

# Terminal 2: Voir les logs API
tail -f /tmp/marki_api.log
```

### Test d'une route spécifique

```bash
# Test API
curl -X GET http://localhost:5000/api/contacts \
  -H "Authorization: Bearer TOKEN"

# Test page
curl -s http://localhost:5000/dashboard | head -20
```

---

## ✅ Checklist de validation

### Frontend
- [ ] Toutes les pages chargent (200 OK)
- [ ] Alpine.js est chargé sur chaque page
- [ ] Les workflows s'initialisent (logs WORKFLOW_INIT)
- [ ] Pas d'erreurs console JavaScript

### Backend
- [ ] Authentification fonctionne
- [ ] Toutes les API CRUD répondent
- [ ] Les workflows backend s'exécutent
- [ ] Pas d'erreurs 500

### Intégration
- [ ] Les appels API depuis le frontend fonctionnent
- [ ] Les données s'affichent correctement
- [ ] Les actions (création, modification) marchent

---

## 🎯 Commandes rapides

```bash
# Test complet (recommandé)
python3 test_full_playwright.py

# Test API seul
python3 test_authenticated.py

# Test simple
python3 console_fetch.py

# Voir les logs temps réel
tail -f /tmp/marki_api.log
```

---

**Note :** Pour tester les pages protégées, vous devez obligatoirement passer par l'authentification (token JWT) comme le fait `test_authenticated.py` ou `test_full_playwright.py`.
