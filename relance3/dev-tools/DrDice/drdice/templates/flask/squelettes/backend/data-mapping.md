# Data Mapping - {cell_name}

## 🔧 Workflows Backend

Ce type de cell (`backend-wf`) implémente des workflows sans interface utilisateur.

### Workflows identifiés

| Workflow | Fichier Spec | Route API | Méthode | Description |
|------------|--------------|-----------|---------|-------------|
| `{cell_name}-process` | `specs/wf-backend/{cell_name}-process.md` | `/api/{cell_name}/process` | POST | Traitement principal |
| ... | ... | ... | ... | ... |

---

## 🗂️ Modèles de données

| Modèle | Fichier | Champs principaux | Utilisé par |
|--------|---------|-------------------|-------------|
| `{CellName}Job` | `models/{cell_name}_job.py` | `id`, `status`, `result` | Workflows |
| ... | ... | ... | ... |

---

## 🗃️ Schéma de la Base de Données

Documenter le schéma complet des tables utilisées par les workflows backend.

### Tables principales

| Table | Description | Usage |
|-------|-------------|-------|
| `{cell_name}_jobs` | Stockage des jobs en cours/complets | Workflow principal |
| `{cell_name}_results` | Résultats des traitements | Archivage |
| ... | ... | ... |

### Schéma détaillé

#### Table `{cell_name}_jobs`

| Champ | Type SQL | Contraintes | Description | Python Type |
|-------|----------|-------------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Identifiant unique | `int` |
| `workflow_name` | `VARCHAR(100)` | `NOT NULL` | Nom du workflow | `str` |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'pending'` | pending, running, completed, failed | `str` |
| `input_data` | `JSON` | `NULL` | Données d'entrée | `Dict` |
| `output_data` | `JSON` | `NULL` | Résultat du traitement | `Dict` |
| `created_at` | `DATETIME` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Date de création | `datetime` |
| `started_at` | `DATETIME` | `NULL` | Date de début | `datetime` |
| `completed_at` | `DATETIME` | `NULL` | Date de fin | `datetime` |
| `error_message` | `TEXT` | `NULL` | Message d'erreur si échec | `str` |

#### Table `{cell_name}_results` (si séparée)

| Champ | Type SQL | Contraintes | Description | Python Type |
|-------|----------|-------------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Identifiant unique | `int` |
| `job_id` | `INTEGER` | `FOREIGN KEY` | Référence vers {cell_name}_jobs.id | `int` |
| `result_type` | `VARCHAR(50)` | `NOT NULL` | Type de résultat | `str` |
| `data` | `JSON` | `NOT NULL` | Données résultat | `Dict` |
| `created_at` | `DATETIME` | `NOT NULL` | Date de création | `datetime` |


### Mapping API ↔️ DB

| Paramètre API | Champ DB | Transformation |
|---------------|----------|----------------|
| `workflow_id` | `id` | `int()` |
| `input.data` | `input_data` | `json.dumps()` |
| `output` | `output_data` | `json.dumps()` |
| `status` | `status` | Direct |

---

## 📡 Points d'entrée API

| Endpoint | Méthode | Input | Output | Description |
|----------|---------|-------|--------|-------------|
| `/api/{cell_name}/process` | POST | `{"data": "..."}` | `{"result": "..."}` | Traitement principal |
| `/api/{cell_name}/status/<id>` | GET | - | `{"status": "..."}` | Statut du job |
| ... | ... | ... | ... | ... |

> **⚠️ Vérification** : Toutes les routes doivent exister dans `specs/routes/*.md`.


---

## ✅ Checklist de validation

- [ ] Tous les workflows backend ont une spec dans `specs/wf-backend/`
- [ ] Toutes les routes API sont définies dans `specs/routes/`
- [ ] Les modèles nécessaires sont dans `specs/models/`


---

*Généré automatiquement par DrDice dev2*
*Date: {date}*
