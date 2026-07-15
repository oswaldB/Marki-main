# contacts-blacklist.py - Toggle blacklist

**Fichier** : `app/workflows/contacts-blacklist.py`

## Description

Active/désactive le statut blacklist d'un contact.

## Entrée

```json
{
  "contact_id": 123,
  "blacklist": true
}
```

## Sortie

```json
{
  "success": true,
  "contact_id": 123,
  "blacklist": true
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.contacts-blacklist] START: contact_id={contact_id}, action={action}")` | Début workflow toggle blacklist |
| 2 | `print(f"[WORKFLOW.contacts-blacklist] STEP: Validation paramètres entrée")` | Vérif présence contact_id + action |
| 3 | `print(f"[WORKFLOW.contacts-blacklist] ERROR: Champs manquants (contact_id ou action invalide)")` | Input invalide |
| 4 | `print(f"[WORKFLOW.contacts-blacklist] STEP: Recherche contact '{contact_id}' en DB")` | Lookup contact |
| 5 | `print(f"[WORKFLOW.contacts-blacklist] ERROR: Contact '{contact_id}' introuvable")` | Contact not found |
| 6 | `print(f"[WORKFLOW.contacts-blacklist] STEP: Lecture état actuel blacklist")` | Lecture état courant |
| 7 | `print(f"[WORKFLOW.contacts-blacklist] DATA: blacklist_actuel={current_blacklist}, statut={current_status}")` | État avant update |
| 8 | `print(f"[WORKFLOW.contacts-blacklist] STEP: Annulation relances pending/futures associées au contact")` | Si blacklist=True → cancel relances |
| 9 | `print(f"[WORKFLOW.contacts-blacklist] DATA: nb_relances_annulees={nb_relances_cancelled}")` | Compteur relances annulées |
| 10 | `print(f"[WORKFLOW.contacts-blacklist] STEP: Mise à jour DB (UPDATE contacts SET blacklist={new_value})")` | Update DB |
| 11 | `print(f"[WORKFLOW.contacts-blacklist] ERROR: Échec mise à jour DB (rollback transaction)")` | DB update failure |
| 12 | `print(f"[WORKFLOW.contacts-blacklist] STEP: Réactivation relances si unblacklist")` | Si blacklist=False → reactivation |
| 13 | `print(f"[WORKFLOW.contacts-blacklist] SUCCESS: contact_id={contact_id} blacklist={new_blacklist}, relances_impactees={nb_relances_cancelled}")` | Succès toggle |
| 14 | `print(f"[WORKFLOW.contacts-blacklist] END: Durée={duree}ms")` | Fin workflow |
