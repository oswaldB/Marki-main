# F-012 : Historique et Suivi des Relances

**Personas** : Agent de recouvrement, Responsable commercial, Analyste financier
**Contexte** : Les utilisateurs doivent pouvoir consulter l'historique complet des relances envoyées, suivre leur efficacité, et avoir une traçabilité complète des actions de recouvrement.

## User Stories

### US-012-1
En tant qu'agent de recouvrement
Je veux consulter l'historique des relances envoyées à un client
Afin de connaître le nombre de relances déjà effectuées.

### US-012-2
En tant que responsable commercial
Je veux voir un tableau de bord des relances avec taux d'ouverture
Afin d'évaluer l'efficacité de mes campagnes de recouvrement.

### US-012-3
En tant qu'analyste financier
Je veux exporter l'historique des relances
Afin d'analyser les tendances et délais de paiement.

### US-012-4
En tant qu'agent de recouvrement
Je veux filtrer l'historique par période, par client ou par séquence
Afin de retrouver rapidement une relance spécifique.

### US-012-5
En tant qu'agent de recouvrement
Je veux voir le statut d'une relance (en attente, validée, envoyée, échouée)
Afin de savoir si un client a bien reçu le message.

### US-012-6
En tant que responsable commercial
Je veux voir les statistiques de relances par séquence
Afin d'optimiser mes templates et délais.

## Critères d'acceptation

- Une page "Relances > Historique" liste toutes les relances créées
- Les filtres disponibles : période, client, séquence, statut (valide/envoyée/échouée)
- La vue détail d'une relance montre : contenu, destinataire, date, statut
- Une timeline des relances est visible sur la fiche client
- Les statistiques incluent : taux d'envoi, répartition par séquence, délai moyen
- Un log `[CHECKPOINT] relance-viewed` est émis à la consultation du détail
- Un log `[CHECKPOINT] relance-history-filtered` est émis à l'application de filtres

---

## Modèle de Données

### Classe `Relance` (complément)

```javascript
{
  // ... champs existants ...
  
  "statut": String,              // "brouillon", "valide", "envoyee", "echec"
  "erreurEnvoi": String,         // Message d'erreur SMTP si échec
  "dateValidation": Date,      // Date de validation par l'agent
  "dateEnvoi": Date,             // Date d'envoi effectif
  "ouvertureEmail": Boolean,     // Email ouvert ? (si tracking)
  "dateOuverture": Date,         // Date d'ouverture
  "clics": Number,               // Nombre de clics sur liens
  "ipEnvoi": String,             // IP de l'envoi (traçabilité)
  
  // Relations
  "validePar": Pointer(User),    // Agent ayant validé
  "envoyeePar": Pointer(User),   // Agent ayant envoyé (si différent)
  "contact": Pointer(Contact),   // Destinataire
  "impayes": Array<Pointer(Impaye)> // Impayés concernés
}
```

### Classe `RelanceHistory` (optionnel - pour audit complet)

```javascript
{
  "relance": Pointer(Relance),   // Référence vers la relance
  "action": String,              // "created", "updated", "validated", "sent", "failed"
  "dateAction": Date,            // Date de l'action
  "user": Pointer(User),         // Utilisateur ayant effectué l'action
  "details": Object,             // Détails JSON (champs modifiés, etc.)
  "ipAddress": String            // IP de l'utilisateur
}
```

---

## UI/UX - Liste de l'Historique

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Historique des relances                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filtres :                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ [Filtrer] │
│  │ Période    ▼│ │ Client      ▼│ │ Séquence   ▼│ │ Statut  ▼│             │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Date       │ Client         │ Séquence      │ Montant   │ Statut      ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ 30/06 14:30│ Dupont SARL    │ Relance J+15  │ 12,500 €  │ ✅ Envoyée  ││
│  │ 30/06 11:15│ Martin SA      │ Relance J+30  │ 8,300 €   │ ⏳ Validée  ││
│  │ 29/06 16:45│ Bernard EURL   │ Relance J+15  │ 3,200 €   │ ❌ Échouée  ││
│  │ 29/06 09:00│ Tech Solutions │ Suivi J+7     │ 45,000 €  │ ✅ Envoyée  ││
│  │ ...        │ ...            │ ...           │ ...       │ ...         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  [Précédent] Page 1 sur 12 [Suivant]  [Exporter CSV]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI/UX - Détail d'une Relance

### Vue détail (Slideover)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Détail de la relance                                       [×]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Statut : ✅ Envoyée le 30/06/2024 à 14:30                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Informations                                                       │
│  ─────────────                                                      │
│  Client : Dupont SARL                                             │
│  Email : contact@dupont.fr                                          │
│  Séquence : Relance J+15 (Niveau 1)                                 │
│  Validée par : Jean Dupont                                          │
│  Envoyée par : Jean Dupont                                          │
│                                                                     │
│  Montant : 12,500.00 €                                              │
│  Factures concernées : 3                                            │
│                                                                     │
│  Contenu de l'email                                                 │
│  ───────────────────                                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Objet : Rappel : facture 3 en attente - Dupont SARL          │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │ Bonjour Dupont SARL,                                          │  │
│  │                                                               │  │
│  │ Nous espérons que vous allez bien.                            │  │
│  │ ...                                                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 📋 Factures liées                                             │  │
│  │ ─────────────────                                            │  │
│  │ • FAC-2024-0012 - 5,000.00 € - Échéance: 15/06/2024         │  │
│  │ • FAC-2024-0045 - 4,500.00 € - Échéance: 20/06/2024         │  │
│  │ • FAC-2024-0056 - 3,000.00 € - Échéance: 25/06/2024         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│                                                                     │
│  [Voir le client]  [Renvoyer]  [Supprimer]                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## UI/UX - Timeline sur Fiche Client

```
┌─────────────────────────────────────────────────────────────────────┐
│  Historique des relances                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│     30/06/2024                                                      │
│     ┌──────────────┐                                               │
│  ───│ ✅ Envoyée   │─── Relance J+15 (niveau 1)                     │
│     │ 14:30        │                                               │
│     │ 12,500 €     │                                               │
│     └──────────────┘                                               │
│          │                                                          │
│     15/06/2024                                                      │
│     ┌──────────────┐                                               │
│  ───│ ⏰ Échéance  │─── Facture FAC-2024-0012 créée                 │
│     └──────────────┘                                               │
│                                                                     │
│  [Voir tout l'historique]                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## UI/UX - Tableau de Bord Statistiques

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Statistiques des relances                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  KPIs                                                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │  156         │ │  142         │ │  91%         │ │  12 jours    │      │
│  │ Relances     │ │ Envoyées     │ │ Taux d'envoi │ │ Délai moyen  │      │
│  │ ce mois      │ │ ce mois      │ │              │ │ validation   │      │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                                             │
│  Répartition par séquence                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐│
│  │                                                                        ││
│  │  Relance J+15   ████████████████████████████████  87 (56%)            ││
│  │  Relance J+30   ██████████████████  45 (29%)                         ││
│  │  Relance J+45   ████████  18 (11%)                                    ││
│  │  Mise en demeure ███  6 (4%)                                          ││
│  │                                                                        ││
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  Taux de relance par client (top 10)                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐│
│  │ Client              │ Relances │ Dernier envoi │ Statut               ││
│  │─────────────────────│──────────│───────────────│──────────────────────││
│  │ Dupont SARL         │    3     │  30/06/2024   │ En cours             ││
│  │ Martin SA           │    2     │  28/06/2024   │ En cours             ││
│  │ ...                 │   ...    │     ...       │ ...                  ││
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  Période : [Juin 2024 ▼]  [Exporter rapport]                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Frontend

### Store RelanceHistoryStore

```javascript
import { defineStore } from 'pinia'

export const useRelanceHistoryStore = defineStore('relanceHistory', {
  state: () => ({
    relances: [],
    filtres: {
      dateDebut: null,
      dateFin: null,
      clientId: null,
      sequenceId: null,
      statut: null
    },
    stats: null,
    loading: false,
    pagination: {
      page: 1,
      limit: 20,
      total: 0
    }
  }),

  getters: {
    relancesFiltrees: (state) => {
      return state.relances.filter(r => {
        if (state.filtres.statut && r.statut !== state.filtres.statut) return false;
        return true;
      });
    },
    
    statsParSequence: (state) => {
      if (!state.stats) return [];
      return state.stats.parSequence || [];
    }
  },

  actions: {
    async fetchRelances(params = {}) {
      this.loading = true;
      try {
        const { $parse } = useNuxtApp();
        const Relance = $parse.Object.extend('Relance');
        
        const query = new $parse.Query(Relance);
        query.include(['contact', 'sequence', 'validePar', 'envoyeePar']);
        query.descending('createdAt');
        
        // Appliquer les filtres
        if (params.dateDebut) {
          query.greaterThanOrEqualTo('createdAt', params.dateDebut);
        }
        if (params.dateFin) {
          query.lessThanOrEqualTo('createdAt', params.dateFin);
        }
        if (params.sequenceId) {
          const SequenceRelance = $parse.Object.extend('SequenceRelance');
          query.equalTo('sequence', SequenceRelance.createWithoutData(params.sequenceId));
        }
        if (params.clientId) {
          const Contact = $parse.Object.extend('Contact');
          query.equalTo('contact', Contact.createWithoutData(params.clientId));
        }
        if (params.statut) {
          query.equalTo('statut', params.statut);
        }
        
        // Pagination
        const skip = (this.pagination.page - 1) * this.pagination.limit;
        query.skip(skip);
        query.limit(this.pagination.limit);
        
        const [relances, total] = await Promise.all([
          query.find(),
          query.count()
        ]);
        
        this.relances = relances;
        this.pagination.total = total;
        
        console.log('[CHECKPOINT] relance-history-filtered', { 
          count: relances.length, 
          filtres: params 
        });
        
        return relances;
        
      } catch (error) {
        console.error('[CHECKPOINT] relance-history-error', { error: error.message });
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async getRelanceDetail(id) {
      try {
        const { $parse } = useNuxtApp();
        const Relance = $parse.Object.extend('Relance');
        
        const query = new $parse.Query(Relance);
        query.include(['contact', 'sequence', 'validePar', 'envoyeePar', 'impayes']);
        query.include('impayes.facture');
        
        const relance = await query.get(id);
        
        console.log('[CHECKPOINT] relance-viewed', { id });
        
        return relance;
        
      } catch (error) {
        console.error('[CHECKPOINT] relance-detail-error', { id, error: error.message });
        throw error;
      }
    },

    async fetchStats(periode = 'mois') {
      try {
        // Appel à une Cloud Function pour les stats agrégées
        const { $parse } = useNuxtApp();
        const stats = await $parse.Cloud.run('getRelancesStats', { periode });
        
        this.stats = stats;
        return stats;
        
      } catch (error) {
        console.error('[CHECKPOINT] relance-stats-error', { error: error.message });
        throw error;
      }
    },

    async exporterHistorique(format = 'csv') {
      try {
        const { $parse } = useNuxtApp();
        const result = await $parse.Cloud.run('exportRelances', {
          format,
          filtres: this.filtres
        });
        
        // Télécharger le fichier
        const blob = new Blob([result.data], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('[CHECKPOINT] relance-history-exported', { format });
        
      } catch (error) {
        console.error('[CHECKPOINT] relance-export-error', { error: error.message });
        throw error;
      }
    }
  }
});
```

---

## API Endpoints Cloud Functions

### `getRelancesStats`

```javascript
Parse.Cloud.define("getRelancesStats", async (request) => {
    const { periode = 'mois' } = request.params;
    
    const maintenant = new Date();
    const dateDebut = new Date(maintenant);
    
    if (periode === 'mois') {
        dateDebut.setMonth(dateDebut.getMonth() - 1);
    } else if (periode === 'trimestre') {
        dateDebut.setMonth(dateDebut.getMonth() - 3);
    }
    
    const Relance = Parse.Object.extend('Relance');
    const query = new Parse.Query(Relance);
    query.greaterThanOrEqualTo('createdAt', dateDebut);
    
    const relances = await query.find();
    
    // Calculer les stats
    const stats = {
        total: relances.length,
        envoyees: relances.filter(r => r.get('statut') === 'envoyee').length,
        validees: relances.filter(r => r.get('statut') === 'valide').length,
        echouees: relances.filter(r => r.get('statut') === 'echec').length,
        tauxEnvoi: 0,
        parSequence: {}
    };
    
    stats.tauxEnvoi = stats.total > 0 ? Math.round((stats.envoyees / stats.total) * 100) : 0;
    
    // Stats par séquence
    for (const relance of relances) {
        const seq = relance.get('sequence');
        if (seq) {
            const seqId = seq.id;
            const seqNom = seq.get('nom');
            
            if (!stats.parSequence[seqId]) {
                stats.parSequence[seqId] = {
                    nom: seqNom,
                    count: 0
                };
            }
            stats.parSequence[seqId].count++;
        }
    }
    
    return stats;
});
```

---

## Checkpoints

```
[CHECKPOINT] relance-viewed { id, userId }
[CHECKPOINT] relance-history-filtered { count, filtres }
[CHECKPOINT] relance-history-exported { format, count }
[CHECKPOINT] relance-detail-error { id, error }
[CHECKPOINT] relance-stats-error { error }
[CHECKPOINT] relance-export-error { error }
```

---

## Intégration avec F-007 (Relances Email)

Cette feature est complémentaire de F-007 :
- **F-007** : Création et envoi des relances individuelles
- **F-012** : Historique global, statistiques, traçabilité
