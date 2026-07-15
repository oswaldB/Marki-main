# send-suivi.py - Envoi suivis

**Fichier** : `app/workflows/send-suivi.py`

## Description

Envoie les emails de suivi (relances douces).

## Entrée

```json
{
  "suivi_ids": [100, 101]
}
```

## Sortie

```json
{
  "envoyes": 2,
  "echecs": 0
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.send-suivi] START: Début envoi des suivis planifiés pour {date_jour}")` | Démarrage du workflow |
| 2 | `print(f"[WORKFLOW.send-suivi] STEP: Listing des suivis planifiés aujourd'hui en DB")` | Requête DB filtrée par date_envoi |
| 3 | `print(f"[WORKFLOW.send-suivi] DATA: {nb_suivis} suivi(s) planifié(s) trouvé(s)")` | Nombre de suivis à envoyer |
| 4 | `print(f"[WORKFLOW.send-suivi] ERROR: Aucun suivi à envoyer, fin anticipée")` | Liste vide |
| 5 | `print(f"[WORKFLOW.send-suivi] STEP: Connexion au serveur SMTP {smtp_host}:{smtp_port}")` | Établissement connexion SMTP |
| 6 | `print(f"[WORKFLOW.send-suivi] ERROR: Connexion SMTP échouée - {erreur}")` | Échec connexion/timeout |
| 7 | `print(f"[WORKFLOW.send-suivi] STEP: Début envoi batch sur {nb_suivis} email(s)")` | Boucle d'envoi |
| 8 | `print(f"[WORKFLOW.send-suivi] DATA: Envoi email {i}/{nb_suivis} -> suivi_id={suivi_id}, destinataire={email}")` | Envoi en cours |
| 9 | `print(f"[WORKFLOW.send-suivi] ERROR: Échec envoi suivi_id={suivi_id} - {erreur}")` | Échec sur un email |
| 10 | `print(f"[WORKFLOW.send-suivi] STEP: Marquage suivi_id={suivi_id} comme envoyé en DB")` | Update statut DB |
| 11 | `print(f"[WORKFLOW.send-suivi] STEP: Calcul des statistiques finales")` | Agrégation envoyes/echecs |
| 12 | `print(f"[WORKFLOW.send-suivi] SUCCESS: Envois terminés - envoyes={envoyes}, echecs={echecs}")` | Bilan workflow |
| 13 | `print(f"[WORKFLOW.send-suivi] END: Durée={duree}ms")` | Fin du workflow |
