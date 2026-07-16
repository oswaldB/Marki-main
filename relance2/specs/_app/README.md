# _app/ - Shadow App Specifications

**Dossier** : `specs/_app/`  
**Description** : Spécifications de l'application Marki

**Statut**: ✅ À jour - Juillet 2024

---

## Principe

Structure des spécifications pour le développement de l'application Flask (`app/`).

Chaque composant de l'application est documenté ici avant d'être implémenté.

---

## Structure Actualisée

```
specs/_app/
├── README.md                           ← Ce fichier
├── AUDIT.md                            ← Audit et incohérences
├── workflow-strategy.md                ← Guide architecture workflows
├── CRON.md                             ← Documentation système cron
├── app.md                              ← Application principale
├── db.md                               ← Schéma base de données
├── requirements.md                     ← Dépendances Python
│
├── routes/                             ← API REST (13 fichiers)
│   ├── auth.md
│   ├── contacts.md
│   ├── events.md
│   ├── impayes.md
│   ├── import_data.md
│   ├── pages.md
│   ├── portail.md
│   ├── relances.md
│   ├── sequences.md
│   ├── smtp.md
│   ├── tokens.md
│   ├── users.md
│   └── workflow.md
│
├── layouts/                            ← Layouts et composants
│   ├── README.md
│   ├── layout_app.md                   ← Layout standard avec nav
│   ├── layout_portail.md               ← Layout portails clients
│   └── components/                     ← Composants réutilisables
│       ├── sidebar-nav-dual.js
│       └── sidebar-nav-dual.md
│
├── templates/                          ← Templates Jinja2 + Alpine.js (23 pages)
│   ├── login/
│   │   ├── index.html
│   │   ├── alpinejs.html
│   │   └── workflows/
│   ├── dashboard/
│   │   ├── index.html
│   │   ├── alpinejs.html
│   │   └── workflows/
│   ├── impayes/
│   ├── impayes_detail/
│   ├── contacts/
│   ├── relances/
│   ├── relances_detail/
│   ├── relances_calendrier/
│   ├── relances_validation/
│   ├── sequences/
│   ├── sequences_relance_detail/
│   ├── sequences_suivi_detail/
│   ├── evenements/
│   ├── settings/
│   ├── settings_smtp/
│   ├── settings_smtp_detail/
│   ├── settings_utilisateurs/
│   ├── portail_client/
│   ├── portail_mission/
│   └── smart_marki/
│
└── static/                             ← Ressources statiques uniquement
    └── css/
        └── app.md
```

---

## Architecture Frontend

### Pattern Alpine.js + Jinja2

Chaque page suit le pattern **Props → Init → Workflows**:

```html
<!-- templates/xxx/alpinejs.html -->
<script>
Alpine.data('pageName', () => ({
    // 1. PROPS RÉACTIVES (state)
    loading: false,
    items: [],
    
    // Getters calculés
    get filteredItems() { return ... },
    
    // 2. INIT (en premier)
    {% include 'xxx/workflows/workflow-init.html' %},
    
    // 3. WORKFLOWS (méthodes async)
    {% include 'xxx/workflows/initial-load.html' %},
    {% include 'xxx/workflows/action-xxx.html' %},
}));
</script>
```

### Layouts

| Layout | Usage | Structure |
|--------|-------|-----------|
| `layout_app` | Pages admin | Rail (64px) + Menu (220px) + Content |
| `layout_portail` | Portails clients | Header minimal + Content centré |

---

## Workflows

### Quand utiliser quoi ?

| Type | Implémentation | Exemple |
|------|----------------|---------|
| **State local** | Frontend uniquement | Tri, pagination, filtres |
| **CRUD simple** | Appel REST direct | `PUT /api/impayes/{id}` |
| **Logique métier** | Workflow Python | `POST /api/workflow/generate-relances` |
| **Cron** | APScheduler | Tâches planifiées |

📖 Voir [workflow-strategy.md](./workflow-strategy.md) pour le guide complet.

---

## Conventions

### Fichiers `.md`

Contiennent :
- Description du composant
- Code source documenté
- API et paramètres
- Checkpoints pour workflows

### Fichiers `.html`

Templates Jinja2 avec Alpine.js :
- `index.html` : Structure HTML
- `alpinejs.html` : Logique JavaScript
- `workflows/*.html` : Mega-functions

### Fichiers Routes

Chaque fichier dans `routes/` documente :
- Endpoints REST
- Paramètres requis
- Format des réponses
- Logs obligatoires (print)

---

## Suppressions Récentes

Les éléments suivants ont été supprimés car obsolètes :

| Élément | Raison | Date |
|---------|--------|------|
| `static/pages/` | Migré vers `templates/` | Juillet 2024 |
| `*/store/store.md` | Architecture remplacée | Juillet 2024 |
| `static/components/` | Déplacé vers `layouts/components/` | Juillet 2024 |

---

## Ressources

- [Routes API](./routes/) - Documentation API REST complète
- [Layouts](./layouts/) - Spécifications des layouts
- [Workflow Strategy](./workflow-strategy.md) - Guide architecture
- [CRON](./CRON.md) - Système de tâches planifiées
- [Audit](./AUDIT.md) - Rapport d'audit et incohérences

---

## Workflow de Développement

1. **Créer/Modifier** les specs dans `specs/_app/`
2. **Valider** la structure et les props
3. **Implémenter** dans `app/` (code Python/JS)
4. **Tester** les workflows et routes
5. **Mettre à jour** l'audit si nécessaire
