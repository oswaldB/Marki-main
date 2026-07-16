# Rapport Détaillé par URL - Console & Network

**Date**: 2026-07-16 21:01:38

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

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"4ddde23d-6057-4fc6-835b-4a9fe72343b6","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"4ddde23d-6057-4fc6-835b-4a9fe72343b6","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"28663de0-233b-494d-b82f-b100a6911ead","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"28663de0-233b-494d-b82f-b100a6911ead","r...

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

- `2026-07-16T21:00:52.051868` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `2026-07-16T21:00:55.949441` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `2026-07-16T21:00:59.847239` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `2026-07-16T21:01:03.728479` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `2026-07-16T21:01:07.656769` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `2026-07-16T21:01:11.559162` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"d23ac709-1208-4201-9ae7-02e9d2b08383","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"d23ac709-1208-4201-9ae7-02e9d2b08383","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"9efa8462-819f-4d78-9c10-f41a1bd94a36","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"9efa8462-819f-4d78-9c10-f41a1bd94a36","r...

**Erreurs Console**:

- `2026-07-16T21:01:15.466801` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"8a31e19c-e084-4bc2-8f25-c9d536f5832d","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"dde53fa2-fd79-417d-84cb-f54ff549eb32","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"e6e4aa61-58bb-42c5-a094-6b024701306a","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"e6e4aa61-58bb-42c5-a094-6b024701306a","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"9b2abf81-acd9-4cc8-8ca3-0c752e55fd00","wor...

**Erreurs Console**:

- `2026-07-16T21:01:19.428770` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"60b18ccb-a1bc-49d0-a07d-a5bf453c00a3","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"1a495f40-e19e-4866-941c-d2ac99afcd79","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"802b4402-d2d0-449a-89ed-aaeb1e57305a","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"802b4402-d2d0-449a-89ed-aaeb1e57305a","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"167fca42-33cb-43b8-8903-683d7bcdaf75","wor...

**Erreurs Console**:

- `2026-07-16T21:01:23.362147` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"6b442da4-9bef-4d8c-836f-c7a3d1007c17","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"cebccbf3-c481-4f23-8c5e-6bbc1c44f1f5","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"9ebaa0f3-af3f-4517-a288-4028f1729fa2","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"9ebaa0f3-af3f-4517-a288-4028f1729fa2","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"65dcbc99-812c-46c6-98e5-b0dc8c1d32fb","wor...

**Erreurs Console**:

- `2026-07-16T21:01:27.313171` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `[log]` [INFO][WORKFLOW_START] {"workflowId":"56044baa-7669-4d1f-a00f-60cd47e2ea49","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"45f65505-f159-4828-aa88-eff76e7d56a9","wor...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"d75eb148-8d10-4c99-9611-f3e03bb0e126","wor...
- `[log]` [INFO][WORKFLOW_SUCCESS] {"workflowId":"d75eb148-8d10-4c99-9611-f3e03bb0e126","r...
- `[log]` [INFO][WORKFLOW_START] {"workflowId":"bc643cd7-a680-47cd-985b-3c3a7caeac45","wor...

**Erreurs Console**:

- `2026-07-16T21:01:31.281112` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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

- `2026-07-16T21:01:35.234949` Failed to load resource: the server responded with a status of 404 (NOT FOUND)...

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
