# F-005 : Détection anomalies

**Personas** : Analyste financier, Responsable commercial
**Contexte** : Le système doit automatiquement identifier les clients et factures à risque.

## User Stories

### US-005-1
En tant qu'analyste financier
Je veux voir une liste des clients à risque détectés automatiquement
Afin de prioriser les actions de recouvrement.

### US-005-2
En tant qu'analyste financier
Je veux comprendre pourquoi un client est signalé à risque
Afin d'évaluer la pertinence de l'alerte.

### US-005-3
En tant que responsable commercial
Je veux recevoir des alertes sur les clients dépassant 90 jours de retard
Afin d'agir rapidement sur les créances douteuses.

## Critères d'acceptation

- Une section "Alertes" sur le dashboard liste les clients à risque
- Les critères de détection : DSO > 60 jours, montant impayé > 10k€, retard > 90 jours
- Chaque alerte affiche : nom client, motif de l'alerte, montant concerné
- Un badge indique la sévérité ( critique / warning / info )
- Un clic sur une alerte ouvre la fiche client
- Un log `[CHECKPOINT] alert-generated` est émis pour chaque alerte affichée
- Le système recalcule les alertes après chaque import
- Un bouton "Ignorer" permet de masquer une alerte (avec raison)
