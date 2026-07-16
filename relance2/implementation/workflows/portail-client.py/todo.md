# TODO - workflows/portail-client.py

## Fichier à créer
`app/workflows/portail-client.py`

## Source de vérité
- **Spec** : `specs/_app/workflows/portail-client.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/workflows/portail-client.md`

2. **Implémenter les checkpoints** :
   ```python
   def portail_client_validate_token(token):
       # @checkpoint 1: Décoder et valider JWT
       # @checkpoint 2: Vérifier contact existe et actif
       # @checkpoint 3: Vérifier expiration token
       # @checkpoint 4: Retourner contact + impayés associés
   
   def portail_client_payer(token, impaye_ids):
       # @checkpoint 1: Valider token
       # @checkpoint 2: Marquer impayés comme payés
       # @checkpoint 3: Créer événement paiement
       # @checkpoint 4: Notifier admin
       
   def portail_client_contester(token, impaye_id, raison):
       # @checkpoint 1: Valider token
       # @checkpoint 2: Marquer impayé comme contesté
       # @checkpoint 3: Créer événement contestation
       # @checkpoint 4: Notifier admin
   ```

3. **Tokens avec expiration** (ex: 30 jours)

## Dépendances
- db.py
- PyJWT

## Check de validation
- [ ] Token validation OK
- [ ] Actions loggées
- [ ] Notifications envoyées
