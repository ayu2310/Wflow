#!/bin/bash

echo "🚀 Starting Wflow - Intelligent Browser Workflow Automation Tool"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please update backend/.env with your Gemini API key and other settings"
fi

# Start the application
echo "🐳 Starting services with Docker Compose..."
docker-compose up -d

echo "✅ Services started successfully!"
echo ""
echo "📊 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo ""
echo "📋 Next steps:"
echo "   1. Update backend/.env with your Gemini API key"
echo "   2. Visit http://localhost:3000 to access the application"
echo "   3. Create your first workflow using natural language"
echo ""
echo "🛑 To stop the application, run: docker-compose down"