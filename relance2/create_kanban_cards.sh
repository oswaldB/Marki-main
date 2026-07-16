#!/bin/bash
# Crée ~189 cartes kanban sur la board marki-relance :
#  - 166 cartes frontend (1 par workflow .md dans specs/_app/static/pages/*/workflows/)
#  - 23 cartes backend (1 par workflow .md dans specs/_app/workflows/)
# Toutes assignées à 'integrator', created-by=Hermes.

set -e
BOARD="marki-relance"
ASSIGNEE="integrator"
AUTHOR="Hermes"
COUNT=0
FAIL=0

create_card() {
  local title="$1"
  local body="$2"
  local output
  output=$(~/.local/bin/hermes kanban --board "$BOARD" create \
    --assignee "$ASSIGNEE" \
    --body "$body" \
    --created-by "$AUTHOR" \
    "$title" 2>&1) || { echo "FAIL: $title"; echo "$output" | tail -3; FAIL=$((FAIL+1)); return 1; }
  if echo "$output" | grep -q "^Created t_"; then
    local id
    id=$(echo "$output" | grep "^Created t_" | awk '{print $2}')
    echo "OK $id :: $title"
    COUNT=$((COUNT+1))
  else
    echo "FAIL: $title"
    echo "$output" | tail -3
    FAIL=$((FAIL+1))
  fi
}

# === FRONTEND WORKFLOWS ===
echo "=== FRONTEND ==="
for md in "$SPECS_BASE/static/pages"/*/workflows/*.md; do
  [ -f "$md" ] || continue
  page=$(echo "$md" | sed -E 's|.*pages/([^/]+)/workflows/.*|\1|')
  wf=$(basename "$md" .md)
  title="[FE] $page: $wf"
  body="Coder le workflow frontend '$wf' de la page '$page'.

Source spec : specs/_app/static/pages/$page/workflows/$wf.md

Skills a charger : stedz-alpine-workflow, stedz-workflow-spec-frontend

Livrable :
- app/static/pages/$page/workflows/$wf.js (1 fichier par workflow)
- Respect du pattern window.MarkiWorkflows
- Prefixe de logs : [WORKFLOW.$page-$wf]
- store.js orchestrateur mis a jour (state + helpers + delegation)
- index.html : balise <script> ajoutee pour charger le workflow
- Ne PAS modifier les bindings x-text/x-show/@click existants
- Aucune dependance externe (pas de require/import)

Conventions projet :
- Code dans app/, specs dans specs/_app/
- Securite : pas de mot de passe ni token en clair dans les logs"
  create_card "$title" "$body"
done

# === BACKEND WORKFLOWS ===
echo ""
echo "=== BACKEND ==="
for md in "$SPECS_BASE/workflows"/*.md; do
  [ -f "$md" ] || continue
  wf=$(basename "$md" .md)
  title="[BE] workflow: $wf"
  body="Coder le workflow backend '$wf'.

Source spec : specs/_app/workflows/$wf.md

Skills a charger : stedz-workflow-spec-backend, stedz-workflow-coder

Livrable :
- app/routes/$wf.py (Blueprint Flask) OU app/workflows/$wf.py
- Format de logs Python : print(f'[API <MODULE>] ...')
- Prefixe : [API <MODULE>] selon le nom du fichier
- Tous les endpoints proteges par @require_auth (sauf exceptions documentees)
- SQL avec parametres lies (?) pour eviter injections
- Pas de mot de passe ni token en clair dans les logs
- Enregistrement du blueprint dans app/app.py

Conventions projet :
- Code dans app/, specs dans specs/_app/
- Format de logs conforme au style impayes.py / relances.py (references)
- Securite : validation des inputs, gestion des erreurs 404/500"
  create_card "$title" "$body"
done

echo ""
echo "=== RESUME ==="
echo "Cartes creees : $COUNT"
echo "Echecs : $FAIL"
