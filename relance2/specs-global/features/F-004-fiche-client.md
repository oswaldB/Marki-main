# F-004 : Fiche client

**Personas** : Analyste financier, Responsable commercial
**Contexte** : Les utilisateurs doivent pouvoir analyser le détail d'un client et son historique.

## User Stories

### US-004-1
En tant que responsable commercial
Je veux voir les informations d'un client (nom, adresse, contact)
Afin de préparer une relance personnalisée.

### US-004-2
En tant qu'analyste financier
Je veux voir l'historique des factures d'un client avec leur statut
Afin d'analyser son comportement de paiement.

### US-004-3
En tant que responsable commercial
Je veux voir le solde débiteur total du client
Afin d'évaluer l'exposition au risque.

### US-004-4
En tant qu'analyste financier
Je veux voir le nombre de jours moyens de retard de ce client
Afin d'identifier les mauvais payeurs.

## Critères d'acceptation

- La fiche client affiche : nom, adresse, email, téléphone
- Une section "Solde débiteur" montre le montant total impayé
- Une section "Score client" affiche un indicateur (A/B/C/D) basé sur l'historique
- Un tableau liste les factures du client (20 dernières par défaut)
- Un bouton "Voir toutes les factures" filtre la liste globale sur ce client
- Un bouton "Relancer" permet d'envoyer un email de relance
- Un log `[CHECKPOINT] client-loaded` est émis avec l'ID client
- Un historique visuel montre la tendance des retards de paiement
