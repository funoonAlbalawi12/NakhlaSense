#!/usr/bin/env node

/**
 * Firebase Configuration Checker
 *
 * Checks if Firebase is properly configured for NakhlaSense
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking Firebase Configuration...\n');

// Check environment variables
const requiredVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

let allConfigured = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isConfigured = value && value !== 'your_api_key' && value !== 'your_project.firebaseapp.com' && value !== 'your_project_id' && value !== 'your_project.appspot.com' && value !== '123456789' && value !== '1:123456789:web:abcdef123456';

  if (isConfigured) {
    console.log(`✅ ${varName}: Configured`);
  } else {
    console.log(`❌ ${varName}: Not configured`);
    allConfigured = false;
  }
});

console.log('\n📋 Configuration Status:');
if (allConfigured) {
  console.log('✅ Firebase is fully configured!');
  console.log('\n🚀 You can now:');
  console.log('   • Run: npm run db:populate');
  console.log('   • Visit: http://localhost:3000/firebase-test');
  console.log('   • Test login: http://localhost:3000/login');
} else {
  console.log('❌ Firebase is not configured properly.');
  console.log('\n🔧 Setup Steps:');
  console.log('   1. Go to https://console.firebase.google.com/');
  console.log('   2. Create a new project called "NakhlaSense"');
  console.log('   3. Enable Authentication and Firestore Database');
  console.log('   4. Copy your Firebase config from Project Settings');
  console.log('   5. Update .env.local with your actual values');
  console.log('   6. Run: npm run db:populate');
  console.log('\n📄 See FIREBASE_GMAIL_SETUP.md for detailed instructions');
}

console.log('\n📁 Current .env.local file location:');
console.log('   ' + require('path').resolve('.env.local'));