# TODO - workflows/generate-relances.py

## Fichier à créer
`app/workflows/generate-relances.py`

## Source de vérité
- **Spec** : `specs/_app/workflows/generate-relances.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/workflows/generate-relances.md`

2. **Implémenter les checkpoints** :
   ```python
   def generate_relances(filters=None):
       # @checkpoint 1: Récupérer les impayés éligibles
       # @checkpoint 2: Grouper par contact
       # @checkpoint 3: Pour chaque groupe:
       #   - Vérifier séquence active
       #   - Créer relance avec bonne position
       #   - Générer contenu email (template)
       # @checkpoint 4: Marquer impayés comme "en relance"
       # @checkpoint 5: Logger les relances créées
       # @checkpoint 6: Retourner liste des relances
   ```

3. **Utiliser les templates** de séquences pour les emails

4. **Gérer les cas** :
   - Contact blacklisté → skip
   - Pas de séquence active → skip
   - Relance déjà existante pour cet impayé → skip

## Dépendances
- db.py
- Routes sequences pour templates

## Check de validation
- [ ] Tous les checkpoints passent
- [ ] Relances créées en DB
- [ ] Emails générés avec bon template
- [ ] Cas particuliers gérés
