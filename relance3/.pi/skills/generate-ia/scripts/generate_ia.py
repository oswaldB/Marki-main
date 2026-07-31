#!/usr/bin/env python3
"""Generate IA - Génère le code final via pi -p."""

import subprocess
import sys
from pathlib import Path


def generate_ia(cell_path: Path) -> tuple[bool, list[str]]:
    """Génère le code final via IA pour chaque fichier."""
    cell_path = Path(cell_path)
    
    print("🤖 Génération IA avec pi -p...")
    
    # Trouver les fichiers à générer
    files = []
    for f in cell_path.iterdir():
        if f.is_file() and f.suffix in ['.html', '.js']:
            files.append(f.name)
    
    workflows_dir = cell_path / "workflows"
    if workflows_dir.exists():
        for f in workflows_dir.glob("*.js"):
            files.append(f"workflows/{f.name}")
    
    if not files:
        print("⚠️ Aucun fichier à générer")
        return True, []
    
    print(f"  {len(files)} fichiers à générer:")
    for f in files:
        print(f"    - {f}")
    
    generated = []
    errors = []
    
    logs_dir = cell_path / "drdice-logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    
    for idx, file_rel in enumerate(files, 1):
        print(f"\n  → Traitement fichier {idx}/{len(files)}: {file_rel}")
        
        file_path = cell_path / file_rel
        abs_path = file_path.absolute()
        
        prompt = f"Corrige ce fichier selon les commentaires IA : {abs_path}"
        
        try:
            result = subprocess.run(
                ["pi", "-p", prompt],
                capture_output=True,
                text=True,
                timeout=600
            )
            
            if result.returncode != 0:
                print(f"    ✗ Échec")
                errors.append(f"{file_rel}: {result.stderr[:200]}")
                continue
            
            # Sauvegarder log
            log_file = logs_dir / f"{file_rel.replace('/', '_')}.log"
            log_file.write_text(result.stdout, encoding="utf-8")
            
            print(f"    ✓ Fichier {file_rel} traité")
            generated.append(file_rel)
            
        except Exception as e:
            print(f"    ✗ Erreur: {e}")
            errors.append(f"{file_rel}: {e}")
    
    print()
    if generated:
        print(f"✅ {len(generated)} fichiers générés avec succès")
    
    if errors:
        print(f"❌ {len(errors)} erreurs")
    
    return len(errors) == 0, generated


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: generate_ia.py <cell-path>")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    
    success, files = generate_ia(cell_path)
    
    if success:
        for f in files:
            print(f"  - {f}")
        sys.exit(0)
    else:
        sys.exit(1)
