"""Générateurs de tests depuis les specs datamapping."""

import re
from pathlib import Path
from typing import Dict, List, Tuple


def extract_schema_from_datamapping(datamapping_path: Path) -> Dict:
    """Extrait le schéma de données depuis un fichier datamapping.md.
    
    Retourne un dict avec:
    - entity_name: nom de l'entité
    - fields: liste des champs avec type et contraintes
    - endpoints: liste des endpoints API
    """
    content = datamapping_path.read_text()
    
    # Extraire le nom de l'entité
    entity_match = re.search(r'### Entité : (\w+)', content)
    entity_name = entity_match.group(1) if entity_match else "Unknown"
    
    # Extraire les champs depuis le tableau de mapping
    fields = []
    field_pattern = r'\|\s*`(\w+)`\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*([^|]+)\|'
    for match in re.finditer(field_pattern, content):
        fields.append({
            'name': match.group(1),
            'sql_type': match.group(2),
            'python_type': match.group(3),
            'json_type': match.group(4),
            'constraints': match.group(5).strip()
        })
    
    # Extraire les endpoints
    endpoints = []
    endpoint_pattern = r'(GET|POST|PUT|DELETE|PATCH)\s+(/api/[^\s`]+)'
    for match in re.finditer(endpoint_pattern, content):
        endpoints.append({
            'method': match.group(1),
            'path': match.group(2)
        })
    
    return {
        'entity_name': entity_name,
        'fields': fields,
        'endpoints': endpoints,
        'cell_name': datamapping_path.parent.name
    }


def generate_api_contract_test(schema: Dict) -> str:
    """Génère un fichier de test API contract depuis le schéma."""
    
    entity = schema['entity_name']
    cell = schema['cell_name']
    endpoints = schema['endpoints']
    fields = schema['fields']
    
    # Générer les champs requis pour la validation
    required_fields = [f"'{f['name']}'" for f in fields if 'nullable=False' in f.get('constraints', '')]
    
    test_code = f'''"""Tests API Contract générés automatiquement depuis datamapping.md

Ce fichier vérifie que les endpoints API retournent exactement le format
documenté dans le data mapping.
"""

import pytest
from app import create_app, db
from app.models.{cell} import {entity}


@pytest.fixture
def app():
    """Application fixture avec DB de test."""
    app = create_app({{'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'}})
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Test client."""
    return app.test_client()


@pytest.fixture
def sample_data(app):
    """Crée des données de test selon le data mapping."""
    with app.app_context():
        item = {entity}(
'''
    
    # Ajouter des valeurs de test pour chaque champ requis
    for field in fields:
        if field['name'] == 'id':
            continue
        if field['python_type'] == 'str':
            test_code += f"            {field['name']}=\'test_{field['name']}\',\n"
        elif field['python_type'] == 'int':
            test_code += f"            {field['name']}=1,\n"
        elif field['python_type'] == 'bool':
            test_code += f"            {field['name']}=True,\n"
    
    test_code += f'''        )
        db.session.add(item)
        db.session.commit()
        return item


class Test{entity}APIContract:
    """Tests contractuels pour l'API {cell}."""
    
    def test_list_returns_expected_structure(self, client, sample_data):
        """GET /api/{cell}s doit retourner la structure du data mapping."""
        response = client.get('/api/{cell}s')
        assert response.status_code == 200
        
        data = response.get_json()
        
        # Vérifier la structure de base
        assert 'data' in data, "Champ 'data' manquant"
        assert 'total' in data, "Champ 'total' manquant"
        assert isinstance(data['data'], list), "'data' doit être une liste"
        
        if data['data']:
            item = data['data'][0]
            # Vérifier chaque champ du data mapping
'''
    
    # Ajouter les assertions pour chaque champ
    for field in fields:
        if field['name'] == 'id':
            test_code += f"            assert '{field['name']}' in item\n"
            test_code += f"            assert isinstance(item['{field['name']}'], int)\n"
        elif field['json_type'] == 'string':
            test_code += f"            assert '{field['name']}' in item\n"
            test_code += f"            assert isinstance(item['{field['name']}'], str)\n"
        elif field['json_type'] == 'number':
            test_code += f"            assert '{field['name']}' in item\n"
            test_code += f"            assert isinstance(item['{field['name']}'], (int, float))\n"
        elif field['json_type'] == 'boolean':
            test_code += f"            assert '{field['name']}' in item\n"
            test_code += f"            assert isinstance(item['{field['name']}'], bool)\n"
    
    # Ajouter les champs à ne PAS retrouver (sécurité)
    test_code += f'''
            # Vérifier que les champs sensibles ne sont pas exposés
            assert 'password_hash' not in item, "password_hash ne doit pas être exposé"
            assert '_password' not in item, "_password ne doit pas être exposé"
    
'''
    
    # Générer des tests pour chaque endpoint trouvé
    for endpoint in endpoints:
        method = endpoint['method']
        path = endpoint['path'].replace('{cell}', cell).replace('{id}', '1')
        
        if method == 'GET' and '/<' not in endpoint['path']:
            test_code += f'''    def test_get_list_status_code(self, client, sample_data):
        """GET {path} doit retourner 200."""
        response = client.get('{path}')
        assert response.status_code == 200
    
'''
        elif method == 'GET' and '/<' in endpoint['path']:
            test_code += f'''    def test_get_detail_returns_item(self, client, sample_data):
        """GET {path} doit retourner un item spécifique."""
        response = client.get('{path.replace('/<int:id>', '/1') or path.replace('/<id>', '/1')}')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'data' in data
        assert data['data']['id'] == 1
    
    def test_get_detail_not_found(self, client):
        """GET {path} avec ID inexistant doit retourner 404."""
        response = client.get('{path.replace('/<int:id>', '/999') or path.replace('/<id>', '/999')}')
        assert response.status_code == 404
    
'''
        elif method == 'POST':
            test_code += f'''    def test_create_returns_201(self, client):
        """POST {path} doit créer et retourner 201."""
        response = client.post('{path}', json={{
'''
            # Ajouter les champs requis pour la création
            for field in fields:
                if field['name'] == 'id':
                    continue
                if field['python_type'] == 'str':
                    test_code += f"            '{field['name']}': 'test_value',\n"
                elif field['python_type'] == 'int':
                    test_code += f"            '{field['name']}': 1,\n"
            
            test_code += f'''        }})
        assert response.status_code == 201
        
        data = response.get_json()
        assert 'data' in data
        assert 'id' in data['data']
    
    def test_create_validation_error(self, client):
        """POST {path} avec données invalides doit retourner 400."""
        response = client.post('{path}', json={{{{}}}})
        assert response.status_code == 400
    
'''
        elif method == 'PUT':
            test_code += f'''    def test_update_returns_200(self, client, sample_data):
        """PUT {path} doit mettre à jour et retourner 200."""
        response = client.put('{path.replace('/<int:id>', '/1') or path.replace('/<id>', '/1')}', json={{
            'name': 'updated_name'
        }})
        assert response.status_code == 200
    
'''
        elif method == 'DELETE':
            test_code += f'''    def test_delete_returns_200(self, client, sample_data):
        """DELETE {path} doit supprimer et retourner 200."""
        response = client.delete('{path.replace('/<int:id>', '/1') or path.replace('/<id>', '/1')}')
        assert response.status_code == 200
        
        # Vérifier que l'item n'existe plus
        response = client.get('{path.replace('/<int:id>', '/1') or path.replace('/<id>', '/1')}')
        assert response.status_code == 404
    
'''
    
    # Ajouter un test de sérialisation
    test_code += f'''    def test_model_to_dict_returns_expected_fields(self, sample_data):
        """La méthode to_dict() doit retourner tous les champs du data mapping."""
        item = sample_data
        data = item.to_dict()
        
        # Vérifier la présence de chaque champ
'''
    for field in fields:
        test_code += f"        assert '{field['name']}' in data\n"
    
    test_code += f'''
    def test_model_to_dict_excludes_sensitive_fields(self, sample_data):
        """La méthode to_dict() ne doit pas exposer les champs sensibles."""
        item = sample_data
        data = item.to_dict()
        
        assert 'password_hash' not in data
        assert '_password' not in data
'''
    
    return test_code


def generate_workflow_tests(cell_path: Path) -> str:
    """Génère des tests pour les workflows frontend."""
    
    cell_name = cell_path.name
    workflows_dir = cell_path / 'workflows'
    
    if not workflows_dir.exists():
        return f"// Aucun workflow trouvé dans {cell_name}/workflows/"
    
    test_code = f'''"""Tests des workflows frontend pour {cell_name}.

Généré automatiquement depuis les specs.
"""

// Mock pour les tests
const mockApi = {{
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
}};

const mockContext = {{
    api: mockApi,
    baseUrl: '/api/{cell_name}s'
}};

beforeEach(() => {{
    jest.clearAllMocks();
}});

'''
    
    # Lister tous les workflows
    for workflow_file in workflows_dir.glob('*.js'):
        workflow_name = workflow_file.stem
        
        test_code += f'''
describe('{workflow_name} workflow', () => {{
    test('should exist and be importable', async () => {{
        const {{ execute }} = await import('../app/static/js/pages/{cell_name}/workflows/{workflow_name}.js');
        expect(execute).toBeDefined();
        expect(typeof execute).toBe('function');
    }});
    
    test('should return success structure', async () => {{
        const {{ execute }} = await import('../app/static/js/pages/{cell_name}/workflows/{workflow_name}.js');
        
        // Mock réponse API standardisée
        mockApi.get.mockResolvedValue({{
            success: true,
            data: {{ data: [], total: 0 }}
        }});
        
        const result = await execute(mockContext, {{}});
        
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');
    }});
    
    test('should return error on API failure', async () => {{
        const {{ execute }} = await import('../app/static/js/pages/{cell_name}/workflows/{workflow_name}.js');
        
        mockApi.get.mockRejectedValue(new Error('Network error'));
        
        const result = await execute(mockContext, {{}});
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    }});
}});

'''
    
    return test_code


def generate_all_tests(cell_path: Path, specs_path: Path = None) -> Tuple[bool, List[str]]:
    """Génère tous les tests pour une cell.
    
    Args:
        cell_path: Chemin vers la cell dans app/
        specs_path: Chemin vers les specs dans .specs/ (optionnel)
    
    Returns:
        (success, list_of_generated_files)
    """
    generated_files = []
    
    # Créer le dossier cell si nécessaire
    cell_path.mkdir(parents=True, exist_ok=True)
    
    # Chercher le datamapping
    if specs_path is None:
        specs_path = cell_path / '.specs'
    
    datamapping_path = specs_path / 'data-mapping-page.md'
    if not datamapping_path.exists():
        # Essayer l'ancien chemin pour compatibilité
        datamapping_path = cell_path / 'datamapping.md'
        if not datamapping_path.exists():
            return False, []
    
    # Extraire le schéma
    try:
        schema = extract_schema_from_datamapping(datamapping_path)
    except Exception as e:
        print(f"Erreur extraction schéma: {e}")
        return False, []
    
    # Générer les tests API
    api_test_code = generate_api_contract_test(schema)
    api_test_path = cell_path / 'test-api-contract.py'
    api_test_path.write_text(api_test_code)
    generated_files.append(str(api_test_path))
    
    # Générer les tests workflows
    workflow_test_code = generate_workflow_tests(cell_path)
    workflow_test_path = cell_path / 'test-workflows.js'
    workflow_test_path.write_text(workflow_test_code)
    generated_files.append(str(workflow_test_path))
    
    return True, generated_files
