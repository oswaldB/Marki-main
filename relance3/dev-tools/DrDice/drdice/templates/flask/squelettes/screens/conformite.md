# Checklist de Conformité - Vérification IA

Cette checklist doit être complétée lors de la phase de vérification de conformité.

## Structure du Blueprint

- [ ] Le blueprint est correctement nommé `{cell_name}`
- [ ] Le `template_folder='templates'` est présent pour les screens
- [ ] L'import des routes se fait après la création du blueprint (`from . import routes`)

## Routes (routes.py)

- [ ] Les noms de fonctions correspondent aux endpoints utilisés dans `url_for()`
- [ ] Format correct : `url_for('{cell_name}.nom_fonction')`
- [ ] Les routes retournent bien `render_template()` avec le bon chemin
- [ ] Les imports de modèles sont présents si nécessaire
- [ ] Pas d'imports circulaires
- [ ] Le templates/index.html n'utilise que des routes qui sont définies dans `routes.py`
- [ ] les templates/workflows n'utilisent que des routes qui sont définies dans `routes.py`


## Modèles (models/*.py)

- [ ] Les noms de classes sont en PascalCase
- [ ] Les méthodes CRUD sont présentes (from_row, get_by_id, save, delete)
- [ ] Les requêtes SQL utilisent sqlite3 standard (pas d'ORM)

## Templates HTML

- [ ] Le layout utilisé correspond au type de page
  - [ ] `layouts/base.html` pour pages sans nav (login, register)
  - [ ] `layouts/layout_app.html` pour pages avec nav (dashboard)
- [ ] Les blocs Jinja2 (`{% block content %}`) sont correctement définis
- [ ] Les `url_for()` utilisent le format `{cell_name}.nom_fonction`
- [ ] Les variables utilisées sont bien passées par `render_template()`
- [ ] Alpine.js est initialisé avec `x-data` sur le container principal
- [ ] Les assets (images, CSS, JS) sont correctement chargés via `/static/nom-fichier.extension`
- [ ] chaque bouton est associé à une fonction qui est un workflows/*html.

## Workflows Frontend (templates/workflows/*.html)

- [ ] Le logger est présent : `log.info('WORKFLOW_START', {...})`
- [ ] La structure try/catch/finally est en place
- [ ] Les logs incluent : WORKFLOW_START, STATE_UPDATE, WORKFLOW_SUCCESS/ERROR
- [ ] Les variables réactives sont définies dans alpinejs.html

## Workflows Backend (wf-backend)

- [ ] La classe WorkflowContext est utilisée
- [ ] La classe WorkflowResult est retournée
- [ ] Le WorkflowLogger logue tous les événements importants
- [ ] Pattern : WORKFLOW_START → VALIDATION_* → DB_* → WORKFLOW_SUCCESS/ERROR
- [ ] La fonction `execute(**kwargs)` retourne un dict

## Assets et Fichiers Statiques

- [ ] Les images existent dans `static/`
- [ ] Les références utilisent `url_for('static', filename='...')`
- [ ] Les fichiers CSS/JS externes ont des fallbacks

## Boutons dans index.html

- [ ] **Tous les boutons ont un ID CSS unique** (format: `btn-{cell_name}-01`, `btn-{cell_name}-02`, etc.)
- [ ] **Tous les boutons ont un `@click` ou `x-on:click`** pointant vers une fonction workflow
- [ ] Le format est `@click="nomDuWorkflow()"` (fonction définie dans un fichier workflows/*.html)
- [ ] Vérifier que la fonction appelée existe bien dans `alpinejs.html` ou dans un `templates/workflows/*.html`
- [ ] Les boutons n'ont pas d'attribut `onclick` natif (doit être Alpine.js)
- [ ] Les IDs des boutons sont uniques dans la page (pas de doublons)

**Pour vérifier :**
```bash
# Liste tous les boutons avec leurs IDs et @click
grep -n "<button" templates/{cell_name}/index.html | grep -E "(id=|@click|x-on:click)"
```

## Cohérence Globale

- [ ] Pas de variables mélangeant langues (ex: `user` vs `utilisateur`)
- [ ] Les noms sont cohérents entre routes, modèles et templates
- [ ] Pas de routes qui n'existent pas
- [ ] Les imports sont organisés (stdlib, tiers, locaux)
- [ ] Pas de code mort ou de commentaires de debug

## Notes de Vérification

<!-- L'IA doit remplir cette section avec les problèmes trouvés -->

**Problèmes détectés :**
-

**Corrections appliquées :**
-

**Statut final :** ⬜ Conforme / ⬜ Corrections nécessaires
