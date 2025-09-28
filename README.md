# Browser Automation SaaS

A comprehensive browser workflow automation SaaS tool with custom user scheduling, built with Browserbase API for cloud browsing and Stagehand for automation.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/Vue)   │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Scheduler     │
                    │   (Bull Queue)  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │   Stagehand     │    │   Browserbase   │
                    │   Automation    │◄──►│   Cloud Browsing│
                    └─────────────────┘    └─────────────────┘
```

## Core Features

### 1. User Management
- User authentication and authorization
- Role-based access control
- User profile management
- Subscription and billing integration

### 2. Workflow Creation
- Visual workflow builder
- Natural language automation commands
- Custom automation scripts
- Template library

### 3. Scheduling System
- Custom scheduling (cron expressions)
- Recurring tasks
- One-time executions
- Time zone support

### 4. Automation Engine
- Stagehand integration for browser automation
- Browserbase API for cloud browsing
- Context persistence across sessions
- Error handling and retry logic

### 5. Monitoring & Analytics
- Real-time execution monitoring
- Detailed execution logs
- Performance analytics
- Success/failure reporting

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for data persistence
- **Redis** for caching and job queues
- **Bull** for job scheduling
- **JWT** for authentication
- **Winston** for logging

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **React Query** for state management
- **React Router** for navigation

### Automation
- **Stagehand** for browser automation
- **Browserbase API** for cloud browsing
- **Playwright** as underlying browser engine

## Project Structure

```
browser-automation-saas/
├── src/
│   ├── server/                 # Backend server
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Express middleware
│   │   ├── models/            # Database models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Utility functions
│   │   └── index.js           # Server entry point
│   ├── automation/            # Automation engine
│   │   ├── stagehand/         # Stagehand integration
│   │   ├── browserbase/       # Browserbase integration
│   │   ├── scheduler/         # Job scheduling
│   │   └── workflows/         # Workflow definitions
│   └── shared/                # Shared utilities
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API services
│   │   └── utils/            # Frontend utilities
│   └── public/               # Static assets
├── tests/                    # Test files
├── docs/                     # Documentation
└── docker/                   # Docker configuration
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Redis
- Browserbase API key
- OpenAI API key (for Stagehand)

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start the development server: `npm run dev`

### Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/browser-automation-saas
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# External APIs
BROWSERBASE_API_KEY=your-browserbase-api-key
OPENAI_API_KEY=your-openai-api-key

# Frontend
REACT_APP_API_URL=http://localhost:3000/api
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Workflows
- `GET /api/workflows` - List user workflows
- `POST /api/workflows` - Create new workflow
- `GET /api/workflows/:id` - Get workflow details
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow

### Schedules
- `GET /api/schedules` - List user schedules
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Executions
- `GET /api/executions` - List executions
- `GET /api/executions/:id` - Get execution details
- `POST /api/executions/:id/retry` - Retry execution

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Docker Deployment
```bash
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details