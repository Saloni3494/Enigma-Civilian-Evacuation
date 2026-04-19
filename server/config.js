// SERA Backend Configuration
export default {
  PORT: process.env.PORT || 3001,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
  DB_NAME: process.env.DB_NAME || 'sera',
  AI_AGENTS_URL: process.env.AI_AGENTS_URL || 'http://127.0.0.1:8000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  // Demo region: Bangalore, India
  DEMO_CENTER: { lat: 12.9716, lng: 77.5946 },
  DEMO_RADIUS_KM: 3,
};
