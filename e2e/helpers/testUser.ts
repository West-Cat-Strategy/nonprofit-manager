import fs from 'fs';
import path from 'path';

const DEFAULT_TEST_EMAIL = 'test@example.com';
const DEFAULT_TEST_PASSWORD = 'Test123!@#';

type TestUser = { email: string; password: string };

const isPasswordPolicyCompliant = (password: string): boolean => {
  // Keep this aligned with backend password validation requirements.
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

const readCachedUser = (cacheFile: string): TestUser | null => {
  try {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as {
      email?: string;
      password?: string;
    };
    if (cached?.email && cached?.password && isPasswordPolicyCompliant(cached.password)) {
      return { email: cached.email, password: cached.password };
    }
  } catch {
    // ignore
  }
  return null;
};

export const getSharedTestUser = (): TestUser => {
  const envEmail = process.env.TEST_USER_EMAIL?.trim();
  const envPassword = process.env.TEST_USER_PASSWORD?.trim();
  if (envEmail && envPassword) {
    process.env.TEST_USER_EMAIL = envEmail;
    process.env.TEST_USER_PASSWORD = envPassword;
    return { email: envEmail, password: envPassword };
  }

  const cacheDir = path.resolve(process.cwd(), '.cache');
  const cacheFile = path.join(cacheDir, 'test-user.json');
  const lockFile = path.join(cacheDir, 'test-user.lock');

  const cached = readCachedUser(cacheFile);
  if (cached) {
    process.env.TEST_USER_EMAIL = cached.email;
    process.env.TEST_USER_PASSWORD = cached.password;
    return cached;
  }

  fs.mkdirSync(cacheDir, { recursive: true });

  let hasLock = false;
  try {
    fs.writeFileSync(lockFile, `${process.pid}`, { encoding: 'utf8', flag: 'wx' });
    hasLock = true;
  } catch {
    // another worker is creating the user
  }

  if (!hasLock) {
    const start = Date.now();
    while (Date.now() - start < 10000) {
      const existing = readCachedUser(cacheFile);
      if (existing) {
        process.env.TEST_USER_EMAIL = existing.email;
        process.env.TEST_USER_PASSWORD = existing.password;
        return existing;
      }
    }
  }

  const generated = {
    email: `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: envPassword || DEFAULT_TEST_PASSWORD,
  };

  try {
    fs.writeFileSync(cacheFile, JSON.stringify(generated), { encoding: 'utf8' });
  } catch {
    // ignore cache write issues
  }

  if (hasLock) {
    try {
      fs.unlinkSync(lockFile);
    } catch {
      // ignore
    }
  }

  process.env.TEST_USER_EMAIL = generated.email;
  process.env.TEST_USER_PASSWORD = generated.password;
  return generated;
};

export const setSharedTestUser = (user: TestUser): void => {
  const cacheDir = path.resolve(process.cwd(), '.cache');
  const cacheFile = path.join(cacheDir, 'test-user.json');
  fs.mkdirSync(cacheDir, { recursive: true });
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(user), { encoding: 'utf8' });
  } catch {
    // ignore cache write issues
  }
  process.env.TEST_USER_EMAIL = user.email;
  process.env.TEST_USER_PASSWORD = user.password;
};
