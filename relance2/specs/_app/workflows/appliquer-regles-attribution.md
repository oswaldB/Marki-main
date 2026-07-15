# appliquer-regles-attribution.py - Attribution

**Fichier** : `app/workflows/appliquer-regles-attribution.py`

## Description

Attribue automatiquement les impayés aux bons contacts.

## Entrée

```json
{
  "impaye_ids": [1, 2, 3]
}
```

## Sortie

```json
{
  "attribues": 3,
  "nouveaux_contacts": 1
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.appliquer-regles-attribution] START: impaye_ids={impaye_ids}")` | Début workflow avec liste impayés reçus |
| 2 | `print(f"[WORKFLOW.appliquer-regles-attribution] STEP: Validation des {len(impaye_ids)} impaye_ids en DB")` | Vérification existence en DB |
| 3 | `print(f"[WORKFLOW.appliquer-regles-attribution] ERROR: impaye_id={id} introuvable en DB")` | ID invalide ou inexistant |
| 4 | `print(f"[WORKFLOW.appliquer-regles-attribution] STEP: Recherche contact payeur pour impaye_id={id}")` | Recherche du contact associé |
| 5 | `print(f"[WORKFLOW.appliquer-regles-attribution] STEP: Application règles d'attribution pour impaye_id={id}")` | Application des règles métier |
| 6 | `print(f"[WORKFLOW.appliquer-regles-attribution] STEP: Création nouveau contact pour impaye_id={id}")` | Nouveau contact si nécessaire |
| 7 | `print(f"[WORKFLOW.appliquer-regles-attribution] DATA: traités={n} nouveaux={m} erreurs={k}")` | Stats d'avancement |
| 8 | `print(f"[WORKFLOW.appliquer-regles-attribution] STEP: Mise à jour DB pour {n} attributions")` | Persistance en base |
| 9 | `print(f"[WORKFLOW.appliquer-regles-attribution] SUCCESS: attribués={attribues} nouveaux_contacts={nouveaux_contacts}")` | Résumé final |
| 10 | `print(f"[WORKFLOW.appliquer-regles-attribution] END: Durée={duree}ms")` | Fin du workflow |
```
