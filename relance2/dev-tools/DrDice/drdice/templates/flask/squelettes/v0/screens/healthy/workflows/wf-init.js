/**
 * Workflow Engine pour Healthy
 * Use case: healthy?name=coucou → affiche "Hello coucou"
 */

const wf = {
    // Registre des workflows disponibles
    workflows: {},
    
    /**
     * Enregistre un workflow
     * @param {string} name - Nom du workflow
     * @param {Function} fn - Fonction du workflow
     */
    register: function(name, fn) {
        this.workflows[name] = fn;
        console.log('[wf] ✓ Workflow enregistré:', name);
    },
    
    /**
     * Exécute un workflow
     * @param {string} name - Nom du workflow
     * @param {Object} params - Paramètres
     * @returns {Promise} Résultat du workflow
     */
    run: function(name, params) {
        console.log('[wf] ✓ Exécution workflow:', name, params);
        
        return new Promise((resolve, reject) => {
            if (!this.workflows[name]) {
                reject(new Error('Workflow "' + name + '" non trouvé'));
                return;
            }
            
            try {
                const result = this.workflows[name](params);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }
};

// Workflow "hello" : retourne "Hello {name}"
wf.register('hello', function(params) {
    const name = params && params.name ? params.name : 'toto';
    const message = 'Hello ' + name;
    
    console.log('[wf:hello] ✓ Exécution avec name:', name);
    console.log('[wf:hello] ✓ Résultat:', message);
    
    return message;
});

// Exposer wf globalement
window.wf = wf;
console.log('[wf-init.js] ✓ Workflow Engine chargé');
