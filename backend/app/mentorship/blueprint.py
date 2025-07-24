from flask import Blueprint
from .routes import mentorship_bp

# O Blueprint já está definido em routes.py
# Este arquivo serve como ponto de entrada para o módulo

def register_mentorship_blueprint(app):
    """Registra o Blueprint de mentoria na aplicação Flask"""
    app.register_blueprint(mentorship_bp)
    
    # Log de registro
    app.logger.info("Módulo de mentoria registrado com sucesso")
    
    return mentorship_bp