# impayes-payeur/store/store.js

Store pour la vue par payeur.

```javascript
function impayesPayeurStore() {
  return {
    payeurs: [],
    selectedPayeur: null,
    
    async init() {
      await this.loadPayeurs();
    },
    
    async loadPayeurs() {
      // Agrège les impayés par contact
      const res = await fetch('/api/contacts?with_impayes=true');
      this.payeurs = await res.json();
    },
    
    selectPayeur(payeur) {
      this.selectedPayeur = payeur;
    },
    
    getTotalImpayes(payeurId) {
      const payeur = this.payeurs.find(p => p.id === payeurId);
      return payeur?.impayes?.reduce((sum, i) => sum + i.montant, 0) || 0;
    }
  }
}
```
