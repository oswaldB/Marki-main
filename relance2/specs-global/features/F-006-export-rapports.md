# F-006 : Export rapports

**Personas** : Analyste financier, Responsable commercial
**Contexte** : Les utilisateurs doivent pouvoir exporter les analyses au format PDF ou Excel.

## User Stories

### US-006-1
En tant qu'analyste financier
Je veux exporter le tableau de bord au format PDF
Afin de l'insérer dans un rapport de direction.

### US-006-2
En tant qu'analyste financier
Je veux exporter la liste des factures filtrées au format Excel
Afin de faire des analyses complémentaires.

### US-006-3
En tant que responsable commercial
Je veux exporter la liste des clients à risque
Afin de la partager avec l'équipe recouvrement.

## Critères d'acceptation

- Un bouton "Exporter" est présent sur chaque écran avec données
- Le format PDF génère un rapport formaté avec logo et date
- Le format Excel contient les données brutes avec filtres activables
- Un modal permet de choisir le format et le nom du fichier
- Le fichier se télécharge automatiquement après génération
- Un log `[CHECKPOINT] export-started` est émis avec le format choisi
- Un log `[CHECKPOINT] export-success` est émis avec la taille du fichier
- Un toast confirme la réussite de l'export
