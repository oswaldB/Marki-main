# F-011 : Configuration des Séquences de Relances

**Personas** : Responsable commercial, Administrateur
**Contexte** : Les entreprises doivent pouvoir configurer leurs propres séquences de relances (J+15, J+30, J+45) avec des templates d'emails personnalisés pour chaque niveau.

## User Stories

### US-011-1
En tant que responsable commercial
Je veux créer une nouvelle séquence de relances
Afin d'ajouter un niveau de relance supplémentaire.

### US-011-2
En tant que responsable commercial
Je veux définir le délai (en jours) d'une séquence
Afin de contrôler quand la relance sera générée.

### US-011-3
En tant que responsable commercial
Je veux personnaliser le template d'email pour chaque séquence
Afin d'adapter le ton selon l'ancienneté de l'impayé.

### US-011-4
En tant que responsable commercial
Je veux activer/désactiver une séquence
Afin de suspendre temporairement un niveau de relance.

### US-011-5
En tant que responsable commercial
Je veux voir la liste de toutes les séquences configurées
Afin d'avoir une vue d'ensemble de ma politique de recouvrement.

### US-011-6
En tant que responsable commercial
Je veux réorganiser l'ordre des séquences
Afin de modifier la progression des niveaux de relance.

## Critères d'acceptation

- Une page "Configuration > Séquences de relances" est accessible
- Le formulaire de création inclut : nom, type, niveau, délai en jours, templates
- Les templates supportent les variables ({{contact_nom}}, {{montant_total}}, etc.)
- Un éditeur WYSIWYG est disponible pour le template de corps
- Les séquences peuvent être activées/désactivées individuellement
- Un aperçu du rendu email est disponible avant sauvegarde
- Un log `[CHECKPOINT] sequence-created` est émis à la création
- Un log `[CHECKPOINT] sequence-updated` est émis à la modification
- Un log `[CHECKPOINT] sequence-deleted` est émis à la suppression

---

## Modèle de Données

### Classe `SequenceRelance`

```javascript
{
  "nom": String,                    // Nom affiché (ex: "Relance J+15")
  "type": String,                   // "relances" ou "suivi"
  "niveau": Number,                 // Ordre dans la séquence (1, 2, 3...)
  "delaiJours": Number,             // Nombre de jours après échéance
  "templateSujet": String,          // Template de l'objet
  "templateCorps": String,          // Template HTML du corps
  "estActive": Boolean,             // Activer/désactiver
  "description": String,            // Description interne
  "createdAt": Date,
  "updatedAt": Date
}
```

---

## Variables de Template Disponibles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{contact_nom}}` | Nom du contact | "Dupont SARL" |
| `{{contact_email}}` | Email du contact | "contact@dupont.fr" |
| `{{montant_total}}` | Montant total dû | "12,500.00" |
| `{{nb_factures}}` | Nombre de factures concernées | "3" |
| `{{date_jour}}` | Date du jour | "30/06/2024" |
| `{{date_echeance_ancienne}}` | Date de la plus ancienne échéance | "15/06/2024" |
| `{{liste_factures}}` | Liste HTML des factures | Tableau HTML |

---

## UI/UX - Liste des Séquences

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Séquences de relances                                      [+ Nouvelle]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────┬────────────────┬──────────┬──────────────┬──────────┬──────────┐  │
│  │ Niv │ Nom            │ Délai    │ Type         │ Statut   │ Actions  │  │
│  ├─────┼────────────────┼──────────┼──────────────┼──────────┼──────────┤  │
│  │ 1   │ Relance amicale│ J+15     │ Relances     │ ✅ Active│ ⚙️ 🗑️   │  │
│  │ 2   │ Relance ferme  │ J+30     │ Relances     │ ✅ Active│ ⚙️ 🗑️   │  │
│  │ 3   │ Mise en demeure│ J+45     │ Relances     │ ⏸️ Pause │ ⚙️ 🗑️   │  │
│  │ 1   │ Suivi client   │ J+7      │ Suivi        │ ✅ Active│ ⚙️ 🗑️   │  │
│  └─────┴────────────────┴──────────┴──────────────┴──────────┴──────────┘  │
│                                                                             │
│  Légende :                                                                  │
│  - Relances : Emails de relance des impayés                               │
│  - Suivi : Emails de suivi préventif                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI/UX - Formulaire Création/Édition

### Slideover de création

```
┌─────────────────────────────────────────────────────────────────────┐
│  Nouvelle séquence de relances                            [×]        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Informations générales                                             │
│  ─────────────────────────                                          │
│                                                                     │
│  Nom *                                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Relance amicale                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Type *                                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [Relances  ▼]                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Niveau *                                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1                                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Délai (jours après échéance) *                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 15                                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Description                                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Première relance, ton amical mais professionnel              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Template de l'email                                                │
│  ───────────────────────                                            │
│                                                                     │
│  Objet *                                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Rappel : facture {{nb_factures}} en attente - {{contact_nom}}│  │
│  └──────────────────────────────────────────────────────────────┘  │
│  Variables: {{contact_nom}}, {{montant_total}}, {{nb_factures}}...   │
│                                                                     │
│  Corps de l'email *                                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [Éditeur WYSIWYG]                                            │  │
│  │                                                              │  │
│  │ Bonjour {{contact_nom}},                                     │  │
│  │                                                              │  │
│  │ Nous vous rappelons que {{nb_factures}} facture(s)           │  │
│  │ restent impayées pour un montant total de {{montant_total}}€.│  │
│  │                                                              │  │
│  │ ...                                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [Aperçu]  ← bouton pour voir le rendu avec des données fictives   │
│                                                                     │
│                                                                     │
│  [Annuler]                    [Créer la séquence]                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Frontend

### Store SequenceRelanceStore

```javascript
import { defineStore } from 'pinia'

export const useSequenceRelanceStore = defineStore('sequenceRelance', {
  state: () => ({
    sequences: [],
    loading: false,
    error: null
  }),

  getters: {
    sequencesActives: (state) => {
      return state.sequences.filter(s => s.get('estActive'));
    },
    
    sequencesByType: (state) => (type) => {
      return state.sequences
        .filter(s => s.get('type') === type)
        .sort((a, b) => a.get('niveau') - b.get('niveau'));
    },
    
    sequenceById: (state) => (id) => {
      return state.sequences.find(s => s.id === id);
    }
  },

  actions: {
    async fetchSequences() {
      this.loading = true;
      try {
        const { $parse } = useNuxtApp();
        const SequenceRelance = $parse.Object.extend('SequenceRelance');
        const query = new $parse.Query(SequenceRelance);
        query.ascending('type', 'niveau');
        
        this.sequences = await query.find();
      } catch (error) {
        this.error = error;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createSequence(data) {
      try {
        const { $parse } = useNuxtApp();
        const SequenceRelance = $parse.Object.extend('SequenceRelance');
        
        const sequence = new SequenceRelance();
        sequence.set('nom', data.nom);
        sequence.set('type', data.type);
        sequence.set('niveau', parseInt(data.niveau));
        sequence.set('delaiJours', parseInt(data.delaiJours));
        sequence.set('templateSujet', data.templateSujet);
        sequence.set('templateCorps', data.templateCorps);
        sequence.set('estActive', data.estActive ?? true);
        sequence.set('description', data.description);
        
        await sequence.save();
        
        console.log('[CHECKPOINT] sequence-created', { 
          id: sequence.id, 
          nom: data.nom 
        });
        
        this.sequences.push(sequence);
        return sequence;
        
      } catch (error) {
        console.error('[CHECKPOINT] sequence-creation-failed', { error: error.message });
        throw error;
      }
    },

    async updateSequence(id, data) {
      try {
        const { $parse } = useNuxtApp();
        const SequenceRelance = $parse.Object.extend('SequenceRelance');
        
        const sequence = await new $parse.Query(SequenceRelance).get(id);
        
        if (data.nom !== undefined) sequence.set('nom', data.nom);
        if (data.niveau !== undefined) sequence.set('niveau', parseInt(data.niveau));
        if (data.delaiJours !== undefined) sequence.set('delaiJours', parseInt(data.delaiJours));
        if (data.templateSujet !== undefined) sequence.set('templateSujet', data.templateSujet);
        if (data.templateCorps !== undefined) sequence.set('templateCorps', data.templateCorps);
        if (data.estActive !== undefined) sequence.set('estActive', data.estActive);
        
        await sequence.save();
        
        console.log('[CHECKPOINT] sequence-updated', { id, nom: data.nom });
        
        // Mettre à jour le state local
        const index = this.sequences.findIndex(s => s.id === id);
        if (index !== -1) {
          this.sequences[index] = sequence;
        }
        
        return sequence;
        
      } catch (error) {
        console.error('[CHECKPOINT] sequence-update-failed', { id, error: error.message });
        throw error;
      }
    },

    async deleteSequence(id) {
      try {
        const { $parse } = useNuxtApp();
        const SequenceRelance = $parse.Object.extend('SequenceRelance');
        
        const sequence = await new $parse.Query(SequenceRelance).get(id);
        await sequence.destroy();
        
        console.log('[CHECKPOINT] sequence-deleted', { id });
        
        // Supprimer du state local
        this.sequences = this.sequences.filter(s => s.id !== id);
        
      } catch (error) {
        console.error('[CHECKPOINT] sequence-deletion-failed', { id, error: error.message });
        throw error;
      }
    }
  }
});
```

---

## Fonction de Prévisualisation

```javascript
function previewTemplate(template, sampleData = null) {
  const defaultData = {
    contact_nom: 'Dupont SARL',
    contact_email: 'contact@dupont.fr',
    montant_total: '12,500.00',
    nb_factures: '3',
    date_jour: new Date().toLocaleDateString('fr-FR'),
    date_echeance_ancienne: '15/06/2024',
    liste_factures: `
      <table>
        <tr><th>Facture</th><th>Montant</th><th>Échéance</th></tr>
        <tr><td>FAC-2024-001</td><td>5,000.00 €</td><td>15/06/2024</td></tr>
        <tr><td>FAC-2024-002</td><td>4,500.00 €</td><td>20/06/2024</td></tr>
        <tr><td>FAC-2024-003</td><td>3,000.00 €</td><td>25/06/2024</td></tr>
      </table>
    `
  };
  
  const data = sampleData || defaultData;
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  
  return result;
}
```

---

## Exemples de Templates

### Template Niveau 1 (J+15) - Ton amical

```html
<p>Bonjour {{contact_nom}},</p>

<p>Nous espérons que vous allez bien.</p>

<p>Nous vous écrivons pour vous rappeler amicalement que <strong>{{nb_factures}} facture(s)</strong> restent en attente de règlement pour un montant total de <strong>{{montant_total}} €</strong>.</p>

<p>Le détail des factures concernées :</p>

{{liste_factures}}

<p>Si vous avez déjà effectué le règlement, merci de ne pas tenir compte de ce message.</p>

<p>Dans le cas contraire, nous vous serions reconnaissants de bien vouloir procéder au paiement dans les plus brefs délais.</p>

<p>Nous restons à votre disposition pour toute question.</p>

<p>Cordialement,<br>
Le service comptable</p>
```

### Template Niveau 2 (J+30) - Ton ferme

```html
<p>Bonjour {{contact_nom}},</p>

<p><strong>Objet : Relance impayée - {{montant_total}} €</strong></p>

<p>Malgré notre précédent message, nous constatons que les factures suivantes, dont la plus ancienne date du {{date_echeance_ancienne}}, n'ont toujours pas été réglées :</p>

{{liste_factures}}

<p><strong>Montant total dû : {{montant_total}} €</strong></p>

<p>Nous vous demandons de régulariser cette situation sous 7 jours.</p>

<p>Sans réglement dans ce délai, nous nous verrons dans l'obligation de mettre en œuvre les recours appropriés.</p>

<p>Dans l'attente de votre règlement,</p>

<p>Cordialement,<br>
Le service comptable</p>
```

---

## Checkpoints

```
[CHECKPOINT] sequence-created { id, nom, type, niveau, delaiJours }
[CHECKPOINT] sequence-updated { id, changes }
[CHECKPOINT] sequence-deleted { id, nom }
[CHECKPOINT] sequence-creation-failed { error }
[CHECKPOINT] sequence-update-failed { id, error }
[CHECKPOINT] sequence-deletion-failed { id, error }
```
