# login/alpinejs.md - Spécification

## Description

Initialisation Alpine.js pour la page de connexion.

## Pattern

**Props → Init → Workflows**

## Code

```javascript
// templates/login/alpinejs.html
<script>    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener('alpine:init', () => {
        Alpine.data('login', () => ({
            // =====================================================
            // 1. PROPS RÉACTIVES (STATE)
            // =====================================================
            
            // UI State
            loading: false,
            error: null,
            
            // Form data
            form: {
                username: '',
                password: ''
            },
            
            // Validation errors
            errors: {
                username: null,
                password: null
            },
            
            // =====================================================
            // 2. INIT (EN PREMIER)
            // =====================================================
            {% include 'login/workflows/initial-load.html' %},
            
            // =====================================================
            // 3. WORKFLOWS (méthodes qui utilisent les props)
            // =====================================================
            {% include 'login/workflows/auth-submit.html' %}
        }));
    });
</script>
```

## Workflows Inclus

| Workflow | Fichier | Description |
|----------|---------|-------------|
| Initial Load | `workflows/initial-load.html` | Vérification de la session et redirection si nécessaire |
| Auth Submit | `workflows/auth-submit.html` | Soumission du formulaire de connexion |

## Props Détaillées

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `loading` | Boolean | `false` | Indique si une action de chargement est en cours |
| `error` | String | `null` | Message d'erreur global pour l'affichage dans l'UI |
| `form.username` | String | `''` | Valeur du champ "identifiant ou email" |
| `form.password` | String | `''` | Valeur du champ "mot de passe" |
| `errors.username` | String | `null` | Message d'erreur lié au champ identifiant |
| `errors.password` | String | `null` | Message d'erreur lié au champ mot de sécurité |

## Points d'attention

- La vérification de la session au `init()` permet de rediriger automatiquement les utilisateurs connectés vers `/dashboard`.

## Validation des Données


### Validation du Formulaire

| Champ | Validation | Message d'erreur |
|-------|------------|------------------|
| `username` | Requis | `errors.username` = "Ce champ est requis" |
| `password` | Requis | `errors.password` = "Ce champ est requis" |

## Résolution des Problèmes

### Erreur de connexion

- Afficher dans `error` le message renvoyé par le backend ou un message générique.
- Ne pas réinitialiser le mot de passe pour permettre à l'utilisateur de corriger l'erreur.

## Changelog

| Date | Auteur | Description |
|------|--------|-------------|
| 2024-07-16 | Assistant | Création de la spécification pour la page de connexion.

## Mockups de Référence

- `mockups/login.html`
