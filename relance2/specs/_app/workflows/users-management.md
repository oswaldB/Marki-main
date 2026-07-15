# users-management.py - Gestion users

**Fichier** : `app/workflows/users-management.py`

## Description

CRUD avancé utilisateurs avec validations.

## Actions

- `create`: Créer utilisateur
- `update`: Modifier utilisateur
- `delete`: Désactiver utilisateur
- `reset_password`: Reset mot de passe

## Entrée

```json
{
  "action": "create",
  "data": {
    "username": "newuser",
    "email": "user@marki.fr",
    "role": "user"
  }
}
```

## Sortie

```json
{
  "success": true,
  "user_id": 5
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.users-management] START: action={action} user_id={user_id}")` | Début du workflow |
| 2 | `print(f"[WORKFLOW.users-management] STEP: Validation champs requis (action, data)")` | Validation de l'entrée |
| 3 | `print(f"[WORKFLOW.users-management] ERROR: Action invalide '{action}'")` | Action inconnue (ni create/read/update/delete/reset_password) |
| 4 | `print(f"[WORKFLOW.users-management] STEP: Vérification droits admin user_id={user_id}")` | Contrôle permissions (admin requis) |
| 5 | `print(f"[WORKFLOW.users-management] ERROR: Droits insuffisants user_id={user_id}")` | Non autorisé (rôle ≠ admin) |
| 6 | `print(f"[WORKFLOW.users-management] STEP: Recherche user '{username}' en DB")` | Lookup utilisateur |
| 7 | `print(f"[WORKFLOW.users-management] DATA: User trouvé id={user_id} role={role} active={active}")` | User trouvé (jamais de pwd) |
| 8 | `print(f"[WORKFLOW.users-management] ERROR: Username déjà pris (action=create)")` | Conflit unicité sur create |
| 9 | `print(f"[WORKFLOW.users-management] ERROR: User non trouvé id={user_id}")` | Not found sur update/delete/reset |
| 10 | `print(f"[WORKFLOW.users-management] STEP: Hash bcrypt password (JAMAIS loggé en clair)")` | Hashage - mot de passe strictement hors logs |
| 11 | `print(f"[WORKFLOW.users-management] STEP: Persistance DB action={action} user_id={user_id}")` | Insert / Update / Soft delete |
| 12 | `print(f"[WORKFLOW.users-management] STEP: Reset password hash user_id={user_id} (action=reset_password)")` | Reset password (hash seul) |
| 13 | `print(f"[WORKFLOW.users-management] STEP: Mise à jour stats (users_total, users_active)")` | Compteurs/stats |
| 14 | `print(f"[WORKFLOW.users-management] ERROR: Échec opération DB - {erreur}")` | Erreur SQL / contrainte |
| 15 | `print(f"[WORKFLOW.users-management] SUCCESS: action={action} user_id={user_id}")` | Opération réussie |
| 16 | `print(f"[WORKFLOW.users-management] END: Durée={duree}ms")` | Fin du workflow |
