import logging
import sys

from flask import Flask

from routes.hello import hello

# Configuration du logging vers stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Création de l'application Flask
app = Flask(__name__, template_folder='templates')

# Enregistrement du blueprint hello
app.register_blueprint(hello)

if __name__ == '__main__':
    logger.info("Démarrage du serveur Flask sur le port 5000")
    app.run(port=5000, debug=True)
