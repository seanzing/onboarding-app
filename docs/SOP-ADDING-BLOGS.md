# SOP: Adding Blogs to Customer Websites

## Overview

This procedure covers adding SEO blog posts to a customer's Duda website. There are two phases: preparing the Duda site for blogs (manual), then generating blog content through the onboarding app (automated).

---

## Phase 1: Prepare the Duda Website

### Step 1: Add the Blog Feature

1. Log in to the **Duda** website editor for the customer's site.
2. In the editor, navigate to the **Site Features** or **Apps** section.
3. Find and enable the **Blog** feature to add it to the site.
4. Confirm the blog page has been created and is accessible in the site's navigation.

### Step 2: Remove Template Blogs

1. Once the Blog feature is enabled, Duda will populate it with default template blog posts.
2. Navigate to the **Blog Manager** (or the blog section in the editor).
3. **Delete all template/default blog posts** — these are placeholder content and should not remain on the customer's site.

### Step 3: Remove the Social Icons Row

1. Navigate to the **Blog page** in the Duda editor.
2. Locate the **social icons row** (typically appears near the top or bottom of the blog page layout).
3. Select the social icons row and **delete it** from the page.
4. Save and publish the changes.

---

## Phase 2: Generate Blogs in the Onboarding App

### Prerequisites

- The customer's **Duda site code** must be set in the onboarding app. If it's not already configured, set it in the **Overview tab** on the customer's company page.

### Step 1: Navigate to the Customer

1. Open the onboarding app at [https://onboarding-app-sigma.vercel.app/](https://onboarding-app-sigma.vercel.app/).
2. Find and select the customer's company from the companies list.

### Step 2: Open the Blogs Tab

1. On the customer's company page, click the **Blogs** tab.
2. Verify that the Duda site code is detected (if you see a "Duda Site Code Required" warning, go back to the Overview tab and add it first).

### Step 3: Fill in Blog Details

1. **Business Name** (required) — Enter the customer's business name (e.g., "Acme Plumbing").
2. **Industry** (required) — Enter the customer's industry (e.g., "Plumbing", "Accounting").
3. **Location** (required) — Enter the customer's service area (e.g., "Denver, CO").
4. **Number of Blogs** — Set the desired number of blog posts to generate (default: 12, max: 50).

### Step 4: Generate Blogs

1. Click the **Generate Blogs** button.
2. The app will display a progress card showing:
   - Elapsed time
   - Current status messages
3. **Do not close the tab** — blog generation may take several minutes depending on the number of posts.
4. When complete, a success toast will confirm how many blogs were generated and sent to Duda.

### Step 5: Verify

1. Return to the Duda editor and confirm the blog posts have appeared on the customer's site.
2. Spot-check a few posts for correct content, formatting, and relevance to the business.
3. The Blogs tab in the onboarding app will show the status as **Active** with a count of published and total generated blogs.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Duda Site Code Required" warning | Add the Duda site code in the Overview tab first. |
| Blog generation times out | Retry from the Blogs tab. The app allows up to 5 minutes per generation. |
| Status shows "Error" | Check the error message displayed, then click **Retry**. |
| Blogs not appearing in Duda | Verify the Duda site code is correct. Check the Duda editor's blog manager. |
| Status stuck on "Pending" | A previous generation may still be in progress. Wait a few minutes and refresh. |