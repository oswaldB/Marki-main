# F-002 : Tableau de bord

**Personas** : Analyste financier, Responsable commercial
**Contexte** : Les utilisateurs ont besoin d'une vue d'ensemble des KPIs d'impayés dès la connexion.

## User Stories

### US-002-1
En tant qu'analyste financier
Je veux voir le taux d'impayé global (montant impayé / montant total)
Afin d'évaluer la santé financière du portefeuille client.

### US-002-2
En tant qu'analyste financier
Je veux voir le DSO moyen (Days Sales Outstanding)
Afin de mesurer la rapidité de paiement des clients.

### US-002-3
En tant que responsable commercial
Je veux voir le top 10 des clients débiteurs
Afin de prioriser mes actions de recouvrement.

### US-002-4
En tant qu'analyste financier
Je veux voir un graphique d'évolution des impayés sur 12 mois
Afin d'identifier les tendances.

## Critères d'acceptation

- La page dashboard s'affiche par défaut à la connexion
- La carte "Taux d'impayé" affiche un pourcentage avec indicateur visuel (vert/orange/rouge)
- La carte "DSO moyen" affiche le nombre de jours
- La section "Top 10 débiteurs" liste les clients avec montant décroissant
- Un graphique en barres montre l'évolution mensuelle des impayés
- Un log `[CHECKPOINT] dashboard-loaded` est émis avec les KPIs calculés
- Les données se rafraîchissent automatiquement toutes les 5 minutes
- Un état "empty" s'affiche si aucune donnée n'est importée
