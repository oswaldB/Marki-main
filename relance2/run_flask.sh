#!/bin/bash
cd /home/ubuntu/marki/relance2
source venv/bin/activate
python -c "from app.app import app; app.run(host='0.0.0.0', port=5001, debug=False)"
