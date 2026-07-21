# F-001 : Import de données

**Personas** : Analyste financier
**Contexte** : L'analyste doit pouvoir charger des fichiers de factures pour les analyser dans l'application.

## User Stories

### US-001-1
En tant qu'analyste financier
Je veux uploader un fichier CSV ou Excel contenant les factures
Afin d'alimenter la base de données pour analyse.

### US-001-2
En tant qu'analyste financier
Je veux voir un aperçu des données importées avant validation
Afin de vérifier que le mapping des colonnes est correct.

### US-001-3
En tant qu'analyste financier
Je veux être notifié des erreurs de format ou de données manquantes
Afin de corriger mon fichier source.

## Critères d'acceptation

- Un bouton "Importer" est visible sur la page d'accueil
- Le système accepte les formats .csv, .xlsx, .xls
- Un modal d'aperçu affiche les 10 premières lignes avec mapping des colonnes
- Un log `[CHECKPOINT] import-started` est émis au début du traitement
- Un log `[CHECKPOINT] import-success` est émis avec le nombre de lignes importées
- Un log `[CHECKPOINT] import-error` est émis en cas d'erreur avec le détail
- Un toast de succès s'affiche avec le nombre de factures importées
- Un message d'erreur clair s'affiche si le format est invalide
