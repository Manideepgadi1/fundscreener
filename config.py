"""
Configuration file for Fund Screener application
"""
import os

class Config:
    """Base configuration"""
    # Server settings
    HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
    PORT = int(os.environ.get('FLASK_PORT', 8004))  # Using port 8004 - verified free
    DEBUG = os.environ.get('FLASK_DEBUG', 'False') == 'True'
    
    # Application settings
    APP_NAME = 'Fund Screener'
    CSV_FILE = os.environ.get('CSV_FILE', 'FinExport_11-12-2025.csv')
    
    # Security (for production)
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    PORT = 8004

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    PORT = 8004

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
