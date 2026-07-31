#!/bin/bash
# Scénario de validation: contacts-initial-load
# Vérifie que la page contacts charge correctement

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"

echo "=== Validation: contacts-initial-load ==="
echo "URL: $BASE_URL/contacts"
echo ""

# Vérifier que le serveur répond
echo "[TEST] Vérification serveur..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/contacts" | grep -q "200\|302" || {
    echo "[FAIL] Le serveur ne répond pas sur /contacts"
    exit 1
}
echo "[PASS] Serveur OK"
echo ""

# Vérifier que le template contient les éléments essentiels
echo "[TEST] Vérification contenu HTML..."
HTML=$(curl -s "$BASE_URL/contacts")

# Vérifier présence Alpine.js
echo "$HTML" | grep -q "x-data=\"contactsPage()\"" || {
    echo "[FAIL] Alpine.js data contactsPage() manquant"
    exit 1
}
echo "[PASS] Alpine.js data attribute OK"

# Vérifier présence script workflow
echo "$HTML" | grep -q "contacts-workflow.js" || {
    echo "[FAIL] Script contacts-workflow.js non référencé"
    exit 1
}
echo "[PASS] Script workflow référencé"

# Vérifier structure tableau
echo "$HTML" | grep -q "<table" || {
    echo "[FAIL] Tableau contacts manquant"
    exit 1
}
echo "[PASS] Structure tableau OK"

# Vérifier filtres
echo "$HTML" | grep -q "filterType" || {
    echo "[FAIL] Filtres non présents"
    exit 1
}
echo "[PASS] Filtres OK"

# Vérifier stats
echo "$HTML" | grep -q "stats.total" || {
    echo "[FAIL] Stats non présentes"
    exit 1
}
echo "[PASS] Stats OK"

echo ""
echo "=== TOUS LES TESTS PASSÉS ==="
echo "La page contacts est correctement configurée."
echo ""
echo "Prochaine étape: Tester avec Playwright pour valider les checkpoints console"
exit 0
