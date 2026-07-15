# login/index.html - Page de connexion

**Fichier** : `app/static/pages/login/index.html`

## Description

Page de connexion utilisateur. Formulaire simple avec email/password.

## Structure HTML

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Marki - Connexion</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <link rel="stylesheet" href="/css/app.css">
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center">
  
  <div x-data="loginStore()" x-init="init()" class="w-full max-w-md">
    <!-- Card -->
    <div class="bg-white rounded-lg shadow-lg p-8">
      
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-800">Marki</h1>
        <p class="text-slate-500 mt-2">Gestion des impayés</p>
      </div>
      
      <!-- Formulaire -->
      <form @submit.prevent="submitLogin()">
        
        <!-- Email -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input 
            type="text" 
            x-model="form.username"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            :class="errors.username && 'border-red-500'"
          >
          <p x-show="errors.username" class="text-red-500 text-sm mt-1" x-text="errors.username"></p>
        </div>
        
        <!-- Password -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Mot de passe
          </label>
          <input 
            type="password" 
            x-model="form.password"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            :class="errors.password && 'border-red-500'"
          >
          <p x-show="errors.password" class="text-red-500 text-sm mt-1" x-text="errors.password"></p>
        </div>
        
        <!-- Submit -->
        <button 
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <span x-show="!loading">Se connecter</span>
          <span x-show="loading">Connexion...</span>
        </button>
        
      </form>
      
      <!-- Erreur globale -->
      <div x-show="error" class="mt-4 p-3 bg-red-50 text-red-700 rounded" x-text="error"></div>
      
    </div>
    
  </div>
  
  <!-- Scripts -->
  <script src="./store/store.js"></script>
  <script src="./workflows/initial-load.js"></script>
  <script src="./workflows/auth-submit.js"></script>
  
</body>
</html>
```

## Workflows liés

- `initial-load.js` : Vérifie si déjà connecté
- `auth-submit.js` : Soumission formulaire

## Mockups

- `mockups/default.html` : Formulaire vierge
- `mockups/erreur.html` : Avec erreurs de validation
- `mockups/loading.html` : État de chargement
