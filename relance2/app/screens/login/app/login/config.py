"""Configuration for login cell"""

import os


class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    JWT_SECRET = os.environ.get('JWT_SECRET') or 'jwt-secret-key-change-in-production'
    JWT_EXPIRATION_HOURS = 24
    
    # Database
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, 'data', 'login.db')
    
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
