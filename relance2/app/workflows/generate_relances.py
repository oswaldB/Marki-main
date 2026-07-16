"""
Workflow: Génération des Relances

Génère automatiquement les relances pour les impayés actifs.
"""

import uuid
import datetime
from ..db import get_db


def generate_relances():
    """Generate relances for unpaid invoices."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.GENERATE_RELANCES] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Étape 1: Récupération des impayés actifs
        print(f"[WORKFLOW.GENERATE_RELANCES] STEP: Fetching active impayes")
        
        cursor.execute("""
            SELECT i.*, s.nom as sequence_nom, s.type_sequence, s.validation_obligatoire
            FROM impayes i
            JOIN sequences s ON i.sequence_id = s.id
            WHERE i.reste_a_payer > 0
              AND i.statut = 'impaye'
              AND i.suspendu = 0
              AND s.actif = 1
        """)
        
        impayes = [dict(row) for row in cursor.fetchall()]
        print(f"[WORKFLOW.GENERATE_RELANCES] STEP: Found {len(impayes)} impayes")
        
        # Étape 2: Filtrage
        filtered = []
        for impaye in impayes:
            # Vérifier si le contact est blacklisté
            cursor.execute(
                "SELECT is_blacklisted, email FROM contacts WHERE id = ?",
                (impaye.get('payer_id') or impaye.get('contact_relance_id'),)
            )
            contact = cursor.fetchone()
            
            if not contact:
                continue
            if contact['is_blacklisted']:
                continue
            if not contact['email']:
                continue
                
            filtered.append(impaye)
        
        print(f"[WORKFLOW.GENERATE_RELANCES] STEP: {len(filtered)} impayes after filtering")
        
        # Étape 3: Regroupement par contact/séquence
        grouped = {}
        for impaye in filtered:
            contact_id = impaye.get('payer_id') or impaye.get('contact_relance_id')
            key = f"{contact_id}_{impaye['sequence_id']}"
            
            if key not in grouped:
                grouped[key] = {
                    'contact_id': contact_id,
                    'sequence_id': impaye['sequence_id'],
                    'validation_obligatoire': impaye['validation_obligatoire'],
                    'impayes': []
                }
            grouped[key]['impayes'].append(impaye)
        
        # Étape 4: Création des relances
        created_count = 0
        scenarios = {'single': 0, 'multiple': 0, 'broker': 0, 'both': 0}
        
        for group in grouped.values():
            # Déterminer le scénario
            count = len(group['impayes'])
            if count == 1:
                scenario = 'single'
            else:
                has_broker = any(i.get('apporteur_id') for i in group['impayes'])
                has_payeur = any(i.get('payer_id') for i in group['impayes'])
                
                if has_broker and has_payeur:
                    scenario = 'both'
                elif has_broker:
                    scenario = 'broker'
                else:
                    scenario = 'multiple'
            
            scenarios[scenario] += 1
            
            # Récupérer le premier email de la séquence
            cursor.execute("""
                SELECT delai FROM sequences_emails 
                WHERE sequence_id = ? AND email_index = 0
            """, (group['sequence_id'],))
            
            email_config = cursor.fetchone()
            delai = email_config['delai'] if email_config else 0
            
            # Calculer la date de programmation
            date_echeance = datetime.datetime.strptime(
                group['impayes'][0]['date_echeance'], '%Y-%m-%d'
            )
            date_programmation = date_echeance + datetime.timedelta(days=delai)
            
            # Créer la relance
            relance_id = f"rel_{datetime.datetime.now().timestamp()}"
            statut = 'brouillon' if group['validation_obligatoire'] else 'pret pour envoi'
            
            cursor.execute("""
                INSERT INTO relances (
                    id, contact_id, sequence_id, impaye_id, statut,
                    type_relance, date_prevue, email_sujet, email_corps,
                    validation_requise, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                relance_id,
                group['contact_id'],
                group['sequence_id'],
                group['impayes'][0]['id'],
                statut,
                scenario,
                date_programmation.isoformat(),
                f"Relance {scenario}",
                f"Corps du message pour {len(group['impayes'])} facture(s)",
                1 if group['validation_obligatoire'] else 0,
                datetime.datetime.now().isoformat(),
                datetime.datetime.now().isoformat()
            ))
            
            created_count += 1
        
        db.commit()
        
        print(f"[WORKFLOW.GENERATE_RELANCES] SUCCESS: Created {created_count} relances")
        print(f"[WORKFLOW.GENERATE_RELANCES] SCENARIOS: {scenarios}")
        
        return {
            'relances_crees': created_count,
            'scenarios': scenarios
        }
        
    except Exception as e:
        print(f"[WORKFLOW.GENERATE_RELANCES] ERROR: {str(e)}")
        raise
