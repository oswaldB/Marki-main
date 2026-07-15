# import-invoice.py - Import factures

**Fichier** : `app/workflows/import-invoice.py`

## Description

Importe des factures depuis CSV/JSON.

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.import-invoice] START: format={format}, mapping={mapping}")` | Début import |
| 2 | `print(f"[WORKFLOW.import-invoice] STEP: Décodage fichier base64")` | Décodage |
| 3 | `print(f"[WORKFLOW.import-invoice] DATA: {file_size} octets décodés")` | Taille fichier |
| 4 | `print(f"[WORKFLOW.import-invoice] STEP: Parsing {format}")` | Parsing |
| 5 | `print(f"[WORKFLOW.import-invoice] DATA: {total_lines} lignes trouvées")` | Total lignes |
| 6 | `print(f"[WORKFLOW.import-invoice] STEP: Validation mapping colonnes")` | Validation |
| 7 | `print(f"[WORKFLOW.import-invoice] STEP: Début boucle import ligne par ligne")` | Boucle |
| 8 | `print(f"[WORKFLOW.import-invoice] STEP: Traitement ligne {line_num}/{total_lines}")` | Ligne courante |
| 9 | `print(f"[WORKFLOW.import-invoice] ERROR: Ligne {line_num} invalide - {erreur}")` | Erreur ligne |
| 10 | `print(f"[WORKFLOW.import-invoice] STEP: Insertion facture ref={reference}")` | Insertion |
| 11 | `print(f"[WORKFLOW.import-invoice] SUCCESS: {imported} factures importées")` | Succès |
| 12 | `print(f"[WORKFLOW.import-invoice] END: {errors} erreurs sur {total_lines} lignes")` | Fin |

## Entrée

```json
{
  "fichier": "data:application/csv;base64,...",
  "format": "csv",
  "mapping": {
    "reference": "col_a",
    "montant": "col_b"
  }
}
```

## Sortie

```json
{
  "imported": 50,
  "errors": 2,
  "lines": [...]
}
```
