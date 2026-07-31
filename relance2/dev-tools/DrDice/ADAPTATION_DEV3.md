# Adaptation de dev3 pour Flask/SQLite (relance2)

## Fichiers modifiés/créés

### Commande principale
- `drdice/commands/dev3.py` - Recherche cells dans app/screens/, app/backend_wf/, app/cron/
- `drdice/commands/__init__.py` - Export de dev3
- `drdice/cli.py` - Enregistrement de la commande dev3

### Étapes adaptées pour Flask
| Étape | Fichier | Changement |
|-------|---------|------------|
| 2 | `step_2_structure.py` | Vérification structure Flask au lieu de Node.js/Caddy |
| 4 | `step_4_specs.py` | Utilise `specs/` (sans point) au lieu de `.specs/` |
| 5 | `step_5_specs.py` | Utilise `specs/` pour page-specs.md |
| 6 | `step_6_data_mapping.py` | Data mapping pour SQLite/Flask au lieu de CouchDB |
| 7 | `step_7_clean.py` | Nettoie tout sauf `specs/` (sans point) |
| 8 | `step_8_skeleton.py` | Génère squelettes Flask (blueprint, routes, models) |
| 9 | `step_9_flask.py` (nouveau) | Gère serveur Flask + enregistrement blueprint |
| - | `step_9_caddy.py` (supprimé) | Plus utilisé |

### Module dev3_steps
- `__init__.py` - Mise à jour des imports pour step_9_flask_server
- 15 étapes disponibles pour le workflow Flask

### Templates Flask (déjà en place)
```
drdice/templates/flask/squelettes/
├── screens/           # Blueprint, routes, models, templates
├── backend/           # Workflow backend Flask
└── cron/              # Cron jobs Flask
```

### Templates static-stack (optionnel)
```
drdice/templates/static-stack/  # Pour référence stack statique
```

## Différences clés entre relance3 (original) et relance2 (adapté)

| Aspect | relance3 (original) | relance2 (adapté) |
|--------|---------------------|-------------------|
| **Stack** | HTML/JS + CouchDB/PouchDB | Flask + SQLite |
| **Specs** | `.specs/` (avec point) | `specs/` (sans point) |
| **Cells** | À la racine `/{cell}/` | Dans `app/screens/{cell}/` |
| **Serveur** | Caddy + Node.js | Flask sur port 5000 |
| **Squelettes** | index.html, main.js | __init__.py, routes.py, templates/ |

## Utilisation

```bash
cd /home/ubuntu/marki/relance2/DrDice

# Développement d'une cell Flask
python -m drdice dev3 --cell login

# Mode automatique
python -m drdice dev3 --cell login --yes

# Sans gestion git
python -m drdice dev3 --cell login --skip-git
```

## Étapes du workflow dev3 (adapté Flask)

1. **Git Setup** - Création branche feature/cell-{name}
2. **Structure** - Vérification structure Flask
3. **Healthy Test** - Test du serveur Flask
4. **Analyse Specs** - Parse specs/models/, specs/routes/, specs/wf-*/
5. **Check Specs** - Vérification page-specs.md
6. **Data Mapping** - Génération data-mapping-page.md (SQLite)
7. **Workflow Tests** - Vérification tests workflows
8. **Clean Cell** - Suppression anciens fichiers
9. **Skeletons** - Génération fichiers Flask vides
10. **Flask Server** - Enregistrement blueprint + test serveur
11. **Skeleton Tests** - Tests squelettes
12. **Generate IA** - Génération code par IA
13. **Mockup Check** - Vérification similarité mockup
14. **Commit Git** - Commit et push
15. **Create Devok** - Marquage cell comme dev OK
