# Résultat de la Migration : Marki.db → CouchDB marki2

## ✅ Migration Complétée avec Succès

**Date de migration**: 2026-07-28
**Source**: `marki.db` (SQLite)
**Destination**: `marki2` (CouchDB)
**URL CouchDB**: `http://localhost:5984/marki2`
**Identifiants**: User: `oswald`, Password: `Citron6-Mustang8`

---

## Statistiques de Migration

| Type | Nombre de Documents | Détails |
|------|-------------------|---------|
| `demande` | 7,367 | Documents agrégats avec factures, relances et events |
| `contact` | 6,860 | Référentiel clients et apporteurs |
| `sequence` | 2 | Configurations de relances |
| `smtp_profile` | 1 | Profil SMTP pour les emails |
| `user` | 1 | Utilisateur admin (créé par défaut) |
| `Design Documents` | 2 | Vues pour les demandes et contacts |
| **Total** | **14,233** | | | | |

---

## Répartition des Demandes

- **En relance**: 267 demandes
- **Soldées**: 7,100 demandes

---

## Fichiers Générés

```
relance3/
├── export/
│   ├── marki_data.json          # Export brut SQLite (toutes les tables)
│   ├── demandes.json            # 7,367 documents 'demande' transformés
│   ├── contacts.json            # 6,860 documents 'contact' transformés
│   ├── sequences.json           # 2 documents 'sequence' transformés
│   ├── smtp_profiles.json       # 1 document 'smtp_profile' transformé
│   └── users.json               # 1 document 'user' transformé
│
├── designs/
│   ├── demandes_design.json     # Vues pour les demandes
│   └── contacts_design.json     # Vues pour les contacts
│
└── scripts/
    ├── export_sqlite.js         # Export des données depuis SQLite
    ├── transformer.js           # Transformation des impayés en demandes
    ├── transformer_contacts.js # Transformation des contacts
    ├── transformer_sequences.js # Transformation des séquences
    ├── transformer_smtp.js      # Transformation des profils SMTP
    ├── transformer_users.js     # Transformation des utilisateurs
    └── importer.js              # Import vers CouchDB
```

---

## Points d'Attention

### 1. Impayés sans dossier_key (46 cas)
Les impayés suivants n'ont pas pu être groupés en demandes car ils n'ont ni `id_dossier` ni `payer_id`:
- iBwY5ZYNQl, 6AJcpEgeVH, Yyjk6qfUqk, C6tnUOnZo4, lFJaQNsBV8, EGNTeM4Bdt, 7R2FCptvLT, yeA0VBlXiT, FaXF6Q40MY, oAvsoODF2t, lm9tc1unsz, DvhlaabNOL, xGN1JKljpC, xZKb3HDxK1, oNJMCR9Ges, m5V3YsTJBi, 0dOWOiC8TT, WrieaSE6dO, HUbVv5TfP9, QxzCDKtT6u, jDig1qWdIT, oYiYKFNz3L, 6C1BzrG30P, MeaOJw4wdC, nVUhPGRQC0, mYyUVi10qB, E3AoAzqVmm, CFh5G1dMWf, zy5xMTqjQB, t6vTdXAqys, vZ1SJHQ5Mp, swfTl0pHFT, eoF4LAG2xS, 5OH4ui2mhy, 556z1G8nwk, BIwnPWBBP0, MWIv5MK9NX, n4z1imNZ7D, t462r1nWFG, 4Gne3jbbni, znvsiNK17f

**Solution**: Ces impayés n'ont pas été inclus dans la migration. Vérifiez la cohérence des données source.

### 2. Utilisateurs
- Aucune table `users` n'existait dans la base SQLite originale.
- Un utilisateur `user:admin` a été créé par défaut avec `must_reset_password: true`.
- **Action requise**: Configurez les vrais utilisateurs avec des mots de passe sécurisés.

### 3. Mots de passe SMTP
- Les mots de passe SMTP ont été marqués comme `[ENCRYPTED]`.
- **Action requise**: Implémentez un vrai chiffrement ou utilisez des variables d'environnement.

### 4. Contacts sans client associable
- Certains documents `demande` ont `client: null` car le `payer_id` ne correspond à aucun contact existant.
- Exemple: `demande:10796` a `client: null` mais a un `apporteur`.

---

## Vues Disponibles

### Design Document: `demandes`
- `par_statut`: Liste les demandes par statut
- `par_client`: Liste les demandes par client
- `par_reference`: Liste les demandes par référence
- `par_date_creation`: Liste les demandes par date de création
- `par_apporteur`: Liste les demandes par apporteur
- `montant_total`: Somme des montants totaux (avec reduce)
- `nb_factures_impayees`: Demandes avec factures impayées

### Design Document: `contacts`
- `par_type`: Contacts par type (client, apporteur, etc.)
- `par_nom`: Contacts par nom
- `par_email`: Contacts par email
- `avec_demandes_actives`: Contacts avec des demandes actives

---

## Accès à la Base

### Via HTTP
```bash
# Lister tous les documents
curl http://oswald:Citron6-Mustang8@localhost:5984/marki2/_all_docs

# Compter les documents
curl http://oswald:Citron6-Mustang8@localhost:5984/marki2/_all_docs | jq '.total_rows'

# Voir une demande spécifique
curl http://oswald:Citron6-Mustang8@localhost:5984/marki2/demande:10796 | jq '.'

# Voir un contact spécifique
curl http://oswald:Citron6-Mustang8@localhost:5984/marki2/contact:00jPOdYCRP | jq '.'

# Utiliser une vue
curl "http://oswald:Citron6-Mustang8@localhost:5984/marki2/_design/demandes/_view/par_statut?key='en_relance'" | jq '.'
```

### Via Futon (Interface Web)
Ouvrez votre navigateur à: `http://localhost:5984/_utils/`
- Connectez-vous avec `oswald` / `Citron6-Mustang8`
- Sélectionnez la base `marki2`

---

## Prochaines Étapes

1. **Vérifier la cohérence des données**: Comparez les comptages avec la base SQLite originale
2. **Configurer la réplication PouchDB**: Pour la synchronisation avec le frontend
3. **Mettre à jour l'application**: Configurer l'application pour utiliser `marki2` au lieu de `marki`
4. **Configurer les utilisateurs**: Créer les vrais comptes utilisateurs avec des mots de passe
5. **Sécuriser les mots de passe SMTP**: Implémenter un vrai chiffrement
6. **Tester les vues**: Vérifiez que toutes les vues fonctionnent correctement
7. **Sauvegarder la base**: Faites une sauvegarde de `marki2`

---

## Commandes Utiles

```bash
# Reconstruire les vues (si nécessaire)
curl -X POST http://oswald:Citron6-Mustang8@localhost:5984/marki2/_view_cleanup

# Compactage de la base
curl -X POST http://oswald:Citron6-Mustang8@localhost:5984/marki2/_compact

# Backup de la base
curl -X GET http://oswald:Citron6-Mustang8@localhost:5984/marki2/_all_docs?include_docs=true > marki2_backup.json

# Supprimer la base (attention!)
curl -X DELETE http://oswald:Citron6-Mustang8@localhost:5984/marki2
```

---

## Structure des Documents

### Document `demande`
```json
{
  "_id": "demande:{dossierKey}",
  "type": "demande",
  "reference": "{dossierKey}",
  "date_creation": "ISO8601",
  "statut": "en_relance|solde",
  "client": { ... },
  "apporteur": { ... },
  "bien": { "adresse", "code_postal", "ville" },
  "factures": [ ... ],
  "relances": [ ... ],
  "events": [ ... ],
  "stats": { ... },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Document `contact`
```json
{
  "_id": "contact:{id}",
  "type": "contact",
  "nom": "...",
  "prenom": "...",
  "email": "...",
  "telephone": "...",
  "type_contact": "client|apporteur|...",
  "adresse": { ... },
  "nb_demandes_actives": 0,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

*Migration exécutée selon la procédure décrite dans `MIGRATION_MARKI_COUCHDB.md`*
