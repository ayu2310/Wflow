#!/usr/bin/env python3
"""
Simple Wflow Startup Script
Installs dependencies and starts the application
"""

import os
import sys
import subprocess

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def install_requirements():
    """Install Python requirements"""
    print("📦 Installing Python dependencies...")
    try:
        # Try to install with --break-system-packages flag for this environment
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", 
            "--break-system-packages", "-r", "requirements.txt"
        ])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        print("\n💡 Alternative installation methods:")
        print("1. Try: pip3 install --break-system-packages -r requirements.txt")
        print("2. Or install packages individually:")
        print("   pip3 install --break-system-packages flask flask-cors google-generativeai selenium pillow")
        return False

def main():
    """Main startup function"""
    print("🚀 Starting Wflow - Simple Browser Automation Tool")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install requirements
    if not install_requirements():
        print("\n⚠️  Please install dependencies manually and then run: python3 app.py")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✅ Setup complete!")
    print("\n📋 Next steps:")
    print("1. Get a Google Gemini API key from: https://makersuite.google.com/app/apikey")
    print("2. Run: python3 app.py")
    print("3. Open your browser to: http://localhost:5000")
    print("4. Go to Settings and add your Gemini API key")
    print("5. Create your first workflow!")
    print("\n🎯 Example workflow:")
    print('"Go to https://example.com, find the contact form, fill it with my information, and submit it"')
    print("\n🛑 To stop the app, press Ctrl+C")

if __name__ == "__main__":
    main()