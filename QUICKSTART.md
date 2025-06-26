# Quick Start Guide

Get the Test Case Management MVP running in 5 minutes!

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Setup Script
```bash
npm run setup
```
This will guide you through entering your Firebase and Gemini API credentials.

### 3. Start the Application
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Storage
5. Enable Authentication (Anonymous auth)

### 2. Get Firebase Config
1. Go to Project Settings
2. Scroll down to "Your apps"
3. Click the web app icon (</>)
4. Copy the configuration

### 3. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key

### 4. Create .env File
Create a `.env` file in the root directory:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

### 5. Update Security Rules

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/{collection}/{document=**} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || request.auth.token.app_id == appId);
    }
  }
}
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /projects/{projectId}/{folder}/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## First Steps

1. **Create a Project**: Click "Create New Project" and give it a name
2. **Upload Documents**: Go to Documents tab and upload PDF, DOCX, or TXT files
3. **Upload Template**: Go to Templates tab and upload an Excel file with headers
4. **Generate Test Cases**: Go to Test Cases tab and click "Generate Test Cases"
5. **Modify with AI**: Use natural language to modify your test cases
6. **Export**: Download your test cases as Excel

## Need Help?

- Check the full [README.md](README.md) for detailed instructions
- Review the troubleshooting section
- Ensure all environment variables are set correctly
- Verify Firebase services are enabled

## Security Notes

- The app uses anonymous authentication by default
- All data is stored in user-specific collections
- Files are stored securely in Firebase Storage
- API keys are kept in environment variables

---

**That's it!** You should now have a fully functional Test Case Management MVP running locally. 
