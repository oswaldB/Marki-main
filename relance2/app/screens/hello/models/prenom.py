import json
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), 'prenoms.json')

class Prenom:
    PRENOMS_DEFAUT = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"]

    @classmethod
    def _ensure_file(cls):
        if not os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'w') as f:
                json.dump({'current': 'Visiteur', 'all': cls.PRENOMS_DEFAUT}, f)

    @classmethod
    def get_current(cls):
        cls._ensure_file()
        with open(DATA_FILE, 'r') as f:
            return json.load(f).get('current', 'Visiteur')

    @classmethod
    def set_current(cls, prenom):
        cls._ensure_file()
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        data['current'] = prenom
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f)
