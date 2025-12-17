const IORedis = require("ioredis");
const crypto = require('crypto');

var redisUrl = process.env.REDIS_URL || null;
if( !redisUrl ) throw "REDIS_URL required. ";

var redis = null;
var usingRedis = false;

if (redisUrl) {
  try {
    redis = new IORedis(
      redisUrl + (redisUrl.includes("?") ? "&" : "?") + "family=0",
      {
        retryStrategy(times) {
          return Math.min(times * 50, 2000);
        },
      }
    );
    usingRedis = true;

    redis.on("error", (e) => console.error("Redis error:", e && e.message));
  } catch (err) {

    console.error("Redis init error:", err);
    usingRedis = false;
  }
}

function safe_stringify(val) {
  try {
    return JSON.stringify(val);
  } catch (e) {
    return String(val);
  }
};

function safe_parse(val) {
  if (val === null || val === undefined) return null;
  try {
    return JSON.parse(val);
  } catch (e) {
    return val;
  }
};

function make_token() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
};

module.exports = {
  is_enabled() {
    return usingRedis && !!redis;
  },
  async acquire_lock(key, ttlSeconds = 120) {
    if (!(usingRedis && redis)) return null;
    var token = make_token();

    try {

      var res = await redis.set(key, token, "NX", "EX", ttlSeconds);
      return res === "OK" ? token : null;

    } catch (err) {

      console.error("Redis acquire_lock error:", err && err.message);
      return null;
    }
  },

  async release_lock(key, token) {
    if (!(usingRedis && redis) || !token) return;

    var script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {

      await redis.eval(script, 1, key, token);
    } catch (err) {

      console.error("Redis release_lock error:", err && err.message);
    }
  },
  async extend_lock(key, token, ttlSeconds = 120) {
    if (!(usingRedis && redis) || !token) return 0;

    var script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    try {

      return await redis.eval(script, 1, key, token, ttlSeconds);
    } catch (err) {

      console.error("Redis extend_lock error:", err && err.message);
      return 0;
    }
  },
  async get(key) {
    if (usingRedis && redis) {
      try {
        var v = await redis.get(key);
        return safe_parse(v);
      } catch (err) {
        console.error("Redis get error:", err && err.message);
        return;
      }
    } else {
      return;
    }
  },
  async set(key, val, ttlSeconds = 600) {
    if (usingRedis && redis) {
      try {
        var s = safe_stringify(val);
        if (ttlSeconds > 0) {
          await redis.set(key, s, "EX", ttlSeconds);
        } else {
          await redis.set(key, s);
        }
        return true;
      } catch (err) {
        console.error("Redis set error:", err && err.message);
        return;
      }
    } else {
      return;
    }
  },
  async del(key) {
    if (usingRedis && redis) {
      try {
        await redis.del(key);
        return true;
      } catch (err) {
        console.error("Redis del error:", err && err.message);
        return;
      }
    } else {
      return;
    }
  },
  async has(key) {
    if (usingRedis && redis) {
      try {
        var exists = await redis.exists(key);
        return exists === 1;
      } catch (err) {
        console.error("Redis exists error:", err && err.message);
        return;
      }
    } else {
      return;
    }
  }
};