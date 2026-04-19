// Seed data for SERA demo – matches frontend's ZONES and MESH_DEVICES
import { getDB } from './connection.js';
import crypto from 'crypto';

const SEED_ZONES = [
  {
    zone_id: 'zone-a',
    name: 'Sector 4 – Downtown',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [77.5896, 12.9766], [77.5996, 12.9766],
        [77.5996, 12.9666], [77.5896, 12.9666],
        [77.5896, 12.9766],
      ]],
    },
    center: { lat: 12.9716, lng: 77.5946 },
    status: 'SAFE',
    risk_score: 12,
    population: 4200,
    last_updated: new Date(),
  },
  {
    zone_id: 'zone-b',
    name: 'Sector 7 – Market',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [77.6038, 12.9831], [77.6138, 12.9831],
        [77.6138, 12.9731], [77.6038, 12.9731],
        [77.6038, 12.9831],
      ]],
    },
    center: { lat: 12.9781, lng: 77.6088 },
    status: 'MODERATE',
    risk_score: 55,
    population: 2800,
    last_updated: new Date(),
  },
  {
    zone_id: 'zone-c',
    name: 'Sector 12 – Industrial',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [77.5957, 12.9684], [77.6057, 12.9684],
        [77.6057, 12.9584], [77.5957, 12.9584],
        [77.5957, 12.9684],
      ]],
    },
    center: { lat: 12.9634, lng: 77.6007 },
    status: 'UNSAFE',
    risk_score: 87,
    population: 1500,
    last_updated: new Date(),
  },
  {
    zone_id: 'zone-d',
    name: 'Sector 2 – Residential',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [77.5850, 12.9900], [77.5950, 12.9900],
        [77.5950, 12.9800], [77.5850, 12.9800],
        [77.5850, 12.9900],
      ]],
    },
    center: { lat: 12.9850, lng: 77.5900 },
    status: 'SAFE',
    risk_score: 8,
    population: 6100,
    last_updated: new Date(),
  },
  {
    zone_id: 'zone-e',
    name: 'Sector 9 – Convention',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [77.6100, 12.9750], [77.6200, 12.9750],
        [77.6200, 12.9650], [77.6100, 12.9650],
        [77.6100, 12.9750],
      ]],
    },
    center: { lat: 12.9700, lng: 77.6150 },
    status: 'SAFE',
    risk_score: 15,
    population: 3300,
    last_updated: new Date(),
  },
];

const SEED_DEVICES = [
  { device_id: 'dev-1', label: 'Node-A1', last_seen: new Date(), last_location: { type: 'Point', coordinates: [77.5946, 12.9716] }, status: 'online' },
  { device_id: 'dev-2', label: 'Node-B2', last_seen: new Date(), last_location: { type: 'Point', coordinates: [77.6088, 12.9781] }, status: 'online' },
  { device_id: 'dev-3', label: 'Node-C3', last_seen: new Date(Date.now() - 600000), last_location: { type: 'Point', coordinates: [77.6007, 12.9634] }, status: 'offline' },
  { device_id: 'dev-4', label: 'Node-D4', last_seen: new Date(), last_location: { type: 'Point', coordinates: [77.5900, 12.9850] }, status: 'online' },
  { device_id: 'dev-5', label: 'Node-E5', last_seen: new Date(), last_location: { type: 'Point', coordinates: [77.6150, 12.9700] }, status: 'online' },
];

const SEED_EVENTS = [
  {
    event_id: 'evt-seed-1',
    type: 'camera_detection',
    source: 'camera',
    location: { type: 'Point', coordinates: [77.6007, 12.9634] },
    timestamp: new Date(Date.now() - 300000),
    confidence: 0.94,
    synced: true,
    description: 'Fire detected – Sector 12 Industrial',
    severity: 'danger',
  },
  {
    event_id: 'evt-seed-2',
    type: 'hazard',
    source: 'satellite',
    location: { type: 'Point', coordinates: [77.6088, 12.9781] },
    timestamp: new Date(Date.now() - 420000),
    confidence: 0.78,
    synced: true,
    description: 'Zone updated: Sector 7 → Warning',
    severity: 'warn',
  },
  {
    event_id: 'evt-seed-3',
    type: 'SOS',
    source: 'device',
    device_id: 'dev-2',
    location: { type: 'Point', coordinates: [77.6088, 12.9781] },
    timestamp: new Date(Date.now() - 540000),
    confidence: 1.0,
    synced: true,
    description: 'SOS triggered – Sector 7, Device Node-B2',
    severity: 'danger',
  },
  {
    event_id: 'evt-seed-4',
    type: 'hazard',
    source: 'camera',
    location: { type: 'Point', coordinates: [77.6007, 12.9634] },
    timestamp: new Date(Date.now() - 660000),
    confidence: 0.91,
    synced: true,
    description: 'Hazard identified – structural damage',
    severity: 'danger',
  },
  {
    event_id: 'evt-seed-5',
    type: 'fire',
    source: 'satellite',
    location: { type: 'Point', coordinates: [77.5970, 12.9650] },
    timestamp: new Date(Date.now() - 900000),
    confidence: 0.85,
    synced: true,
    description: 'Thermal anomaly detected near Sector 12',
    severity: 'warn',
  },
];

const SEED_PREDICTIONS = [
  { zone_id: 'zone-c', risk_level: 'HIGH', confidence: 0.88, timestamp: new Date() },
  { zone_id: 'zone-b', risk_level: 'MEDIUM', confidence: 0.72, timestamp: new Date() },
  { zone_id: 'zone-e', risk_level: 'MEDIUM', confidence: 0.65, timestamp: new Date() },
  { zone_id: 'zone-a', risk_level: 'LOW', confidence: 0.91, timestamp: new Date() },
  { zone_id: 'zone-d', risk_level: 'LOW', confidence: 0.95, timestamp: new Date() },
];

const SEED_FACILITIES = [
  { facility_id: 'fac-1', name: 'City Central Hospital', type: 'hospital', location: { type: 'Point', coordinates: [77.5900, 12.9750] }, capacity: 500, available: 120, status: 'operational' },
  { facility_id: 'fac-2', name: 'Sector 4 Community Shelter', type: 'shelter', location: { type: 'Point', coordinates: [77.5960, 12.9730] }, capacity: 1000, available: 850, status: 'operational' },
  { facility_id: 'fac-3', name: 'Downtown Police Station', type: 'police', location: { type: 'Point', coordinates: [77.5920, 12.9710] }, capacity: 50, available: 50, status: 'operational' },
  { facility_id: 'fac-4', name: 'Sector 7 Relief Camp', type: 'shelter', location: { type: 'Point', coordinates: [77.6050, 12.9800] }, capacity: 2000, available: 1950, status: 'operational' },
  { facility_id: 'fac-5', name: 'Industrial Fire Station', type: 'police', location: { type: 'Point', coordinates: [77.6020, 12.9640] }, capacity: 30, available: 28, status: 'operational' },
];

export async function seedDatabase() {
  const db = getDB();
  console.log('🌱 Seeding database...');

  // Clear existing data
  await db.collection('zones').deleteMany({});
  await db.collection('devices').deleteMany({});
  await db.collection('events').deleteMany({});
  await db.collection('predictions').deleteMany({});
  await db.collection('routes').deleteMany({});
  await db.collection('offline_queue').deleteMany({});
  await db.collection('alerts').deleteMany({});
  await db.collection('facilities').deleteMany({});

  // Insert seed data
  await db.collection('zones').insertMany(SEED_ZONES);
  await db.collection('devices').insertMany(SEED_DEVICES);
  await db.collection('events').insertMany(SEED_EVENTS);
  await db.collection('predictions').insertMany(SEED_PREDICTIONS);
  await db.collection('facilities').insertMany(SEED_FACILITIES);

  // Seed admin user (only if not already present)
  const existingAdmin = await db.collection('users').find({ email: 'admin@gmail.com' });
  if (!existingAdmin || existingAdmin.length === 0) {
    const adminSalt = crypto.randomBytes(16).toString('hex');
    const adminHash = crypto.pbkdf2Sync('1234', adminSalt, 10000, 64, 'sha512').toString('hex');
    await db.collection('users').insertOne({
      user_id: 'admin-001',
      name: 'Admin',
      email: 'admin@gmail.com',
      phone: '',
      password_hash: adminHash,
      password_salt: adminSalt,
      role: 'admin',
      created_at: new Date().toISOString(),
    });
    console.log('   Admin user seeded: admin@gmail.com / 1234');
  } else {
    console.log('   Admin user already exists, skipping');
  }

  // Create indexes (no-op for in-memory)
  try {
    await db.collection('events').createIndex({ 'location': '2dsphere' });
    await db.collection('events').createIndex({ 'timestamp': -1 });
    await db.collection('zones').createIndex({ 'zone_id': 1 }, { unique: true });
    await db.collection('devices').createIndex({ 'device_id': 1 }, { unique: true });
    await db.collection('users').createIndex({ 'email': 1 }, { unique: true });
  } catch (e) {
    // Indexes not supported in memory mode
  }

  const userCount = (await db.collection('users').find({})).length;
  console.log('✅ Database seeded successfully');
  console.log(`   Zones: ${SEED_ZONES.length}`);
  console.log(`   Devices: ${SEED_DEVICES.length}`);
  console.log(`   Events: ${SEED_EVENTS.length}`);
  console.log(`   Predictions: ${SEED_PREDICTIONS.length}`);
  console.log(`   Facilities: ${SEED_FACILITIES.length}`);
  console.log(`   Users: ${userCount}`);
}
