# Configuration des tâches Cron

Ce document décrit l'ensemble des tâches planifiées (cron jobs) du backend ADTI.

## Vue d'ensemble

| Heure (Paris) | Workflow | Description | Dépendances |
|---------------|----------|-------------|-------------|
| **00:00** | `import-invoice` | Import des factures depuis les sources externes | - |
| **01:00** | `generate-suivi` | Génération des emails de suivi | `import-invoice` (données fraîches) |
| **19:00** | `send-emails` | Envoi des relances d'impayés | - |
| **19:30** | `send-suivi` | Envoi des suivis de dossiers | `send-emails` (évite conflits SMTP) |
| **hh:50** | `verify-paid-invoices` | Vérification des paiements | Toutes les heures |
| **hh:00** | `cleanup-relances-blacklist` | Nettoyage relances blacklistées | Toutes les heures |
| **02:00** | `cleanup-temp-files` | Nettoyage fichiers temporaires | - |

---

## Détail des workflows

### 1. import-invoice
**Horaire :** Tous les jours à 00:00 (minuit)

**Objectif :**
- Importer les nouvelles factures depuis les sources externes
- Mettre à jour le statut des factures existantes
- Créer les enregistrements d'impayés associés

**Fichier :** `cloud/workflows/import-invoice/00-master.js`

**Dépendances :** Aucune (premier workflow de la journée)

---

### 2. generate-suivi
**Horaire :** Tous les jours à 01:00

**Objectif :**
- Générer les emails de suivi pour les séquences de type "suivi" publiées
- Filtrer par fréquence (quotidien, hebdomadaire, lundi, 15, etc.)
- Appeler l'IA (Ollama) pour personnaliser le contenu
- Créer les objets `Suivi` avec statut "pret pour envoi"

**Fichier :** `cloud/workflows/generate-suivi/index.js`

**Dépendances :**
- `import-invoice` : Nécessite les données de factures à jour

**Fréquences supportées :**
- `quotidien` : Tous les jours
- `hebdomadaire` : Tous les lundis
- `mensuel` : Le 1er du mois
- `lundi` à `dimanche` : Jour spécifique de la semaine
- `1` à `31` : Jour précis du mois

---

### 3. send-emails
**Horaire :** Tous les jours à 19:00

**Objectif :**
- Envoyer les relances d'impayés (classe `Relance`)
- Gérer la livraison SMTP avec signature
- Mettre à jour le statut : "pret pour envoi" → "Envoyée"
- Copier dans le dossier Sent (IMAP) - optionnel

**Fichier :** `cloud/workflows/send-emails/00-master.js`

**Dépendances :** Aucune

**Note :** Les relances sont traitées quotidiennement via les règles d'attribution des séquences de type "relance".

---

### 4. send-suivi
**Horaire :** Tous les jours à 19:30

**Objectif :**
- Envoyer les suivis de dossiers (classe `Suivi`)
- Gérer le champ CC (copie à l'apporteur)
- Mettre à jour le statut : "pret pour envoi" → "Envoyée"
- Copier dans le dossier Sent (IMAP) - **obligatoire**

**Fichier :** `cloud/workflows/send-suivi/00-master.js`

**Dépendances :**
- `generate-suivi` : Nécessite que les suivis soient générés
- `send-emails` : Décalé de 30 min pour éviter les conflits SMTP

**Différences avec send-emails :**
| Aspect | send-emails (relances) | send-suivi (suivis) |
|--------|------------------------|---------------------|
| Classe | `Relance` | `Suivi` |
| Type de séquence | `"relance"` | `"suivi"` |
| Fréquence | Quotidienne + règles | Configurable (hebdo, mensuel...) |
| Champ CC | Non | Oui |
| IMAP Sent | Optionnel | **Obligatoire** |
| Scénarios | single, multiple | single, multiple, both, broker |

---

### 5. verify-paid-invoices
**Horaire :** Toutes les heures à xx:50

**Objectif :**
- Vérifier les paiements reçus
- Mettre à jour le statut des factures payées
- Mettre à jour les impayés (reste_a_payer = 0)
- Marquer les relances/suivis comme soldés si nécessaire

**Fichier :** `cloud/workflows/verify-paid-invoices/00-master.js`

**Dépendances :** Aucune (s'exécute en continu)

---

### 6. cleanup-relances-contact-blackliste
**Horaire :** Toutes les heures à xx:00

**Objectif :**
- Supprimer les relances dont le contact est blacklisté
- Éviter l'envoi d'emails à des contacts interdits
- Maintenir la base de données propre

**Fichier :** `cloud/workflows/cleanup-relances-contact-blackliste/index.js`

**Dépendances :** Aucune

---

### 7. cleanup-temp-files
**Horaire :** Tous les jours à 02:00

**Objectif :**
- Supprimer les fichiers temporaires de plus de 24h
- Libérer l'espace disque dans `/tmp/adti-invoices`
- Éviter l'accumulation de fichiers orphelins

**Fonction :** `cleanupTempFiles()` dans `cron.js`

**Dépendances :** Aucune

---

## Séquence typique d'une journée

```
00:00  ┌─► import-invoice          (Import des factures)
       │
01:00  ┌─► generate-suivi          (Génération emails suivi)
       │
...    │   [Traitement métier dans la journée]
       │
19:00  ┌─► send-emails             (Envoi relances)
       │
19:30  ┌─► send-suivi              (Envoi suivis)
       │
02:00  └─► cleanup-temp-files      (Nettoyage fichiers)
```

---

## Fichier de configuration

**Chemin :** `backend/cron.js`

**Structure :**
```javascript
const cron = require("node-cron");

// Import des workflows
const importInvoicesMaster = require("./cloud/workflows/import-invoice/00-master");
const sendEmailsMaster = require("./cloud/workflows/send-emails/00-master");
const sendSuivisMaster = require("./cloud/workflows/send-suivi/00-master").sendSuivisMaster;
// ... etc

// Déclaration des crons
cron.schedule("0 0 * * *", () => { /* import-invoice */ }, { timezone: "Europe/Paris" });
cron.schedule("0 1 * * *", () => { /* generate-suivi */ }, { timezone: "Europe/Paris" });
// ... etc
```

**TimeZone :** Tous les crons utilisent `Europe/Paris` (CET/CEST, UTC+1 ou UTC+2 selon l'heure d'été).

---

## Exécution manuelle

Pour exécuter un workflow manuellement (hors cron) :

```bash
# En local
node backend/cloud/workflows/send-suivi/00-master.js --trigger manual

# Via curl (Cloud Function)
curl -X POST \
  -H "X-Parse-Application-Id: $PARSE_APP_ID" \
  -H "X-Parse-Master-Key: $PARSE_MASTER_KEY" \
  -H "Content-Type: application/json" \
  "$PARSE_SERVER_URL/functions/sendSuivis"
```

---

## Logs et monitoring

Les logs de chaque exécution cron sont disponibles dans :
- Console Node.js (stdout)
- Fichiers de log spécifiques à chaque workflow (`cloud/workflows/{workflow}/logs/`)
- Parse Server logs (si configuré)

**Identifier les exécutions cron dans les logs :**
```
⏰ [CRON] Déclenchement: send-suivi (19h30)
✅ [CRON] send-suivi terminé
❌ [CRON] Erreur send-suivi: {message}
```

---

## Dépannage

### Problème : send-suivi échoue à cause d'IMAP

**Cause :** La copie vers le dossier Sent (IMAP) est obligatoire pour les suivis.

**Solution :**
1. Vérifier la configuration IMAP dans le profil SMTP
2. Ajouter les champs `imapHost` et `imapPort` dans la classe `SmtpProfile`
3. Ou implémenter une solution alternative dans `copyToSentFolder()`

### Problème : Conflits SMTP entre send-emails et send-suivi

**Cause :** Exécution simultanée sur le même serveur SMTP.

**Solution :** Le décalage de 30 min (19:00 vs 19:30) est volontaire. En cas de problème persistant, augmenter le délai ou mettre en place une file d'attente.

### Problème : generate-suivi ne génère rien

**Cause :** La fréquence configurée dans la séquence ne correspond pas à aujourd'hui.

**Vérification :**
- Vérifier la valeur du champ `frequence` dans la séquence (type: "suivi")
- Vérifier que la séquence est `publiee: true`
- Vérifier que des impayés existent pour cette séquence
