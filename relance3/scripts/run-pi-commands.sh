#!/bin/bash
# Script généré automatiquement pour adapter les workflows pour PouchDB
# Exécute: pi -p "instruction" "fichier.md" pour chaque workflow

set -e

FRONTEND_DIR="/home/ubuntu/marki/relance3/workflows/frontend"
LOG_FILE="/home/ubuntu/marki/relance3/scripts/pi-execution.log"

# Instruction standard pour pi -p
INSTRUCTION='Adapte ce workflow pour une utilisation de PouchDB connecté en live avec CouchDB.

RÈGLES IMPORTANTES:
1. Utilise PouchDB côté frontend avec réplication live vers CouchDB
2. Remplace tous les appels API directs par des opérations PouchDB (db.get, db.put, db.query, etc.)
3. Gère la synchronisation bidirectionnelle avec db.sync() ou db.replicate.to()/from()
4. Gère les conflits de réplication (conflicts: true)
5. Utilise les _design documents pour les vues Mango
6. Implémente le pattern local-first : lectures depuis PouchDB local, écritures vers PouchDB (qui réplique vers CouchDB)
7. Gère les états offline/online avec les events paused/active de la réplication
8. Conserve la structure Alpine.js x-data du workflow
9. Ajoute une propriété syncStatus pour suivre l état de la sync
10. Utilise les ID CouchDB (_id) et révisions (_rev) appropriés

Le workflow doit utiliser PouchDB pour toutes les opérations de données, avec réplication automatique vers CouchDB.'

echo "Démarrage de l adaptation des workflows..." > "$LOG_FILE"
echo "" >> "$LOG_FILE"

COUNTER=0


# Écran: relances-calendrier (9 workflows)
echo "=== Traitement de l'écran: relances-calendrier ==="

# Workflow: switch-view-week
echo "→ Adaptation: relances-calendrier/switch-view-week"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-calendrier/switch-view-week.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: relances-calendrier/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-calendrier/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: save-edit
echo "→ Adaptation: relances-calendrier/save-edit"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-calendrier/save-edit.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-edit-relance
echo "→ Adaptation: relances-calendrier/open-edit-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-calendrier/open-edit-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: go-today
echo "→ Adaptation: relances-calendrier/go-today"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-calendrier/go-today.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: next-period
echo "→ Adaptation: relances-calendrier/next-period"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-calendrier/next-period.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: switch-view-month
echo "→ Adaptation: relances-calendrier/switch-view-month"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-calendrier/switch-view-month.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: close-modal
echo "→ Adaptation: relances-calendrier/close-modal"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-calendrier/close-modal.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: previous-period
echo "→ Adaptation: relances-calendrier/previous-period"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-calendrier/previous-period.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: portail-client (5 workflows)
echo "=== Traitement de l'écran: portail-client ==="

# Workflow: download-facture
echo "→ Adaptation: portail-client/download-facture"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/portail-client/download-facture.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: portail-client/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/portail-client/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: switch-tab-apporteur
echo "→ Adaptation: portail-client/switch-tab-apporteur"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/portail-client/switch-tab-apporteur.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: regler-facture
echo "→ Adaptation: portail-client/regler-facture"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/portail-client/regler-facture.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: switch-tab-factures
echo "→ Adaptation: portail-client/switch-tab-factures"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/portail-client/switch-tab-factures.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: relances-validation (11 workflows)
echo "=== Traitement de l'écran: relances-validation ==="

# Workflow: select-relance
echo "→ Adaptation: relances-validation/select-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/select-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: relances-validation/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: supprimer-relance
echo "→ Adaptation: relances-validation/supprimer-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/supprimer-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: save-changes
echo "→ Adaptation: relances-validation/save-changes"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/save-changes.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: suspendre-relance
echo "→ Adaptation: relances-validation/suspendre-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/suspendre-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: filter-today
echo "→ Adaptation: relances-validation/filter-today"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/filter-today.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: deselect-relance
echo "→ Adaptation: relances-validation/deselect-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/deselect-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: blacklister-relance
echo "→ Adaptation: relances-validation/blacklister-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/blacklister-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: filter-all
echo "→ Adaptation: relances-validation/filter-all"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/filter-all.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: filter-email
echo "→ Adaptation: relances-validation/filter-email"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/filter-email.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: valider-relance
echo "→ Adaptation: relances-validation/valider-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances-validation/valider-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: contacts-sans-email (3 workflows)
echo "=== Traitement de l'écran: contacts-sans-email ==="

# Workflow: contacts-sans-email-set-email-force
echo "→ Adaptation: contacts-sans-email/contacts-sans-email-set-email-force"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts-sans-email/contacts-sans-email-set-email-force.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: contacts-sans-email-load
echo "→ Adaptation: contacts-sans-email/contacts-sans-email-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts-sans-email/contacts-sans-email-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: contacts-sans-email-bulk
echo "→ Adaptation: contacts-sans-email/contacts-sans-email-bulk"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts-sans-email/contacts-sans-email-bulk.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: impayes-suspendus (2 workflows)
echo "=== Traitement de l'écran: impayes-suspendus ==="

# Workflow: initial-load
echo "→ Adaptation: impayes-suspendus/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-suspendus/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: reactivate-impaye
echo "→ Adaptation: impayes-suspendus/reactivate-impaye"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-suspendus/reactivate-impaye.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: settings-smtp (8 workflows)
echo "=== Traitement de l'écran: settings-smtp ==="

# Workflow: delete-profil
echo "→ Adaptation: settings-smtp/delete-profil"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp/delete-profil.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: new-profil
echo "→ Adaptation: settings-smtp/new-profil"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp/new-profil.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: create-profil
echo "→ Adaptation: settings-smtp/create-profil"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp/create-profil.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: close-delete-modal
echo "→ Adaptation: settings-smtp/close-delete-modal"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp/close-delete-modal.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: edit-profil
echo "→ Adaptation: settings-smtp/edit-profil"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp/edit-profil.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: settings-smtp/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: confirm-delete
echo "→ Adaptation: settings-smtp/confirm-delete"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp/confirm-delete.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: test-profil
echo "→ Adaptation: settings-smtp/test-profil"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp/test-profil.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: dashboard (14 workflows)
echo "=== Traitement de l'écran: dashboard ==="

# Workflow: kpi-taux-recouvrement
echo "→ Adaptation: dashboard/kpi-taux-recouvrement"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/kpi-taux-recouvrement.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: kpi-anciennete-tranches
echo "→ Adaptation: dashboard/kpi-anciennete-tranches"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/kpi-anciennete-tranches.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: switch-view-card
echo "→ Adaptation: dashboard/switch-view-card"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/switch-view-card.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: props
echo "→ Adaptation: dashboard/props"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/props.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: dashboard/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: sync-data
echo "→ Adaptation: dashboard/sync-data"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/sync-data.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: clear-events
echo "→ Adaptation: dashboard/clear-events"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/clear-events.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: kpi-factures-en-attente
echo "→ Adaptation: dashboard/kpi-factures-en-attente"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/kpi-factures-en-attente.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: switch-view-list
echo "→ Adaptation: dashboard/switch-view-list"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/switch-view-list.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: kpi-impayes-actifs
echo "→ Adaptation: dashboard/kpi-impayes-actifs"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/kpi-impayes-actifs.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: chart-evolution-impayes
echo "→ Adaptation: dashboard/chart-evolution-impayes"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/chart-evolution-impayes.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: kpi-montant-total
echo "→ Adaptation: dashboard/kpi-montant-total"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/kpi-montant-total.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: events-manager
echo "→ Adaptation: dashboard/events-manager"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/events-manager.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: kpi-relances-jour
echo "→ Adaptation: dashboard/kpi-relances-jour"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/dashboard/kpi-relances-jour.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: hello (1 workflows)
echo "=== Traitement de l'écran: hello ==="

# Workflow: demander-prenom
echo "→ Adaptation: hello/demander-prenom"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/hello/demander-prenom.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: evenements (7 workflows)
echo "=== Traitement de l'écran: evenements ==="

# Workflow: initial-load
echo "→ Adaptation: evenements/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/evenements/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-event
echo "→ Adaptation: evenements/open-event"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/evenements/open-event.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: mark-as-read
echo "→ Adaptation: evenements/mark-as-read"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/evenements/mark-as-read.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: mark-all-read
echo "→ Adaptation: evenements/mark-all-read"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/evenements/mark-all-read.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: close-modal
echo "→ Adaptation: evenements/close-modal"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/evenements/close-modal.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: filter-unread
echo "→ Adaptation: evenements/filter-unread"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/evenements/filter-unread.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: filter-all
echo "→ Adaptation: evenements/filter-all"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/evenements/filter-all.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: contacts-blacklist (4 workflows)
echo "=== Traitement de l'écran: contacts-blacklist ==="

# Workflow: contacts-blacklist-bulk-remove
echo "→ Adaptation: contacts-blacklist/contacts-blacklist-bulk-remove"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts-blacklist/contacts-blacklist-bulk-remove.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: contacts-blacklist-remove
echo "→ Adaptation: contacts-blacklist/contacts-blacklist-remove"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts-blacklist/contacts-blacklist-remove.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: contacts-blacklist-load
echo "→ Adaptation: contacts-blacklist/contacts-blacklist-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts-blacklist/contacts-blacklist-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: contacts-blacklist-search
echo "→ Adaptation: contacts-blacklist/contacts-blacklist-search"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts-blacklist/contacts-blacklist-search.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: sequences-relance-detail (21 workflows)
echo "=== Traitement de l'écran: sequences-relance-detail ==="

# Workflow: copy-variable
echo "→ Adaptation: sequences-relance-detail/copy-variable"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/copy-variable.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-liens-paiement
echo "→ Adaptation: sequences-relance-detail/open-liens-paiement"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/open-liens-paiement.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: supprimer-email
echo "→ Adaptation: sequences-relance-detail/supprimer-email"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/supprimer-email.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: tester-email
echo "→ Adaptation: sequences-relance-detail/tester-email"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/tester-email.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: sequences-relance-detail/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: ajouter-email
echo "→ Adaptation: sequences-relance-detail/ajouter-email"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/ajouter-email.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: select-scenario-broker
echo "→ Adaptation: sequences-relance-detail/select-scenario-broker"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/select-scenario-broker.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-validation
echo "→ Adaptation: sequences-relance-detail/toggle-validation"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/toggle-validation.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: supprimer-groupe
echo "→ Adaptation: sequences-relance-detail/supprimer-groupe"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/supprimer-groupe.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-scenario-active
echo "→ Adaptation: sequences-relance-detail/toggle-scenario-active"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/toggle-scenario-active.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: sauvegarder
echo "→ Adaptation: sequences-relance-detail/sauvegarder"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/sauvegarder.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-chatgpt
echo "→ Adaptation: sequences-relance-detail/open-chatgpt"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/open-chatgpt.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: select-scenario-single
echo "→ Adaptation: sequences-relance-detail/select-scenario-single"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/select-scenario-single.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: copy-lien
echo "→ Adaptation: sequences-relance-detail/copy-lien"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/copy-lien.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: lancer-attribution
echo "→ Adaptation: sequences-relance-detail/lancer-attribution"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/lancer-attribution.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-attribution-auto
echo "→ Adaptation: sequences-relance-detail/toggle-attribution-auto"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/toggle-attribution-auto.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: select-scenario-impayes-broker
echo "→ Adaptation: sequences-relance-detail/select-scenario-impayes-broker"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/select-scenario-impayes-broker.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-publication
echo "→ Adaptation: sequences-relance-detail/toggle-publication"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/toggle-publication.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-email
echo "→ Adaptation: sequences-relance-detail/toggle-email"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/toggle-email.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-ia-modal
echo "→ Adaptation: sequences-relance-detail/open-ia-modal"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/open-ia-modal.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: select-scenario-multiple
echo "→ Adaptation: sequences-relance-detail/select-scenario-multiple"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-relance-detail/select-scenario-multiple.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: contacts (5 workflows)
echo "=== Traitement de l'écran: contacts ==="

# Workflow: contacts-load-all
echo "→ Adaptation: contacts/contacts-load-all"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts/contacts-load-all.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: contacts-set-email-force
echo "→ Adaptation: contacts/contacts-set-email-force"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts/contacts-set-email-force.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: contacts-blacklist
echo "→ Adaptation: contacts/contacts-blacklist"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts/contacts-blacklist.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: contacts-view-detail
echo "→ Adaptation: contacts/contacts-view-detail"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts/contacts-view-detail.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: contacts-export
echo "→ Adaptation: contacts/contacts-export"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/contacts/contacts-export.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: impayes-payeur (7 workflows)
echo "=== Traitement de l'écran: impayes-payeur ==="

# Workflow: initial-load
echo "→ Adaptation: impayes-payeur/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-payeur/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: sync-data
echo "→ Adaptation: impayes-payeur/sync-data"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-payeur/sync-data.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: pagination-next
echo "→ Adaptation: impayes-payeur/pagination-next"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-payeur/pagination-next.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: save-note
echo "→ Adaptation: impayes-payeur/save-note"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-payeur/save-note.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: close-detail
echo "→ Adaptation: impayes-payeur/close-detail"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-payeur/close-detail.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: pagination-prev
echo "→ Adaptation: impayes-payeur/pagination-prev"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-payeur/pagination-prev.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-detail
echo "→ Adaptation: impayes-payeur/open-detail"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-payeur/open-detail.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: impayes-reparer (1 workflows)
echo "=== Traitement de l'écran: impayes-reparer ==="

# Workflow: view-reparer
echo "→ Adaptation: impayes-reparer/view-reparer"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-reparer/view-reparer.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: sequences-suivi-detail (17 workflows)
echo "=== Traitement de l'écran: sequences-suivi-detail ==="

# Workflow: supprimer-email
echo "→ Adaptation: sequences-suivi-detail/supprimer-email"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/supprimer-email.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: tester-email
echo "→ Adaptation: sequences-suivi-detail/tester-email"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/tester-email.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: sequences-suivi-detail/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: ajouter-email
echo "→ Adaptation: sequences-suivi-detail/ajouter-email"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/ajouter-email.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-validation
echo "→ Adaptation: sequences-suivi-detail/toggle-validation"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/toggle-validation.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: set-frequence-mensuel
echo "→ Adaptation: sequences-suivi-detail/set-frequence-mensuel"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/set-frequence-mensuel.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: set-frequence-hebdomadaire
echo "→ Adaptation: sequences-suivi-detail/set-frequence-hebdomadaire"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/set-frequence-hebdomadaire.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: select-heure
echo "→ Adaptation: sequences-suivi-detail/select-heure"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/select-heure.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: sauvegarder
echo "→ Adaptation: sequences-suivi-detail/sauvegarder"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/sauvegarder.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: select-scenario-single
echo "→ Adaptation: sequences-suivi-detail/select-scenario-single"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/select-scenario-single.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: select-jour-mois
echo "→ Adaptation: sequences-suivi-detail/select-jour-mois"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/select-jour-mois.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-publication
echo "→ Adaptation: sequences-suivi-detail/toggle-publication"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/toggle-publication.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: select-jour-semaine
echo "→ Adaptation: sequences-suivi-detail/select-jour-semaine"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/select-jour-semaine.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-collapse
echo "→ Adaptation: sequences-suivi-detail/toggle-collapse"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/toggle-collapse.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: set-frequence-quotidien
echo "→ Adaptation: sequences-suivi-detail/set-frequence-quotidien"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/set-frequence-quotidien.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-ia-modal
echo "→ Adaptation: sequences-suivi-detail/open-ia-modal"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/open-ia-modal.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: select-scenario-multiple
echo "→ Adaptation: sequences-suivi-detail/select-scenario-multiple"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences-suivi-detail/select-scenario-multiple.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: settings-smtp-detail (4 workflows)
echo "=== Traitement de l'écran: settings-smtp-detail ==="

# Workflow: initial-load
echo "→ Adaptation: settings-smtp-detail/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp-detail/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-password
echo "→ Adaptation: settings-smtp-detail/toggle-password"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp-detail/toggle-password.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: tester-connexion
echo "→ Adaptation: settings-smtp-detail/tester-connexion"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp-detail/tester-connexion.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: save-changes
echo "→ Adaptation: settings-smtp-detail/save-changes"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-smtp-detail/save-changes.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: login (2 workflows)
echo "=== Traitement de l'écran: login ==="

# Workflow: initial-load
echo "→ Adaptation: login/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/login/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: auth-submit
echo "→ Adaptation: login/auth-submit"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/login/auth-submit.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: impayes-detail (10 workflows)
echo "=== Traitement de l'écran: impayes-detail ==="

# Workflow: load-events
echo "→ Adaptation: impayes-detail/load-events"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/load-events.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: impayes-detail/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: change-sequence-confirmation
echo "→ Adaptation: impayes-detail/change-sequence-confirmation"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/change-sequence-confirmation.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-pdf
echo "→ Adaptation: impayes-detail/open-pdf"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/open-pdf.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: suspend-facture
echo "→ Adaptation: impayes-detail/suspend-facture"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/suspend-facture.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: changer-sequence
echo "→ Adaptation: impayes-detail/changer-sequence"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/changer-sequence.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: load-missions
echo "→ Adaptation: impayes-detail/load-missions"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/load-missions.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: manage-notes
echo "→ Adaptation: impayes-detail/manage-notes"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/manage-notes.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: unsuspend-facture
echo "→ Adaptation: impayes-detail/unsuspend-facture"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/unsuspend-facture.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: blacklist-facture
echo "→ Adaptation: impayes-detail/blacklist-facture"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes-detail/blacklist-facture.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: smart-marki (6 workflows)
echo "=== Traitement de l'écran: smart-marki ==="

# Workflow: initial-load
echo "→ Adaptation: smart-marki/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/smart-marki/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: close-insight
echo "→ Adaptation: smart-marki/close-insight"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/smart-marki/close-insight.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: mark-all-read
echo "→ Adaptation: smart-marki/mark-all-read"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/smart-marki/mark-all-read.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: dismiss-insight
echo "→ Adaptation: smart-marki/dismiss-insight"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/smart-marki/dismiss-insight.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: apply-insight
echo "→ Adaptation: smart-marki/apply-insight"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/smart-marki/apply-insight.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-insight
echo "→ Adaptation: smart-marki/open-insight"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/smart-marki/open-insight.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: impayes (13 workflows)
echo "=== Traitement de l'écran: impayes ==="

# Workflow: sort-by-reste
echo "→ Adaptation: impayes/sort-by-reste"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/sort-by-reste.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: sort-by-dossier
echo "→ Adaptation: impayes/sort-by-dossier"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/sort-by-dossier.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: sort-by-montant
echo "→ Adaptation: impayes/sort-by-montant"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/sort-by-montant.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: impayes/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: sync-data
echo "→ Adaptation: impayes/sync-data"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/sync-data.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: pagination-next
echo "→ Adaptation: impayes/pagination-next"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/pagination-next.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: sort-by-payeur
echo "→ Adaptation: impayes/sort-by-payeur"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/sort-by-payeur.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: sort-by-numero
echo "→ Adaptation: impayes/sort-by-numero"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/sort-by-numero.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: suspend-facture
echo "→ Adaptation: impayes/suspend-facture"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/suspend-facture.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: save-note
echo "→ Adaptation: impayes/save-note"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/save-note.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: pagination-prev
echo "→ Adaptation: impayes/pagination-prev"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/pagination-prev.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: unsuspend-facture
echo "→ Adaptation: impayes/unsuspend-facture"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/unsuspend-facture.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: open-detail
echo "→ Adaptation: impayes/open-detail"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/impayes/open-detail.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: portail-mission (4 workflows)
echo "=== Traitement de l'écran: portail-mission ==="

# Workflow: logout
echo "→ Adaptation: portail-mission/logout"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/portail-mission/logout.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: download-facture
echo "→ Adaptation: portail-mission/download-facture"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/portail-mission/download-facture.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: portail-mission/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/portail-mission/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: regler-facture
echo "→ Adaptation: portail-mission/regler-facture"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/portail-mission/regler-facture.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: relances (24 workflows)
echo "=== Traitement de l'écran: relances ==="

# Workflow: new-relance
echo "→ Adaptation: relances/new-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/new-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: view-relance
echo "→ Adaptation: relances/view-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/view-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: relances/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: liste-sequences
echo "→ Adaptation: relances/liste-sequences"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/liste-sequences.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: historique-relances-payeur
echo "→ Adaptation: relances/historique-relances-payeur"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/historique-relances-payeur.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: edit-note
echo "→ Adaptation: relances/edit-note"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/edit-note.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: impayes-by-payeur
echo "→ Adaptation: relances/impayes-by-payeur"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/impayes-by-payeur.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: liste-payeurs-impayes
echo "→ Adaptation: relances/liste-payeurs-impayes"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/liste-payeurs-impayes.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: relances-a-valider
echo "→ Adaptation: relances/relances-a-valider"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/relances-a-valider.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: toggle-payeur
echo "→ Adaptation: relances/toggle-payeur"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/toggle-payeur.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: supprimer-relance
echo "→ Adaptation: relances/supprimer-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/supprimer-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: liste-relances-payeur
echo "→ Adaptation: relances/liste-relances-payeur"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/liste-relances-payeur.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: details-relance
echo "→ Adaptation: relances/details-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/details-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: reprogrammer-relance
echo "→ Adaptation: relances/reprogrammer-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/reprogrammer-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: liste-smtp-profiles
echo "→ Adaptation: relances/liste-smtp-profiles"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/liste-smtp-profiles.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: stats-relances
echo "→ Adaptation: relances/stats-relances"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/stats-relances.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: edit-relance
echo "→ Adaptation: relances/edit-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/edit-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: envoyer-relance
echo "→ Adaptation: relances/envoyer-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/envoyer-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: close-modal
echo "→ Adaptation: relances/close-modal"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/close-modal.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: modifier-relance
echo "→ Adaptation: relances/modifier-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/modifier-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: create-relance
echo "→ Adaptation: relances/create-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/create-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: cancel-relance
echo "→ Adaptation: relances/cancel-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/cancel-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: preview-relance
echo "→ Adaptation: relances/preview-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/preview-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: valider-relance
echo "→ Adaptation: relances/valider-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/relances/valider-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: sequences (9 workflows)
echo "=== Traitement de l'écran: sequences ==="

# Workflow: filter-suivi
echo "→ Adaptation: sequences/filter-suivi"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences/filter-suivi.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: sequences/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: duplicate-sequence
echo "→ Adaptation: sequences/duplicate-sequence"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences/duplicate-sequence.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: set-type-relance
echo "→ Adaptation: sequences/set-type-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences/set-type-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: filter-relance
echo "→ Adaptation: sequences/filter-relance"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences/filter-relance.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: close-modal
echo "→ Adaptation: sequences/close-modal"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences/close-modal.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: create-sequence
echo "→ Adaptation: sequences/create-sequence"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences/create-sequence.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: filter-all
echo "→ Adaptation: sequences/filter-all"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences/filter-all.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: new-sequence
echo "→ Adaptation: sequences/new-sequence"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/sequences/new-sequence.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Écran: settings-utilisateurs (5 workflows)
echo "=== Traitement de l'écran: settings-utilisateurs ==="

# Workflow: open-add-user
echo "→ Adaptation: settings-utilisateurs/open-add-user"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-utilisateurs/open-add-user.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: initial-load
echo "→ Adaptation: settings-utilisateurs/initial-load"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-utilisateurs/initial-load.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: update-user
echo "→ Adaptation: settings-utilisateurs/update-user"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-utilisateurs/update-user.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: edit-user
echo "→ Adaptation: settings-utilisateurs/edit-user"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-utilisateurs/edit-user.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

# Workflow: create-user
echo "→ Adaptation: settings-utilisateurs/create-user"
pi -p "$INSTRUCTION" "/home/ubuntu/marki/relance3/workflows/frontend/settings-utilisateurs/create-user.md" 2>&1 | tee -a "$LOG_FILE"
COUNTER=$((COUNTER + 1))
sleep 1

echo ""
echo "========================================"
echo "  ADAPTATION TERMINÉE"
echo "========================================"
echo "Workflows traités: $COUNTER"
echo "Log: $LOG_FILE"
echo ""
