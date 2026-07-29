"""
Feedback Loop pour les tests de scénarios.
Analyse les échecs et décide de la stratégie de correction.
"""

import json
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, Literal
from enum import Enum

from rich.console import Console

console = Console()


class FailureSeverity(Enum):
    """Niveau de sévérité d'un échec de test."""
    CRITICAL = "critical"      # Erreur JS critique - correction code directe
    FUNCTIONAL = "functional"  # Comportement inattendu - analyse nécessaire
    STRUCTURAL = "structural"  # Problème de structure - maj scénario + régénération
    MINOR = "minor"           # Petit écart - correction mineure


@dataclass
class TestFailure:
    """Représente un échec de test analysé."""
    scenario_name: str
    workflow: str
    error_message: str
    severity: FailureSeverity
    console_logs: list[str] = field(default_factory=list)
    suggested_fix: Optional[str] = None
    fix_type: Literal["code_patch", "scenario_update", "regenerate"] = "code_patch"


class FailureAnalyzer:
    """Analyse les échecs de tests et détermine la stratégie."""
    
    CRITICAL_PATTERNS = [
        r"is not defined",
        r"Cannot read property",
        r"undefined is not",
        r"null is not",
        r"ReferenceError",
        r"TypeError",
    ]
    
    STRUCTURAL_PATTERNS = [
        r"Fichier manquant",
        r"fonction execute manquante",
        r"pas d'ID btn-\*",
        r"Alpine\.data non trouvé",
        r"workflows appelés mais manquants",
    ]
    
    def analyze(self, scenario_name: str, workflow: str, 
                error_message: str, console_logs: list[str]) -> TestFailure:
        """Analyse un échec et retourne la stratégie de correction."""
        
        # Détecter la sévérité
        severity = self._detect_severity(error_message, console_logs)
        
        # Déterminer le type de correction
        fix_type, suggested_fix = self._determine_fix(error_message, severity)
        
        return TestFailure(
            scenario_name=scenario_name,
            workflow=workflow,
            error_message=error_message,
            severity=severity,
            console_logs=console_logs,
            suggested_fix=suggested_fix,
            fix_type=fix_type
        )
    
    def _detect_severity(self, error_message: str, console_logs: list[str]) -> FailureSeverity:
        """Détecte la sévérité de l'erreur."""
        all_text = error_message + " " + " ".join(console_logs)
        
        # Erreurs critiques JS
        for pattern in self.CRITICAL_PATTERNS:
            if re.search(pattern, all_text, re.IGNORECASE):
                return FailureSeverity.CRITICAL
        
        # Erreurs structurelles
        for pattern in self.STRUCTURAL_PATTERNS:
            if re.search(pattern, error_message, re.IGNORECASE):
                return FailureSeverity.STRUCTURAL
        
        # Erreurs fonctionnelles (logs attendus manquants)
        if "Console contient" in error_message and "non trouvé" in error_message:
            return FailureSeverity.FUNCTIONAL
            
        return FailureSeverity.MINOR
    
    def _determine_fix(self, error_message: str, severity: FailureSeverity) -> tuple[str, Optional[str]]:
        """Détermine le type de correction et suggère une solution."""
        
        if severity == FailureSeverity.CRITICAL:
            # Extraire la variable non définie
            match = re.search(r"(\w+) is not defined", error_message)
            if match:
                var_name = match.group(1)
                return "code_patch", f"Ajouter la déclaration de la variable '{var_name}' dans main.js"
            return "code_patch", "Corriger l'erreur JavaScript critique"
        
        elif severity == FailureSeverity.STRUCTURAL:
            if "fonction execute manquante" in error_message:
                return "regenerate", "Régénérer le workflow avec la fonction execute"
            elif "Fichier manquant" in error_message:
                return "regenerate", "Régénérer les fichiers manquants"
            return "scenario_update", "Mettre à jour les attentes du scénario"
        
        elif severity == FailureSeverity.FUNCTIONAL:
            return "scenario_update", "Ajuster le scénario ou corriger la logique métier"
        
        return "code_patch", "Correction mineure"


class CodePatcher:
    """Applique des corrections directes sur le code source."""
    
    def __init__(self, cell_path: Path):
        self.cell_path = cell_path
        self.patch_report = []
    
    def apply_fix(self, failure: TestFailure) -> bool:
        """Applique une correction automatique si possible."""
        
        if failure.fix_type != "code_patch":
            return False
        
        if failure.severity == FailureSeverity.CRITICAL:
            return self._fix_critical_error(failure)
        elif failure.severity == FailureSeverity.MINOR:
            return self._fix_minor_error(failure)
        
        return False
    
    def _fix_critical_error(self, failure: TestFailure) -> bool:
        """Corrige une erreur JS critique (variable non définie)."""
        # Chercher dans main.js
        main_js = self.cell_path / "main.js"
        if not main_js.exists():
            return False
        
        content = main_js.read_text(encoding="utf-8")
        
        # Extraire la variable non définie
        match = re.search(r"(\w+) is not defined", failure.error_message)
        if not match:
            return False
        
        var_name = match.group(1)
        
        # Chercher où la variable devrait être définie
        # Pattern: trouver Alpine.data et ajouter la variable si manquante
        if f"{var_name}:" not in content and f"{var_name} =" not in content:
            # Ajouter la variable dans le data Alpine avec une valeur par défaut
            pattern = r'(Alpine\.data\("[^"]+",\s*\(\) => \({)'
            if re.search(pattern, content):
                new_content = re.sub(
                    pattern,
                    rf'\1\n            {var_name}: null,',
                    content,
                    count=1
                )
                main_js.write_text(new_content, encoding="utf-8")
                self.patch_report.append(f"✓ Ajout de '{var_name}: null' dans Alpine.data")
                return True
        
        return False
    
    def _fix_minor_error(self, failure: TestFailure) -> bool:
        """Corrige une erreur mineure."""
        # Exemple: sélecteur mal formatté, petit typo, etc.
        return False  # À implémenter selon les cas rencontrés
    
    def get_report(self) -> list[str]:
        """Retourne le rapport des corrections appliquées."""
        return self.patch_report


class ScenarioUpdater:
    """Met à jour le fichier scenario-test.md avec les corrections."""
    
    def __init__(self, cell_path: Path):
        self.cell_path = cell_path
        self.scenario_file = cell_path / ".specs" / "scenario-test.md"
    
    def update_scenario(self, failure: TestFailure, test_result: dict) -> bool:
        """Met à jour le scénario avec les informations de l'échec."""
        
        if failure.fix_type != "scenario_update":
            return False
        
        if not self.scenario_file.exists():
            return False
        
        content = self.scenario_file.read_text(encoding="utf-8")
        
        # Trouver le scénario concerné
        scenario_pattern = rf'## Scénario \d+: {re.escape(failure.scenario_name)}.*?(?=## Scénario |\Z)'
        scenario_match = re.search(scenario_pattern, content, re.DOTALL)
        
        if not scenario_match:
            return False
        
        # Ajouter une section "Corrections appliquées"
        scenario_content = scenario_match.group(0)
        
        # Vérifier si section corrections existe déjà
        if "### Corrections appliquées" not in scenario_content:
            # Ajouter la section avant la fin du scénario
            corrections_section = f"""
### Corrections appliquées
**Date**: {__import__('datetime').datetime.now().strftime("%Y-%m-%d %H:%M")}
**Problème**: {failure.error_message}
**Logs console observés**:
```
{"\\n".join(failure.console_logs[:10])}
```
**Ajustements nécessaires**: {failure.suggested_fix or "À définir"}

"""
            # Insérer avant les --- ou à la fin
            if "---" in scenario_content:
                parts = scenario_content.rsplit("---", 1)
                new_scenario = parts[0] + corrections_section + "---" + parts[1]
            else:
                new_scenario = scenario_content + corrections_section
            
            content = content.replace(scenario_content, new_scenario)
            self.scenario_file.write_text(content, encoding="utf-8")
            return True
        
        return False
    
    def add_new_scenario(self, scenario_data: dict) -> bool:
        """Ajoute un nouveau scénario basé sur l'analyse des échecs."""
        
        if not self.scenario_file.exists():
            return False
        
        content = self.scenario_file.read_text(encoding="utf-8")
        
        # Trouver le dernier numéro de scénario
        scenarios = re.findall(r'## Scénario (\d+):', content)
        next_num = max([int(s) for s in scenarios]) + 1 if scenarios else 1
        
        new_scenario = f"""
## Scénario {next_num}: {scenario_data.get('name', 'Nouveau scénario')}
**Workflow**: {scenario_data.get('workflow', 'unknown')}
**Description**: {scenario_data.get('description', 'Scénario ajouté suite à un échec')}
**Priorité**: Haute

### Préconditions (Mock Data)
{scenario_data.get('preconditions', '- À définir')}

### Actions
{scenario_data.get('actions', '1. À définir')}

### Vérifications Attendues
{scenario_data.get('verifications', '- À définir')}

"""
        
        content = content + new_scenario
        self.scenario_file.write_text(content, encoding="utf-8")
        return True


class FeedbackLoopManager:
    """Orchestre la boucle de feedback des tests."""
    
    def __init__(self, cell_path: Path, cell_name: str):
        self.cell_path = cell_path
        self.cell_name = cell_name
        self.analyzer = FailureAnalyzer()
        self.patcher = CodePatcher(cell_path)
        self.updater = ScenarioUpdater(cell_path)
        self.failures: list[TestFailure] = []
    
    def process_results(self, test_results: dict) -> dict:
        """
        Traite les résultats des tests et applique les corrections.
        
        Returns:
            {
                'action': 'patched' | 'updated_scenario' | 'needs_regeneration' | 'failed',
                'details': str,
                'regenerate': bool,
                'failures': list[TestFailure]
            }
        """
        
        results = test_results.get('scenario_tests', {})
        scenarios_results = results.get('results', [])
        
        if not scenarios_results:
            return {'action': 'success', 'details': 'Aucun échec', 'regenerate': False}
        
        # Analyser chaque échec
        for result in scenarios_results:
            if result.get('passed'):
                continue
            
            scenario_name = result.get('scenario', 'Unknown')
            workflow = result.get('workflow', 'Unknown')
            
            # Analyser chaque vérification échouée
            for verif in result.get('verifications', []):
                if not verif.get('passed'):
                    error_msg = f"{verif.get('check')}: {verif.get('expected', verif.get('forbidden', 'N/A'))}"
                    console_logs = result.get('console_logs', [])
                    
                    failure = self.analyzer.analyze(
                        scenario_name, workflow, error_msg, console_logs
                    )
                    self.failures.append(failure)
        
        if not self.failures:
            return {'action': 'success', 'details': 'Tous les tests passés', 'regenerate': False}
        
        # Afficher l'analyse
        console.print(f"\n[yellow]📊 Analyse des {len(self.failures)} échec(s):[/yellow]")
        
        critical_count = sum(1 for f in self.failures if f.severity == FailureSeverity.CRITICAL)
        structural_count = sum(1 for f in self.failures if f.severity == FailureSeverity.STRUCTURAL)
        functional_count = sum(1 for f in self.failures if f.severity == FailureSeverity.FUNCTIONAL)
        
        console.print(f"  - Critiques (correction code): {critical_count}")
        console.print(f"  - Structurelles (régénération): {structural_count}")
        console.print(f"  - Fonctionnelles (ajustement): {functional_count}")
        
        # Priorité: CRITICAL > STRUCTURAL > FUNCTIONAL > MINOR
        has_critical = any(f.severity == FailureSeverity.CRITICAL for f in self.failures)
        has_structural = any(f.severity == FailureSeverity.STRUCTURAL for f in self.failures)
        
        if has_critical:
            # Essayer de patcher le code directement
            console.print(f"\n[magenta]🔧 Tentative de correction automatique...")
            patched = 0
            for failure in self.failures:
                if failure.severity == FailureSeverity.CRITICAL:
                    if self.patcher.apply_fix(failure):
                        patched += 1
            
            patch_report = self.patcher.get_report()
            if patch_report:
                console.print(f"[green]  ✓ {patched} correction(s) appliquée(s):")
                for report in patch_report:
                    console.print(f"    - {report}")
                return {
                    'action': 'patched',
                    'details': f"{patched} corrections automatiques appliquées",
                    'regenerate': False,
                    'failures': [f for f in self.failures if f.severity != FailureSeverity.CRITICAL or not f.suggested_fix]
                }
            else:
                console.print("[yellow]  ⚠ Corrections automatiques impossibles")
        
        if has_structural:
            # Mettre à jour le scénario et demander régénération
            console.print(f"\n[magenta]📝 Mise à jour du scénario pour régénération...")
            for failure in self.failures:
                if failure.severity == FailureSeverity.STRUCTURAL:
                    self.updater.update_scenario(failure, test_results)
            
            return {
                'action': 'needs_regeneration',
                'details': "Problèmes structurels détectés, régénération nécessaire",
                'regenerate': True,
                'failures': self.failures
            }
        
        # Erreurs fonctionnelles: mettre à jour le scénario
        console.print(f"\n[magenta]📝 Mise à jour des attentes du scénario...")
        for failure in self.failures:
            if failure.severity == FailureSeverity.FUNCTIONAL:
                self.updater.update_scenario(failure, test_results)
        
        return {
            'action': 'updated_scenario',
            'details': "Scénario mis à jour avec les écarts observés",
            'regenerate': False,
            'failures': self.failures
        }
