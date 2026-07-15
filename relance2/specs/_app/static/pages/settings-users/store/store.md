# settings-users/store/store.js

Store pour la gestion des utilisateurs.

```javascript
function settingsUsersStore() {
  return {
    users: [],
    selectedUser: null,
    loading: false,
    modalOpen: false,
    modalMode: 'create',
    filter: '',
    
    form: {
      username: '',
      email: '',
      password: '',
      role: 'user'
    },
    
    async init() {
      await this.loadUsers();
    },
    
    async loadUsers() {
      const res = await fetch('/api/users');
      this.users = await res.json();
    },
    
    filteredUsers() {
      if (!this.filter) return this.users;
      return this.users.filter(u => 
        u.username.toLowerCase().includes(this.filter.toLowerCase()) ||
        u.email.toLowerCase().includes(this.filter.toLowerCase())
      );
    },
    
    openCreateModal() {
      this.modalMode = 'create';
      this.form = { username: '', email: '', password: '', role: 'user' };
      this.modalOpen = true;
    },
    
    openEditModal(user) {
      this.modalMode = 'edit';
      this.selectedUser = user;
      this.form = { ...user, password: '' };
      this.modalOpen = true;
    },
    
    async saveUser() {
      const url = this.modalMode === 'create' 
        ? '/api/users' 
        : `/api/users/${this.selectedUser.id}`;
      const method = this.modalMode === 'create' ? 'POST' : 'PUT';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.form)
      });
      
      this.modalOpen = false;
      await this.loadUsers();
    },
    
    async deleteUser(id) {
      if (!confirm('Désactiver cet utilisateur ?')) return;
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      await this.loadUsers();
    },
    
    async resetPassword(id, newPassword) {
      await fetch(`/api/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword })
      });
    }
  }
}
```
