# generate-pdf-links.py - Liens PDF

**Fichier** : `app/workflows/generate-pdf-links.py`

## Description

Génère des liens sécurisés vers les factures PDF.

## Entrée

```json
{
  "impaye_ids": [1, 2, 3]
}
```

## Sortie

```json
{
  "liens": [
    {"impaye_id": 1, "url": "https://...", "token": "..."}
  ]
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.generate-pdf-links] START: facture_ids={facture_ids}")` | Début génération liens PDF |
| 2 | `print(f"[WORKFLOW.generate-pdf-links] STEP: Validation input (facture_ids non vide)")` | Validation entrée |
| 3 | `print(f"[WORKFLOW.generate-pdf-links] ERROR: facture_ids manquant ou vide")` | Input invalide |
| 4 | `print(f"[WORKFLOW.generate-pdf-links] DATA: {len(facture_ids)} facture(s) à traiter")` | Compteur factures |
| 5 | `print(f"[WORKFLOW.generate-pdf-links] STEP: Lookup factures en DB pour IDs {facture_ids}")` | Recherche DB |
| 6 | `print(f"[WORKFLOW.generate-pdf-links] ERROR: Facture id={fid} introuvable en DB")` | Facture absente |
| 7 | `print(f"[WORKFLOW.generate-pdf-links] STEP: Vérification existence PDF storage pour facture_id={fid}")` | Check storage |
| 8 | `print(f"[WORKFLOW.generate-pdf-links] ERROR: PDF introuvable sur storage pour facture_id={fid}")` | Fichier absent |
| 9 | `print(f"[WORKFLOW.generate-pdf-links] STEP: Génération URL signée HMAC pour facture_id={fid}")` | Génération token |
| 10 | `print(f"[WORKFLOW.generate-pdf-links] ERROR: Échec génération token HMAC pour facture_id={fid}")` | Échec signature |
| 11 | `print(f"[WORKFLOW.generate-pdf-links] STEP: Persistance lien en DB (facture_id={fid}, expires_at={exp})")` | Insert DB |
| 12 | `print(f"[WORKFLOW.generate-pdf-links] ERROR: Échec persistance lien DB pour facture_id={fid}")` | Échec INSERT |
| 13 | `print(f"[WORKFLOW.generate-pdf-links] SUCCESS: Génération terminée, nb_liens={nb_liens}, nb_erreurs={nb_erreurs}")` | Bilan avec compteurs |
| 14 | `print(f"[WORKFLOW.generate-pdf-links] END: Durée={duree}ms")` | Fin workflow |
