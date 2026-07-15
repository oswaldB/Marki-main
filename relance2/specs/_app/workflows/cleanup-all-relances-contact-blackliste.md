# cleanup-all-relances-contact-blackliste.py - Cleanup all blacklist

**Fichier** : `app/workflows/cleanup-all-relances-contact-blackliste.py`

## Description

Annule toutes les relances de tous les contacts black-listés.

## Entrée

```json
{}
```

## Sortie

```json
{
  "annulees": 15
}
```

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] START: début cleanup des relances des contacts black-listés")` | Début du workflow de cleanup |
| 2 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] STEP: Connexion à la base de données")` | Init connexion DB |
| 3 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] ERROR: Connexion DB échouée: {e}")` | Échec connexion DB |
| 4 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] STEP: Listing des contacts black-listés (is_blackliste=True)")` | Récupération contacts blacklistés |
| 5 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] DATA: {len(contacts_blacklistes)} contacts black-listés trouvés")` | Nombre de contacts concernés |
| 6 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] STEP: Listing des relances associées à ces contacts")` | Jointure relances / contacts |
| 7 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] DATA: {len(relances_a_annuler)} relances identifiées pour annulation")` | Volume de relances à traiter |
| 8 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] STEP: Suppression par batch (taille={BATCH_SIZE})")` | Traitement par lots |
| 9 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] STEP: Batch {batch_idx}/{total_batches} - {len(batch)} relances supprimées")` | Progression batch |
| 10 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] ERROR: Échec suppression batch {batch_idx}: {e}")` | Erreur sur un batch |
| 11 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] DATA: Total supprimé={total_annulees}, échecs={total_erreurs}")` | Compteurs cumulés |
| 12 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] STEP: Calcul des statistiques finales")` | Agrégation stats |
| 13 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] STATS: contacts_blacklistes={nb_contacts}, relances_annulees={nb_annulees}, duree_ms={duree}")` | Stats finales |
| 14 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] SUCCESS: Cleanup terminé, {nb_annulees} relances annulées")` | Succès global |
| 15 | `print(f"[WORKFLOW.cleanup-all-relances-contact-blackliste] END: Durée totale={duree}ms")` | Fin du workflow |
