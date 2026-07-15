# verify-paid-invoices.py - Vérifier payés

**Fichier** : `app/workflows/verify-paid-invoices.py`

## Description

Vérifie quelles factures ont été payées (import bancaire).

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.verify-paid-invoices] START: fichier_paiements reçu")` | Début workflow |
| 2 | `print(f"[WORKFLOW.verify-paid-invoices] STEP: Parsing fichier paiements")` | Parsing |
| 3 | `print(f"[WORKFLOW.verify-paid-invoices] DATA: {len(paiements)} paiements à traiter")` | Nombre paiements |
| 4 | `print(f"[WORKFLOW.verify-paid-invoices] STEP: Recherche impayés correspondants")` | Recherche impayés |
| 5 | `print(f"[WORKFLOW.verify-paid-invoices] DATA: {len(impayes_trouves)} impayés trouvés en base")` | Impayés trouvés |
| 6 | `print(f"[WORKFLOW.verify-paid-invoices] STEP: Comparaison montants et références")` | Comparaison |
| 7 | `print(f"[WORKFLOW.verify-paid-invoices] STEP: Mise à jour statut payés")` | Mise à jour |
| 8 | `print(f"[WORKFLOW.verify-paid-invoices] SUCCESS: {len(payes)} factures marquées payées")` | Résultat |
| 9 | `print(f"[WORKFLOW.verify-paid-invoices] DATA: Total payé={total_paye}€")` | Total |
| 10 | `print(f"[WORKFLOW.verify-paid-invoices] END: Durée={duree}s")` | Fin workflow |

## Entrée

```json
{
  "fichier_paiements": "data:..."
}
```

## Sortie

```json
{
  "payes": [1, 2, 3],
  "total_paye": 5000.00
}
```
