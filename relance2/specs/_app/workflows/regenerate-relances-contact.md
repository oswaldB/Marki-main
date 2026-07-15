# regenerate-relances-contact.py - Régénérer contact

**Fichier** : `app/workflows/regenerate-relances-contact.py`

## Description

Régénère les relances d'un contact.

## Entrée

```json
{
  "contact_id": 123,
  "nouvelle_sequence_id": 2
}
```

## Sortie

```json
{
  "regenerees": 1
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.regenerate-relances-contact] START: contact_id={contact_id}, nouvelle_sequence_id={nouvelle_sequence_id}")` | Début régénération |
| 2 | `print(f"[WORKFLOW.regenerate-relances-contact] STEP: Validation paramètres entrée")` | Validation input |
| 3 | `print(f"[WORKFLOW.regenerate-relances-contact] ERROR: contact_id manquant ou invalide")` | Missing/invalid field |
| 4 | `print(f"[WORKFLOW.regenerate-relances-contact] STEP: Recherche contact '{contact_id}' en DB")` | Recherche contact |
| 5 | `print(f"[WORKFLOW.regenerate-relances-contact] ERROR: Contact {contact_id} introuvable")` | Not found |
| 6 | `print(f"[WORKFLOW.regenerate-relances-contact] DATA: Listing impayés du contact (count={nb_impayes})")` | Liste impayés |
| 7 | `print(f"[WORKFLOW.regenerate-relances-contact] ERROR: Aucun impayé pour contact {contact_id}")` | No unpaid invoices |
| 8 | `print(f"[WORKFLOW.regenerate-relances-contact] STEP: Listing séquence applicable id={nouvelle_sequence_id}")` | Fetch sequence |
| 9 | `print(f"[WORKFLOW.regenerate-relances-contact] ERROR: Séquence {nouvelle_sequence_id} introuvable")` | Sequence not found |
| 10 | `print(f"[WORKFLOW.regenerate-relances-contact] STEP: Suppression anciennes relances du contact (count={nb_anciennes})")` | Cleanup old |
| 11 | `print(f"[WORKFLOW.regenerate-relances-contact] STEP: Création nouvelles relances ({nb_nouvelles} créées)")` | Generate new |
| 12 | `print(f"[WORKFLOW.regenerate-relances-contact] DATA: Stats: {regenerees} relances générées, {total_montant}€ total")` | Stats output |
| 13 | `print(f"[WORKFLOW.regenerate-relances-contact] SUCCESS: Régénération terminée, regenerees={regenerees}")` | Success |
| 14 | `print(f"[WORKFLOW.regenerate-relances-contact] END: Durée={duree}ms")` | End |
