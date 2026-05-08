import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { populateDatabase, clearDatabase } from '../firebase/databaseSetup';

const FirebaseTest = () => {
  const [status, setStatus] = useState('Testing Firebase connection...');
  const [user, setUser] = useState(null);
  const [dbStatus, setDbStatus] = useState('');
  const [isPopulating, setIsPopulating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const testFirebase = async () => {
      try {
        // Test Firebase Auth
        onAuthStateChanged(auth, (user) => {
          setUser(user);
        });

        // Test Firestore connection
        const testCollection = collection(db, 'test');
        await getDocs(testCollection);

        setStatus('✅ Firebase connection successful! Auth and Firestore are working.');
      } catch (error) {
        console.error('Firebase test error:', error);
        setStatus(`❌ Firebase connection failed: ${error.message}`);
      }
    };

    testFirebase();
  }, []);

  const handlePopulateDatabase = async () => {
    setIsPopulating(true);
    setDbStatus('Populating database with sample data...');

    try {
      await populateDatabase();
      setDbStatus('✅ Database populated successfully with sample environmental data!');
    } catch (error) {
      setDbStatus(`❌ Failed to populate database: ${error.message}`);
    } finally {
      setIsPopulating(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('Are you sure you want to clear all database data? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    setDbStatus('Clearing database...');

    try {
      await clearDatabase();
      setDbStatus('✅ Database cleared successfully!');
    } catch (error) {
      setDbStatus(`❌ Failed to clear database: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Firebase Connection Test</h2>
      <p>{status}</p>
      {user && (
        <p>Current user: {user.email}</p>
      )}

      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Database Management</h3>
        <p>{dbStatus}</p>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handlePopulateDatabase}
            disabled={isPopulating || isClearing}
            style={{
              padding: '10px 20px',
              backgroundColor: isPopulating ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isPopulating ? 'not-allowed' : 'pointer'
            }}
          >
            {isPopulating ? 'Populating...' : 'Populate Database'}
          </button>

          <button
            onClick={handleClearDatabase}
            disabled={isPopulating || isClearing}
            style={{
              padding: '10px 20px',
              backgroundColor: isClearing ? '#ccc' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isClearing ? 'not-allowed' : 'pointer'
            }}
          >
            {isClearing ? 'Clearing...' : 'Clear Database'}
          </button>
        </div>

        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          <p><strong>Sample Data Includes:</strong></p>
          <ul>
            <li>2 geographic zones (Nakhla Crater, Martian Valley)</li>
            <li>2 missions (completed and active)</li>
            <li>100 sensor samples with environmental data</li>
            <li>Automated alerts for threshold violations</li>
            <li>Mission performance KPIs</li>
          </ul>
          <p><strong>Schema Collections:</strong></p>
          <ul>
            <li><code>zones</code> - Geographic monitoring areas</li>
            <li><code>missions</code> - Mission definitions and status</li>
            <li><code>sensor_samples</code> - Environmental sensor readings</li>
            <li><code>alerts</code> - Automated threshold alerts</li>
            <li><code>kpis</code> - Mission performance metrics</li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Next Steps:</h3>
        <ol>
          <li>Complete Firebase project setup in console.firebase.google.com</li>
          <li>Deploy Cloud Functions for Gmail OTP: <code>firebase deploy --only functions</code></li>
          <li>Use the buttons above to populate your database with sample data</li>
          <li>Test OTP login functionality</li>
          <li>Configure Firestore security rules</li>
        </ol>
      </div>
    </div>
  );
};

export default FirebaseTest;