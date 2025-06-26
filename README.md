# Test Case Management MVP

A modern, AI-powered Test Case Management application built with React, Node.js, and Google Cloud Platform. This MVP provides a comprehensive solution for managing test cases, documents, and AI-generated test scenarios.

## Features

- **Project Management**: Create and manage multiple test projects
- **Document Upload**: Support for PDF, Excel, CSV, and other document formats
- **AI-Powered Test Generation**: Generate test cases using Google's Gemini AI
- **File Management**: Secure file storage with Google Cloud Storage
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Real-time Updates**: Instant updates across the application

## Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **JavaScript (ES6+)** - Modern JavaScript features

### Backend
- **Node.js** - Server-side JavaScript runtime
- **Express.js** - Web application framework
- **Google Cloud Storage** - File storage and management
- **Firestore** - NoSQL database for data persistence

### AI Integration
- **Google Gemini API** - AI-powered test case generation

## Prerequisites

Before running this application, you'll need:

1. **Node.js** (v16 or higher)
2. **Google Cloud Platform Account** with:
   - Firestore Database
   - Cloud Storage Bucket
   - Service Account with appropriate permissions
3. **Google Gemini API Key** (for AI features)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/HarshithaG2619/Test-case-Management-MVP.git
cd Test-case-Management-MVP
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Set Up Google Cloud Platform

1. **Create a Google Cloud Project** (if you don't have one)
2. **Enable Firestore Database**:
   - Go to Firestore in Google Cloud Console
   - Create a database (choose your preferred location)
   - Start in production mode

3. **Create a Cloud Storage Bucket**:
   - Go to Cloud Storage in Google Cloud Console
   - Create a new bucket
   - Set CORS policy (see setup instructions below)

4. **Create a Service Account**:
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Grant roles: Firestore Admin, Storage Admin
   - Download the JSON key file

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name

# Gemini API
REACT_APP_GEMINI_API_KEY=your-gemini-api-key

# Backend Configuration
PORT=4000
```

### 5. Set Up Service Account

1. Place your downloaded service account JSON file in the `server/` directory
2. Rename it to `service-account.json`

### 6. Configure CORS for Cloud Storage

Create a `cors.json` file in your project root:

```json
[
  {
    "origin": ["http://localhost:3000", "https://your-domain.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

Apply the CORS policy to your bucket:

```bash
gsutil cors set cors.json gs://your-bucket-name
```

### 7. Start the Application

```bash
# Start the backend server (in one terminal)
cd server
npm start

# Start the frontend (in another terminal)
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000

## Usage Guide

### Creating a Project

1. Click "Create New Project" on the home page
2. Enter project details (name, description, etc.)
3. Click "Create Project"

### Uploading Documents

1. Navigate to your project
2. Click "Upload Document"
3. Select files (PDF, Excel, CSV, etc.)
4. Files will be uploaded to Google Cloud Storage

### Generating Test Cases

1. Upload a document or select an existing one
2. Click "Generate Test Cases"
3. Optionally provide a custom prompt
4. Select an Excel template for context (optional)
5. Click "Generate" to create AI-powered test cases

### Managing Test Cases

- View all test cases in a table format
- Each test case includes ID, title, description, and steps
- Test cases are automatically saved to Firestore

## 🔧 API Endpoints

### Projects
- `GET /projects` - Get all projects
- `POST /projects` - Create a new project
- `PUT /projects/:id` - Update a project
- `DELETE /projects/:id` - Delete a project

### Documents
- `GET /documents` - Get documents (optionally filtered by project)
- `POST /documents` - Create document metadata
- `DELETE /documents/:id` - Delete a document

### Test Cases
- `GET /testcases` - Get test cases (optionally filtered by project)
- `POST /testcases` - Create a new test case
- `PUT /testcases/:id` - Update a test case
- `DELETE /testcases/:id` - Delete a test case

### File Operations
- `POST /upload` - Upload files to Google Cloud Storage
- `POST /generate-download-url` - Generate signed download URLs

## Deployment

### Frontend Deployment (Vercel/Netlify)

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `build` folder to your preferred platform

3. Set environment variables in your deployment platform:
   - `REACT_APP_GEMINI_API_KEY`
   - `REACT_APP_API_URL` (your backend URL)

### Backend Deployment (Render/Heroku)

1. Deploy the `server/` directory
2. Set environment variables:
   - `GOOGLE_CLOUD_PROJECT_ID`
   - `GOOGLE_CLOUD_STORAGE_BUCKET`
   - `PORT`

3. Upload your `service-account.json` file to the deployment environment

## Security Considerations

- Service account credentials are kept secure and not committed to version control
- Environment variables are used for sensitive configuration
- CORS is properly configured for production domains
- File uploads are validated and stored securely

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify your Google Cloud configuration
3. Ensure all environment variables are set correctly
4. Check the backend logs for server-side errors

## Future Enhancements

- User authentication and authorization
- Test execution tracking
- Advanced reporting and analytics
- Team collaboration features
- Mobile application

---

**Built with using React, Node.js, and Google Cloud Platform** 
