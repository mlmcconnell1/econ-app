import os
from flask import Flask, render_template

# Will be True on Replit, False elsewhere
is_replit = bool(os.getenv('REPL_ID'))

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')  # Serves the frontend

if __name__ == '__main__':
    if is_replit:
        app.run(host='0.0.0.0', port=5000)
    else:
        app.run(debug=True)  # Runs the local server in debug mode
