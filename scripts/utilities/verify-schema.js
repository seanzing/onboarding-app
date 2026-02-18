const fs = require('fs');
const path = require('path');

const dir = './data/enriched-hubspot';
const files = fs.readdirSync(dir)
  .filter(f => f.match(/^\d{2}-.*\.json$/))
  .sort();

console.log('=== SCHEMA VERIFICATION REPORT ===\n');
console.log('Files found:', files.length);
console.log('');

// Get keys from each file
const allFileKeys = {};
const allSocialMediaKeys = {};
const allAttributesKeys = {};
const allBusinessHoursKeys = {};

files.forEach(file => {
  const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  allFileKeys[file] = Object.keys(content).sort();
  allSocialMediaKeys[file] = Object.keys(content.socialMedia || {}).sort();
  allAttributesKeys[file] = Object.keys(content.attributes || {}).sort();
  allBusinessHoursKeys[file] = Object.keys(content.businessHours || {}).sort();
});

// Check if all top-level keys are identical
const firstFileKeys = allFileKeys[files[0]];
console.log('=== TOP-LEVEL KEYS (expected 27) ===');
console.log(firstFileKeys.join(', '));
console.log('Key count:', firstFileKeys.length);
console.log('');

let allMatch = true;
files.forEach(file => {
  const keys = allFileKeys[file];
  const match = JSON.stringify(keys) === JSON.stringify(firstFileKeys);
  if (!match) {
    allMatch = false;
    console.log('❌', file, '- KEYS MISMATCH');
    console.log('   Missing:', firstFileKeys.filter(k => !keys.includes(k)));
    console.log('   Extra:', keys.filter(k => !firstFileKeys.includes(k)));
  } else {
    console.log('✅', file, '- 27 keys match');
  }
});

console.log('');
console.log('=== NESTED OBJECT KEYS ===');

// Check socialMedia keys
const firstSocialKeys = allSocialMediaKeys[files[0]];
console.log('socialMedia keys:', firstSocialKeys.join(', '));
let socialMatch = true;
files.forEach(file => {
  if (JSON.stringify(allSocialMediaKeys[file]) !== JSON.stringify(firstSocialKeys)) {
    socialMatch = false;
    console.log('  ❌', file, 'has different socialMedia keys');
  }
});
if (socialMatch) console.log('  ✅ All files have identical socialMedia keys');

// Check attributes keys
const firstAttrKeys = allAttributesKeys[files[0]];
console.log('attributes keys:', firstAttrKeys.join(', '));
let attrMatch = true;
files.forEach(file => {
  if (JSON.stringify(allAttributesKeys[file]) !== JSON.stringify(firstAttrKeys)) {
    attrMatch = false;
    console.log('  ❌', file, 'has different attributes keys');
  }
});
if (attrMatch) console.log('  ✅ All files have identical attributes keys');

// Check businessHours keys
const firstHoursKeys = allBusinessHoursKeys[files[0]];
console.log('businessHours keys:', firstHoursKeys.join(', '));
let hoursMatch = true;
files.forEach(file => {
  if (JSON.stringify(allBusinessHoursKeys[file]) !== JSON.stringify(firstHoursKeys)) {
    hoursMatch = false;
    console.log('  ❌', file, 'has different businessHours keys');
  }
});
if (hoursMatch) console.log('  ✅ All files have identical businessHours keys');

console.log('');
console.log('=== FINAL VERDICT ===');
if (allMatch && socialMatch && attrMatch && hoursMatch) {
  console.log('✅✅✅ ALL 11 FILES HAVE IDENTICAL SCHEMAS ✅✅✅');
} else {
  console.log('❌ SCHEMA MISMATCH DETECTED - SEE ABOVE FOR DETAILS');
}
