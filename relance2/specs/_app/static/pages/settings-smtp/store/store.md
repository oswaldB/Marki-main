# settings-smtp/store/store.js

Store pour la gestion des profils SMTP.

```javascript
function settingsSmtpStore() {
  return {
    profils: [],
    selectedProfil: null,
    loading: false,
    modalOpen: false,
    modalMode: 'create', // 'create' ou 'edit'
    
    form: {
      nom: '',
      host: '',
      port: 587,
      username: '',
      password: '',
      use_tls: true,
      is_default: false
    },
    
    async init() {
      await this.loadProfils();
    },
    
    async loadProfils() {
      const res = await fetch('/api/smtp-profiles');
      this.profils = await res.json();
    },
    
    openCreateModal() {
      this.modalMode = 'create';
      this.form = { nom: '', host: '', port: 587, username: '', password: '', use_tls: true, is_default: false };
      this.modalOpen = true;
    },
    
    openEditModal(profil) {
      this.modalMode = 'edit';
      this.selectedProfil = profil;
      this.form = { ...profil };
      this.modalOpen = true;
    },
    
    async saveProfil() {
      const url = this.modalMode === 'create' 
        ? '/api/smtp-profiles' 
        : `/api/smtp-profiles/${this.selectedProfil.id}`;
      const method = this.modalMode === 'create' ? 'POST' : 'PUT';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.form)
      });
      
      this.modalOpen = false;
      await this.loadProfils();
    },
    
    async deleteProfil(id) {
      if (!confirm('Supprimer ce profil ?')) return;
      await fetch(`/api/smtp-profiles/${id}`, { method: 'DELETE' });
      await this.loadProfils();
    },
    
    async testProfil(id) {
      await fetch(`/api/smtp-profiles/${id}/test`, { method: 'POST' });
    }
  }
}
```
