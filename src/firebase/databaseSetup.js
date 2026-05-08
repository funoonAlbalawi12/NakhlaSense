import { db } from './config';
import { collection, addDoc, Timestamp, getDocs, deleteDoc } from 'firebase/firestore';

// Sample data for NakhlaSense environmental monitoring system
// Based on the provided database schema

const generateSampleData = () => {
  const now = new Date();

  // ===== ZONES =====
  const zones = [
    {
      zone_id: 'zone_nakhla_crater',
      zone_name: 'Nakhla Crater',
      polygon_coordinates: '[[-23.5, 164.5], [-23.7, 164.3], [-23.3, 164.7], [-23.5, 164.5]]',
      created_by: 'admin@nakhlasense.com',
      created_at: Timestamp.fromDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) // 30 days ago
    },
    {
      zone_id: 'zone_martian_valley',
      zone_name: 'Martian Valley',
      polygon_coordinates: '[[-24.0, 165.0], [-24.2, 164.8], [-23.8, 165.2], [-24.0, 165.0]]',
      created_by: 'admin@nakhlasense.com',
      created_at: Timestamp.fromDate(new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000)) // 25 days ago
    }
  ];

  // ===== MISSIONS =====
  const missions = [
    {
      mission_id: 'mission_2026_001',
      start_time: Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)), // 7 days ago
      end_time: Timestamp.fromDate(new Date(now.getTime() - 1 * 60 * 60 * 1000)), // 1 hour ago
      mission_status: 'completed',
      termination_reason: null
    },
    {
      mission_id: 'mission_2026_002',
      start_time: Timestamp.fromDate(new Date(now.getTime() - 2 * 60 * 60 * 1000)), // 2 hours ago
      end_time: null,
      mission_status: 'active',
      termination_reason: null
    }
  ];

  // ===== SENSOR SAMPLES =====
  const sensorSamples = [];
  const dataPoints = 100; // Generate 100 sensor readings

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now.getTime() - (dataPoints - i) * 6 * 60 * 1000); // Every 6 minutes
    const missionId = i < 70 ? 'mission_2026_001' : 'mission_2026_002'; // First 70 for mission 1, rest for mission 2
    const zoneId = i % 2 === 0 ? 'zone_nakhla_crater' : 'zone_martian_valley';

    // Generate realistic sensor data with some variation
    const baseTemp = 25 + Math.sin(i * 0.2) * 10;
    const tempVariation = (Math.random() - 0.5) * 8;
    const temperature_C = Math.round((baseTemp + tempVariation) * 10) / 10;

    const baseCO2 = 800 + Math.sin(i * 0.15) * 300;
    const co2Variation = (Math.random() - 0.5) * 200;
    const co2_ppm = Math.round(baseCO2 + co2Variation);

    const baseHumidity = 40 + Math.sin(i * 0.25) * 15;
    const humidityVariation = (Math.random() - 0.5) * 10;
    const humidity_pct = Math.round((baseHumidity + humidityVariation) * 10) / 10;

    // Generate coordinates within zone bounds
    const baseLat = zoneId === 'zone_nakhla_crater' ? -23.5 : -24.0;
    const baseLng = zoneId === 'zone_nakhla_crater' ? 164.5 : 165.0;
    const latitude = baseLat + (Math.random() - 0.5) * 0.4;
    const longitude = baseLng + (Math.random() - 0.5) * 0.4;

    // System metrics
    const battery_level_pct = Math.max(10, Math.min(100, 85 - i * 0.3)); // Gradual battery drain
    const signal_strength_dbm = Math.max(-100, Math.min(-30, -45 + (Math.random() - 0.5) * 20));

    sensorSamples.push({
      sample_id: `sample_${String(i + 1).padStart(4, '0')}`,
      mission_id: missionId,
      zone_id: zoneId,
      timestamp: Timestamp.fromDate(timestamp),
      latitude: Math.round(latitude * 1000000) / 1000000,
      longitude: Math.round(longitude * 1000000) / 1000000,
      temperature_C: Math.max(15, Math.min(55, temperature_C)),
      co2_ppm: Math.max(300, Math.min(2500, co2_ppm)),
      humidity_pct: Math.max(5, Math.min(90, humidity_pct)),
      battery_level_pct: Math.round(battery_level_pct),
      signal_strength_dbm: Math.round(signal_strength_dbm),
      data_valid: Math.random() > 0.05, // 95% valid data
      system_state: Math.random() > 0.1 ? 'operational' : 'maintenance' // 90% operational
    });
  }

  // ===== ALERTS =====
  const alerts = [];
  const alertTriggers = [
    { parameter: 'temperature_C', threshold: 50, action: 'warning' },
    { parameter: 'co2_ppm', threshold: 2000, action: 'critical' },
    { parameter: 'humidity_pct', threshold: 85, action: 'warning' },
    { parameter: 'battery_level_pct', threshold: 15, action: 'critical' }
  ];

  // Generate alerts based on sensor data that exceeded thresholds
  sensorSamples.forEach((sample, index) => {
    alertTriggers.forEach(trigger => {
      const value = sample[trigger.parameter];
      if (value > trigger.threshold) {
        alerts.push({
          alert_id: `alert_${String(alerts.length + 1).padStart(4, '0')}`,
          sample_id: sample.sample_id,
          timestamp: sample.timestamp,
          alert_parameter: trigger.parameter,
          measured_value: value,
          threshold: trigger.threshold,
          system_action: trigger.action
        });
      }
    });
  });

  // ===== KPIs =====
  const kpis = missions.map(mission => {
    const missionSamples = sensorSamples.filter(s => s.mission_id === mission.mission_id);
    const validSamples = missionSamples.filter(s => s.data_valid);
    const dataValidityRatio = missionSamples.length > 0 ? (validSamples.length / missionSamples.length) * 100 : 0;

    // Calculate system efficiency based on operational samples
    const operationalSamples = missionSamples.filter(s => s.system_state === 'operational');
    const systemEfficiency = missionSamples.length > 0 ? (operationalSamples.length / missionSamples.length) * 100 : 0;

    return {
      kpi_id: `kpi_${mission.mission_id}`,
      mission_id: mission.mission_id,
      system_efficiency_kpi_percent: Math.round(systemEfficiency * 100) / 100,
      data_validity_ratio_percent: Math.round(dataValidityRatio * 100) / 100
    };
  });

  return {
    zones,
    missions,
    sensorSamples,
    alerts,
    kpis
  };
};

// Function to populate Firebase database
export const populateDatabase = async () => {
  try {
    console.log('🚀 Starting database population with NakhlaSense schema...');

    // Generate sample data
    const data = generateSampleData();

    // Add zones
    console.log('📍 Adding zones...');
    for (const zone of data.zones) {
      await addDoc(collection(db, 'zones'), zone);
    }

    // Add missions
    console.log('🚁 Adding missions...');
    for (const mission of data.missions) {
      await addDoc(collection(db, 'missions'), mission);
    }

    // Add sensor samples
    console.log('📊 Adding sensor samples...');
    for (const sample of data.sensorSamples) {
      await addDoc(collection(db, 'sensor_samples'), sample);
    }

    // Add alerts
    console.log('🚨 Adding alerts...');
    for (const alert of data.alerts) {
      await addDoc(collection(db, 'alerts'), alert);
    }

    // Add KPIs
    console.log('📈 Adding KPIs...');
    for (const kpi of data.kpis) {
      await addDoc(collection(db, 'kpis'), kpi);
    }

    console.log('✅ Database populated successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Zones: ${data.zones.length}`);
    console.log(`   • Missions: ${data.missions.length}`);
    console.log(`   • Sensor Samples: ${data.sensorSamples.length}`);
    console.log(`   • Alerts: ${data.alerts.length}`);
    console.log(`   • KPIs: ${data.kpis.length}`);

    console.log('\n🎯 Data includes:');
    console.log('   • Realistic environmental sensor readings');
    console.log('   • Geographic coordinates within defined zones');
    console.log('   • System health metrics (battery, signal)');
    console.log('   • Automated alerts for threshold violations');
    console.log('   • Mission performance KPIs');

  } catch (error) {
    console.error('❌ Error populating database:', error);
    throw error;
  }
};

// Function to clear all data (for testing)
export const clearDatabase = async () => {
  try {
    console.log('🧹 Clearing database...');

    const collections = ['zones', 'missions', 'sensor_samples', 'alerts', 'kpis', 'otps'];

    for (const collectionName of collections) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log(`   Cleared ${querySnapshot.docs.length} documents from ${collectionName}`);
    }

    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
};