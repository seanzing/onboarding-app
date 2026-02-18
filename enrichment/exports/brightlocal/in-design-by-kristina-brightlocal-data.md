# In Design by Kristina - Complete BrightLocal Data

## Campaign Issue Summary

**Campaign ID:** 915111
**Location ID:** 3914394
**Status:** PAUSED (by BrightLocal support)
**Root Cause:** Business hours submitted as "all closed" - directories reject permanently closed businesses

---

## Data Sources Verified

| Source | URL | Status |
|--------|-----|--------|
| Website | https://www.indesignbykristina.com/ | ✅ Verified |
| Google Business Profile | https://g.co/kgs/hg3xmJX | ✅ Verified |
| Facebook | https://facebook.com/profile.php?id=61552623096822 | ✅ Verified |
| Instagram | https://instagram.com/in_design_by_k/ | ✅ Verified |
| Yelp | https://yelp.com/biz/in-design-by-kristina-peoria-heights | ✅ Listed |

---

## CRITICAL CORRECTIONS NEEDED

### 1. Business Hours (CRITICAL - Campaign Blocker)

**What was submitted:** All days = "Closed"
**What it should be:**

| Day | Open | Close |
|-----|------|-------|
| Monday | 9:00 AM | 12:00 AM (midnight) |
| Tuesday | 9:00 AM | 12:00 AM (midnight) |
| Wednesday | 9:00 AM | 12:00 AM (midnight) |
| Thursday | 9:00 AM | 12:00 AM (midnight) |
| Friday | 9:00 AM | 12:00 AM (midnight) |
| Saturday | 9:00 AM | 12:00 AM (midnight) |
| Sunday | 9:00 AM | 12:00 AM (midnight) |

**CSV Format:**
```
WorkingHoursMonStart1: 09:00
WorkingHoursMonEnd1: 00:00
WorkingHoursTueStart1: 09:00
WorkingHoursTueEnd1: 00:00
WorkingHoursWedStart1: 09:00
WorkingHoursWedEnd1: 00:00
WorkingHoursThuStart1: 09:00
WorkingHoursThuEnd1: 00:00
WorkingHoursFriStart1: 09:00
WorkingHoursFriEnd1: 00:00
WorkingHoursSatStart1: 09:00
WorkingHoursSatEnd1: 00:00
WorkingHoursSunStart1: 09:00
WorkingHoursSunEnd1: 00:00
WorkingHoursApplyToAll: false
```

### 2. Email Address (HIGH PRIORITY)

**What was submitted:** kvelps74@gmail.com
**What it should be:** indesignbykristina@gmail.com

**Source:** Website footer, Facebook page, Contact page

### 3. Business Category (HIGH PRIORITY)

**What was submitted:** 9050 (Other Local Businesses)
**What it should be:** 551 (Photographer)

**Secondary Categories (Extra Business Categories):**
- 896 (Wedding photographer)
- 508 (Graphic designer)

**All Photography-Related Category IDs:**
| Category | ID |
|----------|-----|
| Photographer | 551 |
| Wedding photographer | 896 |
| Commercial photographer | 8495 |
| Aerial photographer | 10117 |
| Graphic designer | 508 |

---

## Complete Location Data for BrightLocal

### Basic Information

| Field | Value |
|-------|-------|
| Business Name | In Design by Kristina |
| Location Reference | in-design-kristina-peoria-heights |
| Country | USA |

### Address

| Field | Value |
|-------|-------|
| Address Line 1 | 902 E Marietta Ave |
| Address Line 2 | |
| City | Peoria Heights |
| State/Region | IL |
| Postal Code | 61616 |

### Contact Information

| Field | Value |
|-------|-------|
| Primary Phone | +1 309-214-1477 |
| Email | indesignbykristina@gmail.com |
| Website | https://www.indesignbykristina.com/ |
| Contact First Name | Kristina |
| Contact Last Name | Velpel |

### Business Category

| Field | Value |
|-------|-------|
| Primary Category ID | 551 (Photographer) |
| Extra Category IDs | 896\|508 (Wedding photographer \| Graphic designer) |

### Business Description

**Short Description (for directories with limits):**
```
In Design by Kristina is a creative studio specializing in photography, videography, and graphic design in Central Illinois. Capturing weddings, engagements, family portraits, and creating stunning visuals.
```

**Full Description (500 chars max):**
```
In Design by Kristina is a creative individual specializing in photography, videography, and graphic design. Founded by Kristina Velpel, the business is built on a passion for capturing moments through photos and graphics and transforming visions into stunning visuals. Serving Central Illinois including Peoria, Springfield, Bloomington, and Champaign. Services include wedding photography, engagement sessions, family portraits, senior photos, and custom graphic design.
```

### Services Offered

1. Wedding Photography
2. Engagement Photography
3. Couple Sessions
4. Family Sessions
5. Individual/Portrait Sessions
6. Senior Photos
7. Graphic Design
8. Logo Design
9. Videography

### Social Media Profiles

| Platform | URL |
|----------|-----|
| Instagram | https://instagram.com/in_design_by_k/ |
| Facebook | https://facebook.com/profile.php?id=61552623096822 |
| Yelp | https://yelp.com/biz/in-design-by-kristina-peoria-heights |
| Google Business | https://g.co/kgs/hg3xmJX |

### Images

**Logo URL:**
```
https://lirp.cdn-website.com/abdee254/dms3rep/multi/opt/In-Design-Logo-ce247a27-1920w.png
```

**Note:** BrightLocal requires .jpg/.jpeg extensions. The PNG logo will need to be converted or a JPEG version obtained.

### Additional Info

| Field | Value |
|-------|-------|
| Years in Business | 6+ |
| Events Covered | 15+ |
| Rating (Google) | 5.0 (6 reviews) |
| Service Area | Central Illinois (Peoria, Springfield, Bloomington, Champaign) |
| Is Service Area Business | Yes (photographer travels to clients) |

---

## BrightLocal CSV Row (Location Upload)

```csv
Business Name,Unique Reference,Country,Address 1,Address 2,City,Postcode,Region,Telephone,Email,Website URL,Business Category ID,Short Description,Full Description,WorkingHoursMonStart1,WorkingHoursMonEnd1,WorkingHoursTueStart1,WorkingHoursTueEnd1,WorkingHoursWedStart1,WorkingHoursWedEnd1,WorkingHoursThuStart1,WorkingHoursThuEnd1,WorkingHoursFriStart1,WorkingHoursFriEnd1,WorkingHoursSatStart1,WorkingHoursSatEnd1,WorkingHoursSunStart1,WorkingHoursSunEnd1,Instagram URL,Facebook URL
"In Design by Kristina","in-design-kristina-peoria-heights","USA","902 E Marietta Ave","","Peoria Heights","61616","IL","+13092141477","indesignbykristina@gmail.com","https://www.indesignbykristina.com/","551","In Design by Kristina is a creative studio specializing in photography, videography, and graphic design in Central Illinois.","In Design by Kristina is a creative individual specializing in photography, videography, and graphic design. Founded by Kristina Velpel, the business is built on a passion for capturing moments through photos and graphics and transforming visions into stunning visuals. Serving Central Illinois including Peoria, Springfield, Bloomington, and Champaign.","09:00","00:00","09:00","00:00","09:00","00:00","09:00","00:00","09:00","00:00","09:00","00:00","09:00","00:00","https://instagram.com/in_design_by_k/","https://facebook.com/profile.php?id=61552623096822","896|508"
```

---

## API Update Request (for Location ID 3915264)

```json
{
  "business_name": "In Design by Kristina",
  "telephone": "+13092141477",
  "email": "indesignbykristina@gmail.com",
  "business_category_id": 551,
  "extra_business_category_ids": [896, 508],
  "description": "In Design by Kristina is a creative individual specializing in photography, videography, and graphic design. Founded by Kristina Velpel, the business is built on a passion for capturing moments through photos and graphics and transforming visions into stunning visuals. Serving Central Illinois including Peoria, Springfield, Bloomington, and Champaign.",
  "opening_hours": {
    "regular": {
      "monday": { "status": "open", "hours": [{ "start": "09:00", "end": "00:00" }] },
      "tuesday": { "status": "open", "hours": [{ "start": "09:00", "end": "00:00" }] },
      "wednesday": { "status": "open", "hours": [{ "start": "09:00", "end": "00:00" }] },
      "thursday": { "status": "open", "hours": [{ "start": "09:00", "end": "00:00" }] },
      "friday": { "status": "open", "hours": [{ "start": "09:00", "end": "00:00" }] },
      "saturday": { "status": "open", "hours": [{ "start": "09:00", "end": "00:00" }] },
      "sunday": { "status": "open", "hours": [{ "start": "09:00", "end": "00:00" }] }
    }
  },
  "social_profiles": {
    "instagram": "https://instagram.com/in_design_by_k/",
    "facebook": "https://facebook.com/profile.php?id=61552623096822"
  }
}
```

---

## 🔧 API vs Playwright Analysis

### Question: Can the location be updated programmatically via API?

### ✅ YES - Location Data CAN Be Updated via API

**Management API v1 Endpoint:**
```
PUT https://api.brightlocal.com/manage/v1/locations/3914394
```

**Authentication:**
```
Headers: {
  "x-api-key": "YOUR_BRIGHTLOCAL_API_KEY",
  "Content-Type": "application/json"
}
```

**What CAN be updated via API:**
| Field | API Support | Notes |
|-------|-------------|-------|
| Email | ✅ YES | `email` parameter |
| Business Hours | ✅ YES | `opening_hours` object |
| Business Category ID | ✅ YES | `business_category_id` |
| Extra Categories | ✅ YES | `extra_business_category_ids` array |
| Description | ✅ YES | `description` parameter |
| Phone | ✅ YES | `telephone` parameter |
| Address | ✅ YES | `address_1`, `city`, etc. |
| Social Media URLs | ✅ YES | Various URL parameters |

### ❌ What REQUIRES Playwright (Web UI Only)

| Action | API Support | Notes |
|--------|-------------|-------|
| Directory Selection | ❌ NO | Must select which directories to submit to via web UI |
| Package Selection | ❌ NO | Choose citation package via web UI |
| Photo Uploads | ❌ NO | Upload .jpg photos via web UI |
| Campaign Deletion | ❌ NO | No API endpoint available |

### 📋 Recommendation

**For THIS specific issue (fixing the paused campaign):**

1. **USE API** to update the location with:
   - Correct business hours (9 AM - 12 AM)
   - Correct email (indesignbykristina@gmail.com)
   - Correct category (551 Photographer)
   - Extra categories (896, 508)

2. **CONTACT BRIGHTLOCAL SUPPORT** to:
   - Un-pause the campaign after location is updated
   - OR delete the old campaign so a new one can be created

3. **USE PLAYWRIGHT ONLY IF:**
   - You need to select different directories
   - You need to upload photos
   - You need to select a different package

### 🚀 API Update Script

```typescript
// update-in-design-kristina-location.ts
const BRIGHTLOCAL_API_KEY = process.env.BRIGHTLOCAL_API_KEY;
const LOCATION_ID = 3914394;

const updatePayload = {
  business_name: "In Design by Kristina",
  telephone: "+13092141477",
  email: "indesignbykristina@gmail.com",
  business_category_id: 551,
  extra_business_category_ids: [896, 508],
  description: "In Design by Kristina is a creative individual specializing in photography, videography, and graphic design. Founded by Kristina Velpel, the business is built on a passion for capturing moments through photos and graphics and transforming visions into stunning visuals. Serving Central Illinois including Peoria, Springfield, Bloomington, and Champaign.",
  opening_hours: {
    regular: {
      monday: { status: "open", hours: [{ start: "09:00", end: "00:00" }] },
      tuesday: { status: "open", hours: [{ start: "09:00", end: "00:00" }] },
      wednesday: { status: "open", hours: [{ start: "09:00", end: "00:00" }] },
      thursday: { status: "open", hours: [{ start: "09:00", end: "00:00" }] },
      friday: { status: "open", hours: [{ start: "09:00", end: "00:00" }] },
      saturday: { status: "open", hours: [{ start: "09:00", end: "00:00" }] },
      sunday: { status: "open", hours: [{ start: "09:00", end: "00:00" }] }
    }
  },
  social_profile_links: {
    instagram: "https://instagram.com/in_design_by_k/",
    facebook: "https://facebook.com/profile.php?id=61552623096822"
  }
};

const response = await fetch(
  `https://api.brightlocal.com/manage/v1/locations/${LOCATION_ID}`,
  {
    method: 'PUT',
    headers: {
      'x-api-key': BRIGHTLOCAL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatePayload),
  }
);

const result = await response.json();
console.log('Update result:', result);
```

---

## Next Steps

1. ✅ **CSV Created** - `data/in-design-by-kristina.csv` ready for bulk upload
2. ⏳ **Update Location via API** - Run the script above to fix hours, email, category
3. ⏳ **Contact BrightLocal Support** - Request campaign #915111 be un-paused or deleted
4. ⏳ **Verify Business Hours** - Confirm with Kristina that 9 AM - midnight is accurate
5. ⏳ **Get JPEG Logo** - Convert PNG to JPEG or request JPEG version for directory submissions
6. ⏳ **Add Photos via Web UI** - Upload 3 portfolio photos (must be .jpg format)

---

## Files Created

| File | Purpose |
|------|---------|
| `data/in-design-by-kristina.csv` | BrightLocal bulk upload CSV |
| `data/in-design-by-kristina-brightlocal-data.md` | Complete data documentation |

---

## Data Collection Completed

**Date:** November 27, 2025
**Sources Verified:** Website, GBP, Facebook, Instagram
**Research Status:** Complete
**API Analysis:** Complete
**CSV Created:** Yes
**Ready for Update:** Yes - via API (pending business hours confirmation)
