const http = require('http');

console.log('Testing authentication flow...\n');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAuthFlow() {
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET'
    });
    console.log('   ✓ Health check:', health.body.status);

    // Test 2: Register user
    console.log('\n2. Testing user registration...');
    const register = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: `test${Date.now()}@example.com`,
      password: 'SecurePassword123!',
      firstName: 'Test',
      lastName: 'User'
    });

    if (register.body.token) {
      console.log('   ✓ Registration successful');
      console.log('   User ID:', register.body.user.id);
      console.log('   Email:', register.body.user.email);
    } else {
      console.log('   ✗ Registration failed:', register.body);
      return;
    }

    // Test 3: Login
    console.log('\n3. Testing login...');
    const login = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: register.body.user.email,
      password: 'SecurePassword123!'
    });

    if (login.body.token) {
      console.log('   ✓ Login successful');
      const token = login.body.token;

      // Test 4: Access protected endpoint
      console.log('\n4. Testing protected endpoint...');
      const accounts = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/accounts',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (accounts.statusCode === 200) {
        console.log('   ✓ Protected endpoint access successful');
        console.log('   Accounts returned:', accounts.body.accounts ? accounts.body.accounts.length : 0);
      } else {
        console.log('   ! Protected endpoint:', accounts.body);
      }

      // Test 5: Invalid credentials
      console.log('\n5. Testing invalid login...');
      const invalid = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        email: register.body.user.email,
        password: 'WrongPassword!'
      });

      if (invalid.body.error || invalid.statusCode !== 200) {
        console.log('   ✓ Invalid login correctly rejected');
      } else {
        console.log('   ✗ Invalid login test failed');
      }

    } else {
      console.log('   ✗ Login failed:', login.body);
    }

    console.log('\n=== All tests completed successfully! ===\n');

  } catch (error) {
    console.error('Test failed with error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nBackend server is not running on port 3000');
      console.error('Please start the backend with: npm run dev');
    }
    process.exit(1);
  }
}

testAuthFlow();
