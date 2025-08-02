# Demo Workflows

Here are some example workflows you can create with Wflow to demonstrate its capabilities:

## 1. Contact Form Automation

**Natural Language Prompt:**
"Go to our company website contact form, fill it with lead information from my Google Sheet, and submit each entry one by one"

**Expected AI Interpretation:**
- Navigate to company website
- Locate and fill contact form fields
- Extract data from external source (Google Sheets)
- Submit form
- Repeat for multiple entries

## 2. Price Monitoring

**Natural Language Prompt:**
"Check the price of the iPhone 15 on Amazon every hour, and if it drops below $800, send me an email notification"

**Expected AI Interpretation:**
- Navigate to Amazon product page
- Extract current price
- Compare with threshold ($800)
- Send email notification if condition met
- Schedule to run every hour

## 3. Social Media Posting

**Natural Language Prompt:**
"Log into my LinkedIn account, create a new post with content from my content calendar, and schedule it for tomorrow at 9 AM"

**Expected AI Interpretation:**
- Navigate to LinkedIn login
- Authenticate user credentials
- Navigate to post creation
- Fill post content from external source
- Set scheduling parameters
- Submit post

## 4. Data Extraction

**Natural Language Prompt:**
"Go to the job board website, search for 'remote software engineer' positions, extract the job titles, companies, and salaries, and save them to a CSV file"

**Expected AI Interpretation:**
- Navigate to job board
- Perform search with keywords
- Extract structured data from results
- Format data for CSV export
- Save to file system

## 5. E-commerce Inventory Check

**Natural Language Prompt:**
"Check our online store inventory levels, and if any product has less than 10 items in stock, update the product status to 'Low Stock' and send an alert to the warehouse team"

**Expected AI Interpretation:**
- Navigate to inventory management system
- Check stock levels for all products
- Identify products below threshold
- Update product status
- Send notification to team

## 6. Website Health Monitoring

**Natural Language Prompt:**
"Visit our main website every 30 minutes, check if the homepage loads correctly, verify all navigation links work, and send an alert if any issues are found"

**Expected AI Interpretation:**
- Navigate to homepage
- Verify page loads successfully
- Test navigation links
- Check for error indicators
- Send alert on failure
- Schedule recurring execution

## 7. Form Data Processing

**Natural Language Prompt:**
"Download the latest customer feedback form submissions from our Google Drive, process each response, categorize them by sentiment, and update our CRM system with the results"

**Expected AI Interpretation:**
- Access Google Drive
- Download form submissions
- Process and analyze responses
- Categorize by sentiment
- Update CRM system
- Handle multiple data sources

## 8. Content Publishing

**Natural Language Prompt:**
"Take the latest blog post from our content management system, format it for our website, add SEO metadata, and publish it with a featured image"

**Expected AI Interpretation:**
- Access CMS
- Retrieve blog content
- Format for web display
- Add SEO elements
- Upload and attach image
- Publish content

## 9. Customer Support Ticket Processing

**Natural Language Prompt:**
"Check our support email inbox every 15 minutes, categorize incoming tickets by priority, assign them to appropriate team members, and send confirmation emails to customers"

**Expected AI Interpretation:**
- Access email system
- Check for new messages
- Analyze ticket content
- Determine priority level
- Assign to team members
- Send automated responses

## 10. Financial Data Aggregation

**Natural Language Prompt:**
"Log into our banking portal, download the latest transaction data, categorize expenses, generate a monthly report, and email it to the finance team"

**Expected AI Interpretation:**
- Navigate to banking portal
- Authenticate securely
- Download transaction data
- Process and categorize
- Generate report
- Send via email

## Tips for Creating Effective Workflows

1. **Be Specific**: Include details about URLs, form fields, and expected outcomes
2. **Mention Data Sources**: Specify where data should come from (files, databases, APIs)
3. **Define Conditions**: Include if/then scenarios and thresholds
4. **Specify Timing**: Mention when and how often the workflow should run
5. **Include Error Handling**: Describe what should happen if something goes wrong
6. **Mention Notifications**: Specify who should be notified and how

## Advanced Features to Try

- **Visual Triggers**: "When the 'Out of Stock' message appears on the product page"
- **Data Triggers**: "If the price drops below $50"
- **Element Triggers**: "When a new job posting contains 'remote work'"
- **Conditional Logic**: "If the form submission is successful, send a thank you email; otherwise, retry"
- **Multi-step Processes**: Complex workflows with dependencies between steps