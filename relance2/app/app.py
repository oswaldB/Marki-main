from flask import Flask, render_template

def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')
    
    @app.route('/')
    def hello_world():
        return render_template('index.html')
    
    @app.route('/api/hello')
    def api_hello():
        return {'message': 'Hello from backend!', 'status': 'ok'}
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
