# F-T-ERROR : Gestion d'erreurs

**Personas** : Tous les utilisateurs
**Contexte** : L'application doit gérer gracieusement les erreurs et informer l'utilisateur.

## User Stories

### US-T-ERROR-1
En tant qu'utilisateur
Je veux voir un message clair quand une erreur survient
Afin de comprendre ce qui s'est passé.

### US-T-ERROR-2
En tant qu'utilisateur
Je veux pouvoir réessayer une action qui a échoué
Afin de ne pas perdre ma progression.

## Critères d'acceptation

- Une erreur API affiche un toast rouge avec message explicite
- Un bouton "Réessayer" est présent sur les écrans en erreur
- Les erreurs réseau sont détectées et un message "Hors ligne" s'affiche
- Un log `[ERROR]` est émis avec détails techniques
