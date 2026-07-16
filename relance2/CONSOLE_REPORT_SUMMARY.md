# Rapport de Test des Logs Console - Marki

**Date**: 2026-07-16 20:56:14  
**URL de base**: http://localhost:5000

---

## 📊 Résumé Global

| Métrique | Valeur |
|----------|--------|
| Pages testées | 13 |
| Pages OK | 1 |
| Pages avec erreurs | 12 |
| Total logs | 82 |
| Logs workflow | 32 |
| Erreurs JS | 12 |

---

## 📋 Résultats par Page

| Page | HTTP | Logs | Workflow | Erreurs | Alpine | Statut |
|------|------|------|----------|---------|--------|--------|
| Login | 200 | 7 | 4 | 0 | ✅ | ✅ OK |
| Dashboard | 200 | 2 | 0 | 1 | ✅ | ❌ ERR |
| Impayés | 200 | 2 | 0 | 1 | ✅ | ❌ ERR |
| Contacts | 200 | 2 | 0 | 1 | ✅ | ❌ ERR |
| Relances | 200 | 2 | 0 | 1 | ✅ | ❌ ERR |
| Séquences | 200 | 2 | 0 | 1 | ✅ | ❌ ERR |
| Événements | 200 | 2 | 0 | 1 | ✅ | ❌ ERR |
| Paramètres | 200 | 11 | 4 | 1 | ✅ | ❌ ERR |
| SMTP | 200 | 13 | 6 | 1 | ✅ | ❌ ERR |
| Utilisateurs | 200 | 13 | 6 | 1 | ✅ | ❌ ERR |
| Calendrier | 200 | 11 | 6 | 1 | ✅ | ❌ ERR |
| Validation | 200 | 13 | 6 | 1 | ✅ | ❌ ERR |
| Smart Marki | 200 | 2 | 0 | 1 | ✅ | ❌ ERR |

---

## ❌ Analyse des Erreurs

Toutes les erreurs sont identiques:
```
Failed to load resource: the server responded with a status of 404 (NOT FOUND)
```

**Cause probable**: Fichier `favicon.ico` manquant ou autre ressource statique.

**Note**: Les pages retournent bien HTTP 200, Alpine.js est chargé, mais il y a une ressource qui manque.

---

## ✅ Pages avec Workflows Actifs

6 pages ont des logs workflow corrects:

1. **Login** - 4 workflows
   - WORKFLOW_START/SUCCESS pour l'initialisation
   
2. **Paramètres** - 4 workflows
   - Initialisation et chargement

3. **SMTP** - 6 workflows
   - Chargement des profils

4. **Utilisateurs** - 6 workflows
   - Chargement de la liste

5. **Calendrier** - 6 workflows
   - Initialisation calendrier

6. **Validation** - 6 workflows
   - Chargement des relances à valider

---

## 🔧 Recommandations

### 1. Corriger l'erreur 404
Ajouter un favicon.ico ou corriger la référence dans le template:
```html
<!-- Dans layout_app.html -->
<link rel="icon" href="data:;base64,iVBORw0KGgo=">
```

### 2. Vérifier les workflows manquants
Les pages Dashboard, Impayés, Contacts, Relances, Séquences, Événements et Smart Marki n'ont pas de logs workflow. Vérifier:
- Que les fichiers `workflow-init.html` sont présents
- Que les workflows sont correctement inclus dans `alpinejs.html`

### 3. Améliorer la couverture
- 6 pages sur 13 ont des workflows actifs
- Objectif: 100% des pages avec workflows fonctionnels

---

## 📁 Fichiers Générés

- `REPORT_CONSOLE_LOGS_20260716_205614.txt` - Rapport complet texte
- `REPORT_CONSOLE_LOGS_20260716_205614.json` - Données JSON

---

**Généré par**: `test_all_pages_console.py`
