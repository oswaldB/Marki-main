# F-T-LOG : Observabilité / Logging

**Personas** : Système (développeur)
**Contexte** : L'application doit émettre des logs structurés pour faciliter le débogage et le monitoring.

## User Stories

### US-T-LOG-1
En tant que développeur
Je veux que chaque action importante émette un log préfixé `[CHECKPOINT]`
Afin de suivre le parcours utilisateur dans la console.

### US-T-LOG-2
En tant que développeur
Je veux que les erreurs émettent un log `[ERROR]` avec stack trace
Afin de diagnostiquer rapidement les problèmes.

## Critères d'acceptation

- Chaque workflow frontend émet au moins un `[CHECKPOINT]` à son démarrage et à sa fin
- Le format est : `[CHECKPOINT] <workflow-name>: <action>` ou `[ERROR] <context>: <message>`
- Les logs sont visibles dans la console du navigateur
- Les logs backend incluent un timestamp ISO
