# Rapport Détaillé par URL - Console & Network

**Date**: 2026-07-16 21:04:55

**URL de base**: http://localhost:5000

**URLs testées**: 13

---

## 📊 Tableau Récapitulatif

| URL | HTTP | Console | Workflow | Network | API Calls | API Errors | Statut |
|-----|------|---------|----------|---------|-----------|------------|--------|
| Login | 200 | 7 | 4 | 4 | 0 | 0 | ✅ |
| Dashboard | 200 | 2 | 0 | 8 | 0 | 0 | ❌ |
| Impayes | 200 | 2 | 0 | 8 | 0 | 0 | ❌ |
| Contacts | 200 | 2 | 0 | 8 | 0 | 0 | ❌ |
| Relances | 200 | 2 | 0 | 8 | 0 | 0 | ❌ |
| Sequences | 200 | 2 | 0 | 8 | 0 | 0 | ❌ |
| Evenements | 200 | 2 | 0 | 8 | 0 | 0 | ❌ |
| Settings | 200 | 11 | 4 | 13 | 0 | 0 | ❌ |
| Settings SMTP | 200 | 13 | 6 | 13 | 0 | 0 | ❌ |
| Settings Utilisateurs | 200 | 13 | 6 | 13 | 0 | 0 | ❌ |
| Relances Calendrier | 200 | 11 | 6 | 13 | 0 | 0 | ❌ |
| Relances Validation | 200 | 13 | 6 | 13 | 0 | 0 | ❌ |
| Smart Marki | 200 | 2 | 0 | 8 | 0 | 0 | ❌ |

---

## 🔍 Détails par URL

### Login

- **URL**: `http://localhost:5000/login`
- **Path**: `/login`
- **HTTP Status**: 200

#### Console Logs

- Total: 7
- Log: 6
- Info: 0
- Warn: 0
- Error: 0
- **Workflow**: 4

**Logs Workflow**:

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"c447ecb7-3913-4679-b88b-8b50b6bcc00b","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"c447ecb7-3913-4679-b88b-8b50b6bcc00b","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"b9ccaa64-c5a2-4fd2-816f-a64d272e686d","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"b9ccaa64-c5a2-4fd2-816f-a64d272e686d","r...

#### Network

- Total requêtes: 4
- Total réponses: 4
- **API calls**: 0
- **API errors**: 0

---

### Dashboard

- **URL**: `http://localhost:5000/dashboard`
- **Path**: `/dashboard`
- **HTTP Status**: 200

#### Console Logs

- Total: 2
- Log: 0
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 0

**Erreurs Console**:

- `2026-07-16T21:04:08.108098` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 8
- Total réponses: 8
- **API calls**: 0
- **API errors**: 0

---

### Impayes

- **URL**: `http://localhost:5000/impayes`
- **Path**: `/impayes`
- **HTTP Status**: 200

#### Console Logs

- Total: 2
- Log: 0
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 0

**Erreurs Console**:

- `2026-07-16T21:04:12.038710` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 8
- Total réponses: 8
- **API calls**: 0
- **API errors**: 0

---

### Contacts

- **URL**: `http://localhost:5000/contacts`
- **Path**: `/contacts`
- **HTTP Status**: 200

#### Console Logs

- Total: 2
- Log: 0
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 0

**Erreurs Console**:

- `2026-07-16T21:04:15.954244` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 8
- Total réponses: 8
- **API calls**: 0
- **API errors**: 0

---

### Relances

- **URL**: `http://localhost:5000/relances`
- **Path**: `/relances`
- **HTTP Status**: 200

#### Console Logs

- Total: 2
- Log: 0
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 0

**Erreurs Console**:

- `2026-07-16T21:04:19.877442` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 8
- Total réponses: 8
- **API calls**: 0
- **API errors**: 0

---

### Sequences

- **URL**: `http://localhost:5000/sequences`
- **Path**: `/sequences`
- **HTTP Status**: 200

#### Console Logs

- Total: 2
- Log: 0
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 0

**Erreurs Console**:

- `2026-07-16T21:04:23.818834` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 8
- Total réponses: 8
- **API calls**: 0
- **API errors**: 0

---

### Evenements

- **URL**: `http://localhost:5000/evenements`
- **Path**: `/evenements`
- **HTTP Status**: 200

#### Console Logs

- Total: 2
- Log: 0
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 0

**Erreurs Console**:

- `2026-07-16T21:04:27.751038` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 8
- Total réponses: 8
- **API calls**: 0
- **API errors**: 0

---

### Settings

- **URL**: `http://localhost:5000/settings`
- **Path**: `/settings`
- **HTTP Status**: 200

#### Console Logs

- Total: 11
- Log: 8
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 4

**Logs Workflow**:

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"12b0e95d-5b80-4364-85b6-b3cbde6c89b0","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"12b0e95d-5b80-4364-85b6-b3cbde6c89b0","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"c78954c0-929f-4436-9983-00fb1d19a5b4","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"c78954c0-929f-4436-9983-00fb1d19a5b4","r...

**Erreurs Console**:

- `2026-07-16T21:04:31.708198` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 13
- Total réponses: 10
- **API calls**: 0
- **API errors**: 0

---

### Settings SMTP

- **URL**: `http://localhost:5000/settings-smtp`
- **Path**: `/settings-smtp`
- **HTTP Status**: 200

#### Console Logs

- Total: 13
- Log: 8
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 6

**Logs Workflow**:

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"329b1d6b-4a6e-42c4-8ace-b32ac57363b0","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"6adb64d3-0988-40ac-8f65-f87758a0ecb6","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"166d0f93-7b38-4adf-9437-b63ed17c54be","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"166d0f93-7b38-4adf-9437-b63ed17c54be","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"34ce07f8-4aa6-493b-89e0-dc2b41013685","wor...

**Erreurs Console**:

- `2026-07-16T21:04:35.680147` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 13
- Total réponses: 10
- **API calls**: 0
- **API errors**: 0

---

### Settings Utilisateurs

- **URL**: `http://localhost:5000/settings-utilisateurs`
- **Path**: `/settings-utilisateurs`
- **HTTP Status**: 200

#### Console Logs

- Total: 13
- Log: 8
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 6

**Logs Workflow**:

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"43fb4b45-a60c-4107-b185-6c72428f7078","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"118e2eb2-6902-4f95-96b9-bb2b224b83fb","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"f9576dd9-b443-4f52-81c1-08492c82b94d","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"f9576dd9-b443-4f52-81c1-08492c82b94d","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"c059beab-d2b5-4531-82b6-1f47a9a6be91","wor...

**Erreurs Console**:

- `2026-07-16T21:04:39.614002` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 13
- Total réponses: 10
- **API calls**: 0
- **API errors**: 0

---

### Relances Calendrier

- **URL**: `http://localhost:5000/relances-calendrier`
- **Path**: `/relances-calendrier`
- **HTTP Status**: 200

#### Console Logs

- Total: 11
- Log: 8
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 6

**Logs Workflow**:

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"65b9f8ee-38c3-44b5-816c-1d7de58e5048","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"47e33843-5a44-4711-8941-c297dada1c92","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"c6dee6c0-3bd1-4c8f-be05-ee2d25d483c0","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"c6dee6c0-3bd1-4c8f-be05-ee2d25d483c0","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"020b8349-444c-4e77-9ab7-5ff6fd4784b0","wor...

**Erreurs Console**:

- `2026-07-16T21:04:43.562200` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 13
- Total réponses: 10
- **API calls**: 0
- **API errors**: 0

---

### Relances Validation

- **URL**: `http://localhost:5000/relances-validation`
- **Path**: `/relances-validation`
- **HTTP Status**: 200

#### Console Logs

- Total: 13
- Log: 8
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 6

**Logs Workflow**:

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"b31c3273-b9a0-4894-b9f6-e7c68636cef7","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"432689a6-495a-47b1-9719-67e96acd859d","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"a5696ed7-eb5d-433a-9724-cf827a7dee36","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"a5696ed7-eb5d-433a-9724-cf827a7dee36","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"81af2b09-8d0e-4b8f-88c9-22b80ccb15d3","wor...

**Erreurs Console**:

- `2026-07-16T21:04:47.512308` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 13
- Total réponses: 10
- **API calls**: 0
- **API errors**: 0

---

### Smart Marki

- **URL**: `http://localhost:5000/smart-marki`
- **Path**: `/smart-marki`
- **HTTP Status**: 200

#### Console Logs

- Total: 2
- Log: 0
- Info: 0
- Warn: 0
- Error: 1
- **Workflow**: 0

**Erreurs Console**:

- `2026-07-16T21:04:51.471896` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

#### Network

- Total requêtes: 8
- Total réponses: 8
- **API calls**: 0
- **API errors**: 0

---

## 📈 Statistiques Globales

- **URLs testées**: 13
- **URLs OK**: 1/13
- **Total console logs**: 82
- **Total workflow logs**: 32
- **Total API calls**: 0
- **Total API errors**: 0
