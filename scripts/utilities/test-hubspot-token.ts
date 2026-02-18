import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env (force override any existing values)
dotenv.config({ override: true });

const token = process.env.HUBSPOT_ACCESS_TOKEN;

console.log('Token found:', !!token);
console.log('Token starts with:', token?.substring(0, 15));

async function test() {
  const response = await fetch('https://api.hubapi.com/crm/v3/properties/contacts', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);

  if (response.ok) {
    const data = await response.json();
    console.log('Success! Found', data.results.length, 'properties');
    console.log('First property:', data.results[0].name);
  } else {
    const text = await response.text();
    console.log('Error response:', text);
  }
}

test();
