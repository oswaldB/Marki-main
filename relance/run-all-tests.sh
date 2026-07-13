#!/bin/bash
# Script global d'exécution de tous les tests workflows
# Usage: ./run-all-tests.sh [--verbose]

set -e

VERBOSE=false
if [ "$1" = "--verbose" ]; then
    VERBOSE=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
TOTAL=0

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         EXÉCUTION GLOBALE DES TESTS WORKFLOWS            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Tests Backend
echo -e "${BLUE}=== BACKEND WORKFLOWS ===${NC}"
for script in backend/*/run-tests.sh; do
    if [ -f "$script" ]; then
        WORKFLOW=$(basename $(dirname "$script"))
        TOTAL=$((TOTAL + 1))
        
        if [ "$VERBOSE" = true ]; then
            echo ""
            echo "Testing: $WORKFLOW..."
            bash "$script" && {
                echo -e "${GREEN}✅ $WORKFLOW${NC}"
                PASSED=$((PASSED + 1))
            } || {
                echo -e "${RED}❌ $WORKFLOW${NC}"
                FAILED=$((FAILED + 1))
            }
        else
            bash "$script" > /dev/null 2>&1 && {
                echo -e "${GREEN}✅${NC} $WORKFLOW"
                PASSED=$((PASSED + 1))
            } || {
                echo -e "${RED}❌${NC} $WORKFLOW"
                FAILED=$((FAILED + 1))
            }
        fi
    fi
done

# Tests Frontend
echo ""
echo -e "${BLUE}=== FRONTEND WORKFLOWS ===${NC}"
for script in frontend/*/run-tests.sh; do
    if [ -f "$script" ]; then
        WORKFLOW=$(basename $(dirname "$script"))
        TOTAL=$((TOTAL + 1))
        
        if [ "$VERBOSE" = true ]; then
            echo ""
            echo "Testing: $WORKFLOW..."
            bash "$script" && {
                echo -e "${GREEN}✅ $WORKFLOW${NC}"
                PASSED=$((PASSED + 1))
            } || {
                echo -e "${RED}❌ $WORKFLOW${NC}"
                FAILED=$((FAILED + 1))
            }
        else
            bash "$script" > /dev/null 2>&1 && {
                echo -e "${GREEN}✅${NC} $WORKFLOW"
                PASSED=$((PASSED + 1))
            } || {
                echo -e "${RED}❌${NC} $WORKFLOW"
                FAILED=$((FAILED + 1))
            }
        fi
    fi
done

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  RÉSULTATS${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ Passés: $PASSED${NC}"
echo -e "${RED}❌ Échoués: $FAILED${NC}"
echo -e "📊 Total: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 TOUS LES TESTS SONT VALIDÉS !${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Certains tests ont échoué${NC}"
    exit 1
fi
