# Wflow - Intelligent Browser Workflow Automation Tool

An AI-powered browser automation platform that enables users to create complex web workflows using natural language, with advanced scheduling and trigger-based execution capabilities.

## 🚀 Features

- **Natural Language Workflow Creation**: Describe workflows in plain English
- **AI-Powered Automation**: Powered by Google Gemini AI for intelligent task execution
- **Flexible Scheduling**: Time-based and trigger-based workflow execution
- **Visual Element Recognition**: Advanced screenshot analysis for reliable automation
- **Multi-Browser Support**: Chrome, Firefox, Safari compatibility
- **Enterprise Dashboard**: Comprehensive workflow management and monitoring

## 🏗️ Architecture

- **Backend**: Python/FastAPI with Gemini AI integration
- **Frontend**: React/TypeScript with modern UI
- **Browser Automation**: browser-use framework
- **Scheduling**: Celery with Redis
- **Database**: PostgreSQL for structured data
- **Infrastructure**: Docker for containerization

## 📋 Prerequisites

- Python 3.9+
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL
- Redis

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd wflow
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Environment Configuration

Copy the example environment files and configure your settings:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 5. Start Services

```bash
# Start database and Redis
docker-compose up -d postgres redis

# Start backend
cd backend
uvicorn main:app --reload

# Start frontend (in new terminal)
cd frontend
npm start
```

## 🔧 Configuration

### Required Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://user:password@localhost:5432/wflow
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your_secret_key
```

**Frontend (.env):**
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws
```

## 📖 Usage

1. **Create Workflow**: Use natural language to describe your automation
2. **Configure Triggers**: Set up visual or time-based triggers
3. **Schedule Execution**: Choose when and how often to run
4. **Monitor & Manage**: Track execution and performance through the dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions, please open an issue in the repository.