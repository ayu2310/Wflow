# Wflow - Simple Browser Automation Tool

**Create browser automation workflows using natural language - no Docker required!**

## 🚀 Quick Start (2 minutes)

### 1. Run the setup script
```bash
python simple-setup.py
```

### 2. Start the application
```bash
python app.py
```

### 3. Open your browser
Go to: http://localhost:5000

### 4. Add your API key
- Go to Settings
- Add your Google Gemini API key (get one free at https://makersuite.google.com/app/apikey)

### 5. Create your first workflow!
Describe what you want to automate in plain English.

## 🎯 Example Workflows

### Basic Form Filling
```
"Go to https://example.com/contact, fill the name field with 'John Doe', 
fill the email field with 'john@example.com', and click submit"
```

### Data Extraction
```
"Visit https://quotes.toscrape.com and extract all quote texts and authors"
```

### Price Monitoring
```
"Go to Amazon, search for iPhone, find the first product price, and extract it"
```

## ✨ Features

- **Natural Language**: Describe workflows in plain English
- **AI-Powered**: Uses Google Gemini AI to understand your requests
- **Browser Automation**: Automatically executes web tasks
- **Simple Setup**: No Docker, no complex configuration
- **Web Interface**: Clean, easy-to-use dashboard
- **Execution History**: Track and monitor your workflows

## 🛠️ What You Need

- Python 3.8 or higher
- Google Gemini API key (free)
- Chrome browser (for automation)

## 📦 What Gets Installed

- Flask web server
- Selenium for browser automation
- Google Gemini AI integration
- SQLite database
- Modern web interface

## 🎮 How to Use

1. **Create Workflow**: Click "Create Workflow" and describe what you want to automate
2. **AI Interpretation**: The system will break down your request into steps
3. **Execute**: Click "Execute" to run your workflow
4. **Monitor**: Check the Executions tab to see results

## 🔧 Troubleshooting

### "Chrome not found" error
Install Chrome browser on your system.

### "API key not working"
- Make sure you have a valid Gemini API key
- Check that you've saved it in Settings
- Verify you have API quota remaining

### "Workflow failed"
- Check the execution details for specific errors
- Make sure the website is accessible
- Try simpler workflows first

## 🚀 Advanced Usage

### Supported Actions
- **Navigate**: Go to websites
- **Click**: Click buttons and links
- **Fill**: Fill out forms
- **Extract**: Get data from pages
- **Wait**: Pause between actions

### Tips for Better Workflows
- Be specific about URLs and elements
- Include wait times for dynamic content
- Test with simple workflows first
- Use descriptive names for your workflows

## 🛑 Stopping the App

Press `Ctrl+C` in the terminal where you ran `python app.py`

## 📁 Files Created

- `app.py` - Main application
- `wflow.db` - SQLite database
- `templates/` - Web interface files
- `requirements.txt` - Python dependencies

## 🆘 Need Help?

- Check the execution logs for error details
- Try simpler workflows to test the system
- Make sure your Gemini API key is valid
- Ensure Chrome browser is installed

## 🎉 That's It!

You now have a powerful browser automation tool running locally. No Docker, no complex setup - just describe what you want to automate and let AI handle the rest!