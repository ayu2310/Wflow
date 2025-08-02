import os
import sqlite3
import json
import subprocess
import threading
import time
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import base64
import io
from PIL import Image

app = Flask(__name__)
CORS(app)

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_db():
    conn = sqlite3.connect('wflow.db')
    conn.row_factory = sqlite3.Row
    return conn

def setup_database():
    """Setup SQLite database"""
    conn = sqlite3.connect('wflow.db')
    cursor = conn.cursor()
    
    # Create tables
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            natural_language_prompt TEXT NOT NULL,
            ai_interpreted_steps TEXT,
            status TEXT DEFAULT 'draft',
            browser_type TEXT DEFAULT 'chrome',
            headless BOOLEAN DEFAULT 1,
            timeout INTEGER DEFAULT 30000,
            max_retries INTEGER DEFAULT 3,
            retry_delay INTEGER DEFAULT 60,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS executions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER,
            status TEXT DEFAULT 'pending',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            duration INTEGER,
            result_data TEXT,
            error_message TEXT,
            screenshots TEXT,
            steps_completed INTEGER DEFAULT 0,
            total_steps INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workflow_id) REFERENCES workflows (id)
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    """)
    
    # Insert default settings
    cursor.execute("""
        INSERT OR REPLACE INTO settings (key, value) VALUES 
        ('gemini_api_key', ''),
        ('secret_key', 'your-secret-key-change-this'),
        ('debug', 'true')
    """)
    
    conn.commit()
    conn.close()

def interpret_workflow(prompt):
    """Use AI to interpret natural language workflow"""
    if not GEMINI_API_KEY:
        return {
            "interpreted_steps": [
                {
                    "step_number": 1,
                    "action_type": "navigate",
                    "description": "Navigate to website",
                    "target": "https://example.com",
                    "parameters": {}
                }
            ],
            "confidence_score": 0.8,
            "estimated_duration": 30
        }
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        system_prompt = """
        You are a browser automation expert. Convert natural language descriptions into structured workflow steps.
        Return a JSON object with:
        {
            "interpreted_steps": [
                {
                    "step_number": 1,
                    "action_type": "navigate|click|fill|extract|wait",
                    "description": "Human readable description",
                    "target": "URL or selector",
                    "parameters": {}
                }
            ],
            "confidence_score": 0.95,
            "estimated_duration": 120
        }
        """
        
        response = model.generate_content([system_prompt, prompt])
        return json.loads(response.text)
    except Exception as e:
        print(f"AI interpretation error: {e}")
        return {
            "interpreted_steps": [
                {
                    "step_number": 1,
                    "action_type": "navigate",
                    "description": "Navigate to website",
                    "target": "https://example.com",
                    "parameters": {}
                }
            ],
            "confidence_score": 0.5,
            "estimated_duration": 30
        }

def execute_workflow(workflow_id):
    """Execute a workflow"""
    conn = get_db()
    workflow = conn.execute('SELECT * FROM workflows WHERE id = ?', (workflow_id,)).fetchone()
    
    if not workflow:
        return {"error": "Workflow not found"}
    
    # Create execution record
    execution_id = conn.execute(
        'INSERT INTO executions (workflow_id, status, started_at) VALUES (?, ?, ?)',
        (workflow_id, 'running', datetime.now())
    ).lastrowid
    conn.commit()
    
    try:
        # Parse AI interpreted steps
        steps = json.loads(workflow['ai_interpreted_steps'])['interpreted_steps']
        
        # Setup Chrome
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.set_page_load_timeout(30)
        
        results = []
        for i, step in enumerate(steps):
            try:
                if step['action_type'] == 'navigate':
                    driver.get(step['target'])
                    results.append({"step": i+1, "success": True, "message": f"Navigated to {step['target']}"})
                
                elif step['action_type'] == 'click':
                    element = WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, step['target']))
                    )
                    element.click()
                    results.append({"step": i+1, "success": True, "message": f"Clicked {step['target']}"})
                
                elif step['action_type'] == 'fill':
                    element = driver.find_element(By.CSS_SELECTOR, step['target'])
                    element.clear()
                    element.send_keys(step['parameters'].get('value', ''))
                    results.append({"step": i+1, "success": True, "message": f"Filled {step['target']}"})
                
                elif step['action_type'] == 'extract':
                    element = driver.find_element(By.CSS_SELECTOR, step['target'])
                    text = element.text
                    results.append({"step": i+1, "success": True, "message": f"Extracted: {text[:100]}..."})
                
                elif step['action_type'] == 'wait':
                    time.sleep(step['parameters'].get('seconds', 2))
                    results.append({"step": i+1, "success": True, "message": f"Waited {step['parameters'].get('seconds', 2)} seconds"})
                
            except Exception as e:
                results.append({"step": i+1, "success": False, "message": str(e)})
        
        driver.quit()
        
        # Update execution record
        success = all(r['success'] for r in results)
        conn.execute(
            'UPDATE executions SET status = ?, completed_at = ?, result_data = ?, steps_completed = ?, total_steps = ? WHERE id = ?',
            ('completed' if success else 'failed', datetime.now(), json.dumps(results), len([r for r in results if r['success']]), len(steps), execution_id)
        )
        conn.commit()
        
        return {"success": success, "results": results, "execution_id": execution_id}
        
    except Exception as e:
        conn.execute(
            'UPDATE executions SET status = ?, completed_at = ?, error_message = ? WHERE id = ?',
            ('failed', datetime.now(), str(e), execution_id)
        )
        conn.commit()
        return {"error": str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/workflows', methods=['GET'])
def list_workflows():
    conn = get_db()
    workflows = conn.execute('SELECT * FROM workflows ORDER BY created_at DESC').fetchall()
    return jsonify([dict(w) for w in workflows])

@app.route('/api/workflows', methods=['POST'])
def create_workflow():
    data = request.json
    
    # Interpret with AI
    interpretation = interpret_workflow(data['natural_language_prompt'])
    
    conn = get_db()
    workflow_id = conn.execute(
        'INSERT INTO workflows (name, description, natural_language_prompt, ai_interpreted_steps) VALUES (?, ?, ?, ?)',
        (data['name'], data.get('description', ''), data['natural_language_prompt'], json.dumps(interpretation))
    ).lastrowid
    conn.commit()
    
    return jsonify({"id": workflow_id, "interpretation": interpretation})

@app.route('/api/workflows/<int:workflow_id>/execute', methods=['POST'])
def execute_workflow_api(workflow_id):
    result = execute_workflow(workflow_id)
    return jsonify(result)

@app.route('/api/executions', methods=['GET'])
def list_executions():
    conn = get_db()
    executions = conn.execute('''
        SELECT e.*, w.name as workflow_name 
        FROM executions e 
        JOIN workflows w ON e.workflow_id = w.id 
        ORDER BY e.created_at DESC
    ''').fetchall()
    return jsonify([dict(e) for e in executions])

@app.route('/api/settings', methods=['GET'])
def get_settings():
    conn = get_db()
    settings = conn.execute('SELECT * FROM settings').fetchall()
    return jsonify({s['key']: s['value'] for s in settings})

@app.route('/api/settings', methods=['POST'])
def update_settings():
    data = request.json
    conn = get_db()
    for key, value in data.items():
        conn.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (key, value))
    conn.commit()
    return jsonify({"success": True})

if __name__ == '__main__':
    print("🚀 Setting up Wflow...")
    setup_database()
    print("✅ Database setup complete")
    print("🚀 Starting Wflow...")
    print("📱 Open your browser to: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)