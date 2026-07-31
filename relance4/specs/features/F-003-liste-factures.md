# F-003 : Liste des factures

**Personas** : Analyste financier, Agent de recouvrement
**Contexte** : Les utilisateurs doivent pouvoir consulter, filtrer et trier toutes les factures.

## User Stories

### US-003-1
En tant qu'agent de recouvrement
Je veux voir la liste de toutes les factures avec numéro, client, date, montant, statut
Afin d'identifier les factures impayées.

### US-003-2
En tant qu'analyste financier
Je veux filtrer par statut (payée, impayée, partiellement payée)
Afin d'affiner ma vue.

### US-003-3
En tant qu'analyste financier
Je veux trier par date ou montant (croissant/décroissant)
Afin de prioriser les analyses.

### US-003-4
En tant qu'agent de recouvrement
Je veux rechercher une facture par numéro ou nom client
Afin de trouver rapidement une facture spécifique.

### US-003-5
En tant qu'agent de recouvrement
Je veux cliquer sur une facture pour voir son détail
Afin d'accéder aux actions disponibles.

## Critères d'acceptation

- Un tableau paginé affiche les factures (50 par page)
- Les colonnes affichées : N° facture, Client, Date émission, Date échéance, Montant TTC, Statut
- Un badge coloré indique le statut (vert=payée, rouge=impayée, orange=partielle)
- Des champs de filtre par statut et date sont présents au-dessus du tableau
- Une barre de recherche filtre en temps réel sur n° et client
- Un clic sur une ligne redirige vers la fiche facture/client
- Un log `[CHECKPOINT] factures-loaded` est émis avec le nombre de résultats
- Un skeleton loader s'affiche pendant le chargement
- Un message "Aucune facture trouvée" s'affiche si la recherche ne retourne rien
