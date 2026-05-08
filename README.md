# NakhlaSense - Environmental Monitoring Dashboard

A comprehensive environmental monitoring system built with React, featuring real-time sensor data visualization, Firebase authentication with Gmail OTP, and secure dashboard access.

## 🚀 Features

- **Real-time Environmental Monitoring**: Temperature, CO₂, humidity, pressure, and radiation sensors
- **Firebase + Gmail Authentication**: Secure OTP-based login using Google's services
- **Interactive Dashboards**: Real-time charts and KPI monitoring
- **Role-based Access Control**: Admin and user permissions
- **Alert System**: Automated environmental threshold alerts
- **Data Export**: JSON export functionality
- **Responsive Design**: Mobile-friendly interface

## 📧 Authentication Setup

### Firebase + Gmail Integration

1. **Create Firebase Project**
   ```bash
   # Visit https://console.firebase.google.com/
   # Create new project: "NakhlaSense"
   ```

2. **Set Up Authentication & Database**
   - Enable Authentication service
   - Create Firestore database
   - Set up Cloud Functions for email sending

3. **Configure Gmail Integration**
   - Enable 2-Factor Authentication on Gmail
   - Generate App Password for Firebase Functions
   - Deploy Cloud Functions to send OTP emails

4. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Add your Firebase config values
   ```

5. **Deploy Functions**
   ```bash
   firebase deploy --only functions
   ```

See `FIREBASE_GMAIL_SETUP.md` for detailed instructions.
## 🚀 Quick Firebase Setup

### 1. Create Firebase Project
```bash
# Visit: https://console.firebase.google.com/
# Create project: "NakhlaSense"
```

### 2. Enable Services
- **Authentication**: Enable Email/Password provider
- **Firestore Database**: Create database in test mode

### 3. Get Config Values
- Go to Project Settings → Your apps → Add Web App
- Copy the Firebase config object

### 4. Configure Environment
```bash
# Run setup helper
npm run firebase:setup

# Or manually edit .env.local with your Firebase values
```

### 5. Populate Database
```bash
# Check configuration
npm run db:check

# Populate with sample data
npm run db:populate

# Test the setup
npm start
# Visit: http://localhost:3000/firebase-test
```
## �️ Database Setup

### Firebase Firestore Database

The application uses Firebase Firestore to store sensor data, user authentication, and system information.

#### Populate Database with Sample Data

```bash
# Populate database with sample environmental data
npm run db:populate

# Or clear all data
npm run db:clear
```

#### Sample Data Structure

The database includes the following collections based on your schema:

- **zones**: Geographic monitoring areas
  - `zone_id` (string, PK)
  - `zone_name` (string)
  - `polygon_coordinates` (string)
  - `created_by` (string)
  - `created_at` (datetime)

- **missions**: Mission definitions and status
  - `mission_id` (string, PK)
  - `start_time` (datetime)
  - `end_time` (datetime, nullable)
  - `mission_status` (string)
  - `termination_reason` (string, nullable)

- **sensor_samples**: Environmental sensor readings (main data table)
  - `sample_id` (string, PK)
  - `mission_id` (string, FK → missions)
  - `zone_id` (string, FK → zones)
  - `timestamp` (datetime)
  - `latitude` (float), `longitude` (float)
  - `temperature_C` (float), `co2_ppm` (float), `humidity_pct` (float)
  - `battery_level_pct` (float), `signal_strength_dbm` (float)
  - `data_valid` (boolean), `system_state` (string)

- **alerts**: Automated threshold alerts
  - `alert_id` (string, PK)
  - `sample_id` (string, FK → sensor_samples)
  - `timestamp` (datetime)
  - `alert_parameter` (string), `measured_value` (float), `threshold` (float)
  - `system_action` (string)

- **kpis**: Mission performance metrics
  - `kpi_id` (string, PK)
  - `mission_id` (string, FK → missions)
  - `system_efficiency_kpi_percent` (float)
  - `data_validity_ratio_percent` (float)

#### Manual Database Population

Visit `http://localhost:3000/firebase-test` in your browser to:
- Test Firebase connection
- Populate database with sample data
- Clear database if needed

#### Database Scripts

```bash
# Populate with sample data
node scripts/populateDatabase.js populate

# Clear all data
node scripts/populateDatabase.js clear
```

### Firebase Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init functions

# Deploy functions
firebase deploy --only functions
```

## 🔧 Configuration

### Environment Variables (.env.local)
```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 📊 Available Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from Create React App
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, React Router, Recharts
- **Backend**: Firebase (Firestore, Cloud Functions)
- **Authentication**: Firebase Auth + Gmail OTP
- **Email Service**: Gmail via Firebase Functions
- **Styling**: Bootstrap + Custom CSS
- **Charts**: Recharts library

### Project Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth)
├── firebase/           # Firebase configuration
├── pages/             # Page components
└── assets/            # Static assets
```

## 🔒 Security Features

- **OTP Authentication**: 6-digit codes via Gmail
- **Session Management**: Secure token-based sessions
- **Firestore Security**: User-specific data access
- **Input Validation**: Email and OTP format validation
- **Rate Limiting**: Built-in Firebase protections

## 📈 Dashboard Features

- **Real-time Updates**: Live sensor data every 5 seconds
- **Multiple Chart Types**: Line, bar, and area charts
- **Alert System**: Automatic threshold monitoring
- **Data Export**: JSON download functionality
- **Responsive Design**: Works on all devices

## 🚀 Deployment

### Firebase Hosting
```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase init hosting
firebase deploy --only hosting
```

### Environment Variables for Production
Ensure all `REACT_APP_*` variables are set in your production environment.

## 🐛 Troubleshooting

### Common Issues

1. **"Firebase not configured"**
   - Check `.env.local` file exists
   - Verify Firebase config values
   - Restart development server

2. **"Failed to send OTP"**
   - Check Firebase Functions are deployed
   - Verify Gmail app password
   - Check Firebase Functions logs

3. **"Permission denied"**
   - Update Firestore security rules
   - Check user authentication status

## 📚 Documentation

- `FIREBASE_GMAIL_SETUP.md` - Complete Firebase + Gmail setup guide
- `EMAILJS_SETUP.md` - Alternative EmailJS setup (legacy)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙋 Support

For support and questions:
- Check the troubleshooting section
- Review Firebase documentation
- Open an issue on GitHub

---

**Built with ❤️ using React, Firebase, and Gmail integration**

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
