# HubSpot → BrightLocal FINAL Property Mappings

**Generated:** 2025-11-09T08:38:34.664Z
**Total HubSpot Properties Analyzed:** 881 (602 contact + 279 company)
**Total Useful Mappings:** 183

---

## 🎯 Executive Summary

| Category | Count | Description |
|----------|-------|-------------|
| ✅ Direct Mappings | 21 | Properties that map 1:1 with no transformation |
| 🔄 Transform Required | 23 | Properties requiring data transformation/normalization |
| 💡 Enrichment Potential | 139 | Properties useful for additional context/data quality |

### 🆕 NEW Discoveries (19 mappings)

The comprehensive property search discovered 19 additional valuable mappings:

- ✅ **Photo URL Support**: `twitterprofilephoto` can populate BrightLocal Photo URL 1
- ✅ **Enhanced LinkedIn Coverage**: `hs_linkedin_url` provides alternative LinkedIn URL source
- ✅ **Description Enrichment**: Twitter and LinkedIn bio fields can enhance business descriptions

---

## 🟢 DIRECT MAPPINGS (21)

These HubSpot properties map directly to BrightLocal fields with minimal or no transformation.

| HubSpot Property | BrightLocal Field | Type | Notes |
|------------------|-------------------|------|-------|
| `address` | **Address 1** | string | Street address including apt/unit number |
| `business_email_address` | **Contact Email Address** | string | Business-specific email (alternative to personal email) |
| `city` | **Town/City** | string | City name |
| `company` | **Location Name** | string | Business name from HubSpot contact |
| `email` | **Contact Email Address** | string | Primary email address |
| `fax` | **Contact Fax Number** | string | Fax number (if available) |
| `firstname` | **Contact First Name** | string | Contact person first name |
| `hs_object_id` | **Unique Location Reference** | number | HubSpot contact ID - guaranteed unique |
| `lastname` | **Contact Last Name** | string | Contact person last name |
| `numemployees` | **Number of Employees** | enumeration | Employee count |
| `state` | **State/County/Region** | string | State/province (required for US/CA/AU) |
| `zip` | **Postcode/Zip** | string | Postal/ZIP code |
| `COMPANY.address` | **Address 1** | string | [Company Property] Street address including apt/unit number |
| `COMPANY.city` | **Town/City** | string | [Company Property] City name |
| `COMPANY.facebook_company_page` | **Facebook URL** | string | [Company Property] Facebook company page URL |
| `COMPANY.hs_object_id` | **Unique Location Reference** | number | [Company Property] HubSpot contact ID - guaranteed unique |
| `COMPANY.linkedin_company_page` | **LinkedIn URL** | string | [Company Property] LinkedIn company page URL |
| `COMPANY.state` | **State/County/Region** | string | [Company Property] State/province (required for US/CA/AU) |
| `COMPANY.zip` | **Postcode/Zip** | string | [Company Property] Postal/ZIP code |
| `twitterprofilephoto` | **Photo URL 1** | string | Twitter profile photo - can use for location photo |
| `hs_linkedin_url` | **LinkedIn URL** | string | LinkedIn profile URL from HubSpot enrichment |

---

## 🟡 TRANSFORMATION REQUIRED (23)

These properties need data transformation before importing to BrightLocal.

| HubSpot Property | BrightLocal Field | Transformation | Notes |
|------------------|-------------------|----------------|-------|
| `business_category_type` | **Business Category ID** | Map text to BrightLocal category ID (528, 503, etc.) | ⚠️ CRITICAL: 86% missing - requires default category |
| `business_hours` | **Business Hours (all 14 fields)** | Parse text and split into 14 day/time fields | 95% empty - complex parsing required |
| `country` | **Country** | Normalize to 3-letter ISO (USA, GBR, CAN) | Convert various formats to ISO 3166-1 alpha-3 |
| `createdate` | **Date of Company Formation** | Convert ISO timestamp to MM-YYYY | HubSpot contact creation date (proxy for formation) |
| `current_website` | **Website URL** | Fallback if website field empty | Alternative website field |
| `mobilephone` | **Contact Mobile Number** | Format as XXX-XXX-XXXX | Mobile phone number |
| `phone` | **Telephone** | Format as XXX-XXX-XXXX | Primary business phone |
| `twitterhandle` | **X URL** | Convert @handle to https://twitter.com/handle | Twitter/X handle |
| `website` | **Website URL** | Ensure https://, remove invalid values | Primary website URL |
| `COMPANY.country` | **Country** | Normalize to 3-letter ISO (USA, GBR, CAN) | [Company Property] Convert various formats to ISO 3166-1 alpha-3 |
| `COMPANY.createdate` | **Date of Company Formation** | Convert ISO timestamp to MM-YYYY | [Company Property] HubSpot contact creation date (proxy for formation) |
| `COMPANY.phone` | **Telephone** | Format as XXX-XXX-XXXX | [Company Property] Primary business phone |
| `COMPANY.twitterhandle` | **X URL** | Convert @handle to https://twitter.com/handle | [Company Property] Twitter/X handle |
| `COMPANY.website` | **Website URL** | Ensure https://, remove invalid values | [Company Property] Primary website URL |
| `domain_registrar_which_holds_this_domain_` | **Website URL** | Fallback if primary website fields empty | Alternative website field: Domain Registrar which holds this domain? |
| `hs_analytics_first_url` | **Website URL** | Fallback if primary website fields empty | Alternative website field: First Page Seen |
| `hs_analytics_last_url` | **Website URL** | Fallback if primary website fields empty | Alternative website field: Last Page Seen |
| `hs_content_membership_registration_domain_sent_to` | **Website URL** | Fallback if primary website fields empty | Alternative website field: Domain to which registration email was sent |
| `hs_linkedin_url` | **Website URL** | Fallback if primary website fields empty | Alternative website field: LinkedIn URL |
| `i_agree__2__your_request_for_domain_transfer` | **Website URL** | Fallback if primary website fields empty | Alternative website field: I Agree- 2. Your Request for Domain Transfer |
| `is_domain_being_purchased_by_zing_` | **Website URL** | Fallback if primary website fields empty | Alternative website field: Is domain being purchased by Zing? |
| `will_the_email_address_stay_with_your_existing_domain_provider_` | **Website URL** | Fallback if primary website fields empty | Alternative website field: Will the email address stay with your existing domain provider? |
| `would_you_like_to_delegate_access_of_your_domain_to_our_support_team_` | **Website URL** | Fallback if primary website fields empty | Alternative website field: Would you like to delegate access of your domain to our Support team? |

---

## 🔵 ENRICHMENT POTENTIAL (showing 50 of 139)

These properties could enhance data quality or provide additional context.

| HubSpot Property | Label | BrightLocal Field | Notes |
|------------------|-------|-------------------|-------|
| `about_us_information` | About Us Information  | **Full Description** | About Us content - can use for description field (750 char limit) |
| `accessibility_information__ex__wheelchair_accessable_` | Accessibility Information (ex: wheelchair accessable) | **Full Description** | Accessibility info - append to description |
| `account_information` | Domain Email Address | **(Potential Enrichment)** | No description - Group: contactinformation |
| `advanced_edit_request_s_` | Advanced Edit Request(s) | **(Potential Enrichment)** | No description - Group: contactinformation |
| `amount_of_items_sold__ecommerce_` | Amount of Items Sold (eCommerce) | **(Potential Enrichment)** | No description - Group: contactinformation |
| `annualrevenue` | Annual Revenue | **Number of Employees** | Can estimate employee count from revenue |
| `bas_booking_link` | BAs booking link | **(Potential Enrichment)** | No description - Group: contactinformation |
| `booked_edits_appts` | Booked Edits Appts | **(Potential Enrichment)** | No description - Group: contactinformation |
| `brand_sold_to_customer` | Brand sold to customer | **(Potential Enrichment)** | No description - Group: contactinformation |
| `by_signing_up__you_agree_to_receive_text_messages_from_zing_website_design_about_your_account__serv` | By signing up, you agree to receive text messages from ZING Website Design about your account, service updates, and promotions. Message frequency varies. Reply STOP to unsubscribe or HELP for help. Standard message and data rates may apply. | **(Potential Enrichment)** | No description - Group: contactinformation |
| `color_scheme` | Color Scheme | **(Potential Enrichment)** | No description - Group: contactinformation |
| `comments` | Comments | **(Potential Enrichment)** | No description - Group: contactinformation |
| `contact_name` | Contact Name | **(Potential Enrichment)** | No description - Group: contactinformation |
| `contact_us_information` | Contact Us Information | **(Potential Enrichment)** | No description - Group: contactinformation |
| `current_domain_name` | Current Domain Name | **(Potential Enrichment)** | No description - Group: contactinformation |
| `delegated_access_instructions` | Delegated Access Instructions | **(Potential Enrichment)** | No description - Group: contactinformation |
| `domain_name_to_reserve` | Domain name to reserve | **(Potential Enrichment)** | No description - Group: contactinformation |
| `domain_registrar__other_` | Domain Registrar (other) | **(Potential Enrichment)** | Domain registrar when other is selected - Group: contactinformation |
| `edit_request_2__description_of_edits` | Edit Request 2- Description of Edits | **(Potential Enrichment)** | No description - Group: contactinformation |
| `edit_request_2__page_section__cloned_` | Edit Request 2- Page Section | **(Potential Enrichment)** | No description - Group: contactinformation |
| `edit_request_3__description_of_edits` | Edit Request 3- Description of Edits | **(Potential Enrichment)** | No description - Group: contactinformation |
| `edit_request_3__page_section` | Edit Request 3- Page Section | **(Potential Enrichment)** | No description - Group: contactinformation |
| `edit_request_4__description_of_edits` | Edit Request 4- Description of Edits | **(Potential Enrichment)** | No description - Group: contactinformation |
| `edit_request_4__page_section` | Edit Request 4- Page Section | **(Potential Enrichment)** | No description - Group: contactinformation |
| `edit_request__description_of_edits` | Edit Request 1- Description of Edits | **(Potential Enrichment)** | No description - Group: contactinformation |
| `edit_request__page_section` | Edit Request 1- Page Section | **(Potential Enrichment)** | No description - Group: contactinformation |
| `edit_requests` | Edit Requests | **(Potential Enrichment)** | No description - Group: contactinformation |
| `essentials__how_many_staff_do_you_have` | Essentials- How many staff do you have  | **(Potential Enrichment)** | No description - Group: contactinformation |
| `facebook_username_and_password__login_informaiton_` | Facebook Username and Password (login informaiton) | **(Potential Enrichment)** | No description - Group: contactinformation |
| `for_new_email_accounts__please_advise_the_name_for_each_email_address_` | For new email accounts, please advise the name for each email address: | **(Potential Enrichment)** | No description - Group: contactinformation |
| `google_business_profile_username_and_password__login_information_` | Google Business Profile Username and Password (login information) | **(Potential Enrichment)** | No description - Group: contactinformation |
| `heymarket_webchat` | Heymarket Webchat | **(Potential Enrichment)** | No description - Group: contactinformation |
| `how_many_guests_will_you_be_brining_` | How many guests will you be brining? | **(Potential Enrichment)** | No description - Group: contactinformation |
| `industry` | ZZZIndustry | **(Potential Enrichment)** | The Industry a contact is in - Group: contactinformation |
| `industry_1` | industry_1 | **(Potential Enrichment)** | No description - Group: contactinformation |
| `instagram_username_and_password__login_information_` | Instagram Username and Password (login information) | **(Potential Enrichment)** | No description - Group: contactinformation |
| `is_there_anything_else_you_would_like_to_add_` | Is there anything else you would like to add? | **(Potential Enrichment)** | No description - Group: contactinformation |
| `item_groups__ecommerce_` | Item Groups (eCommerce) | **(Potential Enrichment)** | No description - Group: contactinformation |
| `jobtitle` | Job Title | **(Potential Enrichment)** | A contact's job title - Group: contactinformation |
| `language_s__spoken` | Language(s) Spoken | **(Potential Enrichment)** | No description - Group: contactinformation |
| `link_to_existing_e_commerce_store__if_applicable_` | Link to existing E-Commerce store (if applicable) | **(Potential Enrichment)** | No description - Group: contactinformation |
| `location_1` | Location 1 | **(Potential Enrichment)** | No description - Group: contactinformation |
| `location_10` | location_10 | **(Potential Enrichment)** | No description - Group: contactinformation |
| `location_11` | location_11 | **(Potential Enrichment)** | No description - Group: contactinformation |
| `location_12` | location_12 | **(Potential Enrichment)** | No description - Group: contactinformation |
| `location_13` | location_13 | **(Potential Enrichment)** | No description - Group: contactinformation |
| `location_14` | location_14 | **(Potential Enrichment)** | No description - Group: contactinformation |
| `location_15` | location_15 | **(Potential Enrichment)** | No description - Group: contactinformation |
| `location_16` | location_16 | **(Potential Enrichment)** | No description - Group: contactinformation |
| `location_17` | location_17 | **(Potential Enrichment)** | No description - Group: contactinformation |

... and 89 more enrichment properties

---

## 📋 BrightLocal Fields Coverage Analysis

### ✅ Covered Fields (Can be populated from HubSpot)

- **Address 1** ← `address`, `COMPANY.address`
- **Contact Email Address** ← `business_email_address`, `email`
- **Town/City** ← `city`, `COMPANY.city`
- **Location Name** ← `company`
- **Contact Fax Number** ← `fax`
- **Contact First Name** ← `firstname`
- **Unique Location Reference** ← `hs_object_id`, `COMPANY.hs_object_id`
- **Contact Last Name** ← `lastname`
- **Number of Employees** ← `numemployees`
- **State/County/Region** ← `state`, `COMPANY.state`
- **Postcode/Zip** ← `zip`, `COMPANY.zip`
- **Facebook URL** ← `COMPANY.facebook_company_page`
- **LinkedIn URL** ← `COMPANY.linkedin_company_page`, `hs_linkedin_url`
- **Photo URL 1** ← `twitterprofilephoto`
- **Business Category ID** ← `business_category_type`
- **Business Hours (all 14 fields)** ← `business_hours`
- **Country** ← `country`, `COMPANY.country`
- **Date of Company Formation** ← `createdate`, `COMPANY.createdate`
- **Website URL** ← `current_website`, `website`, `COMPANY.website` + 9 more
- **Contact Mobile Number** ← `mobilephone`
- **Telephone** ← `phone`, `COMPANY.phone`
- **X URL** ← `twitterhandle`, `COMPANY.twitterhandle`

### ⚠️ Fields Still Requiring Manual Input or Defaults

Based on BrightLocal's 77-field template, the following fields still need attention:

1. **Business Category ID**
   - Status: ⚠️ CRITICAL - 86% of records missing
   - Solution: Requires default category or manual mapping table
   - Fields available: `business_category_type` (but mostly empty)

2. **Business Hours (28 fields - 14 days × 2 time slots)**
   - Status: ⚠️ 95% empty
   - Solution: Complex parsing required from `business_hours` textarea
   - Fields: Monday-Sunday Start/End Time 1 & 2

3. **Payment Methods (12 fields)**
   - Status: ✅ FOUND - `payment_methods_accepted`
   - Solution: Parse text field and map to individual yes/no fields
   - Fields: Cash, Visa, Mastercard, AmEx, Check, Invoice, Insurance, ATM, Traveler's Check, Financing, PayPal, Discover

4. **Service Descriptions (5 fields)**
   - Status: ⚠️ Partial
   - Solution: Extract from `what_products_or_services_do_you_most_want_to_promote_`
   - Fields: Service 1-5

5. **Social Media URLs**
   - ✅ Facebook URL ← `COMPANY.facebook_company_page`
   - ✅ LinkedIn URL ← `COMPANY.linkedin_company_page`, `hs_linkedin_url`
   - ✅ X URL ← `twitterhandle` (requires transformation)
   - ❌ Instagram URL - Not found
   - ❌ YouTube URL - Not found
   - ❌ TikTok URL - Not found
   - ❌ Pinterest URL - Not found

6. **Photos/Logo URLs**
   - ✅ Photo URL 1 ← `twitterprofilephoto` (NEW!)
   - ❌ Logo URL - Not found
   - ❌ Photo URL 2 - Partial (`upload_your_product_images_here`)
   - ❌ Photo URL 3 - Not found

7. **Status Field**
   - Status: ⚠️ Transformation needed
   - Solution: Map `active_customer` ("Yes" → "active", "No" → "adhoc")

---

## 🚀 Implementation Recommendations

### Phase 1: Core NAP Data (IMMEDIATE)
**Goal**: Enable basic citation building for ~1,400 records (52.4%)

**Action Items**:
1. Implement direct mappings for 11 required fields
2. Add country code normalization (39% blank → default to "USA")
3. Add phone number formatting
4. Set default `Status` = "active" for active customers

**Expected Result**: Can import 1,397 out of 2,664 records immediately

---

### Phase 2: Data Quality (WEEK 1)
**Goal**: Increase import success rate to ~75%

**Action Items**:
1. Implement website URL validation and normalization
2. Create business category mapping table
3. Set default category ID for missing values
4. Add fallback logic for website URLs (use `current_website` if `website` empty)

**Expected Result**: Additional 600+ records ready for import

---

### Phase 3: Enhanced Content (WEEK 2-3)
**Goal**: Enrich citations with descriptions, photos, and social links

**Action Items**:
1. Parse `business_hours` text into 28 time slot fields
2. Extract service descriptions from free-text fields
3. Implement social media URL transformations:
   - Twitter: @handle → https://twitter.com/handle
   - LinkedIn: Direct passthrough
   - Photo: Use Twitter profile photo
4. Combine description fields:
   - `about_us_information` (primary)
   - `accessibility_information` (append)
   - `twitterbio` (fallback)
   - `linkedinbio` (fallback)

**Expected Result**: Richer citation data with photos and descriptions

---

### Phase 4: Payment & Advanced Features (ONGOING)
**Goal**: Complete field coverage for 90%+ of records

**Action Items**:
1. Parse `payment_methods_accepted` into 12 boolean fields
2. Add service extraction from `what_products_or_services_do_you_most_want_to_promote_`
3. Investigate additional photo sources (product images)
4. Create fallback chain for missing fields

**Expected Result**: Near-complete automation of BrightLocal CSV generation

---

## 🔍 Data Quality Metrics

Based on analysis of 2,664 EXISTING customers:

| Metric | Value | Impact |
|--------|-------|--------|
| **Complete NAP Data** | 52.4% (1,397 records) | ✅ Ready for immediate import |
| **Missing Country** | 39% (1,039 records) | ⚠️ Needs default "USA" |
| **Missing Business Category** | 86% (2,290 records) | ⚠️ CRITICAL - Needs default category |
| **Missing Website** | 23% (613 records) | ⚠️ Can use `current_website` fallback |
| **Has Phone Number** | 95% (2,531 records) | ✅ Excellent coverage |
| **Has Email** | 100% (2,664 records) | ✅ Perfect coverage |
| **Has Address** | 78% (2,078 records) | ✅ Good coverage |
| **Has Business Hours** | 5% (133 records) | ❌ Very poor - needs manual entry or defaults |

---

## 📁 Files Generated

1. **hubspot-custom-properties.json** - Complete HubSpot property schema (881 properties)
2. **hubspot-brightlocal-mappings.json** - Original mapping analysis (164 mappings)
3. **hubspot-property-search-results.json** - Comprehensive search by category
4. **new-mappings-discovered.json** - Newly discovered mappings (19 mappings)
5. **hubspot-brightlocal-mappings-FINAL.json** - This complete mapping (183 mappings)
6. **HUBSPOT-BRIGHTLOCAL-FINAL-MAPPINGS.md** - This report

---

## 🎓 Key Insights

### What We Learned

1. **HubSpot has 881 properties**, but only **183 are useful** for BrightLocal citations
2. **21 properties map directly** with no transformation needed
3. **Business Category is the biggest blocker** - 86% of records are missing this required field
4. **Most social media URLs are missing** - Only Facebook and LinkedIn are well-populated
5. **Photos are rare** - Only found Twitter profile photos as reliable source
6. **Business hours need parsing** - Text field needs complex transformation

### Next Steps

1. ✅ **Download BrightLocal's category list** to create mapping table
2. ✅ **Build CSV transformation script** to convert HubSpot → BrightLocal format
3. ✅ **Test import with 10 sample records** to validate mappings
4. ✅ **Create fallback logic** for missing required fields
5. ✅ **Implement batch processing** for 2,664 customer records

---

**Last Updated:** 2025-11-09T08:38:34.664Z
**Source:** HubSpot API via Private App Access Token
**BrightLocal Template:** locations-bulk-import-template-v2.csv (77 fields)
**Total Analysis:** 881 HubSpot properties → 183 useful mappings → 77 BrightLocal fields
