/** Utilitaires partagés pour Marki Frontend */

window.markiUtils = {
  formatMoney(amount, inCents = false) {
    const value = inCents ? amount / 100 : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2
    }).format(value);
  },

  formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  formatRelativeDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return this.formatDate(date);
  },

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  },

  async copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (err) { return false; }
  },

  getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
};

// Exposer globalement
window.formatMoney = window.markiUtils.formatMoney;
window.formatNumber = window.markiUtils.formatNumber;
window.formatDate = window.markiUtils.formatDate;
window.formatRelativeDate = window.markiUtils.formatRelativeDate;
window.getInitials = window.markiUtils.getInitials;
window.copyToClipboard = window.markiUtils.copyToClipboard;
window.getUrlParam = window.markiUtils.getUrlParam;
