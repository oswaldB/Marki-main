# generate-relances.py - Génération relances

**Fichier** : `app/workflows/generate-relances.py`

## Description

Génère automatiquement des relances pour les impayés.

## Entrée

```json
{
  "contact_ids": [1, 2, 3],
  "sequence_id": 1,
  "date_reference": "2024-03-15"
}
```

## Sortie

```json
{
  "generated": 3,
  "relances": [
    {"id": 10, "contact_id": 1, "sequence_id": 1}
  ]
}
```

## Logs (print) - OBLIGATOIRE

Chaque étape doit être loguée avec `print()`:

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.generate-relances] START: contact_ids={contact_ids}, sequence_id={sequence_id}")` | Début du workflow avec paramètres |
| 2 | `print(f"[WORKFLOW.generate-relances] STEP: {len(contact_ids)} contacts à traiter")` | Nombre de contacts reçus |
| 3 | `print(f"[WORKFLOW.generate-relances] STEP: Récupération séquence id={sequence_id}")` | Récupération séquence |
| 4 | `print(f"[WORKFLOW.generate-relances] DATA: Séquence '{sequence_nom}' chargée, {nb_etapes} étapes")` | Données séquence |
| 5 | `print(f"[WORKFLOW.generate-relances] STEP: Boucle traitement contacts")` | Début boucle |
| 6 | `print(f"[WORKFLOW.generate-relances] STEP: Traitement contact_id={contact_id}")` | Chaque contact |
| 7 | `print(f"[WORKFLOW.generate-relances] DATA: {len(impayes_contact)} impayés trouvés pour contact {contact_id}")` | Impayés du contact |
| 8 | `print(f"[WORKFLOW.generate-relances] STEP: Création relance (montant_total={montant})")` | Création relance |
| 9 | `print(f"[WORKFLOW.generate-relances] SUCCESS: Relance {relance_id} créée")` | Relance créée |
| 10 | `print(f"[WORKFLOW.generate-relances] STEP: Association {len(impayes_ids)} impayés à la relance")` | Association impayés |
| 11 | `print(f"[WORKFLOW.generate-relances] SUCCESS: {len(relances_crees)} relances générées sur {len(contact_ids)} contacts")` | Résumé final |
| 12 | `print(f"[WORKFLOW.generate-relances] END: Durée={duree}s")` | Fin workflow |
