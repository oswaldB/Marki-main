# TODO - workflows/cleanup-orphan-relances.py

## Fichier à créer
`app/workflows/cleanup-orphan-relances.py`

## Source de vérité
- **Spec** : `specs/_app/workflows/cleanup-orphan-relances.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/workflows/cleanup-orphan-relances.md`

2. **Implémenter les checkpoints** :
   ```python
   def cleanup_orphan_relances():
       # @checkpoint 1: Trouver relances sans impayés associés
       # @checkpoint 2: Pour chacune:
       #   - Si statut envoyée et date > 30j → garder (log)
       #   - Sinon → supprimer
       # @checkpoint 3: Logger le nombre nettoyé
   ```

3. **C'est un job de maintenance** à appeler via `/api/cleanup`

## Dépendances
- db.py

## Check de validation
- [ ] Relances orphelines identifiées
- [ ] Log créé
