# dashboard/index.html - Dashboard

**Fichier** : `app/static/pages/dashboard/index.html`

## Description

Page principale avec statistiques et vue d'ensemble.

## Structure

```html
<!-- Layout avec sidebar -->
<body x-data="dashboardStore()" x-init="init()">
  <!-- Sidebar navigation -->
  <aside>...Menu...</aside>
  
  <!-- Main content -->
  <main>
    <!-- Cards stats -->
    <div class="grid grid-cols-4">
      <div>Impayés: <span x-text="stats.impayes"></span></div>
      <div>Relances: <span x-text="stats.relances"></span></div>
      <div>Contacts: <span x-text="stats.contacts"></span></div>
      <div>À envoyer: <span x-text="stats.a_envoyer"></span></div>
    </div>
    
    <!-- Graphiques -->
    <div>
      <canvas id="chart"></canvas>
    </div>
    
    <!-- Activité récente -->
    <div>
      <ul>
        <template x-for="event in events">
          <li x-text="event.description"></li>
        </template>
      </ul>
    </div>
  </main>
</body>
```

## Workflows

- `initial-load.js` : Charger stats et activité
- `refresh-stats.js` : Rafraîchir les données

## Mockups

- `mockups/default.html` : Dashboard chargé
- `mockups/empty.html` : Premier démarrage (vide)
