/**
 * HubSpot API Test Script
 *
 * Tests reading and updating HubSpot contacts directly using the SDK.
 * Run with: npx tsx test-hubspot-api.ts
 */

import { Client } from '@hubspot/api-client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const TEST_CONTACT_ID = '172631216775';

if (!ACCESS_TOKEN) {
  console.error('❌ HUBSPOT_ACCESS_TOKEN not found in .env.local');
  process.exit(1);
}

console.log('🚀 HubSpot API Test Script');
console.log('===========================\n');

// Initialize HubSpot client
const client = new Client({ accessToken: ACCESS_TOKEN });

async function testReadContact() {
  console.log(`\n📖 TEST 1: Reading Contact ${TEST_CONTACT_ID}`);
  console.log('─'.repeat(50));

  try {
    const contact = await client.crm.contacts.basicApi.getById(
      TEST_CONTACT_ID,
      undefined, // properties (undefined = all)
      undefined, // propertiesWithHistory
      undefined, // associations
      false // archived
    );

    console.log('✅ SUCCESS: Contact retrieved');
    console.log('\n📋 Contact Details:');
    console.log(`   ID: ${contact.id}`);
    console.log(`   Created: ${contact.createdAt}`);
    console.log(`   Updated: ${contact.updatedAt}`);
    console.log('\n📝 Properties:');
    console.log(JSON.stringify(contact.properties, null, 2));

    return contact;
  } catch (error: any) {
    console.error('❌ FAILED: Could not read contact');
    console.error(`   Error: ${error.message}`);
    if (error.body) {
      console.error(`   Details: ${JSON.stringify(error.body, null, 2)}`);
    }
    throw error;
  }
}

async function testUpdateContact(originalPhone: string | null) {
  console.log(`\n✏️  TEST 2: Updating Contact Phone Number`);
  console.log('─'.repeat(50));
  console.log(`   Original Phone: ${originalPhone || 'None'}`);
  console.log(`   New Phone: 7207720485`);

  try {
    const updatedContact = await client.crm.contacts.basicApi.update(
      TEST_CONTACT_ID,
      {
        properties: {
          phone: '7207720485',
        },
      }
    );

    console.log('✅ SUCCESS: Phone number updated');
    console.log(`\n📝 Updated Properties:`);
    console.log(`   phone: ${updatedContact.properties.phone}`);

    return updatedContact;
  } catch (error: any) {
    console.error('❌ FAILED: Could not update contact');
    console.error(`   Error: ${error.message}`);
    if (error.body) {
      console.error(`   Details: ${JSON.stringify(error.body, null, 2)}`);
    }
    throw error;
  }
}

async function testUndoUpdate(originalPhone: string | null) {
  console.log(`\n↩️  TEST 3: Undoing Phone Number Change`);
  console.log('─'.repeat(50));
  console.log(`   Restoring to: ${originalPhone || 'Empty'}`);

  try {
    const updatedContact = await client.crm.contacts.basicApi.update(
      TEST_CONTACT_ID,
      {
        properties: {
          phone: originalPhone || '', // Restore original or set to empty
        },
      }
    );

    console.log('✅ SUCCESS: Phone number restored');
    console.log(`\n📝 Updated Properties:`);
    console.log(`   phone: ${updatedContact.properties.phone || 'Empty'}`);

    return updatedContact;
  } catch (error: any) {
    console.error('❌ FAILED: Could not undo change');
    console.error(`   Error: ${error.message}`);
    if (error.body) {
      console.error(`   Details: ${JSON.stringify(error.body, null, 2)}`);
    }
    throw error;
  }
}

async function runTests() {
  try {
    // Test 1: Read contact
    const contact = await testReadContact();
    const originalPhone = contact.properties.phone || null;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Update contact phone number
    await testUpdateContact(originalPhone);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Undo the change
    await testUndoUpdate(originalPhone);

    console.log('\n\n🎉 ALL TESTS PASSED!');
    console.log('===========================');
    console.log('✅ Read operation: Working');
    console.log('✅ Write operation: Working');
    console.log('✅ Undo operation: Working');
    console.log('\n💡 You can verify in HubSpot UI:');
    console.log(`   https://app.hubspot.com/contacts/39784316/record/0-1/${TEST_CONTACT_ID}`);
    console.log('\n📱 Phone number has been restored to original value.');
  } catch (error) {
    console.log('\n\n❌ TESTS FAILED');
    console.log('===========================');
    process.exit(1);
  }
}

// Run the tests
runTests();
