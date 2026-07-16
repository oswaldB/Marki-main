# TODO - workflows/generate-suivi.py

## Fichier à créer
`app/workflows/generate-suivi.py`

## Source de vérité
- **Spec** : `specs/_app/workflows/generate-suivi.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/workflows/generate-suivi.md`

2. **Implémenter les checkpoints** :
   ```python
   def generate_suivi(relance_id):
       # @checkpoint 1: Récupérer la relance
       # @checkpoint 2: Créer entrée suivi avec statut et note
       # @checkpoint 3: Mettre à jour date_dernier_suivi
       # @checkpoint 4: Logger l'événement
       # @checkpoint 5: Retourner le suivi créé
   ```

3. **Gérer les statuts** : en_cours, promesse_payee, conteste, injoignable

## Dépendances
- db.py

## Check de validation
- [ ] Suivi créé en DB
- [ ] Date de dernière relance mise à jour
