# impayes-suspend.py - Suspendre impayé

**Fichier** : `app/workflows/impayes-suspend.py`

## Description

Met un impayé en suspend (pause des relances).

## Entrée

```json
{
  "impaye_id": 123,
  "raison": "Litige en cours",
  "jours": 30
}
```

## Sortie

```json
{
  "success": true,
  "impaye_id": 123,
  "suspendu": true,
  "date_fin_suspension": "2024-04-15"
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.impayes-suspend] START: mode={mode}, impaye_ids={impaye_ids}")` | Début workflow (single ou batch) |
| 2 | `print(f"[WORKFLOW.impayes-suspend] STEP: Validation entrée (impaye_ids non vide)")` | Validation input |
| 3 | `print(f"[WORKFLOW.impayes-suspend] ERROR: impaye_ids vide ou invalide")` | Missing/empty input |
| 4 | `print(f"[WORKFLOW.impayes-suspend] DATA: batch_size={len(impaye_ids)}")` | Nombre d'impayés à traiter |
| 5 | `print(f"[WORKFLOW.impayes-suspend] STEP: Vérif statut impayé id={impaye_id}")` | Vérification statut courant |
| 6 | `print(f"[WORKFLOW.impayes-suspend] ERROR: impayé id={impaye_id} non trouvé en DB")` | Not found |
| 7 | `print(f"[WORKFLOW.impayes-suspend] ERROR: impayé id={impaye_id} déjà suspendu jusqu'au {date_fin_existant}")` | Déjà suspendu |
| 8 | `print(f"[WORKFLOW.impayes-suspend] STEP: Update DB statut=suspendu, date_fin_suspension={date_fin_suspension}")` | Update DB |
| 9 | `print(f"[WORKFLOW.impayes-suspend] STEP: Annulation relances en cours pour impaye_id={impaye_id}")` | Annulation relances |
| 10 | `print(f"[WORKFLOW.impayes-suspend] DATA: relances_annulees={nb_relances_annulees}")` | Compteur relances annulées |
| 11 | `print(f"[WORKFLOW.impayes-suspend] STEP: Calcul stats (nb_suspendus, nb_relances_annulees_total)")` | Agrégation stats |
| 12 | `print(f"[WORKFLOW.impayes-suspend] DATA: stats={stats}")` | Stats finales |
| 13 | `print(f"[WORKFLOW.impayes-suspend] SUCCESS: impaye_id={impaye_id} suspendu jusqu'au {date_fin_suspension}")` | Succès single |
| 14 | `print(f"[WORKFLOW.impayes-suspend] SUCCESS: batch terminé, nb_traites={nb_traites}, nb_erreurs={nb_erreurs}")` | Succès batch |
| 15 | `print(f"[WORKFLOW.impayes-suspend] END: durée={duree}ms")` | Fin |
