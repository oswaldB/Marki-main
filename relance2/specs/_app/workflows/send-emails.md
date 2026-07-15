# send-emails.py - Envoi emails

**Fichier** : `app/workflows/send-emails.py`

## Description

Envoie les emails de relance via SMTP.

## Entrée

```json
{
  "relance_ids": [10, 11],
  "profil_smtp_id": 1
}
```

## Sortie

```json
{
  "envoyes": 2,
  "erreurs": 0,
  "details": [
    {"relance_id": 10, "status": "sent", "message_id": "..."}
  ]
}
```

## Logs (print) - OBLIGATOIRE

Chaque étape doit être loguée avec `print()`:

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.send-emails] START: relance_ids={relance_ids}, profil_smtp_id={profil_smtp_id}")` | Début avec paramètres |
| 2 | `print(f"[WORKFLOW.send-emails] STEP: {len(relance_ids)} relances à envoyer")` | Nombre relances |
| 3 | `print(f"[WORKFLOW.send-emails] STEP: Connexion SMTP profil {profil_smtp_id}")` | Connexion SMTP |
| 4 | `print(f"[WORKFLOW.send-emails] DATA: SMTP connecté (server={smtp_server})")` | Connexion réussie |
| 5 | `print(f"[WORKFLOW.send-emails] STEP: Boucle envoi emails")` | Début boucle |
| 6 | `print(f"[WORKFLOW.send-emails] STEP: Préparation email relance_id={relance_id}")` | Préparation chaque email |
| 7 | `print(f"[WORKFLOW.send-emails] DATA: Destinataire={email}, Sujet={sujet}")` | Données email |
| 8 | `print(f"[WORKFLOW.send-emails] STEP: Envoi via SMTP...")` | Tentative envoi |
| 9 | `print(f"[WORKFLOW.send-emails] SUCCESS: Email envoyé, message_id={message_id}")` | Succès envoi |
| 10 | `print(f"[WORKFLOW.send-emails] ERROR: Échec envoi - {erreur}")` | Échec envoi |
| 11 | `print(f"[WORKFLOW.send-emails] STEP: Mise à jour statut relance {relance_id}")` | Mise à jour statut |
| 12 | `print(f"[WORKFLOW.send-emails] SUCCESS: {envoyes}/{total} emails envoyés, {erreurs} erreurs")` | Résumé |
| 13 | `print(f"[WORKFLOW.send-emails] END: Durée={duree}s")` | Fin workflow |
