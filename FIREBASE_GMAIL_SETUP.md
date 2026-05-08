# Firebase + Gmail Integration Setup Guide for NakhlaSense

##  **Firebase Setup with Gmail Integration**

### **Why Firebase + Gmail?**
- **Native Google Integration**: Uses Google's own services
- **Database**: Firestore for storing OTP codes securely
- **Authentication**: Firebase Auth for user management
- **Scalable**: Handles millions of users
- **Secure**: Enterprise-grade security

---

## **Step-by-Step Setup**

### **Step 1: Create Firebase Project**
1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Name it **"NakhlaSense"**
4. Enable Google Analytics (optional)
5. Choose your Google account
6. Wait for project creation

### **Step 2: Enable Authentication**
1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Email/Password"** (we'll use it for OTP verification)
5. **Optional**: Enable **"Google"** for Google sign-in

### **Step 3: Set Up Firestore Database**
1. Go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select a location (choose closest to your users)
5. Click **"Done"**

### **Step 4: Configure Gmail Integration**
1. Go to **Authentication** → **Templates**
2. Customize email templates (optional)
3. For custom OTP emails, we'll use **Cloud Functions**

### **Step 5: Set Up Cloud Functions (For Custom OTP Emails)**
1. Go to **Functions** in Firebase Console
2. Click **"Get started"**
3. Install Firebase CLI: `npm install -g firebase-tools`
4. Login: `firebase login`
5. Initialize: `firebase init functions`
6. Choose your project
7. Install dependencies in functions folder

### **Step 6: Create OTP Email Function**
Create `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Configure Gmail transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password // Use App Password
  }
});

exports.sendOTP = functions.https.onCall(async (data, context) => {
  const { email, otp } = data;

  const mailOptions = {
    from: 'NakhlaSense <your-email@gmail.com>',
    to: email,
    subject: 'Your NakhlaSense Login OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E5631;">NakhlaSense Login Verification</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #F5C451; text-align: center; padding: 20px; border: 2px solid #F5C451; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Sent at: ${new Date().toLocaleString()}<br>
          NakhlaSense Security Team
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send OTP');
  }
});
```

### **Step 7: Configure Gmail App Password**
1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to **Security** → **App passwords**
4. Generate an app password for **"NakhlaSense"**
5. Set environment variables:
   ```bash
   firebase functions:config:set gmail.email="your-email@gmail.com"
   firebase functions:config:set gmail.password="your-app-password"
   ```

### **Step 8: Deploy Functions**
```bash
firebase deploy --only functions
```

### **Step 9: Update React App Configuration**
1. Copy `.env.example` to `.env.local`
2. Add your Firebase config from Firebase Console → Project Settings → General → Your apps → Web app config

### **Step 10: Update Login Component**
The Login.js has been updated to use Firebase functions for sending OTP emails.

---

##  **Firebase Security Rules**

### **Firestore Rules** (`firestore.rules`)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // OTP codes - only accessible by the user who owns them
    match /otps/{otpId} {
      allow read, write: if request.auth != null &&
        request.auth.token.email == resource.data.email;
    }

    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### **Storage Rules** (`storage.rules`)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📧 **Email Template Customization**

The OTP emails include:
- ✅ Professional HTML design
- ✅ NakhlaSense branding
- ✅ Large, clear OTP display
- ✅ Expiration warning
- ✅ Security notice
- ✅ Timestamp

---

## 🔒 **Security Features**

- **OTP Expiration**: 10 minutes
- **One-time Use**: OTP deleted after use
- **Firestore Security**: User-specific access
- **Gmail App Passwords**: Secure authentication
- **HTTPS Only**: All communications encrypted

---

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **"Invalid login credentials"**
   - Check Gmail app password is correct
   - Ensure 2FA is enabled on Gmail account

2. **"Function deployment failed"**
   - Check Firebase CLI is installed: `firebase --version`
   - Ensure you're logged in: `firebase login`

3. **"CORS errors"**
   - Functions are configured for cross-origin requests

4. **"OTP not received"**
   - Check spam/junk folder
   - Verify Gmail app password
   - Check Firebase Functions logs

### **Testing Commands:**
```bash
# Test functions locally
firebase emulators:start

# Deploy functions
firebase deploy --only functions

# View function logs
firebase functions:log
```

---

## 📊 **Firebase Benefits for NakhlaSense**

- **Real Gmail Integration**: Uses your Gmail account directly
- **Database Storage**: OTP codes stored securely in Firestore
- **Scalability**: Handles thousands of concurrent users
- **Analytics**: Built-in user analytics and crash reporting
- **Hosting**: Can host the entire app on Firebase Hosting
- **Real-time**: Live updates and notifications

---

## 🎯 **Next Steps**

1. **Complete Firebase setup** following this guide
2. **Test OTP functionality** with your Gmail account
3. **Customize email templates** for your branding
4. **Add user profiles** in Firestore
5. **Implement push notifications** for alerts

**Ready to integrate Firebase + Gmail?** Follow the steps above and you'll have enterprise-grade authentication with real Gmail integration! 🚀