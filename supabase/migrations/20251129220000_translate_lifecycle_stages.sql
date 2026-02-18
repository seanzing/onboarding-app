-- Translate lifecycle stage numeric IDs to human-readable labels
-- This fixes existing records to use meaningful values instead of HubSpot internal IDs
--
-- The sync service now translates at sync time, but existing records need this one-time fix.
-- After this migration, all lifecyclestage values will be readable (Customer, Lead, HOT, DNC, etc.)

-- First, let's see what we have (for verification)
-- SELECT lifecyclestage, count(*) FROM contacts GROUP BY lifecyclestage ORDER BY count(*) DESC;

-- Translate custom stages (numeric IDs to labels)
UPDATE contacts SET lifecyclestage = 'HOT' WHERE lifecyclestage = '944991848';
UPDATE contacts SET lifecyclestage = 'Active' WHERE lifecyclestage = '999377175';
UPDATE contacts SET lifecyclestage = 'No Show' WHERE lifecyclestage = '958707767';
UPDATE contacts SET lifecyclestage = 'DNC' WHERE lifecyclestage = '946862144';
UPDATE contacts SET lifecyclestage = 'Zing Employee' WHERE lifecyclestage = '81722417';
UPDATE contacts SET lifecyclestage = 'Reengage' WHERE lifecyclestage = '1000822942';
UPDATE contacts SET lifecyclestage = 'VC' WHERE lifecyclestage = '1009016957';

-- Translate standard stages to proper capitalization (optional but consistent)
UPDATE contacts SET lifecyclestage = 'Customer' WHERE lifecyclestage = 'customer';
UPDATE contacts SET lifecyclestage = 'Lead' WHERE lifecyclestage = 'lead';
UPDATE contacts SET lifecyclestage = 'Sales Qualified Lead' WHERE lifecyclestage = 'salesqualifiedlead';
UPDATE contacts SET lifecyclestage = 'Opportunity' WHERE lifecyclestage = 'opportunity';
UPDATE contacts SET lifecyclestage = 'Other' WHERE lifecyclestage = 'other';
UPDATE contacts SET lifecyclestage = 'Subscriber' WHERE lifecyclestage = 'subscriber';
UPDATE contacts SET lifecyclestage = 'Marketing Qualified Lead' WHERE lifecyclestage = 'marketingqualifiedlead';
UPDATE contacts SET lifecyclestage = 'Evangelist' WHERE lifecyclestage = 'evangelist';

-- Verify the translation
-- SELECT lifecyclestage, count(*) FROM contacts GROUP BY lifecyclestage ORDER BY count(*) DESC;
