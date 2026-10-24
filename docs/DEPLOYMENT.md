# Deployment guide

## Dashboard deployment

Use one MongoDB service, one Node web service for `apps/api`, and one static site for `apps/web`. No container or infrastructure manifest is required.

### MongoDB Atlas

1. Create a project and select the Atlas **Free** cluster option.
2. Create a database user and copy the driver URI for database `finsight`.
3. Configure network access for the API host.
4. Do not enable paid backup or add a payment method for a free-only launch.

### API service

Build: `npm ci && npm run build`

Start: `npm run start --workspace @finsight/api`

Set:

```text
NODE_ENV=production
WEB_ORIGIN=https://your-static-site.example
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random base64url secret>
FIELD_ENCRYPTION_KEY=<64 lowercase hex characters>
PRIVACY_CONTACT_EMAIL=privacy@example.com
```

The API uses the host-provided `PORT` automatically. Add a health check for `/health` and verify `/ready` after the first deploy.

### Static site

Build: `npm ci && npm run build`

Publish directory: `apps/web/dist`

Build environment:

```text
VITE_API_URL=https://your-api.example
```

Enable the host's single-page-app rewrite so `/dashboard`, `/transactions`, and the other client routes serve `index.html`.

## Free-host limitations

Free web services can sleep and their filesystem is not durable. The application therefore stores no uploads, sessions, exports, or financial records on disk. The API can start slowly after sleep; the UI shows a loading and retry state. Outbound SMTP is not required for the implemented product.

## Production readiness checklist

- [ ] HTTPS is active on both origins.
- [ ] `WEB_ORIGIN` exactly matches the static site origin.
- [ ] Production secrets are generated, stored outside git, and not copied into logs.
- [ ] MongoDB users have only the permissions required by this database.
- [ ] Network access is narrower than the public internet where the host permits it.
- [ ] `/health` and `/ready` are monitored separately.
- [ ] A test account can register, create a workspace, record data, export, and delete it.
- [ ] The operator privacy and grievance contact is published.
- [ ] A restore exercise has been completed before storing irreplaceable records.
