# Quick Start Guide

Get Wflow up and running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- Google Gemini API key (get one at https://makersuite.google.com/app/apikey)

## Step 1: Clone and Setup

```bash
git clone <your-repo-url>
cd wflow
```

## Step 2: Configure Environment

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit the file and add your Gemini API key
nano backend/.env
```

Update these values in `backend/.env`:
```
GEMINI_API_KEY=your_actual_gemini_api_key_here
SECRET_KEY=your-secret-key-change-this-to-something-secure
```

## Step 3: Start the Application

```bash
# Make the startup script executable
chmod +x start.sh

# Start all services
./start.sh
```

Or manually:
```bash
docker-compose up -d
```

## Step 4: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Step 5: Create Your First Workflow

1. Open http://localhost:3000
2. Click "New Workflow"
3. Enter a workflow name
4. Describe what you want to automate in natural language, for example:
   ```
   "Go to example.com, fill out the contact form with my information, and submit it"
   ```
5. Click "Interpret with AI"
6. Review the AI-generated steps
7. Click "Create Workflow"

## Step 6: Execute Your Workflow

1. Go to the Workflows page
2. Find your workflow in the list
3. Click "Execute" to run it immediately
4. Monitor the execution in the Executions page

## Example Workflows to Try

### Basic Form Filling
```
"Navigate to https://example.com/contact, fill the name field with 'John Doe', 
fill the email field with 'john@example.com', fill the message field with 
'Hello from Wflow automation', and click the submit button"
```

### Data Extraction
```
"Go to https://quotes.toscrape.com, extract all quote texts and authors, 
and save them to a file"
```

### Price Monitoring
```
"Visit https://amazon.com/dp/B08N5WRWNW, find the price element, 
extract the current price, and if it's below $500, send me an email"
```

## Troubleshooting

### Services won't start
```bash
# Check if ports are available
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend
```

### AI interpretation fails
- Verify your Gemini API key is correct
- Check the backend logs for API errors
- Ensure you have sufficient API quota

### Browser automation issues
- Check if Chrome is properly installed in the container
- Verify the target website is accessible
- Review execution logs for specific error messages

## Stopping the Application

```bash
docker-compose down
```

## Development Mode

For development, you can run services individually:

```bash
# Backend only
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend only
cd frontend
npm install
npm start
```

## Next Steps

- Explore the API documentation at http://localhost:8000/docs
- Try creating more complex workflows with conditional logic
- Set up scheduled workflows using the scheduling system
- Configure triggers for event-driven automation
- Check out the example workflows in `examples/demo_workflows.md`

## Support

- Check the main README.md for detailed documentation
- Review the API documentation for all available endpoints
- Look at example workflows for inspiration
- Open an issue on GitHub for bugs or feature requests