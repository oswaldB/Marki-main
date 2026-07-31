# AI Sandwich Builder

## Description
Ce skill crée un script bash qui enchaîne l'invocation de plusieurs skills via CLI (`pi -p --no-session "appelle le skill <nom>"`) dans une structure de dossier `workshop/`. Le skill est composé de deux scripts :
- **`scripts/init.sh`** : prépare la structure de fichiers
- **`scripts/generate-run.sh`** : génère le script de workflow exécutable

## Objectif
Produire un script `.sh` (`run_<nom>_workflow.sh`) qui enchaîne des actions `pi` avec les règles suivantes :
- Toutes les actions s'exécutent dans un dossier `workshop/`
- Structure requise :
  ```
  workshop/
  ├── input/              # Fichiers .md ou .html d'entrée
  │   ├── README.md
  │   ├── preflight.md     # Tests AVANT production
  │   ├── erreurs_connus_à_éviter.md
  │   └── *.md|*.html
  │
  ├── output/             # Vidé à chaque lancement (rm -rf output/*)
  │   ├── artefacts/       # Éléments additionnels
  │   └── logs/            # Logs d'exécution
  │
  ├── final/              # Résultat final après traitement
  │
  ├── QA/                 # Tests APRÈS production
  │   └── *.md
  │
  └── .workshop/
      └── scripts/         # Scripts de workflow générés
  ```

## Comportement

### Avant exécution (Preflight)
1. Vérifie que `workshop/input/preflight.md` existe
2. Exécute les tests listés dans `preflight.md`
3. Si un test échoue, le script s'arrête et log l'erreur

### Pendant exécution
1. Vide `workshop/output/` à chaque lancement en préservant `output/logs/`
2. Exécute chaque skill dans l'ordre via `pi -p --no-session "appelle le skill <nom>"`
3. Les skills sont additifs
4. Les artefacts générés sont placés dans `workshop/output/artefacts/`

### Après exécution (QA)
1. Vérifie que `workshop/QA/` existe et contient des tests
2. Exécute les tests QA listés
3. Si un test QA échoue :
   - Met à jour `workshop/input/erreurs_connus_à_éviter.md`
   - Le script retourne un code d'erreur non-nul
4. Si tous les tests QA réussissent :
   - Les artefacts sont copiés de `output/artefacts/` vers `final/`
   - Un rapport de succès est écrit dans `output/logs/`
   - Le script se termine avec le code 0

### Gestion des erreurs
- Toutes les erreurs sont loguées dans `workshop/output/logs/`
- Les erreurs connues sont documentées dans `workshop/input/erreurs_connus_à_éviter.md`
- Le script retourne à la première étape (preflight) en cas d'erreur

## Scripts du skill

### `init.sh`
Crée la structure `workshop/` avec tous les dossiers et fichiers par défaut.

```bash
# Créer la structure workshop/
./.pi/skills/ai-sandwich-builder/scripts/init.sh [chemin_workshop]

# Par défaut, crée dans ./workshop/
./.pi/skills/ai-sandwich-builder/scripts/init.sh
```

Fichiers créés automatiquement :
- `workshop/input/README.md`
- `workshop/input/preflight.md`
- `workshop/input/erreurs_connus_à_éviter.md`
- `workshop/QA/tests.md`

### `generate-run.sh`
Génère le script `run_<nom>_workflow.sh` dans `.workshop/scripts/` depuis un fichier `spec-<nom>.md`.

```bash
./.pi/skills/ai-sandwich-builder/scripts/generate-run.sh <chemin/vers/spec-nom.md>
```

| Argument | Description |
|----------|-------------|
| `spec-nom.md` | Chemin vers le fichier de spécification du workflow |

Le fichier `spec-<nom>.md` doit contenir :
- Un **frontmatter YAML** (`---` ... `---`) avec :
  - `nom:` — nom du workflow (ex: `dev3`)
  - `description:` — description du workflow
- Une **liste numérotée ou à puces** des skills à enchaîner

Exemple de fichier `spec-dev3.md` :
```markdown
---
nom: dev3
description: Workflow de développement pour la cell dev3
---

1. analyze-specs
2. generate-skeletons
3. generate-ia
4. post-gen-tests
```

Exécution :
```bash
./.pi/skills/ai-sandwich-builder/scripts/generate-run.sh workshop/input/spec-dev3.md
```

Génère : `workshop/.workshop/scripts/run_dev3_workflow.sh`

## Script généré : `run_<nom>_workflow.sh`

Le script produit contient :
- **`setup()`** : Crée les dossiers et le fichier d'erreurs
- **`clean_output()`** : Vide `output/` en préservant `output/logs/`
- **`run_preflight()`** : Vérifie `preflight.md`
- **`run_skills()`** : Exécute `pi -p --no-session "appelle le skill <nom>"` pour chaque skill
- **`copy_to_final()`** : Copie `output/artefacts/*` vers `final/`
- **`run_qa()`** : Valide que `final/` contient des fichiers
- **`write_success_report()`** : Écrit un rapport Markdown dans `output/logs/`
- **`main()`** : Orchestration Preflight → Skills → Copy → QA → Rapport

## Exemple de Fichier preflight.md

```markdown
# Tests Preflight

## Vérifications obligatoires avant production

- [ ] **Structure des dossiers**
  - Vérifier que `workshop/input/` contient au moins un fichier .md ou .html
  - Vérifier que `workshop/input/README.md` existe

- [ ] **Dépendances**
  - Vérifier que `pi` est accessible en CLI
  - Vérifier que les skills spécifiés existent

## Commandes de vérification

```bash
# Vérifier la structure
test -d workshop/input && test -f workshop/input/README.md && echo "Structure OK" || echo "Structure KO"

# Vérifier pi CLI
command -v pi >/dev/null 2>&1 && echo "pi CLI OK" || echo "pi CLI KO"
```
```

## Exemple de Fichier QA/tests.md

```markdown
# Tests QA - Validation des résultats

## Tests automatiques

- [ ] Vérifier que `workshop/final/` contient des fichiers
- [ ] Vérifier que les artefacts sont valides
- [ ] Vérifier la structure HTML si applicable

## Tests manuels

- [ ] Ouverture des fichiers générés dans un navigateur
- [ ] Validation visuelle du rendu
```

## Exemple d'Utilisation Complète

```bash
# 1. Créer la structure workshop/
./.pi/skills/ai-sandwich-builder/scripts/init.sh

# 2. (Optionnel) Ajouter des fichiers d'entrée
echo "# Mon Projet" > workshop/input/README.md
cp ma-spec.md workshop/input/

# 3. Écrire le fichier de spécification
cat > workshop/input/spec-dev3.md << 'SPEC'
---
nom: dev3
description: Workflow de développement pour la cell dev3
---

1. analyze-specs
2. generate-skeletons
3. generate-ia
4. post-gen-tests
SPEC

# 4. Générer le script de workflow
./.pi/skills/ai-sandwich-builder/scripts/generate-run.sh workshop/input/spec-dev3.md

# 5. Exécuter le workflow
chmod +x workshop/.workshop/scripts/run_dev3_workflow.sh
./workshop/.workshop/scripts/run_dev3_workflow.sh

# 6. Vérifier les résultats
ls -la workshop/final/
cat workshop/input/erreurs_connus_à_éviter.md
cat workshop/output/logs/rapport_*.md
```

## Notes Techniques

1. **Gestion des erreurs** : Le script utilise `set -euo pipefail`
2. **Logs** : Centralisés dans `workshop/output/logs/` avec timestamp
3. **Idempotence** : `init.sh` et le script généré peuvent être relancés
4. **Préservation des logs** : `clean_output()` sauvegarde et restaure `output/logs/`
