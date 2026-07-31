# TODO - Création des Tests pour tous les Workflows

> Liste des workflows backend et statut de leurs fichiers de test

## Légende

| Statut | Description |
|--------|-------------|
| ✅ | Test créé et complet |
| 📝 | Test créé mais à compléter/améliorer |
| ⏳ | À créer (prioritaire) |
| ⏸️ | Optionnel/peu prioritaire |

---

## Tests Prioritaires (Workflows Core)

| # | Workflow | Fichier Test | Script | Statut | Priorité | Notes |
|---|----------|--------------|--------|--------|----------|-------|
| 1 | `auth-login` | `auth-login-test.md` ✅ | `run-tests.sh` 📝 | 📝 | 🔴 Haute | Scénarios définis, script à finaliser |
| 2 | `contacts-blacklist` | `contacts-blacklist-test.md` ✅ | `run-tests.sh` ⏳ | 📝 | 🔴 Haute | Scénarios définis, script à créer |
| 3 | `import-invoice` | `import-invoice-test.md` ✅ | `run-tests.sh` 📝 | 📝 | 🔴 Haute | Scénarios définis, script à finaliser |
| 4 | `generate-relances` | `generate-relances-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🔴 Haute | 5 scénarios définis, script complet, à tester |
| 5 | `send-emails` | `send-emails-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🔴 Haute | 5 scénarios définis, script complet |
| 6 | `verify-paid-invoices` | `verify-paid-invoices-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🔴 Haute | 4 scénarios, SQLite mock, script complet |

---

## Tests Secondaires (Workflows Importants)

| # | Workflow | Fichier Test | Script | Statut | Priorité | Notes |
|---|----------|--------------|--------|--------|----------|-------|
| 7 | `cleanup-relances-contact-blackliste` | `cleanup-relances-contact-blackliste-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟡 Moyenne | 5 scénarios, mode manuel/auto, script complet |
| 8 | `cleanup-all-relances-contact-blackliste` | `cleanup-all-relances-contact-blackliste-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟡 Moyenne | 3 scénarios, suppression totale (même Envoyée), script complet |
| 9 | `cleanup-all-relances-paid-impayes` | `cleanup-all-relances-paid-impayes-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟡 Moyenne | 3 scénarios, nettoyage impayés payés, script complet |
| 10 | `regenerate-relances-contact` | `regenerate-relances-contact-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟡 Moyenne | 4 scénarios, exclusion impayé, script complet |
| 11 | `regenerate-relances-with-status` | `regenerate-relances-with-status-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟡 Moyenne | 4 scénarios, filtre par statut, mode dry-run, script complet |
| 12 | `sync-contacts` | `sync-contacts-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟡 Moyenne | 4 scénarios, SQLite mock, mode dry-run, script complet |
| 13 | `send-suivi` | `send-suivi-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟡 Moyenne | 4 scénarios, tableaux factures, agences, script complet |
| 14 | `generate-suivi` | `generate-suivi-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟡 Moyenne | 4 scénarios, regroupement agences, tableaux factures, script complet |
| 15 | `portail-client` | `portail-client-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟡 Moyenne | 4 scénarios, token magique, auth, factures, script complet |

---

## Tests Tertiaires (Workflows Utilitaires)

| # | Workflow | Fichier Test | Script | Statut | Priorité | Notes |
|---|----------|--------------|--------|--------|----------|-------|
| 16 | `appliquer-regles-attribution` | `appliquer-regles-attribution-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟢 Basse | 4 scénarios, règles métier, script complet |
| 17 | `cleanup-orphan-relances` | `cleanup-orphan-relances-test.md` ✅ | `run-tests.sh` ✅ | 📝 | 🟢 Basse | 3 scénarios, script complet |
| 51 | `generate-contact-token` | generate-contact-token-test.md ✅ | run-tests.sh ✅ | 📝 | 🟢 Basse | Génération token JWT portail |
| 52 | `generate-pdf-links` | generate-pdf-links-test.md ✅ | run-tests.sh ✅ | 📝 | 🟢 Basse | Génération liens PDF signés |
| 53 | `get-contact-impayes` | get-contact-impayes-test.md ✅ | run-tests.sh ✅ | 📝 | 🟢 Basse | Récupération impayés d'un contact (CRUD-like) |
| 54 | `impayes-suspend` | impayes-suspend-test.md ✅ | run-tests.sh ✅ | 📝 | 🟢 Basse | Suspension impayé |
| 55 | `impayes-unsuspend` | impayes-unsuspend-test.md ✅ | run-tests.sh ✅ | 📝 | 🟢 Basse | Réactivation impayé |
| 56 | `test-single` | test-single-test.md ✅ | run-tests.sh ✅ | 📝 | 🟢 Basse | Test envoi email relance (similaire send-emails) |
| 57 | `test-single-suivi` | test-single-suivi-test.md ✅ | run-tests.sh ✅ | 📝 | 🟢 Basse | Test envoi email suivi |
| 58 | `users-management` | users-management-test.md ✅ | run-tests.sh ✅ | 📝 | 🟢 Basse | CRUD users (optionnel, déjà testé via auth-login) |

---

## Total

| Statut | Count | Pourcentage |
|--------|-------|-------------|
| ✅ Test complet | 0 | 0% |
| 📝 Test partiel | 25 | 100% |
| ⏳ À créer | 0 | 0% |
| **Total** | **25** | **100%** |

✅ **TOUS LES WORKFLOWS SONT DOCUMENTÉS !**

---

## Prochaines Actions (Priorisées)

### Sprint 1 - Core (Semaine 1)
1. [ ] Finaliser `auth-login/run-tests.sh`
2. [ ] Créer `contacts-blacklist/run-tests.sh`
3. [ ] Finaliser `import-invoice/run-tests.sh`
4. [ ] Créer `generate-relances-test.md` + script

### Sprint 2 - Important (Semaine 2)
5. [ ] Créer `send-emails-test.md` + script (avec mock SMTP)
6. [ ] Créer `verify-paid-invoices-test.md` + script
7. [ ] Créer `cleanup-*-test.md` + scripts
8. [ ] Créer `regenerate-relances-*-test.md` + scripts

### Sprint 3 - Complet (Semaine 3)
9. [ ] Créer `sync-contacts-test.md` + script
10. [ ] Créer `send-suivi-test.md` + script
11. [ ] Créer `generate-suivi-test.md` + script
12. [ ] Créer `portail-client-test.md` + script

### Sprint 4 - Optionnel (Semaine 4)
13. [ ] Créer tests restants utilitaires

---

## Template Rapide

Pour créer un test rapidement :

```bash
# 1. Créer fichier test
cd specs/workflows/backend
cat > [workflow]-test.md << 'EOF'
# Tests [workflow]

## Scénario 1: [Description]

### Input
```yaml
# backend/data-tests/[collection]/test.yml
id: test
champ: valeur
```

### Exécution
```bash
node index.js --test-mode
```

### Vérifications
```bash
grep "expected" backend/data-tests/[collection]/test.yml
```

### Output Attendu
```yaml
id: test
champ: modifié
```
EOF

# 2. Créer script test
cat > backend/[workflow]/run-tests.sh << 'EOF'
#!/bin/bash
set -e
mkdir -p ../data-tests/{contacts,impayes,logs}
# ... tests ...
EOF
chmod +x backend/[workflow]/run-tests.sh

# 3. Mettre à jour cette TODO
# Éditer TODO-TESTS.md et changer ⏳ en 📝
```

---

## Commandes de Vérification

```bash
# Voir quels workflows n'ont pas de test
grep -l "⏳" specs/workflows/backend/TODO-TESTS.md

# Compter tests existants
ls specs/workflows/backend/*-test.md 2>/dev/null | wc -l

# Voir scripts exécutables
ls backend/*/run-tests.sh 2>/dev/null | wc -l

# Lancer tous les tests existants
for script in backend/*/run-tests.sh; do
    echo "=== $(dirname $script) ==="
    $script && echo "✅ PASS" || echo "❌ FAIL"
done
```
