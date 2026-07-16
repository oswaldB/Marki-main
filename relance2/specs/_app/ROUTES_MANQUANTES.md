# Routes API Manquantes ou à Vérifier

**Date**: 2024-07-16
**Audit**: Comparaison entre workflows frontend et routes backend existantes

## Routes MANQUANTES (référencées mais non définies)

### ❌ Routes Dashboard
| Endpoint | Méthode | Référencé dans | Action |
|----------|---------|----------------|--------|
| `/api/dashboard/stats` | GET | `dashboard/workflows/refresh-stats.md` | **À créer** ou utiliser le calcul frontend |

### ❌ Routes Events
| Endpoint | Méthode | Référencé dans | Action |
|----------|---------|----------------|--------|
| `/api/events/mark-read` | POST | `evenements/workflows/mark-all-read.md` | **À créer** |

### ❌ Routes Workflows (à vérifier si ce sont des routes ou des imports)
| Endpoint | Méthode | Référencé dans | Action |
|----------|---------|----------------|--------|
| `/api/workflows/sync-orchestrator` | POST | `contacts/workflows/export-data.md` | **Vérifier** - Workflow backend ? |
| `/api/workflows/import-invoices` | POST | `impayes/workflows/sync-data.md` | **Vérifier** - Existe dans `routes/workflow.md` ? |
| `/api/workflows/attribution-impayes/execute` | POST | `sequences_relance_detail/workflows/lancer-attribution.md` | **Vérifier** |

### ❌ Routes de Test (à supprimer ou créer)
| Endpoint | Méthode | Référencé dans | Action |
|----------|---------|----------------|--------|
| `/api/test` | GET | `sequences_relance_detail/workflows/tester-email.md` | **À remplacer** par vrai endpoint |
| `/api/test/suivi` | GET | `sequences_suivi_detail/workflows/tester-email.md` | **À remplacer** par vrai endpoint |

### ❌ Routes Séquences (à vérifier)
| Endpoint | Méthode | Référencé dans | Action |
|----------|---------|----------------|--------|
| `/api/sequences/{id}/publier` | POST | `sequences_relance_detail/workflows/toggle-publication.md` | **Vérifier** - Existe ? |
| `/api/sequences/{id}/validation` | POST | `sequences_relance_detail/workflows/toggle-validation.md` | **À créer ?** |
| `/api/sequences/{id}/tester` | POST | `sequences_*_detail/workflows/tester-email.md` | **À créer ?** |
| `/api/sequences/{id}/attribution` | POST | `sequences_relance_detail/workflows/lancer-attribution.md` | **À créer ?** |

### ❌ Routes Portail (à vérifier)
| Endpoint | Méthode | Référencé dans | Action |
|----------|---------|----------------|--------|
| `/api/portail/factures/{id}/pdf` | GET | `portail_client/workflows/download-facture.md` | **Vérifier** |
| `/api/portail/factures/{id}/payer` | POST | `portail_client/workflows/regler-facture.md` | **Vérifier** |

### ❌ Routes Contacts (à vérifier)
| Endpoint | Méthode | Référencé dans | Action |
|----------|---------|----------------|--------|
| `/api/contacts/{id}/blacklist` | POST | `contacts/workflows/toggle-blacklist.md` | **Vérifier** - Existe ? |

### ❌ Routes Impayés (à vérifier)
| Endpoint | Méthode | Référencé dans | Action |
|----------|---------|----------------|--------|
| `/api/impayes?a_reparer=true` | GET | `impayes_reparer/workflows/view-reparer.md` | **Vérifier** - Le paramètre `a_reparer` existe ? |

### ❌ Routes Settings
| Endpoint | Méthode | Référencé dans | Action |
|----------|---------|----------------|--------|
| `/api/settings` | GET | `settings/workflows/initial-load.md` | **À créer** |

## Routes EXISTANTES ✅ (tout est OK)

| Endpoint | Méthode | Fichier route |
|----------|---------|---------------|
| `/api/auth/login` | POST | `routes/auth.md` |
| `/api/auth/me` | GET | `routes/auth.md` |
| `/api/auth/logout` | POST | `routes/auth.md` |
| `/api/contacts` | GET/POST | `routes/contacts.md` |
| `/api/contacts/:id` | GET/PUT/DELETE | `routes/contacts.md` |
| `/api/contacts/:id/impayes` | GET | `routes/contacts.md` |
| `/api/events` | GET/POST | `routes/events.md` |
| `/api/impayes` | GET/POST | `routes/impayes.md` |
| `/api/impayes/:id` | GET/PUT/DELETE | `routes/impayes.md` |
| `/api/relances` | GET/POST | `routes/relances.md` |
| `/api/relances/:id` | GET/PUT/DELETE | `routes/relances.md` |
| `/api/sequences` | GET/POST | `routes/sequences.md` |
| `/api/sequences/:id` | GET/PUT/DELETE | `routes/sequences.md` |
| `/api/smtp-profiles` | GET/POST | `routes/smtp.md` |
| `/api/smtp-profiles/:id` | GET/PUT/DELETE | `routes/smtp.md` |
| `/api/smtp-profiles/:id/test` | POST | `routes/smtp.md` |
| `/api/users` | GET/POST | `routes/users.md` |
| `/api/users/:id` | GET/PUT/DELETE | `routes/users.md` |
| `/api/users/:id/reset-password` | POST | `routes/users.md` |
| `/api/tokens` | GET | `routes/tokens.md` |
| `/api/tokens/cleanup` | POST | `routes/tokens.md` |
| `/api/tokens/revoke/:id` | POST | `routes/tokens.md` |
| `/api/import/*` | POST | `routes/import_data.md` |
| `/api/portail/config` | GET | `routes/portail.md` |
| `/api/portail/stats` | GET | `routes/portail.md` |
| `/api/portail/token` | POST | `routes/portail.md` |
| `/api/portail/send-reminder` | POST | `routes/portail.md` |

## Résumé

### Routes Critiques à Créer
1. ❌ `/api/events/mark-read` - Pour marquer tous les événements comme lus
2. ❌ `/api/dashboard/stats` - Pour les statistiques du dashboard (ou faire le calcul frontend)
3. ❌ `/api/settings` - Pour les paramètres globaux

### Routes à Vérifier
4. ⚠️ `/api/contacts/:id/blacklist` - Toggle blacklist
5. ⚠️ `/api/sequences/:id/publier` - Publication séquence
6. ⚠️ `/api/sequences/:id/tester` - Test email
7. ⚠️ `/api/portail/factures/:id/pdf` - PDF facture
8. ⚠️ `/api/portail/factures/:id/payer` - Paiement

### Routes Workflow (probablement OK)
9. ✅ `/api/workflows/*` - Gérées par `routes/workflow.md`

## Actions Recommandées

1. **Court terme** : Vérifier si les routes avec ⚠️ existent réellement
2. **Moyen terme** : Créer les routes critiques manquantes
3. **Long terme** : Standardiser les noms d'endpoints entre frontend et backend
