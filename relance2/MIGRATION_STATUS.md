# Migration _app/ - Architecture Jinja2 + Alpine.js

## Nouvelle Structure

```
specs/_app/templates/<nom-page>/
├── index.html              # Template principal (anciennement static/pages/<nom-page>/index.html)
├── alpinejs.html           # Initialisation Alpine avec includes workflows
└── workflows/
    ├── workflow-init.html  # État initial + init()
    └── workflow-*.html     # Un fichier par workflow (anciennement static/pages/<nom-page>/workflows/*.js)
```

## Pages Migrées ✅

### 1. Login ✅
**Source:** `specs/_app/static/pages/login/`
**Destination:** `specs/_app/templates/login/`

Fichiers créés:
- ✅ `templates/login/index.html` - Template principal
- ✅ `templates/login/alpinejs.html` - Initialisation avec includes
- ✅ `templates/login/workflows/workflow-init.html` - État initial
- ✅ `templates/login/workflows/initial-load.html` - Workflow chargement initial
- ✅ `templates/login/workflows/auth-submit.html` - Workflow soumission formulaire

**Workflows:**
- `initialLoad()` - Vérifie si token existant
- `authSubmit()` - Soumission formulaire de connexion

---

## Pages à Migrer ⏳ (22 restantes)

### 2. Dashboard ⏳
**Source:** `specs/_app/static/pages/dashboard/`
**Destination:** `specs/_app/templates/dashboard/`

Fichiers à créer:
- ⏳ `templates/dashboard/index.html`
- ⏳ `templates/dashboard/alpinejs.html`
- ⏳ `templates/dashboard/workflows/workflow-init.html`
- ⏳ `templates/dashboard/workflows/initial-load.html`
- ⏳ `templates/dashboard/workflows/sync-data.html`
- ⏳ `templates/dashboard/workflows/clear-events.html`
- ⏳ ... autres workflows

**Workflows à migrer depuis:**
- `specs/_app/static/pages/dashboard/store/store.js` → workflow-init.html
- `specs/_app/static/pages/dashboard/workflows/initial-load.js` → initial-load.html
- `specs/_app/static/pages/dashboard/workflows/sync-data.js` → sync-data.html
- `specs/_app/static/pages/dashboard/workflows/clear-events.js` → clear-events.html

### 3. Contacts ⏳
**Source:** `specs/_app/static/pages/contacts/`
**Destination:** `specs/_app/templates/contacts/`

### 4. Impayes ⏳
**Source:** `specs/_app/static/pages/impayes/`
**Destination:** `specs/_app/templates/impayes/`

### 5. Impayes-detail ⏳
**Source:** `specs/_app/static/pages/impayes-detail/`
**Destination:** `specs/_app/templates/impayes_detail/`

### 6. Impayes-payeur ⏳
**Source:** `specs/_app/static/pages/impayes-payeur/`
**Destination:** `specs/_app/templates/impayes_payeur/`

### 7. Impayes-reparer ⏳
**Source:** `specs/_app/static/pages/impayes-reparer/`
**Destination:** `specs/_app/templates/impayes_reparer/`

### 8. Impayes-suspendus ⏳
**Source:** `specs/_app/static/pages/impayes-suspendus/`
**Destination:** `specs/_app/templates/impayes_suspendus/`

### 9. Relances ⏳
**Source:** `specs/_app/static/pages/relances/`
**Destination:** `specs/_app/templates/relances/`

### 10. Relances-detail ⏳
**Source:** `specs/_app/static/pages/relances-detail/`
**Destination:** `specs/_app/templates/relances_detail/`

### 11. Relances-calendrier ⏳
**Source:** `specs/_app/static/pages/relances-calendrier/`
**Destination:** `specs/_app/templates/relances_calendrier/`

### 12. Relances-validation ⏳
**Source:** `specs/_app/static/pages/relances-validation/`
**Destination:** `specs/_app/templates/relances_validation/`

### 13. Sequences ⏳
**Source:** `specs/_app/static/pages/sequences/`
**Destination:** `specs/_app/templates/sequences/`

### 14. Sequences-relance-detail ⏳
**Source:** `specs/_app/static/pages/sequences-relance-detail/`
**Destination:** `specs/_app/templates/sequences_relance_detail/`

### 15. Sequences-suivi-detail ⏳
**Source:** `specs/_app/static/pages/sequences-suivi-detail/`
**Destination:** `specs/_app/templates/sequences_suivi_detail/`

### 16. Evenements ⏳
**Source:** `specs/_app/static/pages/evenements/`
**Destination:** `specs/_app/templates/evenements/`

### 17. Settings-smtp ⏳
**Source:** `specs/_app/static/pages/settings-smtp/`
**Destination:** `specs/_app/templates/settings_smtp/`

### 18. Settings-smtp-detail ⏳
**Source:** `specs/_app/static/pages/settings-smtp-detail/`
**Destination:** `specs/_app/templates/settings_smtp_detail/`

### 19. Settings-utilisateurs ⏳
**Source:** `specs/_app/static/pages/settings-utilisateurs/`
**Destination:** `specs/_app/templates/settings_utilisateurs/`

### 20. Smart-marki ⏳
**Source:** `specs/_app/static/pages/smart-marki/`
**Destination:** `specs/_app/templates/smart_marki/`

### 21. Portail-client ⏳
**Source:** `specs/_app/static/pages/portail-client/`
**Destination:** `specs/_app/templates/portail_client/`

### 22. Portail-mission ⏳
**Source:** `specs/_app/static/pages/portail-mission/`
**Destination:** `specs/_app/templates/portail_mission/`

---

## Pattern de Transformation

### Pour les fichiers JS workflow:

1. **Exporter vers méthode Alpine:**
   ```javascript
   // AVANT (JS)
   export function workflowName() { ... }
   
   // APRÈS (template HTML)
   workflowName: async function() { ... }
   ```

2. **Accès au state:**
   ```javascript
   // AVANT (JS)
   store.loading = true;
   
   // APRÈS (template)
   this.loading = true;
   ```

3. **Logs exhaustifs:**
   ```javascript
   const workflowId = crypto.randomUUID();
   log.info('WORKFLOW_START', { workflowId, workflow: 'name' });
   log.debug('STEP_START', { data });
   log.error('WORKFLOW_ERROR', { error: error.message });
   ```

### Pour index.html:

1. **x-data:**
   ```html
   <!-- AVANT -->
   <div x-data="storeName()">
   
   <!-- APRÈS -->
   <div x-data="pageName" x-init="init()">
   ```

2. **Appels workflows:**
   ```html
   <!-- AVANT -->
   @click="workflowFunction()"
   
   <!-- APRÈS -->
   @click="workflowName()"
   ```

3. **Include Alpine.js:**
   ```html
   <!-- À la fin du body -->
   {% include 'pageName/alpinejs.html' %}
   ```

## Commandes Utiles

```bash
# Créer la structure d'une nouvelle page
mkdir -p specs/_app/templates/NOM_PAGE/workflows

# Lister les fichiers source à migrer
find specs/_app/static/pages/NOM_PAGE -type f

# Vérifier la structure créée
find specs/_app/templates/NOM_PAGE -type f
```

## Validation Post-Migration

Pour chaque page migrée:
- [ ] `index.html` utilise `x-data="nomPage" x-init="init()"`
- [ ] `alpinejs.html` inclut tous les workflows avec {% include %}
- [ ] Chaque workflow est une méthode async avec workflowId
- [ ] Logs exhaustifs présents (WORKFLOW_START, SUCCESS, ERROR)
- [ ] Alpine.js chargé à la fin du body
- [ ] Pas de scripts inline dans index.html
