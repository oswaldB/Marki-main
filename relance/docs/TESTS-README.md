# Système de Tests - Workflows Backend

## Vue d'Ensemble

Système de tests basé sur des **données de test isolées** dans `backend/data-tests/`.

## Structure

```
specs/workflows/backend/[workflow]-test.md     # Documentation des scénarios
backend/data-tests/                             # Données de test (isolation)
├── contacts/
├── impayes/
├── relances/
├── sequences/          # Copie des séquences de prod
├── users/
├── smtp_profiles/      # Copie des profils SMTP
├── sync.db            # Base SQLite de test (import-invoice)
└── logs/              # Logs générés par les tests

backend/[workflow]/run-tests.sh               # Script d'exécution
```

## Créer un Test pour un Nouveau Workflow

### Étape 1 : Créer le Fichier de Documentation

Copier le template :

```bash
cd specs/workflows/backend
cp TEMPLATE-workflow-test.md [mon-workflow]-test.md
```

Modifier avec les scénarios spécifiques :
- Input YAML dans `data-tests/`
- Commande d'exécution
- Vérifications (assertions)
- Output attendu

### Étape 2 : Créer le Script de Test

Dans `backend/[mon-workflow]/run-tests.sh` :

```bash
#!/bin/bash
set -e

TEST_DIR="../data-tests"
mkdir -p "$TEST_DIR"/{contacts,impayes,relances,logs}

# Scénario 1
echo "=== Scénario 1 ==="
# Créer données
cat > "$TEST_DIR/contacts/test.yml" << 'EOF'
id: test
nom: Test
EOF

# Exécuter workflow (adapter)
# DATA_DIR="$TEST_DIR" node index.js

# Vérifier
if [ -f "$TEST_DIR/contacts/test.yml" ]; then
    echo "✅ Test passé"
fi

# Cleanup
rm -f "$TEST_DIR/contacts/test.yml"
```

### Étape 3 : Rendre Exécutable

```bash
chmod +x backend/[mon-workflow]/run-tests.sh
```

## Exécuter Tous les Tests

```bash
# Lancer tous les tests
for test_script in backend/*/run-tests.sh; do
    echo "=== $(basename $(dirname $test_script)) ==="
    "$test_script" && echo "✅ PASS" || echo "❌ FAIL"
done

# Ou un workflow spécifique
backend/auth-login/run-tests.sh
```

## Workflows avec Tests Définis

| Workflow | Fichier Test | Script | Status |
|----------|--------------|--------|--------|
| auth-login | `auth-login-test.md` | `backend/auth-login/run-tests.sh` | ✅ |
| contacts-blacklist | `contacts-blacklist-test.md` | - | ✅ |
| import-invoice | `import-invoice-test.md` | `backend/import-invoice/run-tests.sh` | ✅ |
| generate-relances | `generate-relances-test.md` | - | ⏳ À créer |
| send-emails | `send-emails-test.md` | - | ⏳ À créer |
| verify-paid-invoices | `verify-paid-invoices-test.md` | - | ⏳ À créer |

## Commandes Utiles

```bash
# Voir les données de test créées
ls -la backend/data-tests/contacts/

# Vérifier contenu d'un fichier de test
cat backend/data-tests/contacts/cont_scenario_1.yml

# Voir les logs de test récents
tail -20 backend/data-tests/logs/*.log

# Nettoyer tout l'environnement de test
rm -rf backend/data-tests/*

# Diff entre données prod et test
diff backend/data/contacts/cont_xxx.yml backend/data-tests/contacts/cont_xxx.yml
```

## Principes

1. **Isolation** : `data-tests/` ne touche jamais à `data/`
2. **Reproductibilité** : Tests déterministes (mêmes entrées → mêmes sorties)
3. **Automatisation** : Scripts exécutables sans interaction
4. **Validation** : Assertions vérifiables (exit code 0/1)
5. **Cleanup** : Nettoyage systématique après chaque test

## Exemple Rapide

```bash
# Créer test minimal
mkdir -p backend/data-tests/contacts

# Donnée entrée
cat > backend/data-tests/contacts/test.yml << 'EOF'
id: test_user
nom: Test
is_blacklisted: false
EOF

# Vérifier (simuler workflow)
grep "is_blacklisted: false" backend/data-tests/contacts/test.yml && echo "✅ OK"

# Cleanup
rm backend/data-tests/contacts/test.yml
```
