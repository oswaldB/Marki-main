# sync-contacts.py - Sync contacts

**Fichier** : `app/workflows/sync-contacts.py`

## Description

Synchronise les contacts avec un système externe (CRM).

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.sync-contacts] START: source={source}, mode={mode}")` | Début avec config |
| 2 | `print(f"[WORKFLOW.sync-contacts] STEP: Connexion CRM source={source}")` | Connexion CRM |
| 3 | `print(f"[WORKFLOW.sync-contacts] DATA: {len(crm_contacts)} contacts à synchroniser")` | Contacts CRM |
| 4 | `print(f"[WORKFLOW.sync-contacts] STEP: Récupération contacts existants localement")` | Contacts locaux |
| 5 | `print(f"[WORKFLOW.sync-contacts] DATA: {len(local_contacts)} contacts en base locale")` | Base locale |
| 6 | `print(f"[WORKFLOW.sync-contacts] STEP: Comparaison et traitement différentiel")` | Différentiel |
| 7 | `print(f"[WORKFLOW.sync-contacts] STEP: Ajout {ajoutes} nouveaux contacts")` | Ajouts |
| 8 | `print(f"[WORKFLOW.sync-contacts] STEP: Modification {modifies} contacts existants")` | Modifs |
| 9 | `print(f"[WORKFLOW.sync-contacts] STEP: Suppression {supprimes} contacts absents CRM")` | Suppressions |
| 10 | `print(f"[WORKFLOW.sync-contacts] SUCCESS: Sync terminée - {ajoutes} ajoutés, {modifies} modifiés, {supprimes} supprimés")` | Résumé |
| 11 | `print(f"[WORKFLOW.sync-contacts] END: Durée={duree}s")` | Fin |

## Entrée

```json
{
  "source": "crm",
  "mode": "incremental"
}
```

## Sortie

```json
{
  "ajoutes": 5,
  "modifies": 10,
  "supprimes": 0
}
```
