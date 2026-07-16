# sequences/alpinejs.md - Spécification Alpine.js

## Description

Initialisation Alpine.js pour la page des séquences.

## Pattern

**Props → Init → Workflows**

## Code

```javascript
// templates/sequences/alpinejs.html
<script>
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener('alpine:init', () => {
        Alpine.data('sequences', () => ({
            // =====================================================
            // 1. PROPS RÉACTIVES (STATE)
            // =====================================================
            
            // UI State
            loading: false,
            error: null,
            showNewSequenceModal: false,
            
            // Data
            sequences: [],
            searchQuery: '',
            filterType: 'all',
            
            // Forms
            newSequence: { nom: '', type: 'relance', description: '' },
            
            // Getters calculés
            get filteredSequences() {
                return this.sequences.filter(s => {
                    const matchesSearch = !this.searchQuery || 
                        s.nom?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                        s.description?.toLowerCase().includes(this.searchQuery.toLowerCase());
                    const matchesType = this.filterType === 'all' || s.type === this.filterType;
                    return matchesSearch && matchesType;
                });
            },
            
            // =====================================================
            // 2. INIT (EN PREMIER)
            // =====================================================
            {% include 'sequences/workflows/initial-load.html' %},
            
            // =====================================================
            // 3. WORKFLOWS
            // =====================================================
            {% include 'sequences/workflows/filter-all.html' %},
            {% include 'sequences/workflows/filter-relance.html' %},
            {% include 'sequences/workflows/filter-suivi.html' %},
            {% include 'sequences/workflows/new-sequence.html' %},
            {% include 'sequences/workflows/create-sequence.html' %},
            {% include 'sequences/workflows/duplicate-sequence.html' %},
            {% include 'sequences/workflows/close-modal.html' %}
        }));
    });
</script>
```

## Mockups de Référence

- `mockups/sequences.html`
