# impayes/alpinejs.md - Spécification Alpine.js

## Description

Initialisation Alpine.js pour la page des impayés.

## Pattern

**Props → Init → Workflows**

## Code

```javascript
// templates/impayes/alpinejs.html
<script>
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener('alpine:init', () => {
        Alpine.data('impayes', () => ({
            // =====================================================
            // 1. PROPS RÉACTIVES (STATE)
            // =====================================================
            
            // UI State
            loading: false,
            error: null,
            
            // Data
            impayes: [],
            currentPage: 1,
            itemsPerPage: 20,
            sortColumn: 'date_echeance',
            sortDirection: 'desc',
            filters: {
                search: '',
                statut: ''
            },
            
            // Getters calculés
            get filteredImpayes() {
                let result = this.impayes;
                
                if (this.filters.search) {
                    const search = this.filters.search.toLowerCase();
                    result = result.filter(i => 
                        i.nfacture?.toLowerCase().includes(search) ||
                        i.payeur_nom?.toLowerCase().includes(search)
                    );
                }
                
                if (this.filters.statut) {
                    result = result.filter(i => i.statut === this.filters.statut);
                }
                
                return result;
            },
            
            get totalPages() {
                return Math.ceil(this.filteredImpayes.length / this.itemsPerPage) || 1;
            },
            
            get paginatedImpayes() {
                const start = (this.currentPage - 1) * this.itemsPerPage;
                const end = start + this.itemsPerPage;
                return this.filteredImpayes.slice(start, end);
            },
            
            // Helpers
            formatMoney(amount) {
                return new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR' 
                }).format(amount);
            },
            
            formatDate(dateStr) {
                if (!dateStr) return '-';
                return new Date(dateStr).toLocaleDateString('fr-FR');
            },
            
            // =====================================================
            // 2. INIT (EN PREMIER)
            // =====================================================
            {% include 'impayes/workflows/initial-load.html' %},
            
            // =====================================================
            // 3. WORKFLOWS
            // =====================================================
            {% include 'impayes/workflows/pagination-next.html' %},
            {% include 'impayes/workflows/pagination-prev.html' %},
            {% include 'impayes/workflows/sort-by-numero.html' %},
            {% include 'impayes/workflows/sort-by-dossier.html' %},
            {% include 'impayes/workflows/sort-by-payeur.html' %},
            {% include 'impayes/workflows/sort-by-montant.html' %},
            {% include 'impayes/workflows/open-detail.html' %},
            {% include 'impayes/workflows/suspend-facture.html' %},
            {% include 'impayes/workflows/unsuspend-facture.html' %},
            {% include 'impayes/workflows/sync-data.html' %}
        }));
    });
</script>
```

## Mockups de Référence

- `mockups/impayes.html`
