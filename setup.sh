#!/bin/bash

# Browser Automation SaaS Setup Script
# This script sets up the development environment for the browser automation SaaS tool

set -e

echo "🚀 Setting up Browser Automation SaaS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if MongoDB is installed
check_mongodb() {
    print_status "Checking MongoDB installation..."
    if ! command -v mongod &> /dev/null; then
        print_warning "MongoDB is not installed. You can install it or use Docker."
        print_status "To install MongoDB:"
        print_status "  Ubuntu/Debian: sudo apt-get install mongodb"
        print_status "  macOS: brew install mongodb-community"
        print_status "  Or use Docker: docker run -d -p 27017:27017 mongo:7.0"
    else
        print_success "MongoDB is installed"
    fi
}

# Check if Redis is installed
check_redis() {
    print_status "Checking Redis installation..."
    if ! command -v redis-server &> /dev/null; then
        print_warning "Redis is not installed. You can install it or use Docker."
        print_status "To install Redis:"
        print_status "  Ubuntu/Debian: sudo apt-get install redis-server"
        print_status "  macOS: brew install redis"
        print_status "  Or use Docker: docker run -d -p 6379:6379 redis:7-alpine"
    else
        print_success "Redis is installed"
    fi
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    npm install
    print_success "Backend dependencies installed"
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
}

# Create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env file from template"
        print_warning "Please update .env file with your actual API keys and configuration"
    else
        print_status ".env file already exists"
    fi
}

# Create logs directory
create_logs_dir() {
    print_status "Creating logs directory..."
    mkdir -p logs
    print_success "Logs directory created"
}

# Check environment variables
check_env_vars() {
    print_status "Checking environment variables..."
    
    if [ ! -f .env ]; then
        print_error ".env file not found. Please create it first."
        exit 1
    fi
    
    source .env
    
    if [ -z "$BROWSERBASE_API_KEY" ] || [ "$BROWSERBASE_API_KEY" = "your-browserbase-api-key" ]; then
        print_warning "BROWSERBASE_API_KEY not set in .env file"
    fi
    
    if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your-openai-api-key" ]; then
        print_warning "OPENAI_API_KEY not set in .env file"
    fi
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
        print_warning "JWT_SECRET is using default value. Please change it for production."
    fi
}

# Start services
start_services() {
    print_status "Starting services..."
    
    # Start MongoDB if available
    if command -v mongod &> /dev/null; then
        print_status "Starting MongoDB..."
        if ! pgrep -x "mongod" > /dev/null; then
            mongod --fork --logpath /tmp/mongod.log
            print_success "MongoDB started"
        else
            print_status "MongoDB is already running"
        fi
    fi
    
    # Start Redis if available
    if command -v redis-server &> /dev/null; then
        print_status "Starting Redis..."
        if ! pgrep -x "redis-server" > /dev/null; then
            redis-server --daemonize yes
            print_success "Redis started"
        else
            print_status "Redis is already running"
        fi
    fi
}

# Main setup function
main() {
    echo "=========================================="
    echo "  Browser Automation SaaS Setup"
    echo "=========================================="
    echo
    
    check_nodejs
    check_mongodb
    check_redis
    
    install_backend_deps
    install_frontend_deps
    
    create_env_file
    create_logs_dir
    
    check_env_vars
    
    echo
    print_success "Setup completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Update .env file with your API keys:"
    echo "   - BROWSERBASE_API_KEY (get from https://browserbase.com)"
    echo "   - OPENAI_API_KEY (get from https://openai.com)"
    echo "   - Change JWT_SECRET to a secure random string"
    echo
    echo "2. Start MongoDB and Redis (if not using Docker):"
    echo "   - MongoDB: mongod"
    echo "   - Redis: redis-server"
    echo
    echo "3. Start the development server:"
    echo "   npm run dev"
    echo
    echo "4. Or use Docker Compose:"
    echo "   docker-compose up -d"
    echo
    echo "The application will be available at:"
    echo "  - Backend API: http://localhost:3000"
    echo "  - Frontend: http://localhost:3001"
    echo
}

# Run main function
main "$@"