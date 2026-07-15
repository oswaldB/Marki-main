# app.css - Styles globaux

**Fichier** : `app/static/css/app.css`

## Description

Styles CSS globaux pour l'application Marki.

## Contenu

```css
/* Base styles */
html {
  font-family: 'Inter', system-ui, sans-serif;
}

/* Alpine.js cloak */
[x-cloak] {
  display: none !important;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Toast notifications */
.toast {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 50;
}
```

## Variables Tailwind custom

Configuration étendue via CDN:

```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
      }
    }
  }
}
```
