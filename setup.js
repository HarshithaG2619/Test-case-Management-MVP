#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Test Case Management MVP Setup\n');

const questions = [
  {
    name: 'firebaseApiKey',
    question: 'Enter your Firebase API Key: ',
    required: true
  },
  {
    name: 'firebaseAuthDomain',
    question: 'Enter your Firebase Auth Domain (e.g., your-project.firebaseapp.com): ',
    required: true
  },
  {
    name: 'firebaseProjectId',
    question: 'Enter your Firebase Project ID: ',
    required: true
  },
  {
    name: 'firebaseStorageBucket',
    question: 'Enter your Firebase Storage Bucket (e.g., your-project.appspot.com): ',
    required: true
  },
  {
    name: 'firebaseMessagingSenderId',
    question: 'Enter your Firebase Messaging Sender ID: ',
    required: true
  },
  {
    name: 'firebaseAppId',
    question: 'Enter your Firebase App ID: ',
    required: true
  },
  {
    name: 'geminiApiKey',
    question: 'Enter your Gemini API Key: ',
    required: true
  }
];

const answers = {};

function askQuestion(index) {
  if (index >= questions.length) {
    createEnvFile();
    return;
  }

  const question = questions[index];
  rl.question(question.question, (answer) => {
    if (question.required && !answer.trim()) {
      console.log('❌ This field is required. Please try again.\n');
      askQuestion(index);
      return;
    }
    
    answers[question.name] = answer.trim();
    askQuestion(index + 1);
  });
}

function createEnvFile() {
  const envContent = `# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=${answers.firebaseApiKey}
REACT_APP_FIREBASE_AUTH_DOMAIN=${answers.firebaseAuthDomain}
REACT_APP_FIREBASE_PROJECT_ID=${answers.firebaseProjectId}
REACT_APP_FIREBASE_STORAGE_BUCKET=${answers.firebaseStorageBucket}
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=${answers.firebaseMessagingSenderId}
REACT_APP_FIREBASE_APP_ID=${answers.firebaseAppId}

# Gemini AI Configuration
REACT_APP_GEMINI_API_KEY=${answers.geminiApiKey}
`;

  const envPath = path.join(process.cwd(), '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Make sure you have Node.js installed');
    console.log('2. Run: npm install');
    console.log('3. Run: npm start');
    console.log('\n🔧 Firebase Setup:');
    console.log('- Enable Firestore Database');
    console.log('- Enable Storage');
    console.log('- Set up Authentication (Anonymous auth is supported)');
    console.log('- Update Firestore and Storage security rules');
    console.log('\n📖 See README.md for detailed setup instructions');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
  
  rl.close();
}

// Start the setup process
askQuestion(0); 