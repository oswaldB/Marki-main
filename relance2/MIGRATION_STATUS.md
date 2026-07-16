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

### 2. Impayes-reparer ✅
**Source:** `specs/_app/static/pages/impayes-reparer/`
**Destination:** `specs/_app/templates/impayes_reparer/`

Fichiers créés:
- ✅ `templates/impayes_reparer/index.html` - Template principal
- ✅ `templates/impayes_reparer/alpinejs.html` - Initialisation avec includes
- ✅ `templates/impayes_reparer/workflows/workflow-init.html` - État initial
- ✅ `templates/impayes_reparer/workflows/initial-load.html` - Workflow chargement
- ✅ `templates/impayes_reparer/workflows/view-reparer.html` - Workflow affichage

**Workflows:**
- `initialLoad()` - Charge les impayés à réparer depuis l'API
- `viewReparer()` - Affiche/met à jour la vue

### 3. Impayes-suspendus ✅
**Source:** `specs/_app/static/pages/impayes-suspendus/`
**Destination:** `specs/_app/templates/impayes_suspendus/`

Fichiers créés:
- ✅ `templates/impayes_suspendus/index.html` - Template principal
- ✅ `templates/impayes_suspendus/alpinejs.html` - Initialisation avec includes
- ✅ `templates/impayes_suspendus/workflows/workflow-init.html` - État initial
- ✅ `templates/impayes_suspendus/workflows/initial-load.html` - Workflow chargement
- ✅ `templates/impayes_suspendus/workflows/reactivate-impaye.html` - Workflow réactivation

**Workflows:**
- `initialLoad()` - Charge les impayés suspendus depuis l'API
- `reactivateImpaye(id)` - Réactive un impayé suspendu

### 4. Settings ✅
**Source:** `specs/_app/static/pages/settings/`
**Destination:** `specs/_app/templates/settings/`

Fichiers créés:
- ✅ `templates/settings/index.html` - Template principal
- ✅ `templates/settings/alpinejs.html` - Initialisation avec includes
- ✅ `templates/settings/workflows/workflow-init.html` - État initial
- ✅ `templates/settings/workflows/initial-load.html` - Workflow chargement

**Workflows:**
- `initialLoad()` - Charge les paramètres de l'application

### 5. Relances-detail ✅
**Source:** `specs/_app/static/pages/relances-detail/`
**Destination:** `specs/_app/templates/relances_detail/`

Fichiers créés:
- ✅ `templates/relances_detail/index.html` - Template principal
- ✅ `templates/relances_detail/alpinejs.html` - Initialisation avec includes
- ✅ `templates/relances_detail/workflows/workflow-init.html` - État initial
- ✅ `templates/relances_detail/workflows/initial-load.html` - Workflow chargement

**Workflows:**
- `initialLoad()` - Charge le détail d'une relance depuis l'API

### 6. Portail-mission ✅
**Source:** `specs/_app/static/pages/portail-mission/`
**Destination:** `specs/_app/templates/portail_mission/`

Fichiers créés:
- ✅ `templates/portail_mission/index.html` - Template principal
- ✅ `templates/portail_mission/alpinejs.html` - Initialisation avec includes
- ✅ `templates/portail_mission/workflows/workflow-init.html` - État initial
- ✅ `templates/portail_mission/workflows/initial-load.html` - Workflow chargement
- ✅ `templates/portail_mission/workflows/download-facture.html` - Workflow téléchargement facture
- ✅ `templates/portail_mission/workflows/regler-facture.html` - Workflow règlement facture
- ✅ `templates/portail_mission/workflows/logout.html` - Workflow déconnexion

**Workflows:**
- `initialLoad()` - Charge les données de la mission
- `downloadFacture()` - Télécharge la facture
- `reglerFacture()` - Redirige vers le paiement
- `logout()` - Déconnexion du portail

### 7. Dashboard ✅
**Source:** `specs/_app/static/pages/dashboard/`
**Destination:** `specs/_app/templates/dashboard/`

Fichiers créés:
- ✅ `templates/dashboard/index.html` - Template principal
- ✅ `templates/dashboard/alpinejs.html` - Initialisation avec includes
- ✅ `templates/dashboard/workflows/workflow-init.html` - État initial
- ✅ `templates/dashboard/workflows/initial-load.html` - Workflow chargement
- ✅ `templates/dashboard/workflows/sync-data.html` - Workflow synchronisation
- ✅ `templates/dashboard/workflows/clear-events.html` - Workflow effacer événements
- ✅ `templates/dashboard/workflows/switch-view-card.html` - Workflow vue carte
- ✅ `templates/dashboard/workflows/switch-view-list.html` - Workflow vue liste
- ✅ `templates/dashboard/workflows/refresh-stats.html` - Workflow rafraîchir stats

**Workflows:**
- `initialLoad()` - Charge les statistiques et événements
- `syncData()` - Synchronise les données
- `clearEvents()` - Vide les notifications
- `switchViewCard()` - Passe en vue carte
- `switchViewList()` - Passe en vue liste
- `refreshStats()` - Rafraîchit les statistiques

---

## Pages à Migrer ⏳ (16 restantes)

### Contacts ⏳
**Source:** `specs/_app/static/pages/contacts/`
**Destination:** `specs/_app/templates/contacts/`

### Impayes ⏳
**Source:** `specs/_app/static/pages/impayes/`
**Destination:** `specs/_app/templates/impayes/`

### Impayes-detail ⏳
**Source:** `specs/_app/static/pages/impayes-detail/`
**Destination:** `specs/_app/templates/impayes_detail/`

### Impayes-payeur ⏳
**Source:** `specs/_app/static/pages/impayes-payeur/`
**Destination:** `specs/_app/templates/impayes_payeur/`

### Relances ⏳
**Source:** `specs/_app/static/pages/relances/`
**Destination:** `specs/_app/templates/relances/`

### Relances-calendrier ⏳
**Source:** `specs/_app/static/pages/relances-calendrier/`
**Destination:** `specs/_app/templates/relances_calendrier/`

### Relances-validation ⏳
**Source:** `specs/_app/static/pages/relances-validation/`
**Destination:** `specs/_app/templates/relances_validation/`

### Sequences ⏳
**Source:** `specs/_app/static/pages/sequences/`
**Destination:** `specs/_app/templates/sequences/`

### Sequences-relance-detail ⏳
**Source:** `specs/_app/static/pages/sequences-relance-detail/`
**Destination:** `specs/_app/templates/sequences_relance_detail/`

### Sequences-suivi-detail ⏳
**Source:** `specs/_app/static/pages/sequences-suivi-detail/`
**Destination:** `specs/_app/templates/sequences_suivi_detail/`

### Evenements ⏳
**Source:** `specs/_app/static/pages/evenements/`
**Destination:** `specs/_app/templates/evenements/`

### Settings-smtp ⏳
**Source:** `specs/_app/static/pages/settings-smtp/`
**Destination:** `specs/_app/templates/settings_smtp/`

### Settings-smtp-detail ⏳
**Source:** `specs/_app/static/pages/settings-smtp-detail/`
**Destination:** `specs/_app/templates/settings_smtp_detail/`

### Settings-utilisateurs ⏳
**Source:** `specs/_app/static/pages/settings-utilisateurs/`
**Destination:** `specs/_app/templates/settings_utilisateurs/`

### Smart-marki ⏳
**Source:** `specs/_app/static/pages/smart-marki/`
**Destination:** `specs/_app/templates/smart_marki/`

### Portail-client ⏳
**Source:** `specs/_app/static/pages/portail-client/`
**Destination:** `specs/_app/templates/portail_client/`

---

## Transformation requise

### Pour chaque fichier JS workflow:
1. Transformer `export function nomWorkflow()` en `nomWorkflow: async function()`
2. Ajouter le logger: `const log = { debug: ..., info: ... };` ou utiliser un logger global
3. Remplacer `import` par inclusion Jinja2 dans `alpinejs.html`
4. Transformer les accès au store: `store.xxx` → `this.xxx`
5. Ajouter `const workflowId = crypto.randomUUID();` pour le tracing
6. Ajouter les logs exhaustifs (WORKFLOW_START, WORKFLOW_SUCCESS, etc.)

### Pour index.html:
1. Ajouter `{% include '<nom-page>/alpinejs.html' %}` à la fin du body
2. Remplacer `x-data="store"` par `x-data="nomPage" x-init="init()"`
3. Remplacer les appels aux workflows par les méthodes définies (ex: `@click="workflow1()"`)
4. Supprimer les scripts JS inline

### Créer alpinejs.html:
1. Définir le logger global
2. Inclure workflow-init.html
3. Inclure tous les workflows
4. Utiliser `Alpine.data('nomPage', () => ({...}))`

## Routes Flask à ajouter
Pour chaque page, ajouter dans `app/routes/pages.py`:
```python
@bp.route('/<nom-page>')
def nom_page():
    return render_template('<nom_page>/index.html')
```

## Ordre de migration recommandé
1. **login** (page simple, bon exemple) ✅
2. **impayes-reparer** (page simple) ✅
3. **impayes-suspendus** (page simple) ✅
4. **settings** (page simple) ✅
5. **relances-detail** (page simple) ✅
6. **portail-mission** (page moyenne) ✅
7. **dashboard** (page moyenne) ✅
8. Les autres pages...

## Validation Post-Migration

Pour chaque page migrée:
- [ ] `index.html` utilise `x-data="nomPage" x-init="init()"`
- [ ] `alpinejs.html` inclut tous les workflows avec {% include %}
- [ ] Chaque workflow est une méthode async avec workflowId
- [ ] Logs exhaustifs présents (WORKFLOW_START, SUCCESS, ERROR)
- [ ] Alpine.js chargé à la fin du body
- [ ] Pas de scripts inline dans index.html
