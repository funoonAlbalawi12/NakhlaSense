# EmailJS Setup Guide for NakhlaSense OTP Authentication

## 🚀 **Step-by-Step Setup**

### **1. Create EmailJS Account**
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email

### **2. Create Email Service**
1. Go to **Email Services** in your dashboard
2. Click **Add New Service**
3. Choose **Gmail** as your email provider
4. Connect your Gmail account:
   - Click **Connect Account**
   - Sign in with your Gmail credentials
   - Grant permissions to EmailJS
5. Note down the **Service ID**

### **3. Create Email Template**
1. Go to **Email Templates** in your dashboard
2. Click **Create New Template**
3. Use this template content:

**Subject:**
```
Your NakhlaSense OTP Code
```

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>NakhlaSense OTP</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2e7d32;">🔐 NakhlaSense Secure Login</h2>

        <p>Hello,</p>

        <p>You requested to sign in to your NakhlaSense account. Here is your One-Time Password (OTP):</p>

        <div style="background-color: #f5f5f5; border: 2px solid #2e7d32; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2e7d32; font-size: 32px; margin: 0; letter-spacing: 5px;">{{otp_code}}</h1>
        </div>

        <p><strong>Important:</strong></p>
        <ul>
            <li>This OTP will expire in <strong>10 minutes</strong></li>
            <li>Do not share this code with anyone</li>
            <li>If you didn't request this, please ignore this email</li>
        </ul>

        <p>For security reasons, this OTP can only be used once.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #666; font-size: 12px;">
            This is an automated message from NakhlaSense Environmental Monitoring System.<br>
            If you have any questions, please contact support.
        </p>
    </div>
</body>
</html>
```

4. Save the template
5. Note down the **Template ID**

### **4. Get Your API Keys**
1. Go to **Account** → **General** in EmailJS Dashboard
2. Copy your **Public Key**

### **5. Update Environment Variables**
Update your `.env.local` file with the EmailJS credentials:

```env
# EmailJS Configuration
REACT_APP_EMAILJS_SERVICE_ID=your_actual_service_id_here
REACT_APP_EMAILJS_TEMPLATE_ID=your_actual_template_id_here
REACT_APP_EMAILJS_PUBLIC_KEY=your_actual_public_key_here
```

## 📧 **Email Template Variables**
- `{{to_email}}` - Recipient email address
- `{{otp_code}}` - The 6-digit OTP code

## 🔧 **Testing the Setup**
1. Update the `.env.local` file with your EmailJS credentials
2. Run the application: `npm start`
3. Go to the login page (`/login`)
4. Enter your email and click "📧 Send OTP via Gmail"
5. Check your email inbox for the OTP email
6. Enter the 6-digit code in the OTP field
7. Click "Verify & Login →"

## ⚠️ **Important Notes**
- **Free Tier**: EmailJS free tier allows 200 emails/month
- **Security**: Never commit your EmailJS keys to version control
- **Environment Variables**: Always use `.env.local` for local development
- **Rate Limiting**: EmailJS has rate limits to prevent abuse

## 🔒 **Security Features**
- OTP expires in 10 minutes
- One-time use codes only
- Email verification required
- Secure token-based sessions
- OTPs stored encrypted in Firebase Firestore

## 🆘 **Troubleshooting**

### **Emails Not Sending?**
1. **Check Console**: Open browser DevTools → Console tab for errors
2. **Verify Credentials**: Ensure all EmailJS keys are correct in `.env.local`
3. **Gmail Permissions**: Make sure EmailJS has permission to send from your Gmail
4. **Daily Limit**: Check if you've exceeded EmailJS free tier limits

### **OTP Not Working?**
1. **Firebase Config**: Ensure Firebase Firestore is properly configured
2. **Network Issues**: Check if your internet allows email sending
3. **Template Variables**: Ensure `{{otp_code}}` variable is used in template

### **Fallback Mode**
If EmailJS fails, the system automatically shows the OTP in an alert popup for testing:
```
Email sending failed: [error message]. For testing: OTP is 123456
```

## 📞 **Support**
- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [EmailJS Support](https://www.emailjs.com/support/)
- Check browser console for detailed error messages

---
**🎉 You're all set!** Your NakhlaSense authentication system now sends secure OTP emails.