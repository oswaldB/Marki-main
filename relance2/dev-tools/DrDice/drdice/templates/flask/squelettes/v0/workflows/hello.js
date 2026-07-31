/**
 * Workflow {cell_name} - Exemple de workflow frontend
 * Prend un paramètre name et retourne "hello name"
 * Usage: ?name=toto dans l'URL
 */

async function {cell_name}Workflow(name) {{
    const targetName = name || 'toto';
    console.log('[{cell_name}Workflow] ✓ Exécution avec name:', targetName);
    
    return new Promise((resolve) => {{
        setTimeout(() => {{
            const message = `hello ${{targetName}}`;
            console.log('[{cell_name}Workflow] ✓ Résultat:', message);
            resolve(message);
        }}, 100);
    }});
}}

// Exposer globalement
window.{cell_name}Workflow = {cell_name}Workflow;
console.log('[{cell_name}Workflow] ✓ Workflow chargé');
