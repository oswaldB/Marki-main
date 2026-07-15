# generate-suivi.py - Génération suivis

**Fichier** : `app/workflows/generate-suivi.py`

## Description

Génère les actions de suivi pour les relances en cours.

## Entrée

```json
{
  "relance_ids": [10, 11, 12]
}
```

## Sortie

```json
{
  "suivis_generes": 3,
  "a_envoyer_aujourdhui": 2
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.generate-suivi] START: relance_ids={relance_ids}")` | Début workflow |
| 2 | `print(f"[WORKFLOW.generate-suivi] STEP: Validation entrée relance_ids")` | Validation input |
| 3 | `print(f"[WORKFLOW.generate-suivi] ERROR: relance_ids vide ou invalide")` | Input invalide |
| 4 | `print(f"[WORKFLOW.generate-suivi] STEP: Listing impayés à suivre ({nb_impayes} factures)")` | Liste impayés |
| 5 | `print(f"[WORKFLOW.generate-suivi] DATA: suiviSequence={sequence} niveau={niveau}")` | Contexte suivi |
| 6 | `print(f"[WORKFLOW.generate-suivi] STEP: Application règles de suivi (delai, montant, historique)")` | Application règles |
| 7 | `print(f"[WORKFLOW.generate-suivi] DATA: regle_appliquee={regle} action={action}")` | Règle retenue |
| 8 | `print(f"[WORKFLOW.generate-suivi] STEP: Génération contenu email (IA possible) pour facture={facture_id}")` | Génération email |
| 9 | `print(f"[WORKFLOW.generate-suivi] ERROR: Échec génération contenu email IA")` | Echec IA |
| 10 | `print(f"[WORKFLOW.generate-suivi] STEP: Planification envoi pour {date_envoi}")` | Planif envoi |
| 11 | `print(f"[WORKFLOW.generate-suivi] DATA: destinataire={email} sujet={sujet}")` | Infos email |
| 12 | `print(f"[WORKFLOW.generate-suivi] SUCCESS: {suivis_generes} suivis générés, {a_envoyer_aujourdhui} à envoyer aujourd'hui")` | Résultat |
| 13 | `print(f"[WORKFLOW.generate-suivi] END: Durée={duree}ms, envoyés={nb_envoyes}, planifies={nb_planifies}")` | Fin + stats |
