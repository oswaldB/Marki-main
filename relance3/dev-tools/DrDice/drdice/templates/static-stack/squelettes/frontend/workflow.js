/*
INSTRUCTIONS IA - À APPLIQUER:
=============================

PRIORITÉ ABSOLUE: LIT EN PREMIER .specs/page-specs.md

1. NOM DU WORKFLOW: {wf_name}

2. SPECS: Implémenter selon:
   - .specs/wf-frontend/{wf_name}.md
   - /home/ubuntu/marki/relance3/app/site/{cell_name}/.specs/wf-frontend/{wf_name}.md

3. FONCTION: Export nommé execute(context, params) qui:
   - Prend context (avec localDB, remoteDB, etc.)
   - Prend params (paramètres du workflow)
   - Retourne { success: true/false, data: {}, error: string }

4. CONSOLE: Logger '{wf_name}.js loaded' au chargement
*/

console.log('{wf_name}.js loaded');

/**
 * Workflow {wf_name}
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('{wf_name} workflow executing', params);
    
    try {
        // TODO: Implémenter selon les specs .specs/wf-frontend/{wf_name}.md
        
        return { 
            success: true, 
            data: {} 
        };
        
    } catch (err) {
        console.error('{wf_name} error:', err);
        return { 
            success: false, 
            error: err.message 
        };
    }
}
