# regenerate-relances-with-status.py - Régénérer avec statut

**Fichier** : `app/workflows/regenerate-relances-with-status.py`

## Description

Régénère les relances filtrées par statut.

## Entrée

```json
{
  "statut": "en_cours",
  "nouvelle_sequence_id": 2
}
```

## Sortie

```json
{
  "regenerees": 5
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.regenerate-relances-with-status] START: statut={statut} sequence_id={nouvelle_sequence_id}")` | Début régénération avec statut |
| 2 | `print(f"[WORKFLOW.regenerate-relances-with-status] STEP: Validation des paramètres d'entrée")` | Validation input |
| 3 | `print(f"[WORKFLOW.regenerate-relances-with-status] ERROR: Paramètres statut ou sequence_id manquants")` | Missing params |
| 4 | `print(f"[WORKFLOW.regenerate-relances-with-status] STEP: Listing des contacts en statut '{statut}'")` | Listing contacts filtrés |
| 5 | `print(f"[WORKFLOW.regenerate-relances-with-status] DATA: {total} contacts trouvés statut='{statut}'")` | Nombre contacts trouvés |
| 6 | `print(f"[WORKFLOW.regenerate-relances-with-status] STEP: Exclusion des contacts suspendus/blacklistés")` | Filtrage exclusions |
| 7 | `print(f"[WORKFLOW.regenerate-relances-with-status] DATA: {actifs} actifs / {suspendus} suspendus / {blacklistes} blacklistés")` | Décompte par statut |
| 8 | `print(f"[WORKFLOW.regenerate-relances-with-status] STEP: Régénération conditionnelle des relances pour {actifs} contacts actifs")` | Régénération conditionnelle |
| 9 | `print(f"[WORKFLOW.regenerate-relances-with-status] ERROR: Échec régénération contact_id={contact_id}")` | Échec sur un contact |
| 10 | `print(f"[WORKFLOW.regenerate-relances-with-status] DATA: {regenerees} relances régénérées, {erreurs} erreurs")` | Stats régénération |
| 11 | `print(f"[WORKFLOW.regenerate-relances-with-status] STEP: Mise à jour sequence_id={nouvelle_sequence_id} en DB")` | Update DB |
| 12 | `print(f"[WORKFLOW.regenerate-relances-with-status] SUCCESS: Régénération terminée, {regenerees} relances créées")` | Succès global |
| 13 | `print(f"[WORKFLOW.regenerate-relances-with-status] END: Durée={duree}ms statut={statut}")` | Fin workflow |
