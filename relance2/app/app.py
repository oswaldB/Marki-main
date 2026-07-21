from flask import Flask
import logging
import sys

from routes.hello import hello_bp

app = Flask(__name__, template_folder='templates')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)

app.register_blueprint(hello_bp)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
