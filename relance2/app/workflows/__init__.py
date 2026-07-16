"""
Module workflows - Workflows backend appelés par le cron.

Chaque workflow doit exposer une fonction:
    def execute(**kwargs) -> dict

La fonction retourne un dict avec:
    - success: bool
    - message: str (optionnel)
    - data: any (optionnel)
"""
