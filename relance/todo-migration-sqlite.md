# TODO - Migration SQLite Marki

> Date: 2026-07-14
> Objectif: Remplacer flat-file-db (LokiJS + YAML) par SQLite natif
> DB Path: `backend/data/marki.db`

---

## ✅ PHASE 1 - Foundation (DB Layer & CRUD API) ✅ TERMINÉ

### 1.1 - Module SQLite ✅
- [x] `backend/lib/sqlite-db.js` - Classe SQLiteDB avec méthodes CRUD
- [x] `backend/lib/auth-local.js` - Compatibilité SQLite

### 1.2 - Routes CRUD API ✅
- [x] `backend/routes/api-routes.js` - 60+ routes API RESTful
- [x] `backend/api-server.js` - Serveur HTTP mis à jour
- [x] `backend/README-API.md` - Documentation complète

---

## ✅ PHASE 2 - Specs Workflows Backend ✅ TERMINÉ

### Specs mis à jour (25 fichiers)
Tous les workflows backend utilisent maintenant SQLite.

---

## ✅ PHASE 3 - Specs Workflows Frontend ✅ TERMINÉ

### Dossiers mis à jour (23 dossiers)
- [x] `contacts/` - 7 workflows
- [x] `dashboard/` - 2 workflows
- [x] `evenements/` - 4 workflows
- [x] `impayes/` - 14 workflows
- [x] `impayes-detail/` - 5 workflows
- [x] `impayes-payeur/` - 3 workflows
- [x] `impayes-reparer/` - 1 workflow
- [x] `impayes-suspendus/` - 2 workflows
- [x] `login/` - 1 workflow
- [x] `portail-client/` - 2 workflows
- [x] `portail-mission/` - 2 workflows
- [x] `relances/` - 4 workflows
- [x] `relances-calendrier/` - 2 workflows
- [x] `relances-validation/` - 6 workflows
- [x] `sequences/` - 5 workflows
- [x] `sequences-relance-detail/` - 3 workflows
- [x] `sequences-suivi-detail/` - 3 workflows
- [x] `settings-smtp/` - 4 workflows
- [x] `settings-smtp-detail/` - 3 workflows
- [x] `settings-utilisateurs/` - 3 workflows
- [x] `smart-marki/` - 4 workflows

### Suppression ✅
- [x] `API-CORRESPONDANCE.md` supprimé (remplacé par mises à jour individuelles)

---

## 📊 RÉCAPITULATIF FINAL

### Fichiers créés/mis à jour

| Fichier | Description |
|---------|-------------|
| `backend/lib/sqlite-db.js` | Module SQLite complet (20KB) |
| `backend/lib/auth-local.js` | Compatibilité SQLite |
| `backend/routes/api-routes.js` | 60+ routes API RESTful (35KB) |
| `backend/api-server.js` | Serveur HTTP |
| `backend/README-API.md` | Documentation API |
| `specs/data-models.md` | Schéma SQL documenté |
| `specs/workflows/backend/*.md` (25) | Tous les specs backend mis à jour |
| `specs/workflows/frontend/*/*.md` (162) | Tous les specs frontend mis à jour |

### Statistiques

| Catégorie | Quantité |
|-----------|----------|
| Routes API | 63 |
| Tables SQLite | 9 |
| Specs backend mis à jour | 25 |
| Specs frontend mis à jour | 162 |
| Total fichiers | 200+ |

---

## 🎯 PHASE 4 - Implémentation Code (À FAIRE)

### Prochaines étapes recommandées

1. **Créer les workflows backend exécutables**
   - `/backend/import-invoice/index.js`
   - `/backend/generate-relances/index.js`
   - `/backend/send-emails/index.js`
   - etc.

2. **Mettre à jour le frontend**
   - Adapter les appels API dans le code Alpine.js
   - Tester les nouvelles routes

3. **Tests**
   - Tests unitaires sqlite-db.js
   - Tests d'intégration API
   - Tests end-to-end

4. **Migration données**
   - Script YAML → SQLite (one-time)
   - Backup/restore

---

## ✅ MISSION COMPLÉTÉE

Tous les specs ont été mis à jour :
- ✅ Modèle de données SQLite
- ✅ Routes API RESTful
- ✅ Workflows backend avec code SQLite
- ✅ Workflows frontend avec appels API SQLite
- ✅ Suppression du fichier de correspondance global
