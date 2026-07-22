from flask import Flask
from .index import main_bp
from .wf_auth import wf_auth_bp

def init_app(app: Flask):
    app.register_blueprint(main_bp)
    app.register_blueprint(wf_auth_bp)