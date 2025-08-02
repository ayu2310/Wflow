#!/usr/bin/env python3
"""
Simple Wflow Setup Script
Run this to start Wflow without Docker - everything runs locally!
"""

import os
import sys
import subprocess
import sqlite3
import json
import webbrowser
import time
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def install_requirements():
    """Install Python requirements"""
    print("📦 Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        sys.exit(1)

def setup_database():
    """Setup SQLite database"""
    print("🗄️ Setting up database...")
    db_path = Path("wflow.db")
    
    # Create database and tables
    conn = sqlite3.connect(db_path)
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
    print("✅ Database setup complete")

def create_simple_app():
    """Create a simple Flask web application"""
    print("🌐 Creating web application...")
    
    app_code = '''
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
    print("🚀 Starting Wflow...")
    print("📱 Open your browser to: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
'''
    
    with open('app.py', 'w') as f:
        f.write(app_code)
    
    print("✅ Web application created")

def create_templates():
    """Create HTML templates"""
    print("📄 Creating HTML templates...")
    
    os.makedirs('templates', exist_ok=True)
    
    # Main template
    main_html = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wflow - Browser Automation</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
</head>
<body class="bg-gray-50">
    <div id="app" class="min-h-screen">
        <!-- Header -->
        <header class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <h1 class="text-xl font-bold text-gray-900">Wflow</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <button @click="currentView = 'workflows'" 
                                :class="currentView === 'workflows' ? 'bg-blue-500 text-white' : 'text-gray-600'"
                                class="px-3 py-2 rounded-md text-sm font-medium">
                            Workflows
                        </button>
                        <button @click="currentView = 'executions'" 
                                :class="currentView === 'executions' ? 'bg-blue-500 text-white' : 'text-gray-600'"
                                class="px-3 py-2 rounded-md text-sm font-medium">
                            Executions
                        </button>
                        <button @click="currentView = 'settings'" 
                                :class="currentView === 'settings' ? 'bg-blue-500 text-white' : 'text-gray-600'"
                                class="px-3 py-2 rounded-md text-sm font-medium">
                            Settings
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <!-- Workflows View -->
            <div v-if="currentView === 'workflows'">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Workflows</h2>
                    <button @click="showCreateForm = true" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                        Create Workflow
                    </button>
                </div>

                <!-- Create Workflow Form -->
                <div v-if="showCreateForm" class="bg-white p-6 rounded-lg shadow mb-6">
                    <h3 class="text-lg font-medium mb-4">Create New Workflow</h3>
                    <form @submit.prevent="createWorkflow">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Name</label>
                                <input v-model="newWorkflow.name" type="text" required
                                       class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Description</label>
                                <input v-model="newWorkflow.description" type="text"
                                       class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">What do you want to automate?</label>
                                <textarea v-model="newWorkflow.natural_language_prompt" rows="4" required
                                          placeholder="Describe what you want to automate, e.g., 'Go to example.com, fill out the contact form, and submit it'"
                                          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
                            </div>
                            <div class="flex space-x-3">
                                <button type="submit" 
                                        class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                    Create Workflow
                                </button>
                                <button type="button" @click="showCreateForm = false"
                                        class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Workflows List -->
                <div class="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul class="divide-y divide-gray-200">
                        <li v-for="workflow in workflows" :key="workflow.id" class="px-6 py-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h3 class="text-lg font-medium text-gray-900">{{ workflow.name }}</h3>
                                    <p class="text-sm text-gray-500">{{ workflow.description }}</p>
                                    <p class="text-sm text-gray-400 mt-1">{{ workflow.natural_language_prompt }}</p>
                                </div>
                                <div class="flex space-x-2">
                                    <button @click="executeWorkflow(workflow.id)"
                                            class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                                        Execute
                                    </button>
                                    <button @click="deleteWorkflow(workflow.id)"
                                            class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Executions View -->
            <div v-if="currentView === 'executions'">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Executions</h2>
                <div class="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul class="divide-y divide-gray-200">
                        <li v-for="execution in executions" :key="execution.id" class="px-6 py-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h3 class="text-lg font-medium text-gray-900">{{ execution.workflow_name }}</h3>
                                    <p class="text-sm text-gray-500">Status: {{ execution.status }}</p>
                                    <p class="text-sm text-gray-400">{{ execution.created_at }}</p>
                                </div>
                                <div v-if="execution.result_data" class="text-sm text-gray-600">
                                    <div v-for="result in JSON.parse(execution.result_data)" :key="result.step">
                                        <span :class="result.success ? 'text-green-600' : 'text-red-600'">
                                            Step {{ result.step }}: {{ result.message }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Settings View -->
            <div v-if="currentView === 'settings'">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
                <div class="bg-white p-6 rounded-lg shadow">
                    <form @submit.prevent="saveSettings">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Gemini API Key</label>
                                <input v-model="settings.gemini_api_key" type="password"
                                       placeholder="Enter your Google Gemini API key"
                                       class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                <p class="text-sm text-gray-500 mt-1">Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" class="text-blue-600">Google AI Studio</a></p>
                            </div>
                            <button type="submit" 
                                    class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                Save Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    </div>

    <script>
        const { createApp } = Vue

        createApp({
            data() {
                return {
                    currentView: 'workflows',
                    showCreateForm: false,
                    workflows: [],
                    executions: [],
                    settings: {
                        gemini_api_key: ''
                    },
                    newWorkflow: {
                        name: '',
                        description: '',
                        natural_language_prompt: ''
                    }
                }
            },
            mounted() {
                this.loadWorkflows()
                this.loadExecutions()
                this.loadSettings()
            },
            methods: {
                async loadWorkflows() {
                    try {
                        const response = await axios.get('/api/workflows')
                        this.workflows = response.data
                    } catch (error) {
                        console.error('Error loading workflows:', error)
                    }
                },
                async loadExecutions() {
                    try {
                        const response = await axios.get('/api/executions')
                        this.executions = response.data
                    } catch (error) {
                        console.error('Error loading executions:', error)
                    }
                },
                async loadSettings() {
                    try {
                        const response = await axios.get('/api/settings')
                        this.settings = response.data
                    } catch (error) {
                        console.error('Error loading settings:', error)
                    }
                },
                async createWorkflow() {
                    try {
                        const response = await axios.post('/api/workflows', this.newWorkflow)
                        this.workflows.unshift(response.data)
                        this.showCreateForm = false
                        this.newWorkflow = { name: '', description: '', natural_language_prompt: '' }
                        alert('Workflow created successfully!')
                    } catch (error) {
                        console.error('Error creating workflow:', error)
                        alert('Error creating workflow')
                    }
                },
                async executeWorkflow(workflowId) {
                    try {
                        const response = await axios.post(`/api/workflows/${workflowId}/execute`)
                        alert('Workflow execution started!')
                        this.loadExecutions()
                    } catch (error) {
                        console.error('Error executing workflow:', error)
                        alert('Error executing workflow')
                    }
                },
                async deleteWorkflow(workflowId) {
                    if (confirm('Are you sure you want to delete this workflow?')) {
                        try {
                            await axios.delete(`/api/workflows/${workflowId}`)
                            this.workflows = this.workflows.filter(w => w.id !== workflowId)
                            alert('Workflow deleted successfully!')
                        } catch (error) {
                            console.error('Error deleting workflow:', error)
                            alert('Error deleting workflow')
                        }
                    }
                },
                async saveSettings() {
                    try {
                        await axios.post('/api/settings', this.settings)
                        alert('Settings saved successfully!')
                    } catch (error) {
                        console.error('Error saving settings:', error)
                        alert('Error saving settings')
                    }
                }
            }
        }).mount('#app')
    </script>
</body>
</html>
'''
    
    with open('templates/index.html', 'w') as f:
        f.write(main_html)
    
    print("✅ HTML templates created")

def create_requirements():
    """Create requirements.txt"""
    print("📋 Creating requirements file...")
    
    requirements = '''flask==2.3.3
flask-cors==4.0.0
google-generativeai==0.3.2
selenium==4.15.2
pillow==10.1.0
'''
    
    with open('requirements.txt', 'w') as f:
        f.write(requirements)
    
    print("✅ Requirements file created")

def main():
    """Main setup function"""
    print("🚀 Setting up Wflow - Simple Browser Automation Tool")
    print("=" * 50)
    
    # Check Python version
    check_python_version()
    
    # Create requirements
    create_requirements()
    
    # Install requirements
    install_requirements()
    
    # Setup database
    setup_database()
    
    # Create web application
    create_simple_app()
    
    # Create templates
    create_templates()
    
    print("\n" + "=" * 50)
    print("✅ Setup complete!")
    print("\n📋 Next steps:")
    print("1. Get a Google Gemini API key from: https://makersuite.google.com/app/apikey")
    print("2. Run: python app.py")
    print("3. Open your browser to: http://localhost:5000")
    print("4. Go to Settings and add your Gemini API key")
    print("5. Create your first workflow!")
    print("\n🎯 Example workflow:")
    print('"Go to https://example.com, find the contact form, fill it with my information, and submit it"')
    print("\n🛑 To stop the app, press Ctrl+C")

if __name__ == "__main__":
    main()