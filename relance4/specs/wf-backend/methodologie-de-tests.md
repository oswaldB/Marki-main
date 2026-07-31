# Méthodologie de Tests - Workflows Backend

## Principe

Tests sans installation, basés uniquement sur :
- **Lecture de fichiers** (specs, code, données)
- **Lecture de logs** (historique d'exécution)
- **Validation de scénarios** (vérification de cas passés)

## Outils Disponibles

```bash
# Lecture
 cat, head, tail, less
 grep, rg (ripgrep)
 find, ls

# Analyse
 wc, sort, uniq
 jq (si présent, sinon grep/sed)
 diff

# Validation
 md5sum, stat
```

---

## 1. Tests Structurels (Static Analysis)

### 1.1 Vérification Fichiers Workflow

**Objectif** : S'assurer que chaque workflow a sa structure complète.

```bash
# Liste tous les workflows documentés
ls specs/workflows/backend/*.md | grep -v TODO | grep -v methodologie

# Vérifier que chaque workflow a son dossier backend correspondant
for workflow in $(ls specs/workflows/backend/*.md | xargs basename -s .md | grep -v TODO | grep -v methodologie); do
  if [ -d "backend/$workflow" ]; then
    echo "✅ $workflow - dossier présent"
  else
    echo "❌ $workflow - dossier MANQUANT"
  fi
done
```

### 1.2 Vérification Structure Minimale

```bash
# Vérifier que chaque workflow a index.js et specs/
check_workflow_structure() {
  local workflow=$1
  local base="backend/$workflow"
  
  echo "=== $workflow ==="
  
  # Point d'entrée
  if [ -f "$base/index.js" ]; then
    echo "✅ index.js présent"
    # Compter les lignes de code (hors commentaires/blocs vides)
    local loc=$(grep -v "^\s*//\|^\s*/\*\|^\s*\*\|^\s*$" "$base/index.js" | wc -l)
    echo "   📊 $loc lignes de code"
  else
    echo "❌ index.js MANQUANT"
  fi
  
  # Documentation
  if [ -f "$base/specs/spec.md" ]; then
    echo "✅ specs/spec.md présent"
  else
    echo "⚠️  specs/spec.md absent (optionnel)"
  fi
  
  # Logs
  if [ -d "$base/logs" ]; then
    local log_count=$(ls "$base/logs" 2>/dev/null | wc -l)
    echo "📁 logs/ présent ($log_count fichiers)"
  fi
}

# Usage : check_workflow_structure auth-login
```

### 1.3 Vérification Dépendances

```bash
# Vérifier que les imports/require sont résolvables
grep_workflow_imports() {
  local workflow=$1
  local file="backend/$workflow/index.js"
  
  echo "=== Imports dans $workflow ==="
  grep -E "^\s*(const|let|var)\s+.*\s*=\s*require\(" "$file" 2>/dev/null | head -20
}
```

---

## 2. Tests par Scénarios (Scenario-Based Testing)

### 2.1 Définition d'un Scénario de Test

Un scénario est un cas d'usage documenté avec :
- **Input** : données d'entrée (fichiers YAML, params)
- **Action** : exécution du workflow
- **Output attendu** : fichiers/logs résultats
- **Validation** : assertions vérifiables par lecture de fichiers

### 2.2 Template de Scénario

```markdown
## Scénario : [Nom du cas]

### Préconditions
- Fichier `/backend/data/contacts/cont_test.yml` existe
- Fichier `/backend/data/impayes/imp_test.yml` existe
- Log précédent vide ou archivé

### Actions
1. Exécuter workflow : `node backend/[workflow]/index.js`
2. Attendre fin d'exécution

### Vérifications Post-Exécution

```bash
# 1. Vérifier log créé
ls -la backend/[workflow]/logs/*.log | tail -1

# 2. Vérifier contenu log
grep "SUCCESS\|ERROR\|WARN" backend/[workflow]/logs/[dernier-log]

# 3. Vérifier données modifiées
cat backend/data/[collection]/[id].yml
```

### Résultat Attendu
- Log contient "✅ TERMINÉ" ou statut équivalent
- Fichier YAML modifié avec champ `updated_at` récent
- Pas d'erreurs dans les logs
```

### 2.3 Catalogue de Scénarios par Workflow

#### Scénario A : auth-login (Succès)

```bash
# Préconditions
ls backend/data/users/*.yml | head -5

# Exécution (simulée via logs existants ou manuelle)
# Vérification post-exécution :

# 1. Vérifier log
tail -20 backend/auth-login/logs/*.log 2>/dev/null | grep -E "(Login successful|error)"

# 2. Vérifier last_login mis à jour dans le fichier user
find backend/data/users -name "*.yml" -exec grep -l "last_login" {} \; | head -1 | xargs cat
```

#### Scénario B : contacts-blacklist (Blacklist + Annulation relances)

```bash
# Préconditions : trouver un contact non blacklisté
find backend/data/contacts -name "*.yml" -exec grep -L "is_blacklisted: true" {} \; | head -1

# Exécution du blacklist
# node backend/contacts-blacklist/index.js --id=cont_xxx --motif="Test"

# Vérifications
SCENARIO_CONTACT_ID="cont_xxx"

# 1. Vérifier contact blacklisté
grep "is_blacklisted: true" backend/data/contacts/${SCENARIO_CONTACT_ID}.yml

# 2. Vérifier relances annulées
grep -r "annulee" backend/data/relances/*.yml | grep $SCENARIO_CONTACT_ID

# 3. Vérifier log
grep "blacklisted\|annulée" backend/contacts-blacklist/logs/*.log | tail -5
```

#### Scénario C : import-invoice (Import nouvelle facture)

```bash
# Préconditions : vérifier dernière exécution
ls -lt backend/import-invoice/logs/*.log | head -1

# Vérifier qu'il y a des pièces importées
grep "pièces récupérées\|impayés créés" backend/import-invoice/logs/*.log | tail -1

# Vérifier présence nouveaux impayés
tail -1 backend/data/impayes/*.yml 2>/dev/null | head -20
```

#### Scénario D : generate-relances (Génération automatique)

```bash
# Vérifier relances créées aujourd'hui
find backend/data/relances -name "*.yml" -newer $(date -d '1 day ago' +%Y-%m-%d) 2>/dev/null | wc -l

# Vérifier logs de génération
grep "relance générée\|Created relance" backend/generate-relances/logs/*.log | tail -5

# Vérifier statut des relances créées
grep -l "statut: pret pour envoi" backend/data/relances/*.yml | wc -l
```

---

## 3. Tests de Régression (Log Analysis)

### 3.1 Analyse des Logs Historiques

```bash
# Script d'analyse de régression
analyse_logs() {
  local workflow=$1
  local log_dir="backend/$workflow/logs"
  
  echo "=== Analyse logs $workflow ==="
  
  # 1. Nombre d'exécutions récentes (7 jours)
  find $log_dir -name "*.log" -mtime -7 2>/dev/null | wc -l
  
  # 2. Taux d'erreur
  local total_logs=$(find $log_dir -name "*.log" -mtime -7 2>/dev/null | wc -l)
  local error_logs=$(grep -l "ERROR\|error\|Error" $log_dir/*.log 2>/dev/null | wc -l)
  
  if [ $total_logs -gt 0 ]; then
    echo "Taux d'erreur: $error_logs / $total_logs"
  fi
  
  # 3. Dernière exécution réussie
  grep -l "SUCCESS\|terminé\|completed" $log_dir/*.log 2>/dev/null | sort | tail -1
  
  # 4. Erreurs récurrentes
  grep "ERROR" $log_dir/*.log 2>/dev/null | cut -d: -f3- | sort | uniq -c | sort -rn | head -5
}
```

### 3.2 Validation des Checkpoints

```bash
# Vérifier que tous les checkpoints documentés sont dans les logs
check_checkpoints() {
  local workflow=$1
  local spec_file="specs/workflows/backend/$workflow.md"
  local log_dir="backend/$workflow/logs"
  
  # Extraire checkpoints du spec
  local checkpoints=$(grep "^| \`.*\` |" $spec_file 2>/dev/null | grep -i checkpoint | awk -F'|' '{print $2}' | tr -d ' \`')
  
  echo "Checkpoints attendus:"
  echo "$checkpoints"
  
  # Vérifier présence dans derniers logs
  local last_log=$(ls -t $log_dir/*.log 2>/dev/null | head -1)
  if [ -f "$last_log" ]; then
    echo "Présence dans $last_log:"
    for cp in $checkpoints; do
      if grep -q "$cp" "$last_log"; then
        echo "  ✅ $cp"
      else
        echo "  ❌ $cp - NON TROUVÉ"
      fi
    done
  fi
}
```

---

## 4. Tests de Données (Data Validation)

### 4.1 Vérification Cohérence Données

```bash
# Vérifier intégrité référentielle
check_integrity() {
  echo "=== Vérification intégrité données ==="
  
  # 1. Relances avec contact_id inexistant
  for relance in backend/data/relances/*.yml; do
    local contact_id=$(grep "contact_id:" "$relance" | head -1 | awk '{print $2}')
    if [ ! -f "backend/data/contacts/${contact_id}.yml" ]; then
      echo "❌ $(basename $relance) : contact_id $contact_id INEXISTANT"
    fi
  done
  
  # 2. Impayés avec payeur_id inexistant
  for impaye in backend/data/impayes/*.yml; do
    local payeur_id=$(grep "payeur_id:" "$impaye" | head -1 | awk '{print $2}')
    if [ -n "$payeur_id" ] && [ ! -f "backend/data/contacts/${payeur_id}.yml" ]; then
      echo "❌ $(basename $impaye) : payeur_id $payeur_id INEXISTANT"
    fi
  done
  
  # 3. Relances avec impaye_ids inexistants
  for relance in backend/data/relances/*.yml; do
    local impaye_ids=$(grep "impaye_ids:" -A5 "$relance" | grep "^- " | awk '{print $2}')
    for id in $impaye_ids; do
      if [ ! -f "backend/data/impayes/${id}.yml" ]; then
        echo "❌ $(basename $relance) : impaye_id $id INEXISTANT"
      fi
    done
  done
}
```

### 4.2 Validation Format YAML

```bash
# Vérifier que tous les YAML sont valides (lecture basique)
validate_yaml() {
  local collection=$1
  local errors=0
  
  for file in backend/data/$collection/*.yml; do
    # Test simple : peut-on lire le fichier avec head?
    if ! head -1 "$file" > /dev/null 2>&1; then
      echo "❌ $file - illisible"
      ((errors++))
    fi
    
    # Vérifier présence champ 'id'
    if ! grep -q "^id:" "$file"; then
      echo "❌ $file - champ 'id' manquant"
      ((errors++))
    fi
  done
  
  echo "Total erreurs: $errors"
}
```

---

## 5. Tests de Configuration

### 5.1 Vérification Variables d'Environnement

```bash
# Liste des variables attendues par workflow
check_env_vars() {
  echo "=== Variables d'environnement requises ==="
  
  # Chercher tous les process.env dans les workflows
  grep -r "process\.env\." backend/*/index.js 2>/dev/null | \
    grep -o "process\.env\.[A-Z_]*" | \
    sort | uniq | \
    sed 's/process\.env\.//'
}

# Vérifier présence dans .env
check_env_file() {
  while read var; do
    if grep -q "^${var}=" .env 2>/dev/null; then
      echo "✅ $var"
    else
      echo "❌ $var - MANQUANT dans .env"
    fi
  done
}

# Usage : check_env_vars | check_env_file
```

### 5.2 Vérification Répertoires

```bash
# Script de validation structure
check_directories() {
  local required_dirs=(
    "backend/data/contacts"
    "backend/data/impayes"
    "backend/data/relances"
    "backend/data/sequences"
    "backend/data/smtp_profiles"
    "backend/logs"
  )
  
  for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
      local count=$(ls "$dir" | wc -l)
      echo "✅ $dir ($count éléments)"
    else
      echo "❌ $dir - MANQUANT"
    fi
  done
}
```

---

## 6. Automatisation

### 6.1 Script Global de Test

```bash
#!/bin/bash
# test-all-workflows.sh

WORKFLOWS=$(ls specs/workflows/backend/*.md | xargs basename -s .md | grep -v TODO | grep -v methodologie)
REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).txt"

echo "RAPPORT DE TEST - $(date)" > $REPORT_FILE
echo "================================" >> $REPORT_FILE

for workflow in $WORKFLOWS; do
  echo "" >> $REPORT_FILE
  echo "=== $workflow ===" >> $REPORT_FILE
  
  # Test 1 : Structure
  if [ -f "backend/$workflow/index.js" ]; then
    echo "✅ Structure OK" >> $REPORT_FILE
    
    # Compter lignes
    loc=$(wc -l < "backend/$workflow/index.js")
    echo "   Lignes: $loc" >> $REPORT_FILE
  else
    echo "❌ index.js manquant" >> $REPORT_FILE
  fi
  
  # Test 2 : Logs récents
  log_count=$(find "backend/$workflow/logs" -name "*.log" -mtime -7 2>/dev/null | wc -l)
  echo "   Logs récents (7j): $log_count" >> $REPORT_FILE
  
  # Test 3 : Erreurs dans logs
  if [ $log_count -gt 0 ]; then
    error_count=$(grep -l "ERROR" backend/$workflow/logs/*.log 2>/dev/null | wc -l)
    echo "   Logs avec erreurs: $error_count" >> $REPORT_FILE
  fi
done

echo "" >> $REPORT_FILE
echo "Rapport généré: $REPORT_FILE"
cat $REPORT_FILE
```

### 6.2 Checklist Manuelle Rapide

Pour chaque workflow, vérifier :

- [ ] `backend/[workflow]/index.js` existe et est lisible
- [ ] `backend/[workflow]/logs/` contient des logs récents
- [ ] Les logs récents ne contiennent pas d'erreurs critiques
- [ ] Les fichiers de données modifiés ont des timestamps récents
- [ ] Le workflow est documenté dans `specs/workflows/backend/[workflow].md`

### 6.3 Commande Rapide

```bash
# Vérifier santé globale des workflows
health_check() {
  echo "=== SANTÉ WORKFLOWS ==="
  
  # Workflows sans logs récents (30 jours)
  for dir in backend/*/; do
    local name=$(basename "$dir")
    if [ -d "$dir/logs" ]; then
      local recent=$(find "$dir/logs" -name "*.log" -mtime -30 2>/dev/null | wc -l)
      if [ $recent -eq 0 ]; then
        echo "⚠️  $name : aucun log récent"
      fi
    fi
  done
  
  # Workflows avec erreurs récentes
  grep -l "ERROR" backend/*/logs/*.log 2>/dev/null | cut -d/ -f2 | sort | uniq -c | sort -rn | head -5
}
```

---

## 7. Documentation des Résultats

### Format de Rapport

```markdown
# Rapport de Test - [Date]

## Résumé
- Workflows testés: X
- Succès: X
- Avertissements: X
- Erreurs: X

## Détail par Workflow

### [Nom Workflow]
**Statut**: ✅/⚠️/❌

**Structure:**
- index.js: [OK/Manquant]
- specs/spec.md: [OK/Manquant]

**Logs récents:**
- Dernier log: [date]
- Erreurs détectées: [nombre]
- Checkpoints validés: [X/Y]

**Données:**
- Fichiers créés/modifiés: [liste]
- Intégrité: [OK/Erreurs]

**Scénarios testés:**
- [ ] Scénario A
- [ ] Scénario B
```

---

## Annexes

### A. Commandes Utiles

```bash
# Voir les derniers logs modifiés
find backend -name "*.log" -mtime -1 -ls

# Chercher une erreur spécifique dans tous les logs
grep -r "Erreur spécifique" backend/*/logs/

# Lister les workflows les plus actifs (par nombre de logs)
for dir in backend/*/; do 
  echo "$(ls $dir/logs 2>/dev/null | wc -l) $(basename $dir)"
done | sort -rn | head -10

# Vérifier taille des logs (alerte si > 10MB)
find backend -name "*.log" -size +10M -ls
```

### B. Fichiers de Référence

| Fichier | Description |
|---------|-------------|
| `specs/workflows/backend/[workflow].md` | Spec fonctionnelle |
| `backend/[workflow]/index.js` | Code source |
| `backend/[workflow]/logs/*.log` | Logs d'exécution |
| `backend/data/[collection]/*.yml` | Données |

### C. Exit Codes

```bash
0  # Tous les tests passés
1  # Erreurs structurelles
2  # Erreurs dans logs
3  # Incohérences données
```
