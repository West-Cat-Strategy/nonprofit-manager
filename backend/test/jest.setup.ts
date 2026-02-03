process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.REDIS_ENABLED = 'false'; // Disable Redis in tests
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key';

// Some service tests use DATABASE_URL directly.
// Keep it aligned with src/config/database defaults so tests can run in local/dev docker.
process.env.DATABASE_URL = process.env.DATABASE_URL
  || `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'nonprofit_manager'}`;
