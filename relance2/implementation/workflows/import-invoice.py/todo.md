# TODO - workflows/import-invoice.py

## Fichier à créer
`app/workflows/import-invoice.py`

## Source de vérité
- **Spec** : `specs/_app/workflows/import-invoice.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/workflows/import-invoice.md`

2. **Implémenter la fonction** :
   ```python
   def import_invoice(data):
       # @checkpoint 1: Valider les champs requis
       # @checkpoint 2: Vérifier si contact existe (créer si non)
       # @checkpoint 3: Créer l'impayé en DB
       # @checkpoint 4: Appliquer règles d'attribution
       # @checkpoint 5: Logger l'import
       # @checkpoint 6: Retourner l'impayé créé
   ```

3. **Gérer la création de contact** si nouveau client

4. **Utiliser le workflow** appliquer-regles-attribution

## Dépendances
- db.py
- workflows/appliquer-regles-attribution.py

## Check de validation
- [ ] Import simple fonctionne
- [ ] Création contact auto OK
- [ ] Règles d'attribution appliquées
