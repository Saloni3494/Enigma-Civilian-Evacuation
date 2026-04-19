// MongoDB connection manager with in-memory fallback
import { MongoClient } from 'mongodb';
import config from '../config.js';

let client = null;
let db = null;
let usingMemory = false;

// In-memory fallback collections
let memoryStore = {
  events: [],
  zones: [],
  predictions: [],
  routes: [],
  devices: [],
  offline_queue: [],
  alerts: [],
  facilities: [],
  users: [],
};

// Simple in-memory collection that mimics MongoDB collection API
class MemoryCollection {
  constructor(name) {
    this.name = name;
    if (!memoryStore[name]) memoryStore[name] = [];
  }

  async find(query = {}, options = {}) {
    let results = [...memoryStore[this.name]];
    // Basic query matching
    if (Object.keys(query).length > 0) {
      results = results.filter(doc => {
        return Object.entries(query).every(([key, val]) => {
          if (typeof val === 'object' && val !== null) {
            if (val.$gte !== undefined && val.$lte !== undefined) {
              return doc[key] >= val.$gte && doc[key] <= val.$lte;
            }
            if (val.$in) return val.$in.includes(doc[key]);
            if (val.$ne !== undefined) return doc[key] !== val.$ne;
          }
          return doc[key] === val;
        });
      });
    }
    // Sort
    if (options.sort) {
      const [sortKey, sortDir] = Object.entries(options.sort)[0];
      results.sort((a, b) => sortDir === -1 ? (b[sortKey] - a[sortKey]) : (a[sortKey] - b[sortKey]));
    }
    // Limit
    if (options.limit) results = results.slice(0, options.limit);
    return results;
  }

  async findOne(query = {}) {
    const results = await this.find(query);
    return results[0] || null;
  }

  async insertOne(doc) {
    const _id = doc._id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newDoc = { _id, ...doc };
    memoryStore[this.name].push(newDoc);
    return { insertedId: _id, acknowledged: true };
  }

  async insertMany(docs) {
    const ids = [];
    for (const doc of docs) {
      const result = await this.insertOne(doc);
      ids.push(result.insertedId);
    }
    return { insertedIds: ids, acknowledged: true };
  }

  async updateOne(filter, update) {
    const idx = memoryStore[this.name].findIndex(doc => {
      return Object.entries(filter).every(([k, v]) => doc[k] === v);
    });
    if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set) {
      Object.assign(memoryStore[this.name][idx], update.$set);
    }
    if (update.$push) {
      Object.entries(update.$push).forEach(([k, v]) => {
        if (!memoryStore[this.name][idx][k]) memoryStore[this.name][idx][k] = [];
        memoryStore[this.name][idx][k].push(v);
      });
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(filter, update) {
    let modified = 0;
    for (const doc of memoryStore[this.name]) {
      const matches = Object.entries(filter).every(([k, v]) => doc[k] === v);
      if (matches) {
        if (update.$set) Object.assign(doc, update.$set);
        modified++;
      }
    }
    return { matchedCount: modified, modifiedCount: modified };
  }

  async deleteOne(filter) {
    const idx = memoryStore[this.name].findIndex(doc => {
      return Object.entries(filter).every(([k, v]) => doc[k] === v);
    });
    if (idx === -1) return { deletedCount: 0 };
    memoryStore[this.name].splice(idx, 1);
    return { deletedCount: 1 };
  }

  async deleteMany(filter = {}) {
    if (Object.keys(filter).length === 0) {
      const count = memoryStore[this.name].length;
      memoryStore[this.name] = [];
      return { deletedCount: count };
    }
    const before = memoryStore[this.name].length;
    memoryStore[this.name] = memoryStore[this.name].filter(doc => {
      return !Object.entries(filter).every(([k, v]) => doc[k] === v);
    });
    return { deletedCount: before - memoryStore[this.name].length };
  }

  async countDocuments(filter = {}) {
    const results = await this.find(filter);
    return results.length;
  }

  async aggregate(pipeline) {
    // Simplified aggregation – supports basic $group and $sort
    let results = [...memoryStore[this.name]];
    for (const stage of pipeline) {
      if (stage.$match) {
        results = results.filter(doc => {
          return Object.entries(stage.$match).every(([k, v]) => {
            if (typeof v === 'object' && v.$gte !== undefined) {
              return doc[k] >= v.$gte;
            }
            return doc[k] === v;
          });
        });
      }
      if (stage.$sort) {
        const [sortKey, sortDir] = Object.entries(stage.$sort)[0];
        results.sort((a, b) => sortDir === -1 ? (b[sortKey] > a[sortKey] ? 1 : -1) : (a[sortKey] > b[sortKey] ? 1 : -1));
      }
      if (stage.$limit) {
        results = results.slice(0, stage.$limit);
      }
      if (stage.$group) {
        const groups = {};
        for (const doc of results) {
          const groupId = stage.$group._id;
          let key;
          if (typeof groupId === 'string' && groupId.startsWith('$')) {
            key = JSON.stringify(doc[groupId.slice(1)]);
          } else if (typeof groupId === 'object') {
            key = JSON.stringify(
              Object.fromEntries(
                Object.entries(groupId).map(([k, v]) => [k, v.startsWith('$') ? doc[v.slice(1)] : v])
              )
            );
          } else {
            key = 'all';
          }
          if (!groups[key]) {
            groups[key] = { _id: key === 'all' ? null : JSON.parse(key), _docs: [] };
          }
          groups[key]._docs.push(doc);
        }
        results = Object.values(groups).map(g => {
          const out = { _id: g._id };
          for (const [field, expr] of Object.entries(stage.$group)) {
            if (field === '_id') continue;
            if (expr.$sum) out[field] = g._docs.length;
            if (expr.$avg) {
              const vals = g._docs.map(d => d[expr.$avg.slice(1)]).filter(v => v !== undefined);
              out[field] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            }
            if (expr.$first) out[field] = g._docs[0]?.[expr.$first.slice(1)];
            if (expr.$push) out[field] = g._docs.map(d => expr.$push === '$$ROOT' ? d : d[expr.$push.slice(1)]);
          }
          return out;
        });
      }
    }
    return results;
  }

  async createIndex() { /* no-op for memory */ }
}

// In-memory DB proxy
class MemoryDB {
  collection(name) {
    return new MemoryCollection(name);
  }
}

// Wrapper for real MongoDB collection to normalize find() to return arrays
class MongoCollectionWrapper {
  constructor(collection) {
    this._col = collection;
  }

  async find(query = {}, options = {}) {
    let cursor = this._col.find(query);
    if (options.sort) cursor = cursor.sort(options.sort);
    if (options.limit) cursor = cursor.limit(options.limit);
    return cursor.toArray();
  }

  async findOne(query = {}) {
    return this._col.findOne(query);
  }

  async insertOne(doc) {
    return this._col.insertOne(doc);
  }

  async insertMany(docs) {
    return this._col.insertMany(docs);
  }

  async updateOne(filter, update) {
    return this._col.updateOne(filter, update);
  }

  async updateMany(filter, update) {
    return this._col.updateMany(filter, update);
  }

  async deleteOne(filter) {
    return this._col.deleteOne(filter);
  }

  async deleteMany(filter = {}) {
    return this._col.deleteMany(filter);
  }

  async countDocuments(filter = {}) {
    return this._col.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return this._col.aggregate(pipeline).toArray();
  }

  async createIndex(...args) {
    return this._col.createIndex(...args);
  }
}

// Wrapped MongoDB database that returns wrapped collections
class WrappedDB {
  constructor(db) {
    this._db = db;
    this._cache = {};
  }

  collection(name) {
    if (!this._cache[name]) {
      this._cache[name] = new MongoCollectionWrapper(this._db.collection(name));
    }
    return this._cache[name];
  }

  command(...args) {
    return this._db.command(...args);
  }
}

export async function connectDB() {
  try {
    client = new MongoClient(config.MONGO_URI, {
      connectTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000,
    });
    await client.connect();
    const rawDb = client.db(config.DB_NAME);
    // Verify connection
    await rawDb.command({ ping: 1 });
    db = new WrappedDB(rawDb);
    console.log('✅ Connected to MongoDB:', config.MONGO_URI);
    usingMemory = false;
    return db;
  } catch (err) {
    console.warn('⚠️  MongoDB unavailable, using in-memory storage:', err.message);
    db = new MemoryDB();
    usingMemory = true;
    return db;
  }
}

export function getDB() {
  if (!db) {
    console.warn('⚠️  DB not initialized, using in-memory fallback');
    db = new MemoryDB();
    usingMemory = true;
  }
  return db;
}

export function isUsingMemory() {
  return usingMemory;
}

export async function closeDB() {
  if (client && !usingMemory) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}
