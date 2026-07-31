# F-008 : Blacklist des Impayés

**Contexte** : Les agents doivent pouvoir exclure certains impayés des processus de relances automatiques et manuelles (litiges, arrangements, factures contestées).

## User Stories

### US-008-1
En tant qu'agent de recouvrement
Je veux marquer un impayé comme "blacklisté"
Afin de suspendre temporairement les relances sur cette facture.

### US-008-2
En tant que responsable commercial
Je veux voir la liste de tous les impayés blacklistés
Afin d'avoir une vision des factures en suspension.

### US-008-3
En tant qu'agent de recouvrement
Je veux retirer un impayé de la blacklist
Afin de reprendre les relances une fois le litige résolu.

### US-008-4
En tant qu'agent de recouvrement
Je veux ajouter un motif de blacklist
Afin de documenter la raison de la suspension (litige, arrangement, etc.).

### US-008-5
En tant que responsable commercial
Je veux qu'un impayé blacklisté soit automatiquement exclu des générations de relances multiples
Afin d'éviter d'envoyer des relances sur des factures en litige.

### US-008-6
En tant qu'agent de recouvrement
Je veux voir visuellement sur la fiche facture qu'un impayé est blacklisté
Afin d'être informé du statut avant toute action manuelle.

### US-008-7
En tant que responsable commercial
Je veux que les relances soient régénérées automatiquement lors d'un blacklist/unblacklist
Afin que les emails planifiés reflètent immédiatement le nouveau statut de l'impayé.

## Critères d'acceptation

- Un bouton "Suspendre les relances" est présent sur la fiche facture/impayé
- Un slideover s'ouvre avec un champ obligatoire "Motif" (texte libre ou prédéfini)
- La date de blacklist est automatiquement enregistrée
- Un badge "Relances suspendues" apparaît sur la fiche avec le motif
- Un log `[CHECKPOINT] impaye-blacklisted` est émis avec l'ID impayé et le motif
- Un log `[CHECKPOINT] impaye-unblacklisted` est émis lors du retrait
- **Lors d'un blacklist** : les relances futures sont régénérées pour exclure cet impayé (si des relances existent en brouillon pour ce contact, elles sont regénérées sans cet impayé)
- **Lors d'un unblacklist** : une relance est regénérée si les critères sont remplis (impayé non soldé, séquence active, etc.)
- Les impayés blacklistés sont exclus du workflow `generate-relances`
- Les impayés blacklistés sont exclus du workflow `generate-suivi`
- Les impayés blacklistés ne peuvent pas être inclus dans une relance manuelle
- Une section "Impayés blacklistés" est accessible depuis le tableau de bord
- La durée moyenne de blacklist est calculée (date blacklist → date déblacklist ou aujourd'hui)

---

## Modèle de Données

### Classe `Impaye` (champs additionnels)

```javascript
{
  "isBlacklisted": Boolean,           // true = relances suspendues
  "blacklistedAt": Date,              // Date de mise en blacklist
  "blacklistMotif": String,           // Raison de la blacklist
  "blacklistMotifType": String,      // Type prédéfini: "litige", "arrangement", "contestation", "autre"
  "blacklistedBy": Pointer(User),    // Utilisateur ayant blacklisté
  "unblacklistedAt": Date,            // Date de retrait de la blacklist
  "unblacklistedBy": Pointer(User)   // Utilisateur ayant déblacklisté
}
```

---

## Workflow Frontend : Gestion de la Blacklist

### Écran : Fiche Impayé / Fiche Facture

**État nominal (impayé non blacklisté)** :
- Badge vert "Relances actives" ou aucun badge
- Bouton "Suspendre les relances" (icône 🚫)
- Au clic : ouverture du slideover de blacklist

**Slideover de Blacklist** (panneau latéral) :
```
┌─────────────────────────────────────────┐
│  Suspendre les relances              [X]│
├─────────────────────────────────────────┤
│                                         │
│  Motif *                                │
│  ┌─────────────────────────────────┐  │
│  │ [Sélectionner un type...      ▼]│  │
│  └─────────────────────────────────┘  │
│                                         │
│  Détail du motif                        │
│  ┌─────────────────────────────────┐  │
│  │ Litige commercial avec le       │  │
│  │ client concernant les montants  │  │
│  │ facturés...                     │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ⚠️ Cet impayé sera exclu de toutes     │
│     les relances automatiques et ne     │
│     pourra pas faire l'objet d'une      │
│     relance manuelle.                   │
│                                         │
│  [Annuler]          [Confirmer]         │
│                                         │
└─────────────────────────────────────────┘
```

**Types prédéfinis de motif** :
- `litige` : Litige commercial/contrat
- `arrangement` : Arrangement de paiement en cours
- `contestation` : Facture contestée par le client
- `procedure` : Procédure judiciaire en cours
- `annulation` : Facture en cours d'annulation/crédit
- `autre` : Autre motif (préciser dans le détail)

**État blacklisté** :
- Badge rouge "🚫 Relances suspendues"
- Affichage du motif et de la date
- Bouton "Réactiver les relances" (icône ▶️)
- Au clic : confirmation puis retrait de la blacklist

**Log des actions** (section historique sur l'impayé - champs Parse standard) :
- `updatedAt` et `updatedBy` tracent la dernière modification
- Les champs `blacklistedAt`/`unblacklistedAt` conservent les dates

---

## Workflow Backend : Exclusion des Blacklistés

### Impact sur `generate-relances`

**Filtre ajouté à l'Étape 2** (après le filtre des contacts blacklistés) :

```javascript
// Filtre 1.6 : Exclure les impayés blacklistés
const impayesSansBlacklistes = impayesSansContactsBlacklistes.filter((impaye) => {
    return impaye.get("isBlacklisted") !== true;
});

logger.info(
    `Filtre 1.6 (exclusion impayés blacklistés): ${impayesSansBlacklistes.length}/${impayesSansContactsBlacklistes.length}`,
);
```

**Ordre des filtres mis à jour** :
1. Filtre 1 : Séquences de type "relances"
2. Filtre 1.5 : Exclusion contacts blacklistés
3. **Filtre 1.6 : Exclusion impayés blacklistés** ← NOUVEAU
4. Filtre 2 : Exclusion déjà relancés
5. Filtre 2bis : Exclusion sans email

### Impact sur `generate-suivi`

**Filtre ajouté à l'Étape 3** (regroupement par contact) :

```javascript
for (const impaye of impayes) {
    // Skip si l'impayé est blacklisté
    if (impaye.get("isBlacklisted") === true) continue;
    
    let contact = impaye.get("contact_relance") || impaye.get("payeur");
    if (!contact) continue;
    
    // ... suite du traitement
}
```

### Impact sur les Relances Manuelles

**Validation dans le store de relances** :

```javascript
// Vérification avant ouverture du modal de relance
async canRelancerImpaye(impayeId) {
    const { $parse } = useNuxtApp()
    const Impaye = $parse.Object.extend('Impaye')
    const impaye = await new $parse.Query(Impaye).get(impayeId)
    
    if (impaye.get('isBlacklisted')) {
        const motif = impaye.get('blacklistMotif') || 'Non spécifié'
        throw new Error(`Cet impayé est suspendu des relances. Motif: ${motif}`)
    }
    return true
}
```

### Régénération des relances (US-008-7)

**Cloud Function `regenerateRelancesForContact`** :

```javascript
Parse.Cloud.define("regenerateRelancesForContact", async (request) => {
    const { contactId, reason, excludeImpayeId } = request.params;
    
    // 1. Supprimer les relances non envoyées (brouillons) pour ce contact
    const Relance = Parse.Object.extend("Relance");
    const query = new Parse.Query(Relance);
    query.equalTo("contact", { __type: "Pointer", className: "Contact", objectId: contactId });
    query.doesNotExist("dateEnvoi"); // Non envoyées
    query.notEqualTo("statut", "envoyee");
    
    const brouillons = await query.find({ useMasterKey: true });
    
    if (brouillons.length > 0) {
        // Supprimer les brouillons existants
        await Parse.Object.destroyAll(brouillons, { useMasterKey: true });
    }
    
    // 2. Si unblacklist (pas d'exclusion), relancer generate-relances pour ce contact seul
    if (!excludeImpayeId) {
        // Appeler le workflow de génération pour ce contact spécifique
        await Parse.Cloud.run("generateRelancesForContact", { contactId });
    }
    
    return { 
        success: true, 
        deletedCount: brouillons.length,
        regenerated: !excludeImpayeId
    };
});
```

---

## Store Frontend : BlacklistImpayeStore

```javascript
import { defineStore } from 'pinia'

export const useBlacklistImpayeStore = defineStore('blacklistImpaye', {
  state: () => ({
    blacklistedImpayes: [],
    loading: false,
    error: null,
    lastFetched: null,
    cacheDuration: 300000 // 5 minutes
  }),

  getters: {
    count: (state) => state.blacklistedImpayes.length,
    
    isBlacklisted: (state) => (impayeId) => {
      return state.blacklistedImpayes.some(i => i.id === impayeId)
    },
    
    getByContact: (state) => (contactId) => {
      return state.blacklistedImpayes.filter(i => {
        const payeur = i.get('payeur')
        const contactRelance = i.get('contact_relance')
        return (payeur && payeur.id === contactId) || 
               (contactRelance && contactRelance.id === contactId)
      })
    },
    
    totalMontant: (state) => {
      return state.blacklistedImpayes.reduce((sum, i) => {
        return sum + (i.get('reste_a_payer') || 0)
      }, 0)
    },
    
    statsByMotif: (state) => {
      const stats = {}
      state.blacklistedImpayes.forEach(i => {
        const motif = i.get('blacklistMotifType') || 'autre'
        stats[motif] = (stats[motif] || 0) + 1
      })
      return stats
    }
  },

  actions: {
    async fetchBlacklistedImpayes(force = false) {
      if (!force && this.hasValidCache) return this.blacklistedImpayes

      this.loading = true
      try {
        const { $parse } = useNuxtApp()
        const Impaye = $parse.Object.extend('Impaye')
        const query = new $parse.Query(Impaye)
        query.equalTo('isBlacklisted', true)
        query.include(['payeur', 'contact_relance', 'sequence'])
        query.descending('blacklistedAt')
        query.limit(1000)
        
        const impayes = await query.find()
        this.blacklistedImpayes = impayes
        this.lastFetched = Date.now()
        return impayes
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.loading = false
      }
    },

    async blacklistImpaye(impayeId, motifType, motifDetail) {
      const { $parse } = useNuxtApp()
      const Impaye = $parse.Object.extend('Impaye')
      
      const impaye = await new $parse.Query(Impaye).get(impayeId)
      const contactId = impaye.get('contact_relance')?.id || impaye.get('payeur')?.id
      
      impaye.set('isBlacklisted', true)
      impaye.set('blacklistedAt', new Date())
      impaye.set('blacklistMotifType', motifType)
      impaye.set('blacklistMotif', motifDetail)
      
      await impaye.save()
      
      // Regénérer les relances du contact pour exclure cet impayé
      if (contactId) {
        await this.regenerateRelances(impayeId, contactId)
      }
      
      // Invalider le cache
      this.lastFetched = null
    },

    async unblacklistImpaye(impayeId) {
      const { $parse } = useNuxtApp()
      const Impaye = $parse.Object.extend('Impaye')
      
      const impaye = await new $parse.Query(Impaye).get(impayeId)
      const contactId = impaye.get('contact_relance')?.id || impaye.get('payeur')?.id
      
      impaye.set('isBlacklisted', false)
      impaye.set('unblacklistedAt', new Date())
      impaye.unset('blacklistMotifType')
      impaye.unset('blacklistMotif')
      
      await impaye.save()
      
      // Regénérer les relances du contact pour potentiellement inclure cet impayé
      if (contactId) {
        await this.regenerateRelances(impayeId, contactId)
      }
      
      // Invalider le cache
      this.lastFetched = null
    },
    
    async regenerateRelances(impayeId, contactId) {
      // Appel Cloud Function pour regénérer les relances du contact
      const { $parse } = useNuxtApp()
      await $parse.Cloud.run('regenerateRelancesForContact', {
        contactId,
        reason: 'blacklist_change',
        excludeImpayeId: impayeId // Si blacklisté, exclure cet impayé
      })
    }
  }
})
```

---

## UI/UX - Tableau des Impayés Blacklistés

**Vue liste accessible depuis le Dashboard** :

| Facture | Client | Montant | Motif | Depuis | Actions |
|---------|--------|---------|-------|--------|---------|
| FAC-2024-0012 | Dupont SARL | 12 500 € | Litige | 15 jours | [Voir] [Réactiver] |
| FAC-2024-0045 | Martin SA | 8 300 € | Arrangement | 3 jours | [Voir] [Réactiver] |
| ... | ... | ... | ... | ... | ... |

**Filtres disponibles** :
- Motif type (litige, arrangement, contestation...)
- Date de blacklist (période)
- Montant (fourchette)
- Client

**Indicateurs** :
- Total impayés blacklistés : XX factures
- Montant total suspendu : XX XXX €
- Durée moyenne de blacklist : XX jours

---

## API Endpoints Cloud Functions

### `blacklistImpaye`
```javascript
Parse.Cloud.define("blacklistImpaye", async (request) => {
    const { impayeId, motifType, motifDetail } = request.params;
    // ... validation et mise à jour
    return { success: true, impayeId };
});
```

### `unblacklistImpaye`
```javascript
Parse.Cloud.define("unblacklistImpaye", async (request) => {
    const { impayeId } = request.params;
    // ... validation et mise à jour
    return { success: true, impayeId };
});
```

### `getBlacklistedImpayes`
```javascript
Parse.Cloud.define("getBlacklistedImpayes", async (request) => {
    // ... récupération avec pagination
    return { results: impayes, total: count };
});
```

### `regenerateRelancesForContact`
```javascript
Parse.Cloud.define("regenerateRelancesForContact", async (request) => {
    const { contactId, reason, excludeImpayeId } = request.params;
    // ... suppression des brouillons et régénération
    return { success: true, deletedCount, regenerated };
});
```

---

## Logs et Monitoring

### Logs applicatifs
- `[CHECKPOINT] impaye-blacklisted` : {impayeId, motifType, motif, userId}
- `[CHECKPOINT] impaye-unblacklisted` : {impayeId, userId}
- `[CHECKPOINT] impaye-blacklist-failed` : {impayeId, error}
- `[CHECKPOINT] relances-regenerated` : {contactId, reason, deletedCount}

### Logs workflow
- `[GENERATE-RELANCES] Exclusion blacklistés` : {countBefore, countAfter}
- `[GENERATE-SUIVI] Exclusion blacklistés` : {countBefore, countAfter}

### Métriques
- Nombre d'impayés blacklistés (total et par motif)
- Durée moyenne de blacklist
- Montant total suspendu
- Taux de déblacklistage (résolution)
- Nombre de régénérations de relances déclenchées