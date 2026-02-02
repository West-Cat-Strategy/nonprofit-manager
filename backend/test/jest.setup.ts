process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.REDIS_ENABLED = 'false'; // Disable Redis in tests
