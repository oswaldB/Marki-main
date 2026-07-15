# get-contact-impayes.py - Impayés contact

**Fichier** : `app/workflows/get-contact-impayes.py`

## Description

Récupère les impayés d'un contact avec calcul du total.

## Entrée

```json
{
  "contact_id": 123,
  "statut": "impaye"
}
```

## Sortie

```json
{
  "contact": {...},
  "impayes": [...],
  "total": 3500.00
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.get-contact-impayes] START: contact_id={contact_id}, statut={statut}")` | Début récupération impayés |
| 2 | `print(f"[WORKFLOW.get-contact-impayes] STEP: Validation paramètres entrée")` | Vérif contact_id et statut |
| 3 | `print(f"[WORKFLOW.get-contact-impayes] ERROR: contact_id manquant ou invalide")` | Paramètre manquant |
| 4 | `print(f"[WORKFLOW.get-contact-impayes] STEP: Lookup contact '{contact_id}' en DB")` | Recherche contact |
| 5 | `print(f"[WORKFLOW.get-contact-impayes] ERROR: Contact '{contact_id}' introuvable")` | Contact not found |
| 6 | `print(f"[WORKFLOW.get-contact-impayes] STEP: Query impayés filtrés statut='{statut}'")` | Filtre statut impayé |
| 7 | `print(f"[WORKFLOW.get-contact-impayes] DATA: {nb_impayes} impayés trouvés pour contact_id={contact_id}")` | Compteur résultats |
| 8 | `print(f"[WORKFLOW.get-contact-impayes] STEP: Calcul stats agrégées (total, count, oldest)")` | Agrégation |
| 9 | `print(f"[WORKFLOW.get-contact-impayes] DATA: total={total}€, count={count}, oldest={oldest_date}")` | Stats calculées |
| 10 | `print(f"[WORKFLOW.get-contact-impayes] STEP: Tri impayés par date d'échéance ASC")` | Tri chronologique |
| 11 | `print(f"[WORKFLOW.get-contact-impayes] STEP: Construction réponse JSON")` | Sérialisation |
| 12 | `print(f"[WORKFLOW.get-contact-impayes] SUCCESS: {count} impayés retournés, total={total}€")` | Retour OK |
| 13 | `print(f"[WORKFLOW.get-contact-impayes] END: Durée={duree}ms")` | Fin workflow |
