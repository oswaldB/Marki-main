"""Étape 4.5: Vérification/Création du fichier page-specs.md."""

from pathlib import Path

from rich.console import Console

console = Console()


def step_5_check_specs(cell_path: Path, cell_name: str, templates_dir: Path, dev_plan: dict = None, specs_path: Path = None) -> tuple[bool, str]:
    """Vérifie si page-specs.md existe, sinon le crée à partir du template.

    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        templates_dir: Dossier des templates
        dev_plan: Plan de développement (optionnel, non utilisé)
        specs_path: Chemin vers les specs (dans .specs/<cell>/) - optionnel

    Returns:
        Tuple (ok, message)
    """
    console.print("[blue]📋 Étape 4.5: Vérification page-specs.md...")

    # Nouvelle structure: specs dans .specs/<cell-name>/
    if specs_path is None:
        specs_path = cell_path.parent.parent.parent / ".specs" / cell_path.name
    
    page_specs_file = specs_path / "page-specs.md"

    # Vérifier si le fichier existe déjà
    if page_specs_file.exists():
        console.print("  [dim]✓ page-specs.md existe déjà")
    else:
        # Charger le template
        template_path = templates_dir / "static-stack" / "squelettes" / "specs" / "page-specs.md"

        if not template_path.exists():
            console.print(f"  [yellow]⚠️ Template non trouvé: {template_path}")
            # Créer un fichier minimal
            content = _generate_minimal_page_specs(cell_name)
            page_specs_file.write_text(content, encoding="utf-8")
            console.print(f"  [green]✓ page-specs.md créé (minimal)")
        else:
            # Lire le template
            content = template_path.read_text(encoding="utf-8")
            content = content.replace("{cell_name}", cell_name)
            
            # Écrire le fichier
            page_specs_file.write_text(content, encoding="utf-8")
            console.print(f"  [green]✓ page-specs.md créé")

    return True, "ok"


def _generate_minimal_page_specs(cell_name: str) -> str:
    """Génère un fichier page-specs.md minimal si le template n'existe pas."""
    return f"""# Page Specs - {cell_name}

> **DOCUMENT DE RÉFÉRENCE**
> 
> Ce fichier définit les règles du projet.

## Partie 1 : Use Cases (Gherkin)

Feature: {cell_name} Page
  En tant qu'utilisateur
  Je veux pouvoir interagir avec la page {cell_name}
  Afin de réaliser mes tâches

## Partie 2 : Stack Technique

- Alpine.js 3 + HTML statique
- PouchDB (client) avec sync CouchDB
- TailwindCSS via CDN
- Workflows dans ./workflows/*.js

## Partie 3 : Règles Absolues

1. **Passage de paramètres URL** : Utiliser le hash (`#userId=123`)
2. **Appel des Workflows** : Via `runWorkflow('nom', params)` dans Alpine
3. **IDs des Boutons** : Format obligatoire `btn-{{action}}`
4. **Data** : Tout passe par PouchDB, pas de fetch direct
"""



def _generate_scenarios_section(cell_name: str, dev_plan: dict) -> str:
    """Génère la section des scénarios de test détaillés pour page-specs.md."""
    workflows = dev_plan.get("workflows", [])
    
    section = """
## Partie 4 : Scénarios de Test Détaillés

> **Document de référence pour les tests automatisés**
> 
> Chaque workflow doit avoir un fichier scenario-{workflow}.md dans .specs/tests-workflows/

"""
    
    for i, workflow in enumerate(workflows, 1):
        section += f"""### Scénario {i} : {workflow.replace('-', ' ').title()}

**Workflow** : `{workflow}`
**Fichier de test** : `.specs/tests-workflows/scenario-{workflow}.md`

#### Préconditions (Mock Data)
- localStorage:
  - `auth_token`: "mock-jwt-token-{i}"
- État initial PouchDB:
  - Collection appropriée initialisée avec données de test

#### Actions
"""
        # Actions spécifiques selon le type de workflow
        if workflow == "initial-load":
            section += """1. Charger la page `/{cell_name}`
2. Attendre que le workflow s'exécute automatiquement (au init() Alpine)
3. Vérifier que les données sont chargées depuis PouchDB
"""
        elif "submit" in workflow or "save" in workflow or "create" in workflow:
            section += f"""1. Remplir le formulaire avec données valides
2. Cliquer sur le bouton `#btn-{workflow.replace('-', '-')}`
3. Vérifier que `{workflow}` est appelé avec les bon paramètres
4. Vérifier la mise à jour PouchDB
"""
        elif "delete" in workflow or "remove" in workflow:
            section += f"""1. Sélectionner l'élément à supprimer
2. Cliquer sur le bouton `#btn-delete`
3. Confirmer la suppression
4. Vérifier que `{workflow}` supprime bien de PouchDB
"""
        else:
            section += f"""1. Déclencher l'action via le bouton approprié
2. Vérifier que `{workflow}` est exécuté
3. Vérifier le résultat dans PouchDB
"""
        
        section += f"""
#### Vérifications Attendues
- [ ] Console contient : "{workflow} started"
- [ ] Console contient : "{workflow} completed" ou "{workflow} failed"
- [ ] Pas d'erreur JS : "is not defined"
- [ ] Alpine.data mis à jour correctement
- [ ] PouchDB modifié comme attendu

#### Cas d'Erreur à Tester
- [ ] Token invalide/missing
- [ ] Données manquantes
- [ ] Erreur réseau (si applicable)
- [ ] Permissions insuffisantes

"""
    
    section += f"""### Scénario Global : Navigation et Cycle de Vie

**Objectif** : Vérifier le cycle complet de la page

#### Test de Navigation
1. Accéder à `/{cell_name}`
2. Vérifier que `initial-load` s'exécute
3. Tester chaque bouton d'action
4. Vérifier les transitions

#### Test de Persistence
1. Modifier des données
2. Rafraîchir la page
3. Vérifier que les données persistent (PouchDB)
4. Vérifier le sync avec CouchDB

#### Liste des Workflows ({len(workflows)} total)
"""
    for wf in workflows:
        section += f"- `{wf}`\n"
    
    return section


def _generate_complete_page_specs(cell_name: str, dev_plan: dict) -> str:
    """Génère un fichier page-specs.md complet si le template n'existe pas."""
    content = f"""# Page Specs - {cell_name}

> **DOCUMENT DE RÉFÉRENCE PRIORITAIRE**
> 
> Ce fichier définit les règles immuables du projet. 
> **LIT EN PRIORITÉ ABSOLUE avant toute modification de code.**

## Partie 1 : Use Cases (Gherkin)

Feature: {cell_name} Page
  En tant qu'utilisateur
  Je veux pouvoir interagir avec la page {cell_name}
  Afin de réaliser mes tâches

  Scenario: Chargement initial
    Given je suis sur la page {cell_name}
    When la page se charge
    Then le workflow "initial-load" est exécuté
    And les données sont chargées depuis PouchDB

## Partie 2 : Stack Technique

- Alpine.js 3 + HTML statique
- PouchDB (client) avec sync CouchDB
- TailwindCSS via CDN
- Workflows dans ./workflows/*.js

## Partie 3 : Règles Absolues

1. **Passage de paramètres URL** : Utiliser le hash (`#userId=123`)
2. **Appel des Workflows** : Via `runWorkflow('nom', params)` dans Alpine
3. **IDs des Boutons** : Format obligatoire `btn-{{action}}`
4. **Data** : Tout passe par PouchDB, pas de fetch direct

"""
    content += _generate_scenarios_section(cell_name, dev_plan)
    return content


def _enrich_page_specs_with_scenarios(page_specs_file: Path, cell_name: str, dev_plan: dict):
    """Ajoute la section scénarios si elle n'existe pas déjà dans le fichier."""
    content = page_specs_file.read_text(encoding="utf-8")
    
    # Vérifier si la section existe déjà
    if "Partie 4 : Scénarios de Test Détaillés" in content:
        return
    
    # Vérifier si on a des workflows à ajouter
    workflows = dev_plan.get("workflows", [])
    if not workflows:
        return
    
    console.print("  [blue]→ Ajout des scénarios détaillés au page-specs.md existant...")
    
    scenarios_section = _generate_scenarios_section(cell_name, dev_plan)
    content = content + "\n" + scenarios_section
    
    page_specs_file.write_text(content, encoding="utf-8")
    console.print(f"  [green]✓ Section scénarios ajoutée ({len(workflows)} workflows)")


def _generate_scenario_tests(cell_path: Path, cell_name: str, templates_dir: Path, dev_plan: dict):
    """Génère un fichier scenario-*.md par workflow dans tests-workflows/."""
    
    tests_workflows_dir = cell_path / ".specs" / "tests-workflows"
    tests_workflows_dir.mkdir(parents=True, exist_ok=True)
    
    workflows = dev_plan.get("workflows", [])
    if not workflows:
        return
    
    template_path = templates_dir / "static-stack" / "squelettes" / "test" / "scenario-single.md"
    
    if not template_path.exists():
        console.print(f"  [yellow]⚠️ Template scenario-single.md non trouvé")
        return
    
    template_content = template_path.read_text(encoding="utf-8")
    
    created_count = 0
    
    for workflow_name in workflows:
        # Nom du fichier: scenario-{workflow-name}.md
        scenario_file = tests_workflows_dir / f"scenario-{workflow_name}.md"
        
        if scenario_file.exists():
            continue
        
        # Déterminer le type de scénario et les données par défaut
        if workflow_name == "initial-load":
            scenario_name = "Chargement initial"
            description = "Vérifie que la cell charge correctement les données au démarrage"
            priority = "Critique"
            preconditions = """- localStorage:
  - `auth_token`: "mock-token-12345"
  - `user_id`: "user_001"
- PouchDB (collection "users"):
  - `{"_id": "user_001", "name": "John Doe", "email": "john@example.com"}`"""
            actions = """1. Charger la page `/{cell_name}`
2. Attendre 3 secondes
3. Vérifier que le workflow s'est exécuté automatiquement"""
            verifications = """- Console contient: "initial-load started"
- Console contient: "user loaded: John Doe"
- Console contient: "initial-load completed"
- Pas d'erreur contenant "is not defined"
- Alpine.data contient: `user.name === "John Doe"`"""
            
        elif workflow_name.endswith("-submit") or workflow_name.endswith("-save"):
            scenario_name = f"Soumission {workflow_name.replace('-', ' ').title()}"
            description = f"Vérifie que le workflow {workflow_name} s'exécute correctement"
            priority = "Haute"
            preconditions = """- localStorage:
  - `auth_token`: "mock-token-12345"
- État Alpine: données du formulaire initialisées"""
            actions = f"""1. Remplir les champs du formulaire
2. Cliquer sur `#btn-{workflow_name.replace('-', '-')}`
3. Attendre 2 secondes"""
            verifications = f"""- Console contient: "{workflow_name} started"
- Console contient: "{workflow_name} completed"
- Pas d'erreur dans la console"""
            
        else:
            scenario_name = workflow_name.replace('-', ' ').title()
            description = f"Vérifie le workflow {workflow_name}"
            priority = "Moyenne"
            preconditions = """- localStorage:
  - `auth_token`: "mock-token-12345"""""
            actions = f"""1. Déclencher le workflow {workflow_name}
2. Attendre 2 secondes"""
            verifications = f"""- Console contient: "{workflow_name} started"
- Console contient: "{workflow_name} completed" """
        
        # Remplacer les placeholders
        content = template_content
        content = content.replace("{cell_name}", cell_name)
        content = content.replace("{scenario_name}", scenario_name)
        content = content.replace("{workflow_name}", workflow_name)
        content = content.replace("{description}", description)
        content = content.replace("{priority}", priority)
        content = content.replace("{preconditions}", preconditions)
        content = content.replace("{actions}", actions)
        content = content.replace("{verifications}", verifications)
        
        # Écrire le fichier
        scenario_file.write_text(content, encoding="utf-8")
        created_count += 1
    
    if created_count > 0:
        console.print(f"  [green]✓ {created_count} fichier(s) scenario-*.md créé(s) dans tests-workflows/")
