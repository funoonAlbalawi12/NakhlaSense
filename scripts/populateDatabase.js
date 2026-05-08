#!/usr/bin/env node

/**
 * Firebase Database Setup Script for NakhlaSense
 *
 * This script populates your Firebase Firestore database with sample
 * environmental monitoring data for testing purposes.
 *
 * Usage:
 *   node scripts/populateDatabase.js
 *
 * Requirements:
 *   - Firebase project configured
 *   - .env.local file with Firebase config
 *   - Firebase CLI installed and logged in
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp, getDocs, deleteDoc } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample data generation functions
const generateSampleData = () => {
  const now = new Date();
  const dataPoints = 50; // Last 50 readings (5 hours of data at 6-minute intervals)

  // Generate temperature data (20-50°C range for Mars-like conditions)
  const tempData = [];
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now.getTime() - (dataPoints - i) * 6 * 60 * 1000);
    const baseTemp = 25 + Math.sin(i * 0.2) * 10;
    const variation = (Math.random() - 0.5) * 8;
    const value = Math.round((baseTemp + variation) * 10) / 10;

    tempData.push({
      sensorId: 'temp_sensor_001',
      sensorType: 'temperature',
      value: Math.max(15, Math.min(55, value)),
      unit: '°C',
      timestamp: Timestamp.fromDate(timestamp),
      location: 'Nakhla Crater',
      status: 'active'
    });
  }

  // Generate CO2 data (300-2000 ppm range)
  const co2Data = [];
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now.getTime() - (dataPoints - i) * 6 * 60 * 1000);
    const baseCO2 = 800 + Math.sin(i * 0.15) * 300;
    const variation = (Math.random() - 0.5) * 200;
    const value = Math.round(baseCO2 + variation);

    co2Data.push({
      sensorId: 'co2_sensor_001',
      sensorType: 'co2',
      value: Math.max(300, Math.min(2500, value)),
      unit: 'ppm',
      timestamp: Timestamp.fromDate(timestamp),
      location: 'Nakhla Crater',
      status: 'active'
    });
  }

  // Generate humidity data (10-80% range)
  const humidityData = [];
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now.getTime() - (dataPoints - i) * 6 * 60 * 1000);
    const baseHumidity = 40 + Math.sin(i * 0.25) * 15;
    const variation = (Math.random() - 0.5) * 10;
    const value = Math.round((baseHumidity + variation) * 10) / 10;

    humidityData.push({
      sensorId: 'humidity_sensor_001',
      sensorType: 'humidity',
      value: Math.max(5, Math.min(90, value)),
      unit: '%',
      timestamp: Timestamp.fromDate(timestamp),
      location: 'Nakhla Crater',
      status: 'active'
    });
  }

  // Generate pressure data (980-1030 hPa range)
  const pressureData = [];
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now.getTime() - (dataPoints - i) * 6 * 60 * 1000);
    const basePressure = 1013 + Math.sin(i * 0.1) * 15;
    const variation = (Math.random() - 0.5) * 8;
    const value = Math.round((basePressure + variation) * 10) / 10;

    pressureData.push({
      sensorId: 'pressure_sensor_001',
      sensorType: 'pressure',
      value: Math.max(950, Math.min(1050, value)),
      unit: 'hPa',
      timestamp: Timestamp.fromDate(timestamp),
      location: 'Nakhla Crater',
      status: 'active'
    });
  }

  // Generate radiation data (0.1-3.0 μSv/h range)
  const radiationData = [];
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now.getTime() - (dataPoints - i) * 6 * 60 * 1000);
    const baseRadiation = 1.0 + Math.sin(i * 0.3) * 0.5;
    const variation = (Math.random() - 0.5) * 0.4;
    const value = Math.round((baseRadiation + variation) * 100) / 100;

    radiationData.push({
      sensorId: 'radiation_sensor_001',
      sensorType: 'radiation',
      value: Math.max(0.05, Math.min(5.0, value)),
      unit: 'μSv/h',
      timestamp: Timestamp.fromDate(timestamp),
      location: 'Nakhla Crater',
      status: 'active'
    });
  }

  return {
    temperature: tempData,
    co2: co2Data,
    humidity: humidityData,
    pressure: pressureData,
    radiation: radiationData
  };
};

const generateSystemData = () => {
  return {
    batteryLevel: 82,
    signalStrength: 95,
    dataTransferred: 2.4,
    uptime: 168,
    lastMaintenance: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    status: 'operational'
  };
};

const generateAlertData = () => {
  return [
    {
      id: 'alert_001',
      type: 'warning',
      message: 'CO2 levels approaching threshold',
      sensorType: 'co2',
      value: 1450,
      threshold: 1400,
      timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)),
      resolved: true,
      resolvedAt: Timestamp.fromDate(new Date(Date.now() - 1 * 60 * 60 * 1000))
    },
    {
      id: 'alert_002',
      type: 'critical',
      message: 'Temperature spike detected',
      sensorType: 'temperature',
      value: 52,
      threshold: 50,
      timestamp: Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000)),
      resolved: true,
      resolvedAt: Timestamp.fromDate(new Date(Date.now() - 3.5 * 60 * 60 * 1000))
    },
    {
      id: 'alert_003',
      type: 'info',
      message: 'Radiation levels normal',
      sensorType: 'radiation',
      value: 1.2,
      threshold: 2.0,
      timestamp: Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000)),
      resolved: true,
      resolvedAt: Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000))
    }
  ];
};

async function populateDatabase() {
  try {
    console.log('🚀 Starting database population...');

    // Check Firebase config
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your_api_key') {
      throw new Error('Firebase not configured. Please set up your .env.local file with Firebase credentials.');
    }

    // Generate sample data
    const sensorData = generateSampleData();
    const systemData = generateSystemData();
    const alertData = generateAlertData();

    // Add sensor readings
    console.log('📊 Adding sensor data...');

    for (const [sensorType, data] of Object.entries(sensorData)) {
      console.log(`   Adding ${data.length} ${sensorType} readings...`);
      for (const reading of data) {
        await addDoc(collection(db, 'sensor_readings'), reading);
      }
    }

    // Add system status
    console.log('🔋 Adding system status...');
    await addDoc(collection(db, 'system_status'), systemData);

    // Add alerts
    console.log('🚨 Adding alert history...');
    for (const alert of alertData) {
      await addDoc(collection(db, 'alerts'), alert);
    }

    console.log('✅ Database populated successfully!');
    console.log('\n📈 Summary:');
    console.log(`   • Temperature readings: ${sensorData.temperature.length}`);
    console.log(`   • CO2 readings: ${sensorData.co2.length}`);
    console.log(`   • Humidity readings: ${sensorData.humidity.length}`);
    console.log(`   • Pressure readings: ${sensorData.pressure.length}`);
    console.log(`   • Radiation readings: ${sensorData.radiation.length}`);
    console.log(`   • System status: 1 record`);
    console.log(`   • Alert history: ${alertData.length} records`);

    console.log('\n🎯 Next steps:');
    console.log('   1. Visit http://localhost:3000/firebase-test to verify connection');
    console.log('   2. Test the dashboard at http://localhost:3000/dashboard');
    console.log('   3. Deploy Cloud Functions for Gmail OTP');

  } catch (error) {
    console.error('❌ Error populating database:', error.message);
    process.exit(1);
  }
}

async function clearDatabase() {
  try {
    console.log('🧹 Clearing database...');

    const collections = ['sensor_readings', 'system_status', 'alerts', 'otps'];

    for (const collectionName of collections) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log(`   Cleared ${querySnapshot.docs.length} documents from ${collectionName}`);
    }

    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  }
}

// Main execution
const command = process.argv[2];

if (command === 'clear') {
  clearDatabase();
} else if (command === 'populate' || !command) {
  populateDatabase();
} else {
  console.log('Usage: node scripts/populateDatabase.js [populate|clear]');
  console.log('  populate - Add sample data to database (default)');
  console.log('  clear    - Remove all data from database');
  process.exit(1);
}