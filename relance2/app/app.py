from flask import Flask
import logging
import sys

# Configuration du logging vers stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Création de l'application Flask
app = Flask(__name__, template_folder='templates')

# Import et enregistrement du blueprint
from routes.hello import hello_bp
app.register_blueprint(hello_bp)

if __name__ == '__main__':
    logging.info("Démarrage de l'application Flask sur le port 5000")
    app.run(port=5000, debug=True)
