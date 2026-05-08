#!/usr/bin/env node

/**
 * Firebase Setup Helper for NakhlaSense
 *
 * This script helps you set up Firebase for your NakhlaSense project
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 NakhlaSense Firebase Setup Helper\n');

console.log('📋 Step-by-Step Firebase Setup:\n');

console.log('1️⃣  CREATE FIREBASE PROJECT:');
console.log('   • Go to: https://console.firebase.google.com/');
console.log('   • Click "Create a project"');
console.log('   • Name: "NakhlaSense"');
console.log('   • Enable Google Analytics (optional)');
console.log('   • Click "Create project"\n');

console.log('2️⃣  ENABLE AUTHENTICATION:');
console.log('   • In Firebase Console, go to "Authentication"');
console.log('   • Click "Get started"');
console.log('   • Go to "Sign-in method" tab');
console.log('   • Enable "Email/Password" provider');
console.log('   • Save changes\n');

console.log('3️⃣  ENABLE FIRESTORE DATABASE:');
console.log('   • In Firebase Console, go to "Firestore Database"');
console.log('   • Click "Create database"');
console.log('   • Choose "Start in test mode" (for development)');
console.log('   • Select a location (choose the closest to you)');
console.log('   • Click "Done"\n');

console.log('4️⃣  GET YOUR CONFIG VALUES:');
console.log('   • In Firebase Console, click the gear icon → "Project settings"');
console.log('   • Scroll down to "Your apps" section');
console.log('   • Click the "</>" icon to add a web app');
console.log('   • App nickname: "NakhlaSense Web"');
console.log('   • Click "Register app"');
console.log('   • Copy the config object (you\'ll need these values)\n');

console.log('5️⃣  CONFIGURE YOUR PROJECT:');
console.log('   • I\'ll help you create the .env.local file with your config\n');

console.log('🔑 When you have your Firebase config values, run:');
console.log('   node scripts/setupFirebase.js <your-api-key> <your-project-id> <your-auth-domain>\n');

console.log('📝 Example command:');
console.log('   node scripts/setupFirebase.js AIzaSyBxxxxxxxxx nakhlavision nakhlavision.firebaseapp.com\n');

console.log('❓ Need help? Check FIREBASE_GMAIL_SETUP.md for detailed instructions\n');

console.log('⏳ Ready to configure? Run the setup command above with your Firebase values!\n');

// Check if user provided config values
if (process.argv.length >= 5) {
  const apiKey = process.argv[2];
  const projectId = process.argv[3];
  const authDomain = process.argv[4];

  console.log('🔧 Creating .env.local file...\n');

  const envContent = `# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=${apiKey}
REACT_APP_FIREBASE_AUTH_DOMAIN=${authDomain}
REACT_APP_FIREBASE_PROJECT_ID=${projectId}
REACT_APP_FIREBASE_STORAGE_BUCKET=${projectId}.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# EmailJS Configuration (keep for fallback)
REACT_APP_EMAILJS_SERVICE_ID=your_service_id_here
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id_here
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key_here
`;

  try {
    fs.writeFileSync(path.join(__dirname, '..', '.env.local'), envContent);
    console.log('✅ .env.local file created successfully!');
    console.log('📍 Location: ' + path.join(__dirname, '..', '.env.local'));
    console.log('\n🚀 Next steps:');
    console.log('   1. Restart your development server: npm start');
    console.log('   2. Run: npm run db:check (should show all ✅)');
    console.log('   3. Run: npm run db:populate');
    console.log('   4. Visit: http://localhost:3000/firebase-test');
  } catch (error) {
    console.error('❌ Error creating .env.local file:', error.message);
  }
} else {
  console.log('💡 To automatically create .env.local, run this command with your values:');
  console.log('   node scripts/setupFirebase.js <api-key> <project-id> <auth-domain>');
}