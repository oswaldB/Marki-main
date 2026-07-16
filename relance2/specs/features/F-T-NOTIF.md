# F-T-NOTIF : Notifications / Feedback visuel

**Personas** : Tous les utilisateurs
**Contexte** : L'application doit donner un feedback immédiat sur les actions utilisateur.

## User Stories

### US-T-NOTIF-1
En tant qu'utilisateur
Je veux voir une confirmation visuelle après une action réussie
Afin d'être sûr que mon action a été prise en compte.

### US-T-NOTIF-2
En tant qu'utilisateur
Je veux que les notifications disparaissent automatiquement
Afin de ne pas encombrer l'interface.

## Critères d'acceptation

- Un toast succès (vert) s'affiche après import, export, envoi de relance
- Un toast erreur (rouge) s'affiche en cas d'échec
- Les toasts disparaissent après 4 secondes
- Un maximum de 3 toasts sont affichés simultanément
- Les toasts sont positionnés en haut à droite de l'écran
