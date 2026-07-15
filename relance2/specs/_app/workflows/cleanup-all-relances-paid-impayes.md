# cleanup-all-relances-paid-impayes.py - Cleanup payés

**Fichier** : `app/workflows/cleanup-all-relances-paid-impayes.py`

## Description

Clôture les relances dont tous les impayés sont payés.

## Entrée

```json
{}
```

## Sortie

```json
{
  "cloturees": 8
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] START: Recherche impayés soldés/payés")` | Début cleanup |
| 2 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] STEP: Listing impayés status=PAYE/SOLDE en DB")` | Requête impayés |
| 3 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] DATA: {nb_impayes_soldes} impayés soldés trouvés")` | Compte impayés |
| 4 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] STEP: Listing relances associées aux impayés soldés")` | Requête relances |
| 5 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] DATA: {nb_relances} relances à clôturer")` | Compte relances |
| 6 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] STEP: Suppression relances et nettoyage en DB")` | DELETE en base |
| 7 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] ERROR: Échec suppression relance id={relance_id}")` | Échec DELETE |
| 8 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] DATA: {compteur} relances clôturées")` | Compteur progressif |
| 9 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] STEP: Mise à jour statut relances (si soft delete)")` | Update statut |
| 10 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] STEP: Calcul des statistiques de cleanup")` | Calcul stats |
| 11 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] DATA: total_cloturees={cloturees} total_erreur={erreurs}")` | Stats finales |
| 12 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] SUCCESS: Cleanup terminé, {cloturees} relances clôturées")` | Succès global |
| 13 | `print(f"[WORKFLOW.cleanup-all-relances-paid-impayes] END: Durée={duree}ms")` | Fin du workflow |
