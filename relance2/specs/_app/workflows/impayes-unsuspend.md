# impayes-unsuspend.py - Réactiver impayé

**Fichier** : `app/workflows/impayes-unsuspend.py`

## Description

Réactive un impayé suspendu.

## Entrée

```json
{
  "impaye_id": 123
}
```

## Sortie

```json
{
  "success": true,
  "impaye_id": 123,
  "suspendu": false
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.impayes-unsuspend] START: impaye_id={impaye_id}")` | Début réactivation |
| 2 | `print(f"[WORKFLOW.impayes-unsuspend] STEP: Vérification présence impaye_id")` | Validation input |
| 3 | `print(f"[WORKFLOW.impayes-unsuspend] ERROR: impaye_id manquant ou invalide")` | Missing/invalid field |
| 4 | `print(f"[WORKFLOW.impayes-unsuspend] STEP: Recherche impayé {impaye_id} en DB")` | Recherche DB |
| 5 | `print(f"[WORKFLOW.impayes-unsuspend] ERROR: Impayé {impaye_id} non trouvé")` | Not found |
| 6 | `print(f"[WORKFLOW.impayes-unsuspend] DATA: impaye_id={impaye_id}, suspendu={impaye.suspendu}, statut={impaye.statut}")` | État actuel lu |
| 7 | `print(f"[WORKFLOW.impayes-unsuspend] ERROR: Impayé {impaye_id} n'était pas suspendu (suspendu=False)")` | Pas suspendu |
| 8 | `print(f"[WORKFLOW.impayes-unsuspend] STEP: Update DB impayé {impaye_id} -> suspendu=False, date_reactivation=now()")` | Update DB |
| 9 | `print(f"[WORKFLOW.impayes-unsuspend] STEP: Régénération éventuelle des relances pour client_id={impaye.client_id}")` | Régénération relances |
| 10 | `print(f"[WORKFLOW.impayes-unsuspend] DATA: nb_relances_regenerees={nb_relances}")` | Compteur relances |
| 11 | `print(f"[WORKFLOW.impayes-unsuspend] STEP: Recalcul stats impayés client (total, suspendus, actifs)")` | Stats |
| 12 | `print(f"[WORKFLOW.impayes-unsuspend] SUCCESS: Impayé {impaye_id} réactivé, suspendu=false")` | Succès |
| 13 | `print(f"[WORKFLOW.impayes-unsuspend] END: Durée={duree}ms, relances_regenerees={nb_relances}")` | Fin |
