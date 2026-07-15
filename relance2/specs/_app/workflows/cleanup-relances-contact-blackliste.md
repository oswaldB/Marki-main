# cleanup-relances-contact-blackliste.py - Cleanup blacklist

**Fichier** : `app/workflows/cleanup-relances-contact-blackliste.py`

## Description

Annule les relances des contacts black-listés.

## Entrée

```json
{
  "contact_id": 123
}
```

## Sortie

```json
{
  "annulees": 2
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] START: contact_id={contact_id}")` | Début cleanup |
| 2 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] STEP: Validation paramètre contact_id")` | Validation input |
| 3 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] ERROR: contact_id manquant ou invalide")` | Missing/invalid id |
| 4 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] STEP: Recherche du contact '{contact_id}' en DB")` | Recherche DB |
| 5 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] ERROR: Contact '{contact_id}' non trouvé")` | Not found |
| 6 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] STEP: Vérification statut blacklist du contact")` | Check blacklist |
| 7 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] ERROR: Contact '{contact_id}' non blacklisté, cleanup annulé")` | Not blacklisted |
| 8 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] STEP: Listing des relances actives du contact '{contact_id}'")` | Listing relances |
| 9 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] DATA: {nb_relances} relance(s) trouvée(s) pour contact '{contact_id}'")` | Compteur relances |
| 10 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] STEP: Suppression des {nb_relances} relance(s)")` | Action suppression |
| 11 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] ERROR: Échec suppression relances contact '{contact_id}'")` | DB delete failed |
| 12 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] SUCCESS: {annulees} relance(s) annulée(s) pour contact '{contact_id}'")` | Stats finales |
| 13 | `print(f"[WORKFLOW.cleanup-relances-contact-blackliste] END: Durée={duree}ms, annulees={annulees}")` | Fin workflow |
