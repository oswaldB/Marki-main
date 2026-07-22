# F-007 : Relances email

**Personas** : Agent de recouvrement
**Contexte** : Les agents doivent pouvoir envoyer des emails de relance personnalisés aux clients débiteurs.

## User Stories

### US-007-1
En tant qu'agent de recouvrement
Je veux générer un email de relance pré-rempli depuis la fiche client
Afin de gagner du temps sur la rédaction.

### US-007-2
En tant qu'agent de recouvrement
Je veux personnaliser le message avant envoi
Afin d'adapter le ton selon le client.

### US-007-3
En tant qu'agent de recouvrement
Je veux voir l'historique des relances envoyées à un client
Afin d'éviter les doublons.

### US-007-4
En tant qu'agent de recouvrement
Je veux envoyer une relance en copie à mon responsable
Afin de le tenir informé.

## Critères d'acceptation

- Un bouton "Relancer" est présent sur la fiche client et la liste des factures impayées
- Un modal s'ouvre avec un template d'email pré-rempli (objet + corps)
- Le template inclut automatiquement : nom client, montant dû, factures concernées
- Un éditeur permet de modifier le message avant envoi
- Une case à cocher permet d'ajouter le responsable en CC
- Un log `[CHECKPOINT] relance-opened` est émis à l'ouverture du modal
- Un log `[CHECKPOINT] relance-sent` est émis après envoi réussi
- Un log `[CHECKPOINT] relance-failed` est émis en cas d'erreur SMTP
- La liste des factures concernées est jointe automatiquement
