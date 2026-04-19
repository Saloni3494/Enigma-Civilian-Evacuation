// Auth routes – register / login with MongoDB user storage
import { Router } from 'express';
import crypto from 'crypto';
import { getDB } from '../db/connection.js';

const router = Router();

// Hash password with SHA-256 + salt
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const result = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return result === hash;
}

// POST /api/auth/register – create a new civilian account
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDB();
    const users = db.collection('users');

    // Check if user already exists
    const existing = await users.find({ email: email.toLowerCase() });
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const { hash, salt } = hashPassword(password);

    const user = {
      user_id: crypto.randomUUID(),
      name: name || 'Civilian User',
      email: email.toLowerCase(),
      phone: phone || '',
      password_hash: hash,
      password_salt: salt,
      role: 'civilian', // Only civilians can register; admin is pre-seeded
      created_at: new Date().toISOString(),
    };

    await users.insertOne(user);

    // Return user info without password
    res.status(201).json({
      success: true,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login – authenticate user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDB();
    const users = await db.collection('users').find({ email: email.toLowerCase() });

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Verify password
    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return user info
    res.json({
      success: true,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// PUT /api/auth/location – Update user's live location
router.put('/location', async (req, res) => {
  try {
    const { email, location } = req.body;
    if (!email || !location) return res.status(400).json({ error: 'Missing email or location' });

    const db = getDB();
    await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { last_location: location, last_location_time: new Date().toISOString() } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// GET /api/auth/location/:phone – Get user's live location by phone number
router.get('/location/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const db = getDB();
    const users = await db.collection('users').find({ phone });
    if (!users || users.length === 0 || !users[0].last_location) {
      return res.status(404).json({ error: 'Location not found for this phone number' });
    }
    res.json({
      success: true,
      location: users[0].last_location,
      time: users[0].last_location_time,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

export default router;
