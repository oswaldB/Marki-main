# cleanup-orphan-relances.py - Cleanup orphelins

**Fichier** : `app/workflows/cleanup-orphan-relances.py`

## Description

Supprime les relances sans impayés associés.

## Sortie

```json
{
  "supprimees": 3
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.cleanup-orphan-relances] START: scan des relances orphelines")` | Début du cleanup |
| 2 | `print(f"[WORKFLOW.cleanup-orphan-relances] STEP: Connexion DB et récupération de toutes les relances")` | Chargement relances |
| 3 | `print(f"[WORKFLOW.cleanup-orphan-relances] DATA: {total_relances} relances récupérées")` | Volume total |
| 4 | `print(f"[WORKFLOW.cleanup-orphan-relances] STEP: Identification relances sans impayé/contact associé")` | Détection orphelines |
| 5 | `print(f"[WORKFLOW.cleanup-orphan-relances] DATA: {nb_orphelines} relances orphelines détectées (IDs={ids_orphelines})")` | Liste orphelines |
| 6 | `print(f"[WORKFLOW.cleanup-orphan-relances] STEP: Listing détaillé des orphelines pour audit")` | Listing audit |
| 7 | `print(f"[WORKFLOW.cleanup-orphan-relances] DATA: {len(orphelines)} entrées à supprimer")` | Confirmation volume |
| 8 | `print(f"[WORKFLOW.cleanup-orphan-relances] STEP: Suppression effective en base")` | Action suppression |
| 9 | `print(f"[WORKFLOW.cleanup-orphan-relances] ERROR: Échec suppression ID={relance_id} - {erreur}")` | Échec partiel |
| 10 | `print(f"[WORKFLOW.cleanup-orphan-relances] DATA: {supprimees} suppressions réussies, {echecs} échecs")` | Résultat suppression |
| 11 | `print(f"[WORKFLOW.cleanup-orphan-relances] STEP: Calcul des statistiques finales")` | Calcul stats |
| 12 | `print(f"[WORKFLOW.cleanup-orphan-relances] DATA: stats={supprimees}/{total_relances} relances nettoyées")` | Stats finales |
| 13 | `print(f"[WORKFLOW.cleanup-orphan-relances] SUCCESS: Cleanup terminé, {supprimees} relances orphelines supprimées")` | Succès global |
| 14 | `print(f"[WORKFLOW.cleanup-orphan-relances] END: Durée={duree}ms")` | Fin du workflow |
