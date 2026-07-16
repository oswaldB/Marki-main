# TODO - workflows/send-emails.py

## Fichier à créer
`app/workflows/send-emails.py`

## Source de vérité
- **Spec** : `specs/_app/workflows/send-emails.md`

## Instructions

1. **Lire la spec complète** dans `specs/_app/workflows/send-emails.md`

2. **Implémenter les checkpoints** :
   ```python
   def send_emails(relance_ids, smtp_profile_id):
       # @checkpoint 1: Valider les relances (statut brouillon)
       # @checkpoint 2: Récupérer config SMTP
       # @checkpoint 3: Pour chaque relance:
       #   - Générer PDF
       #   - Construire email (to, cc, objet, body)
       #   - Envoyer via SMTP
       #   - Mettre à jour statut
       # @checkpoint 4: Logger les envois
       # @checkpoint 5: Générer rapport
   ```

3. **Gérer les erreurs d'envoi** : marquer en échec, retry possible

4. **Générer les PDFs** via le workflow generate-pdf-links

## Dépendances
- SMTP config
- PDF generation
- db.py

## Check de validation
- [ ] Emails envoyés via SMTP
- [ ] Statuts mis à jour
- [ ] Erreurs gérées
- [ ] PDF attachés
