const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FIELDS = ['email', 'firstname', 'lastname', 'phone', 'company', 'website', 'address', 'city', 'state', 'zip'];

async function fetchAllCustomers() {
  // Use pagination to get ALL customers (Supabase default limit is 1000)
  let allCustomers = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  console.log('Fetching ALL customers with pagination...');

  while (hasMore) {
    const { data: customers, error } = await supabase
      .from('contacts')
      .select('email, firstname, lastname, phone, company, website, address, city, state, zip, lifecyclestage')
      .ilike('lifecyclestage', 'customer')
      .range(from, from + pageSize - 1);

    if (error) {
      console.log('Error:', error.message);
      return [];
    }

    if (customers && customers.length > 0) {
      allCustomers = [...allCustomers, ...customers];
      console.log(`  Fetched ${customers.length} records (total: ${allCustomers.length})`);
    }

    // Check if there are more records
    if (!customers || customers.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  return allCustomers;
}

async function checkAllFieldCoverage() {
  // Get ALL customers with pagination
  const customers = await fetchAllCustomers();

  if (!customers || customers.length === 0) {
    console.log('No customers found');
    return;
  }

  console.log('');
  console.log('Total customers:', customers.length);
  console.log('');
  console.log('Field Coverage (All 10 Fields):');
  console.log('================================');

  const results = [];

  FIELDS.forEach(field => {
    let filled = 0;
    customers.forEach(c => {
      const value = c[field];
      if (value && String(value).trim() !== '') {
        // Extra check for website - exclude invalid values
        if (field === 'website') {
          const lower = String(value).toLowerCase().trim();
          if (lower !== 'no' && lower !== 'http://no' && lower !== 'n/a' && lower !== 'none') {
            filled++;
          }
        } else {
          filled++;
        }
      }
    });

    const percent = Math.round(filled/customers.length*100);
    results.push({ field, filled, percent });
  });

  // Sort by percentage (highest first)
  results.sort((a, b) => b.percent - a.percent);

  results.forEach(r => {
    const bar = '█'.repeat(Math.round(r.percent/5)) + '░'.repeat(20 - Math.round(r.percent/5));
    console.log(r.field.padEnd(12) + ': ' + bar + ' ' + r.percent.toString().padStart(3) + '% (' + r.filled + '/' + customers.length + ')');
  });
}

checkAllFieldCoverage();
