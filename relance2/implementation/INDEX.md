# INDEX - Todos d'implémentation Marki

Ce dossier contient les TODOs granulaires pour développer l'application Marki.

**Règle d'or pour chaque fichier :**
- Lire la spec dans `specs/_app/`
- Suivre le mockup à la lettre (si applicable)
- Respecter les checkpoints dans l'ordre (pour les workflows)
- **Valider avec `console_fetch.py`** après chaque page frontend

---

## 🔧 Outil de validation

Pour toutes les pages frontend, utiliser `console_fetch.py` pour vérifier les erreurs JS :

```bash
# Valider une page
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/login --stdout

# Voir uniquement les erreurs
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/login --stdout --filter error

# Sauvegarder dans un fichier
/home/ubuntu/marki/relance2/app/venv/bin/python console_fetch.py http://localhost:5000/login
```

**Critères de validation:**
- 0 erreurs console
- Pas de `undefined` dans les logs
- Les warnings Tailwind CDN sont OK (en dev)

---

## Phase 1 - Fondations (Backend Core)

| Fichier | TODO | Priorité |
|---------|------|----------|
| `app.py` | [todo.md](app.py/todo.md) | 🔴 Critique |
| `db.py` | [✅ todo.md](db.py/todo.md) | ✅ **Fait** |
| `routes/pages.py` | [✅ todo.md](routes/pages.py/todo.md) | ✅ **Fait** |
| `routes/auth.py` | [✅ todo.md](routes/auth.py/todo.md) | ✅ **Fait** |
| `routes/users.py` | [todo.md](routes/users.py/todo.md) | 🟠 Haute |

---

## Phase 2 - Authentification (Page Login)

| Fichier | TODO | Priorité |
|---------|------|----------|
| `static/pages/login/index.html` | [✅ todo.md](static/pages/login/index.html/todo.md) | ✅ **Fait** |
| `static/pages/login/store/store.js` | [✅ todo.md](static/pages/login/store/store.js/todo.md) | ✅ **Fait** |
| `static/pages/login/workflows/initial-load.js` | [✅ todo.md](static/pages/login/workflows/initial-load.js/todo.md) | ✅ **Fait** |
| `static/pages/login/workflows/auth-submit.js` | [✅ todo.md](static/pages/login/workflows/auth-submit.js/todo.md) | ✅ **Fait** |

**Workflows Backend :**
| Fichier | TODO | Priorité |
|---------|------|----------|
| `workflows/auth-login.py` | [✅ todo.md](workflows/auth-login.py/todo.md) | ✅ **Fait** |

---

## Phase 3 - Dashboard

| Fichier | TODO | Priorité |
|---------|------|----------|
| `static/pages/dashboard/index.html` | [✅ todo.md](static/pages/dashboard/index.html/todo.md) | ✅ **Fait** |
| `static/pages/dashboard/store/store.js` | [✅ todo.md](static/pages/dashboard/store/store.js/todo.md) | ✅ **Fait** |
| `static/pages/dashboard/workflows/initial-load.js` | [✅ todo.md](static/pages/dashboard/workflows/initial-load.js/todo.md) | ✅ **Fait** |

---

## Phase 4 - Données de base

### Contacts
| Fichier | TODO | Priorité |
|---------|------|----------|
| `routes/contacts.py` | [✅ todo.md](routes/contacts.py/todo.md) | ✅ **Fait** |
| `static/pages/contacts/index.html` | [todo.md](static/pages/contacts/index.html/todo.md) | 🟠 Haute |

### Impayés
| Fichier | TODO | Priorité |
|---------|------|----------|
| `routes/impayes.py` | [✅ todo.md](routes/impayes.py/todo.md) | ✅ **Fait** |
| `routes/events.py` | [✅ todo.md](routes/events.py/todo.md) | ✅ **Fait** |
| `static/pages/impayes/index.html` | [todo.md](static/pages/impayes/index.html/todo.md) | 🟠 Haute |

**Workflows Backend :**
| Fichier | TODO | Priorité |
|---------|------|----------|
| `workflows/import-invoice.py` | [todo.md](workflows/import-invoice.py/todo.md) | 🟠 Haute |

---

## Phase 5 - Relances (Core Business)

### Routes API
| Fichier | TODO | Priorité |
|---------|------|----------|
| `routes/relances.py` | [✅ todo.md](routes/relances.py/todo.md) | ✅ **Fait** |
| `routes/sequences.py` | [todo.md](routes/sequences.py/todo.md) | 🟠 Haute |

### Pages Frontend
| Fichier | TODO | Priorité |
|---------|------|----------|
| `static/pages/relances/index.html` | [todo.md](static/pages/relances/index.html/todo.md) | 🔴 Critique |
| `static/pages/sequences/index.html` | [todo.md](static/pages/sequences/index.html/todo.md) | 🟠 Haute |

### Workflows Backend
| Fichier | TODO | Priorité |
|---------|------|----------|
| `workflows/generate-relances.py` | [todo.md](workflows/generate-relances.py/todo.md) | 🔴 Critique |
| `workflows/send-emails.py` | [todo.md](workflows/send-emails.py/todo.md) | 🔴 Critique |
| `workflows/generate-suivi.py` | [todo.md](workflows/generate-suivi.py/todo.md) | 🟠 Haute |

---

## Phase 6 - Configuration & SMTP

| Fichier | TODO | Priorité |
|---------|------|----------|
| `routes/smtp.py` | [todo.md](routes/smtp.py/todo.md) | 🟡 Moyenne |
| `static/pages/settings-smtp/index.html` | À créer | 🟡 Moyenne |
| `static/pages/settings-users/index.html` | À créer | 🟡 Moyenne |

---

## Phase 7 - Portail Client

| Fichier | TODO | Priorité |
|---------|------|----------|
| `routes/portail.py` | [todo.md](routes/portail.py/todo.md) | 🟡 Moyenne |
| `routes/tokens.py` | À créer | 🟡 Moyenne |
| `static/pages/portail-client/index.html` | À créer | 🟡 Moyenne |
| `workflows/portail-client.py` | [todo.md](workflows/portail-client.py/todo.md) | 🟡 Moyenne |
| `workflows/generate-contact-token.py` | À créer | 🟡 Moyenne |

---

## Phase 8 - Maintenance & Cleanup

| Fichier | TODO | Priorité |
|---------|------|----------|
| `routes/cleanup.py` | À créer | 🟢 Basse |
| `workflows/cleanup-orphan-relances.py` | [todo.md](workflows/cleanup-orphan-relances.py/todo.md) | 🟢 Basse |
| `workflows/cleanup-relances-contact-blackliste.py` | À créer | 🟢 Basse |
| `workflows/cleanup-all-relances-paid-impayes.py` | À créer | 🟢 Basse |
| `workflows/verify-paid-invoices.py` | À créer | 🟢 Basse |
| `workflows/appliquer-regles-attribution.py` | À créer | 🟠 Haute |

---

## Phase 9 - Composants Globaux

| Fichier | TODO | Priorité |
|---------|------|----------|
| `static/components/sidebar-nav.js` | [todo.md](static/components/sidebar-nav.js/todo.md) | 🔴 Critique |
| `static/css/app.css` | [todo.md](static/css/app.css/todo.md) | 🔴 Critique |

---

## Légende priorités

- 🔴 **Critique** - Bloquant, doit être fait en premier
- 🟠 **Haute** - Important pour le fonctionnement
- 🟡 **Moyenne** - Feature nécessaire mais pas bloquante
- 🟢 **Basse** - Maintenance, nice-to-have

---

## Structure d'une tâche

Chaque fichier TODO contient :
1. **Fichier à créer** - Chemin exact
2. **Source de vérité** - Liens vers les specs
3. **Instructions** - Étapes détaillées
4. **Dépendances** - Prérequis
5. **Check de validation** - Comment vérifier que c'est bon

---

## Commande pour lister les todos

```bash
find implementation -name "todo.md" | sort
```

## Commande pour voir le progrès

```bash
echo "=== TODOs créés ===" && find implementation -name "todo.md" | wc -l
echo "=== TODOs avec check de validation ===" && grep -l "Check de validation" implementation/*/todo.md 2>/dev/null | wc -l
```
