# Pipedream Workflows - CLI Deployment Guide

This directory contains Pipedream workflows that can be deployed programmatically using the Pipedream CLI.

## 📋 Prerequisites

### 1. Install Pipedream CLI

```bash
npm install -g @pipedream/cli
```

### 2. Authenticate

```bash
pd login
```

This will open a browser window to authenticate with your Pipedream account.

### 3. Verify Authentication

```bash
pd whoami
```

Should show your Pipedream account details.

## 🚀 Deploy Workflows

### Deploy Single Workflow

```bash
cd pipedream-workflows
pd deploy gbp-get-location.mjs
```

After deployment, the CLI will output:
- Workflow ID (e.g., `p_abc123`)
- Workflow endpoint URL (e.g., `https://eo123abc.m.pipedream.net`)

### Deploy All Workflows

```bash
for file in *.mjs; do pd deploy "$file"; done
```

## 📝 Add Workflow IDs to Environment

After deploying, add the workflow IDs to your `.env.local`:

```env
# Pipedream Workflow IDs (from pd deploy output)
PIPEDREAM_GBP_GET_LOCATION_WORKFLOW_ID=p_abc123
PIPEDREAM_GBP_UPDATE_LOCATION_WORKFLOW_ID=p_def456
PIPEDREAM_GBP_GET_REVIEWS_WORKFLOW_ID=p_ghi789
```

## 🧪 Test Workflows

### Test via cURL

```bash
# Get workflow endpoint from deployment output
curl -X POST https://eo123abc.m.pipedream.net \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "apn_5dhkDe5",
    "external_user_id": "7bc26592-896d-4d9e-a9e3-f30babf57c61"
  }'
```

### Test from Application

Once deployed, your API routes can call the workflow endpoints:

```typescript
// In your API route
const workflowId = process.env.PIPEDREAM_GBP_GET_LOCATION_WORKFLOW_ID;
const response = await fetch(`https://api.pipedream.com/v1/workflows/${workflowId}/trigger`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PIPEDREAM_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    account_id: accountId,
    external_user_id: clientId,
  }),
});
```

## 📊 Available Workflows

### `gbp-get-location.mjs`

Fetches Google Business Profile location data.

**Input**:
```json
{
  "account_id": "apn_xxx",
  "external_user_id": "client-uuid"
}
```

**Output**:
```json
{
  "success": true,
  "account_id": "apn_xxx",
  "gbp_account_id": "accounts/103378246033774877708",
  "locations": [...],
  "count": 1
}
```

### TODO: Add More Workflows

- `gbp-update-location.mjs` - Update business profile information
- `gbp-get-reviews.mjs` - Fetch customer reviews
- `gbp-reply-to-review.mjs` - Post management response to review
- `gbp-create-post.mjs` - Create Google posts
- `gbp-upload-photo.mjs` - Upload photos to profile
- `gbp-get-insights.mjs` - Fetch analytics and metrics

## 🔄 Update Workflows

To update an existing workflow after making changes:

```bash
pd deploy gbp-get-location.mjs
```

The CLI will detect it's an existing workflow and update it.

## 🗑️ Delete Workflows

```bash
pd delete p_abc123
```

## 📚 Pipedream CLI Reference

```bash
# List all workflows
pd list workflows

# View workflow details
pd inspect p_abc123

# View workflow logs
pd logs p_abc123

# Export workflow configuration
pd export p_abc123
```

## 🔐 Security Notes

- Workflows are deployed to your Pipedream account
- Each workflow has a unique HTTP endpoint
- Consider adding API key authentication for production
- Use environment variables for sensitive data

## 🐛 Troubleshooting

### "pd: command not found"

Install the CLI globally:
```bash
npm install -g @pipedream/cli
```

### "Authentication failed"

Re-authenticate:
```bash
pd logout
pd login
```

### "Deployment failed"

Check syntax:
```bash
node --check gbp-get-location.mjs
```

### View deployment logs

```bash
pd logs p_abc123 --follow
```

## 📖 Resources

- [Pipedream CLI Docs](https://pipedream.com/docs/cli/)
- [Workflow Development Guide](https://pipedream.com/docs/workflows/)
- [Component API Reference](https://pipedream.com/docs/components/api/)
