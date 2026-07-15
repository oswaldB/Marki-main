# workflow.py - Routes workflows

**Fichier** : `app/routes/workflow.py`  
**Blueprint** : `workflow_bp` (préfixe `/api/workflow`)

## Description

Point d'entrée unique pour tous les workflows métier Python.
Chaque workflow est un fichier dans `app/workflows/`.

Tous les workflows sont en **POST** sur `/api/workflow/{nom}`.

## Principe

```python
@app.route('/api/workflow/<name>', methods=['POST'])
def run_workflow(name):
    # Charge dynamiquement le fichier workflows/{name}.py
    # Exécute la fonction main() avec les paramètres JSON
```

## Workflows disponibles

### Authentification
| Route | Workflow | Description |
|-------|----------|-------------|
| POST `/api/workflow/auth-login` | auth-login.py | Authentification JWT |

### Contacts
| Route | Workflow | Description |
|-------|----------|-------------|
| POST `/api/workflow/contacts-blacklist` | contacts-blacklist.py | Toggle blacklist contact |
| POST `/api/workflow/sync-contacts` | sync-contacts.py | Synchronisation CRM |
| POST `/api/workflow/get-contact-impayes` | get-contact-impayes.py | Impayés d'un contact |

### Impayés
| Route | Workflow | Description |
|-------|----------|-------------|
| POST `/api/workflow/impayes-suspend` | impayes-suspend.py | Suspendre un impayé |
| POST `/api/workflow/impayes-unsuspend` | impayes-unsuspend.py | Réactiver un impayé |
| POST `/api/workflow/import-invoice` | import-invoice.py | Importer des factures |
| POST `/api/workflow/verify-paid-invoices` | verify-paid-invoices.py | Vérifier paiements |

### Relances
| Route | Workflow | Description |
|-------|----------|-------------|
| POST `/api/workflow/generate-relances` | generate-relances.py | Générer relances |
| POST `/api/workflow/generate-suivi` | generate-suivi.py | Générer suivis |
| POST `/api/workflow/send-emails` | send-emails.py | Envoyer emails relance |
| POST `/api/workflow/send-suivi` | send-suivi.py | Envoyer emails suivi |
| POST `/api/workflow/regenerate-relances-contact` | regenerate-relances-contact.py | Régénérer pour un contact |
| POST `/api/workflow/regenerate-relances-with-status` | regenerate-relances-with-status.py | Régénérer par statut |

### Nettoyage (cleanup)
| Route | Workflow | Description |
|-------|----------|-------------|
| POST `/api/workflow/cleanup-relances-contact-blackliste` | cleanup-relances-contact-blackliste.py | Annuler relances blacklist |
| POST `/api/workflow/cleanup-all-relances-contact-blackliste` | cleanup-all-relances-contact-blackliste.py | Annuler toutes blacklist |
| POST `/api/workflow/cleanup-all-relances-paid-impayes` | cleanup-all-relances-paid-impayes.py | Clôturer relances payées |
| POST `/api/workflow/cleanup-orphan-relances` | cleanup-orphan-relances.py | Supprimer relances orphelines |

### Utilisateurs
| Route | Workflow | Description |
|-------|----------|-------------|
| POST `/api/workflow/users-management` | users-management.py | CRUD users avancé |

### Portail
| Route | Workflow | Description |
|-------|----------|-------------|
| POST `/api/workflow/generate-contact-token` | generate-contact-token.py | Générer token portail |
| POST `/api/workflow/generate-pdf-links` | generate-pdf-links.py | Générer liens PDF |
| POST `/api/workflow/portail-client` | portail-client.py | Actions portail client |
| POST `/api/workflow/appliquer-regles-attribution` | appliquer-regles-attribution.py | Attribution automatique |

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `POST /api/workflow/<name>` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: workflow_name={name} user_id={g.current_user.id if g.current_user else 'anonymous'}")` | Début dispatch workflow |
| `POST /api/workflow/<name>` | 2 | `print(f"[API.WORKFLOW.TRIGGER] STEP: Validation paramètres JSON reçus")` | Validation payload |
| `POST /api/workflow/<name>` | 3 | `print(f"[API.WORKFLOW.TRIGGER] ERROR: Payload JSON invalide ou manquant")` | JSON invalide |
| `POST /api/workflow/<name>` | 4 | `print(f"[API.WORKFLOW.TRIGGER] STEP: Vérification authentification utilisateur")` | Vérif auth |
| `POST /api/workflow/<name>` | 5 | `print(f"[API.WORKFLOW.TRIGGER] ERROR: Utilisateur non authentifié")` | Non authentifié |
| `POST /api/workflow/<name>` | 6 | `print(f"[API.WORKFLOW.TRIGGER] STEP: Chargement dynamique du module workflows/{name}.py")` | Chargement module |
| `POST /api/workflow/<name>` | 7 | `print(f"[API.WORKFLOW.TRIGGER] ERROR: Workflow '{name}' introuvable dans app/workflows/")` | Workflow inexistant |
| `POST /api/workflow/<name>` | 8 | `print(f"[API.WORKFLOW.TRIGGER] ERROR: Workflow '{name}' désactivé")` | Workflow désactivé |
| `POST /api/workflow/<name>` | 9 | `print(f"[API.WORKFLOW.TRIGGER] STEP: Exécution de {name}.main() avec params={params}")` | Exécution main() |
| `POST /api/workflow/<name>` | 10 | `print(f"[API.WORKFLOW.TRIGGER] ERROR: Exception pendant exécution de '{name}': {str(e)}")` | Erreur exécution |
| `POST /api/workflow/<name>` | 11 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: Workflow '{name}' terminé duration={elapsed_ms}ms status=ok")` | Succès exécution |
| `POST /api/workflow/<name>` | 12 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: Workflow '{name}' terminé rows={rows_affected} duration={elapsed_ms}ms")` | Succès avec compteurs |
| `POST /api/workflow/auth-login` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: auth-login user={username}")` | Début auth-login |
| `POST /api/workflow/auth-login` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: auth-login user_id={user_id} token_issued=1")` | Succès login |
| `POST /api/workflow/contacts-blacklist` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: contacts-blacklist contact_id={contact_id}")` | Début toggle blacklist |
| `POST /api/workflow/contacts-blacklist` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: contacts-blacklist contact_id={contact_id} new_status={status} toggled=1")` | Succès toggle |
| `POST /api/workflow/sync-contacts` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: sync-contacts source={source}")` | Début sync |
| `POST /api/workflow/sync-contacts` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: sync-contacts created={created} updated={updated} errors={errors}")` | Succès sync |
| `POST /api/workflow/get-contact-impayes` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: get-contact-impayes contact_id={contact_id}")` | Début récup impayés |
| `POST /api/workflow/get-contact-impayes` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: get-contact-impayes contact_id={contact_id} count={count}")` | Succès récup |
| `POST /api/workflow/impayes-suspend` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: impayes-suspend impaye_id={impaye_id}")` | Début suspend |
| `POST /api/workflow/impayes-suspend` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: impayes-suspend impaye_id={impaye_id} status=suspended")` | Succès suspend |
| `POST /api/workflow/impayes-unsuspend` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: impayes-unsuspend impaye_id={impaye_id}")` | Début unsuspend |
| `POST /api/workflow/impayes-unsuspend` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: impayes-unsuspend impaye_id={impaye_id} status=active")` | Succès unsuspend |
| `POST /api/workflow/import-invoice` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: import-invoice source={source}")` | Début import factures |
| `POST /api/workflow/import-invoice` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: import-invoice imported={imported} skipped={skipped} errors={errors}")` | Succès import |
| `POST /api/workflow/verify-paid-invoices` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: verify-paid-invoices")` | Début vérif paiements |
| `POST /api/workflow/verify-paid-invoices` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: verify-paid-invoices verified={verified} paid={paid} unpaid={unpaid}")` | Succès vérif |
| `POST /api/workflow/generate-relances` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: generate-relances level={level}")` | Début génération |
| `POST /api/workflow/generate-relances` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: generate-relances generated={generated} skipped={skipped} level={level}")` | Succès génération |
| `POST /api/workflow/generate-suivi` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: generate-suivi")` | Début génération suivi |
| `POST /api/workflow/generate-suivi` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: generate-suivi generated={generated} skipped={skipped}")` | Succès génération |
| `POST /api/workflow/send-emails` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: send-emails count={len(relance_ids)}")` | Début envoi emails |
| `POST /api/workflow/send-emails` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: send-emails sent={sent} failed={failed} total={len(relance_ids)}")` | Succès envoi |
| `POST /api/workflow/send-suivi` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: send-suivi count={len(suivi_ids)}")` | Début envoi suivi |
| `POST /api/workflow/send-suivi` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: send-suivi sent={sent} failed={failed} total={len(suivi_ids)}")` | Succès envoi |
| `POST /api/workflow/regenerate-relances-contact` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: regenerate-relances-contact contact_id={contact_id}")` | Début régénération |
| `POST /api/workflow/regenerate-relances-contact` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: regenerate-relances-contact contact_id={contact_id} regenerated={regenerated} cancelled={cancelled}")` | Succès régénération |
| `POST /api/workflow/regenerate-relances-with-status` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: regenerate-relances-with-status status={status}")` | Début régénération |
| `POST /api/workflow/regenerate-relances-with-status` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: regenerate-relances-with-status status={status} regenerated={regenerated}")` | Succès régénération |
| `POST /api/workflow/cleanup-relances-contact-blackliste` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: cleanup-relances-contact-blackliste contact_id={contact_id}")` | Début cleanup |
| `POST /api/workflow/cleanup-relances-contact-blackliste` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: cleanup-relances-contact-blackliste contact_id={contact_id} cancelled={cancelled}")` | Succès cleanup |
| `POST /api/workflow/cleanup-all-relances-contact-blackliste` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: cleanup-all-relances-contact-blackliste")` | Début cleanup all |
| `POST /api/workflow/cleanup-all-relances-contact-blackliste` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: cleanup-all-relances-contact-blackliste cancelled={cancelled} total={total}")` | Succès cleanup all |
| `POST /api/workflow/cleanup-all-relances-paid-impayes` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: cleanup-all-relances-paid-impayes")` | Début cleanup payées |
| `POST /api/workflow/cleanup-all-relances-paid-impayes` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: cleanup-all-relances-paid-impayes closed={closed} total={total}")` | Succès cleanup payées |
| `POST /api/workflow/cleanup-orphan-relances` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: cleanup-orphan-relances")` | Début cleanup orphelines |
| `POST /api/workflow/cleanup-orphan-relances` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: cleanup-orphan-relances deleted={deleted}")` | Succès cleanup orphelines |
| `POST /api/workflow/users-management` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: users-management action={action} target_user_id={target_id}")` | Début users-management |
| `POST /api/workflow/users-management` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: users-management action={action} target_user_id={target_id} status=ok")` | Succès users-management |
| `POST /api/workflow/generate-contact-token` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: generate-contact-token contact_id={contact_id}")` | Début génération token |
| `POST /api/workflow/generate-contact-token` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: generate-contact-token contact_id={contact_id} token_issued=1 expires_in=24h")` | Succès génération token |
| `POST /api/workflow/generate-pdf-links` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: generate-pdf-links contact_id={contact_id}")` | Début génération PDF |
| `POST /api/workflow/generate-pdf-links` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: generate-pdf-links contact_id={contact_id} links_generated={count}")` | Succès génération PDF |
| `POST /api/workflow/portail-client` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: portail-client action={action} contact_id={contact_id}")` | Début portail |
| `POST /api/workflow/portail-client` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: portail-client action={action} contact_id={contact_id} status=ok")` | Succès portail |
| `POST /api/workflow/appliquer-regles-attribution` | 1 | `print(f"[API.WORKFLOW.TRIGGER] START: appliquer-regles-attribution")` | Début attribution |
| `POST /api/workflow/appliquer-regles-attribution` | 2 | `print(f"[API.WORKFLOW.TRIGGER] SUCCESS: appliquer-regles-attribution assigned={assigned} skipped={skipped} total={total}")` | Succès attribution |
