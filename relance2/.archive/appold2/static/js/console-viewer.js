// Console Viewer - s'active avec ?console=true dans l'URL
// Intercepte tous les console.log/error/warn et affiche une fenêtre flottante

(function() {
  // Vérifier si le paramètre console=true est présent
  if (!window.location.search.includes('console=true')) return;

  const logs = [];
  let isMinimized = false;
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  // Détecter si on est sur mobile
  const isMobile = window.innerWidth <= 768;

  // Fonction pour formater n'importe quel argument (objet Error inclus)
  function formatArg(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    
    // Gérer les objets Error
    if (arg instanceof Error) {
      let result = `Error: ${arg.message}`;
      if (arg.stack) {
        // Garder seulement les 3 premières lignes de la stack pour éviter le bruit
        const stackLines = arg.stack.split('\n').slice(0, 4);
        result += '\n' + stackLines.join('\n');
      }
      return result;
    }
    
    // Gérer les objets Response (fetch errors)
    if (arg instanceof Response) {
      return `Response { status: ${arg.status}, statusText: "${arg.statusText}" }`;
    }
    
    if (typeof arg === 'object') {
      try {
        // Essayer de sérialiser proprement
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return '[Object circulaire]';
      }
    }
    
    if (typeof arg === 'function') {
      return `[Function: ${arg.name || 'anonymous'}]`;
    }
    
    return String(arg);
  }

  // Intercepter tous les niveaux de console
  ['log', 'error', 'warn', 'info', 'debug'].forEach(level => {
    const original = console[level];
    console[level] = function(...args) {
      const formattedMessage = args.map(formatArg).join(' ');
      
      logs.push({
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
        level: level,
        message: formattedMessage
      });
      
      // Appeler la console originale
      original.apply(console, args);
      updateViewer();
    };
  });
  
  // Intercepter aussi les erreurs non catchées (exceptions)
  window.addEventListener('error', (event) => {
    logs.push({
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
      level: 'error',
      message: `Uncaught Error: ${event.message}\n  at ${event.filename}:${event.lineno}:${event.colno}`
    });
    updateViewer();
  });
  
  // Intercepter les rejets de Promesses non gérés
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    let message = 'Unhandled Promise Rejection: ';
    if (reason instanceof Error) {
      message += reason.message;
      if (reason.stack) {
        message += '\n' + reason.stack.split('\n').slice(0, 3).join('\n');
      }
    } else if (typeof reason === 'object') {
      message += JSON.stringify(reason);
    } else {
      message += String(reason);
    }
    
    logs.push({
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
      level: 'error',
      message: message
    });
    updateViewer();
  });

  // Ajouter les styles CSS responsives
  const styles = document.createElement('style');
  styles.textContent = `
    #console-viewer {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 700px;
      max-height: 500px;
      background: #1e293b;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 12px;
      border: 1px solid #334155;
      transition: all 0.3s ease;
    }

    #console-viewer.minimized {
      width: auto !important;
      height: auto !important;
      max-height: 50px !important;
    }

    #console-viewer.minimized #console-logs,
    #console-viewer.minimized .console-actions {
      display: none !important;
    }

    #console-header {
      padding: 14px 18px;
      background: #0f172a;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
      cursor: pointer;
      user-select: none;
    }

    #console-viewer.minimized #console-header {
      border-radius: 12px;
      border-bottom: none;
    }

    #console-title {
      color: #94a3b8;
      font-weight: 600;
      font-size: 13px;
      white-space: nowrap;
    }

    .console-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .console-btn {
      padding: 6px 14px;
      background: #334155;
      color: #e2e8f0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      transition: background 0.2s;
    }

    .console-btn:hover {
      background: #475569;
    }

    .console-btn-close {
      background: #ef4444;
      padding: 6px 12px;
    }

    .console-btn-close:hover {
      background: #dc2626;
    }

    .console-btn-minimize {
      background: #f59e0b;
      padding: 6px 10px;
    }

    .console-btn-minimize:hover {
      background: #d97706;
    }

    #console-logs {
      overflow-y: auto;
      padding: 14px;
      max-height: 400px;
      color: #e2e8f0;
      line-height: 1.6;
    }

    /* === RESPONSIVE === */
    
    /* Tablette */
    @media (max-width: 1024px) {
      #console-viewer {
        width: 500px;
        max-height: 450px;
      }
      #console-logs {
        max-height: 350px;
      }
    }

    /* Mobile */
    @media (max-width: 768px) {
      #console-viewer {
        width: calc(100vw - 20px);
        left: 10px;
        right: 10px;
        bottom: 10px;
        max-height: 60vh;
        border-radius: 10px;
      }

      #console-header {
        padding: 10px 14px;
        border-radius: 10px 10px 0 0;
      }

      #console-viewer.minimized #console-header {
        border-radius: 10px;
      }

      #console-title {
        font-size: 12px;
      }

      .console-actions {
        gap: 6px;
      }

      .console-btn {
        padding: 5px 10px;
        font-size: 11px;
      }

      .console-btn .btn-text {
        display: none;
      }

      #console-logs {
        padding: 10px;
        max-height: calc(60vh - 60px);
        font-size: 11px;
      }

      .console-log-entry {
        margin-bottom: 6px;
        padding: 8px 10px;
      }

      .console-log-entry pre {
        font-size: 11px;
      }
    }

    /* Très petits écrans */
    @media (max-width: 380px) {
      .console-btn {
        padding: 4px 8px;
      }
    }
  `;
  document.head.appendChild(styles);

  // Créer la fenêtre flottante
  const viewerHTML = `
    <div id="console-viewer">
      <div id="console-header">
        <span id="console-title">🐛 Console Web</span>
        <div class="console-actions">
          <button class="console-btn console-btn-minimize" id="console-minimize" title="Minimiser">
            <span class="btn-text">🗕️</span>
            <span class="minimize-icon">🗕️</span>
          </button>
          <button class="console-btn" id="console-copy" title="Copier tout">
            <span class="btn-text">📋 Copier</span>
            <span class="minimize-icon">📋</span>
          </button>
          <button class="console-btn" id="console-clear" title="Vider">
            <span class="btn-text">🗑️ Vider</span>
            <span class="minimize-icon">🗑️</span>
          </button>
          <button class="console-btn console-btn-close" id="console-close" title="Fermer">✕</button>
        </div>
      </div>
      <div id="console-logs"></div>
    </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = viewerHTML;
  document.body.appendChild(wrapper.firstElementChild);

  // Gestionnaires d'événements
  const viewer = document.getElementById('console-viewer');
  const header = document.getElementById('console-header');

  document.getElementById('console-close').addEventListener('click', (e) => {
    e.stopPropagation();
    viewer.remove();
    // Restaurer les consoles originales
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.info = originalInfo;
    console.debug = originalDebug;
  });

  document.getElementById('console-clear').addEventListener('click', (e) => {
    e.stopPropagation();
    logs.length = 0;
    updateViewer();
  });

  document.getElementById('console-copy').addEventListener('click', (e) => {
    e.stopPropagation();
    if (logs.length === 0) {
      originalLog.call(console, '%c📋 Aucun log à copier', 'color: #64748b;');
      return;
    }
    const text = logs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      originalLog.call(console, '%c📋 Logs copiés dans le presse-papiers !', 'color: #22c55e; font-weight: bold;');
      const btn = document.getElementById('console-copy');
      const originalText = btn.querySelector('.btn-text')?.textContent || '📋';
      const textSpan = btn.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = '✅ Copié !';
      setTimeout(() => {
        if (textSpan) textSpan.textContent = originalText;
      }, 1500);
    });
  });

  // Minimize / Restore
  document.getElementById('console-minimize').addEventListener('click', (e) => {
    e.stopPropagation();
    isMinimized = !isMinimized;
    viewer.classList.toggle('minimized', isMinimized);
    const minimizeBtn = document.getElementById('console-minimize');
    minimizeBtn.title = isMinimized ? 'Restaurer' : 'Minimiser';
    minimizeBtn.querySelector('.minimize-icon').textContent = isMinimized ? '🗖️' : '🗕️';
  });

  // Click sur header pour minimize/restore (sauf sur les boutons)
  header.addEventListener('click', () => {
    if (isMinimized) {
      isMinimized = false;
      viewer.classList.remove('minimized');
      const minimizeBtn = document.getElementById('console-minimize');
      minimizeBtn.title = 'Minimiser';
      minimizeBtn.querySelector('.minimize-icon').textContent = '🗕️';
    }
  });

  // Gestion du redimensionnement de la fenêtre
  window.addEventListener('resize', () => {
    const newIsMobile = window.innerWidth <= 768;
    // La mise à jour se fait automatiquement via CSS media queries
  });

  function updateViewer() {
    const container = document.getElementById('console-logs');
    const title = document.getElementById('console-title');
    if (!container || !title) return;

    const countText = `🐛 Console Web (${logs.length})`;
    title.textContent = isMobile && logs.length > 99 ? `🐛 (${logs.length})` : countText;

    if (logs.length === 0) {
      container.innerHTML = '<div style="color: #64748b; text-align: center; padding: 40px;">Aucun log pour le moment...</div>';
      return;
    }

    container.innerHTML = logs.map(log => {
      const borderColor = {
        error: '#ef4444',
        warn: '#f59e0b',
        info: '#3b82f6',
        debug: '#22c55e',
        log: '#94a3b8'
      }[log.level] || '#94a3b8';

      const bgColor = {
        error: '#450a0a',
        warn: '#422006',
        info: '#172554',
        debug: '#052e16',
        log: '#1e293b'
      }[log.level] || '#1e293b';

      const levelColor = {
        error: '#fca5a5',
        warn: '#fcd34d',
        info: '#93c5fd',
        debug: '#86efac',
        log: '#e2e8f0'
      }[log.level] || '#e2e8f0';

      // Sur mobile, compacter l'affichage
      const timeDisplay = isMobile 
        ? `<span style="color: #64748b; font-size: 9px;">${log.time.split(':').slice(0,2).join(':')}</span>`
        : `<span style="color: #64748b; font-size: 10px;">${log.time}</span>`;

      return `
        <div class="console-log-entry" style="
          margin-bottom: 8px;
          padding: 10px 12px;
          background: ${bgColor};
          border-radius: 6px;
          border-left: 3px solid ${borderColor};
        ">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
            ${timeDisplay}
            <span style="
              color: ${levelColor};
              font-weight: 600;
              text-transform: uppercase;
              font-size: 9px;
              padding: 2px 6px;
              background: rgba(0,0,0,0.3);
              border-radius: 3px;
            ">${log.level}</span>
          </div>
          <pre style="
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            color: #f1f5f9;
            font-family: inherit;
            font-size: inherit;
          ">${log.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  // Message initial
  setTimeout(() => {
    originalLog.call(console, '%c🐛 Console Viewer actif', 'color: #22c55e; font-weight: bold; font-size: 14px;');
    originalLog.call(console, '%c• Ajoute ?console=true à l\'URL pour afficher', 'color: #64748b;');
    originalLog.call(console, '%c• Cliquez sur 🗕️ pour minimiser', 'color: #64748b;');
    originalLog.call(console, '%c• Responsive: s\'adapte automatiquement au mobile', 'color: #64748b;');
  }, 100);
})();
