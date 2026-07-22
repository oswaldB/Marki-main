#!/bin/bash

# Script pour générer les workflows backend à partir des workflows frontend
# Pour chaque workflow frontend, on identifie le besoin backend puis on génère la spec
# Usage: ./generate-backend-from-frontend.sh [nom-ecran]

set -e

SPECS_DIR="/home/ubuntu/marki/relance2/specs"
SCHEMA_FILE="$SPECS_DIR/schema.sql"
ECRANS_DIR="$SPECS_DIR/_app/ecrans"

if [[ ! -f "$SCHEMA_FILE" ]]; then
    echo "❌ Schema file not found: $SCHEMA_FILE"
    exit 1
fi

# Lire le schéma SQL
SCHEMA_CONTENT=$(cat "$SCHEMA_FILE")

# Fonction pour traiter un workflow frontend
process_frontend_workflow() {
    local FRONTEND_WF="$1"
    local ECRAN_NAME="$2"
    local WF_NAME=$(basename "$FRONTEND_WF" .md)
    local ECRAN_DIR="$ECRANS_DIR/$ECRAN_NAME"
    local BACKEND_DIR="$ECRAN_DIR/backend/workflows"
    local NEEDS_DIR="$BACKEND_DIR/.needs"
    
    echo ""
    echo "=========================================="
    echo "📝 Frontend Workflow: $WF_NAME"
    echo "📱 Écran: $ECRAN_NAME"
    echo "📁 Dossier: $ECRAN_DIR"
    echo "=========================================="
    
    # Créer les répertoires
    mkdir -p "$BACKEND_DIR"
    mkdir -p "$NEEDS_DIR"
    
    # Lire le contenu du workflow frontend
    local FRONTEND_CONTENT=$(cat "$FRONTEND_WF")
    
    # Vérifier si le fichier de besoin existe déjà
    local NEEDS_FILE="$NEEDS_DIR/${WF_NAME}-needs.md"
    local NEEDS_ALREADY_EXISTS=false
    if [[ -f "$NEEDS_FILE" ]]; then
        echo "   ⏭️  Fichier de besoin déjà existant: $NEEDS_FILE"
        NEEDS_ALREADY_EXISTS=true
    else
        echo ""
        echo "🔍 Étape 1: Analyse du besoin backend..."
        
        # Prompt pour identifier le besoin backend
        local NEEDS_PROMPT=$(cat <<NEEDS_EOF
Tu es un architecte backend qui analyse les besoins API pour une application Python/FastAPI avec SQLite.

RÈGLE CRITIQUE - À LIRE ATTENTIVEMENT:
Dans cette architecture, une "route API" est appelée un "workflow backend".

Tu dois UNIQUEMENT définir des workflows backend (routes API) qui nécessitent un accès à la base de données SQLite.

NE JAMAIS créer de workflow backend pour:
- Actions purement frontend (localStorage, Alpine.js, UI state)
- Navigation/routing côté client
- Manipulations de DOM ou affichage
- États temporaires de l'interface
- Gestion de modales/toggles sans persistence serveur

Si l'action est purement frontend → Réponds "AUCUN" et explique pourquoi.

CONTEXTE:
- Écran: "$ECRAN_NAME"
- Workflow Frontend analysé: "$WF_NAME"
- Schéma SQL:
\`\`\`sql
$SCHEMA_CONTENT
\`\`\`

WORKFLOW FRONTEND:
\`\`\`markdown
$FRONTEND_CONTENT
\`\`\`

TÂCHE:
Identifie toutes les routes API (workflows backend) nécessaires pour que cet écran fonctionne.

Une route API (workflow backend) est nécessaire UNIQUEMENT si elle doit:
1. Lire/écrire dans la base SQLite
2. Exécuter une logique métier côté serveur
3. Retourner des données persistantes depuis la base

FORMAT DE RÉPONSE:
\`\`\`markdown
## Besoin Backend pour "$WF_NAME"

### Route API (Workflow Backend) identifiée
- **Nom fichier suggéré:** \`[nom-kebab-case].md\` ou \`AUCUN - PUR FRONTEND\`
- **Méthode HTTP:** GET|POST|PUT|DELETE ou N/A
- **Endpoint:** \`/api/[chemin]\` ou N/A
- **Tables concernées:** table1, table2 ou Aucune

### Description
[Description détaillée de l'action backend OU explication pourquoi c'est du pur frontend]

### Paramètres d'entrée
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| param1 | string | oui | ... |

### Réponse attendue (JSON)
\`\`\`json
{
  "structure": "attendue"
}
\`\`\`

### Cas particuliers
- [Liste des cas d'erreur ou cas particuliers]

### Analyse
- **Nécessite workflow backend (route API):** OUI / NON
- **Justification:** [Pourquoi cette route API est nécessaire ou pourquoi c'est du pur frontend]
\`\`\`

IMPORTANT - CRITIQUE:
- Tu dois UNIQUEMENT retourner l'analyse markdown dans ta réponse
- NE CREE AUCUN FICHIER
- NE CREE AUCUN DOSSIER
- Si le workflow frontend manipule uniquement localStorage, affiche/cache des éléments DOM, ou gère de l'état UI local → Réponds "AUCUN - PUR FRONTEND" et n'identifie AUCUNE route API (workflow backend).
NEEDS_EOF
)
        
        # Appeler pi pour identifier le besoin (dans le dossier de l'écran)
        echo "   🤖 Demande à pi d'analyser le besoin (dans $ECRAN_DIR)..."
        (cd "$ECRAN_DIR" && pi -p "$NEEDS_PROMPT") > "$NEEDS_FILE" 2>&1 || {
            echo "   ⚠️  Erreur lors de l'analyse du besoin"
            rm -f "$NEEDS_FILE"
            return 1
        }
        
        if [[ -s "$NEEDS_FILE" ]]; then
            echo "   ✅ Besoin identifié: $NEEDS_FILE"
        else
            echo "   ❌ Fichier de besoin vide"
            rm -f "$NEEDS_FILE"
            return 1
        fi
    fi
    
    # Extraire le nom du fichier backend suggéré
    local BACKEND_FILENAME=$(grep -E "^\- \*\*Nom fichier suggéré:\*\*|^\*\*Nom fichier suggéré:\*\*" "$NEEDS_FILE" | head -1 | sed 's/.*`\([^`]*\)`.*/\1/' | sed 's/.*://g' | tr -d ' ')
    
    if [[ -z "$BACKEND_FILENAME" ]]; then
        # Essayer un autre pattern
        BACKEND_FILENAME=$(grep -E "^- \*\*Fichier:|\*\*Fichier:" "$NEEDS_FILE" | head -1 | sed 's/.*`\([^`]*\)`.*/\1/' | tr -d ' ')
    fi
    
    # Si toujours pas trouvé, générer un nom par défaut
    if [[ -z "$BACKEND_FILENAME" ]]; then
        BACKEND_FILENAME="${WF_NAME}-backend.md"
    fi
    
    # Vérifier si c'est un workflow purement frontend (pas de backend nécessaire)
    if [[ "$BACKEND_FILENAME" =~ (AUCUN|PUR.*FRONTEND|FRONTEND|N/A) ]]; then
        echo ""
        echo "⏭️  Workflow purement frontend - pas de backend nécessaire"
        rm -f "$NEEDS_FILE"
        echo "   🗑️  Fichier de besoin supprimé"
        return 0
    fi
    
    local BACKEND_FILE="$BACKEND_DIR/$BACKEND_FILENAME"
    
    # Vérifier si le workflow backend existe déjà
    if [[ -f "$BACKEND_FILE" ]]; then
        echo "   ⏭️  Workflow backend déjà existant: $BACKEND_FILENAME"
        rm -f "$NEEDS_FILE"
        echo "   🗑️  Fichier de besoin supprimé"
        return 0
    fi
    
    echo ""
    echo "✍️  Étape 2: Rédaction de la spec backend..."
    echo "   📝 Fichier cible: $BACKEND_FILENAME"
    
    # Lire le contenu du fichier de besoin
    local NEEDS_CONTENT=$(cat "$NEEDS_FILE")
    
    # Prompt pour rédiger la spec backend
    local SPEC_PROMPT=$(cat <<SPEC_EOF
Tu es un développeur backend Python/FastAPI.

CONTEXTE:
- Écran: "$ECRAN_NAME"
- Workflow Frontend: "$WF_NAME"
- Chemin BDD: app/data/marki.db
- Schéma SQL:
\`\`\`sql
$SCHEMA_CONTENT
\`\`\`

ANALYSE DU BESOIN:
\`\`\`markdown
$NEEDS_CONTENT
\`\`\`

TÂCHE:
Rédige la spécification complète du workflow backend: $BACKEND_FILENAME

Le fichier doit contenir:
1. **Titre** clair du workflow
2. **Objectifs** - Que fait ce workflow ?
3. **Route API** - Méthode + endpoint FastAPI
4. **Requêtes SQL** - Toutes les requêtes détaillées avec les champs exacts du schéma
5. **Modèles Pydantic** - Pour validation des requêtes/réponses
6. **Gestion des erreurs** - Codes HTTP et messages
7. **Exemples** - Requête et réponse d'exemple

FORMAT: Markdown avec blocs de code Python pour les modèles Pydantic et SQL pour les requêtes.

IMPORTANT - CRITIQUE:
- Tu dois UNIQUEMENT retourner le contenu markdown dans ta réponse
- NE CREE AUCUN FICHIER ADDITIONNEL
- NE CREE AUCUN DOSSIER
- Utilise exactement les noms de tables et colonnes du schéma SQL
- Utilise le chemin de BDD: app/data/marki.db
- Sois précis sur les types de données
SPEC_EOF
)
    
    # Appeler pi pour rédiger la spec (dans le dossier de l'écran)
    echo "   🤖 Génération de la spec via pi (dans $ECRAN_DIR)..."
    (cd "$ECRAN_DIR" && pi -p "$SPEC_PROMPT") > "$BACKEND_FILE" 2>&1 || {
        echo "   ⚠️  Erreur lors de la génération de la spec"
        rm -f "$BACKEND_FILE"
        return 1
    }
    
    if [[ -s "$BACKEND_FILE" ]]; then
        echo "   ✅ Spec backend créée: $BACKEND_FILE"
    else
        echo "   ❌ Fichier de spec vide"
        rm -f "$BACKEND_FILE"
    fi
    
    # Supprimer le fichier de besoin temporaire dans tous les cas
    if [[ -f "$NEEDS_FILE" ]]; then
        rm -f "$NEEDS_FILE"
        echo "   🗑️  Fichier de besoin supprimé: $(basename "$NEEDS_FILE")"
    fi
}

# Script principal
echo "=========================================="
echo "🚀 Génération des workflows backend"
echo "   À partir des workflows frontend"
echo "=========================================="
echo ""

# Si un écran spécifique est passé en argument
if [[ -n "$1" ]]; then
    ECRAN="$1"
    ECRAN_DIR="$ECRANS_DIR/$ECRAN"
    
    if [[ ! -d "$ECRAN_DIR" ]]; then
        echo "❌ Écran '$ECRAN' non trouvé"
        exit 1
    fi
    
    FRONTEND_WF_DIR="$ECRAN_DIR/frontend/workflows"
    
    if [[ ! -d "$FRONTEND_WF_DIR" ]]; then
        echo "❌ Pas de workflows frontend pour l'écran '$ECRAN'"
        exit 1
    fi
    
    echo "📱 Traitement de l'écran: $ECRAN"
    
    for wf in "$FRONTEND_WF_DIR"/*.md; do
        [[ -f "$wf" ]] || continue
        # Ignorer les fichiers cachés et les scénarios
        [[ "$(basename "$wf")" == .* ]] && continue
        [[ "$wf" == *"/scenarios-to-validate/"* ]] && continue
        
        process_frontend_workflow "$wf" "$ECRAN"
    done
    
    # Nettoyer le dossier .needs s'il est vide
    NEEDS_DIR="$ECRAN_DIR/backend/workflows/.needs"
    if [[ -d "$NEEDS_DIR" ]] && [[ -z "$(ls -A "$NEEDS_DIR" 2>/dev/null)" ]]; then
        rmdir "$NEEDS_DIR" 2>/dev/null || true
        echo ""
        echo "🗑️  Dossier .needs vide supprimé"
    fi
else
    # Traiter tous les écrans
    for ecran_dir in "$ECRANS_DIR"/*/; do
        [[ -d "$ecran_dir" ]] || continue
        
        ECRAN_NAME=$(basename "$ecran_dir")
        FRONTEND_WF_DIR="$ecran_dir/frontend/workflows"
        
        if [[ ! -d "$FRONTEND_WF_DIR" ]]; then
            echo "⏭️  $ECRAN_NAME - Pas de workflows frontend"
            continue
        fi
        
        echo ""
        echo "=========================================="
        echo "📱 ÉCRAN: $ECRAN_NAME"
        echo "=========================================="
        
        # Compter les workflows frontend
        WF_COUNT=$(find "$FRONTEND_WF_DIR" -name "*.md" ! -name ".*" -type f 2>/dev/null | wc -l)
        echo "   $WF_COUNT workflows frontend trouvés"
        
        for wf in "$FRONTEND_WF_DIR"/*.md; do
            [[ -f "$wf" ]] || continue
            [[ "$(basename "$wf")" == .* ]] && continue
            [[ "$wf" == *"/scenarios-to-validate/"* ]] && continue
            
            process_frontend_workflow "$wf" "$ECRAN_NAME"
        done
        
        # Nettoyer le dossier .needs s'il est vide
        NEEDS_DIR="$ecran_dir/backend/workflows/.needs"
        if [[ -d "$NEEDS_DIR" ]] && [[ -z "$(ls -A "$NEEDS_DIR" 2>/dev/null)" ]]; then
            rmdir "$NEEDS_DIR" 2>/dev/null || true
        fi
    done
fi

echo ""
echo "=========================================="
echo "✅ Génération terminée !"
echo "=========================================="
echo ""
# Nettoyer tous les dossiers .needs vides
find "$ECRANS_DIR" -type d -name ".needs" -empty -exec rmdir {} \; 2>/dev/null || true
echo "Les fichiers de besoins temporaires ont été nettoyés"
echo "Les specs backend sont dans: _app/ecrans/<nom>/backend/workflows/"
