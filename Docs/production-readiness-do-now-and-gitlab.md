# Production Readiness: Do Now + GitLab Setup

This is the recommended minimum setup before putting `kk_v1` on a VPS with separate LOCAL, DEV, and PROD environments.

## Environments

Use three separate environments:

| Environment | Branch               | Purpose                                    | Database       |
| ----------- | -------------------- | ------------------------------------------ | -------------- |
| LOCAL       | local working branch | Laptop development and debugging           | Local database |
| DEV         | `develop`            | Internal testing before production release | DEV database   |
| PROD        | `main`               | Live customer/admin system                 | PROD database  |

Each environment should have its own:

- deployment path
- domain or subdomain
- environment variables
- database
- logs
- process services
- backup configuration
- GitLab deployment job

Recommended naming:

- LOCAL domain: `localhost`
- DEV domain: `dev.yourdomain.com`
- PROD domain: `yourdomain.com`
- LOCAL database: `kk_v1_local`
- DEV database: `kk_v1_dev`
- PROD database: `kk_v1_prod`
- LOCAL app path: project folder on laptop
- DEV app path: `/var/www/kk_v1_dev`
- PROD app path: `/var/www/kk_v1_prod`

Important rule:

- LOCAL, DEV, and PROD must never share the same MySQL database.
- DEV deployments must only run from `develop`.
- PROD deployments must only run from `main`.
- LOCAL secrets must stay on the developer machine.
- PROD secrets must not be available to DEV jobs unless explicitly required.

## Environment Files

Use separate `.env` files for LOCAL, DEV, and PROD.

Recommended files:

| File                   | Used by                      | Commit to Git? |
| ---------------------- | ---------------------------- | -------------- |
| `.env.local`           | LOCAL frontend values        | No             |
| `backend/.env.local`   | LOCAL backend values         | No             |
| `.env.dev`             | DEV frontend values on VPS   | No             |
| `backend/.env.dev`     | DEV backend values on VPS    | No             |
| `.env.prod`            | PROD frontend values on VPS  | No             |
| `backend/.env.prod`    | PROD backend values on VPS   | No             |
| `.env.example`         | safe frontend example values | Yes            |
| `backend/.env.example` | safe backend example values  | Yes            |

Rules:

- Never commit real `.env` files.
- Commit only example files with fake or placeholder values.
- Keep LOCAL, DEV, and PROD database URLs different.
- Use different `SECRET_KEY` values for LOCAL, DEV, and PROD.
- Use different third-party API keys per environment when possible.
- Do not copy PROD `.env` files into LOCAL or DEV.

Minimum backend variables per environment:

- `DATABASE_URL`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- optional provider keys such as `GEMINI_API_KEY`

Recommended values:

| Variable          | LOCAL                   | DEV                        | PROD                   |
| ----------------- | ----------------------- | -------------------------- | ---------------------- |
| `DATABASE_URL`    | points to `kk_v1_local` | points to `kk_v1_dev`      | points to `kk_v1_prod` |
| `COOKIE_SECURE`   | `false`                 | `true` if HTTPS is enabled | `true`                 |
| `COOKIE_SAMESITE` | `Lax`                   | `Lax`                      | `Lax`                  |

GitLab should not commit `.env.dev` or `.env.prod`. Instead, GitLab should store the values as CI/CD variables and write the correct env file during deployment.

Deployment behavior:

- `develop` deployment writes DEV env files on the VPS.
- `main` deployment writes PROD env files on the VPS.
- local development uses `.env.local` and `backend/.env.local` on the developer machine.

The current `.gitignore` already ignores `.env*`, which is the right default. If example files are added, explicitly allow them in `.gitignore` with:

```gitignore
!.env.example
!backend/.env.example
```

## Do Now

### 1. Uptime Monitoring

Set up external uptime monitors for both DEV and PROD.

Recommended tools:

- UptimeRobot
- Better Stack

Monitor these URLs:

- `https://dev.yourdomain.com`
- `https://dev.yourdomain.com/api/backend/health`
- `https://yourdomain.com`
- `https://yourdomain.com/api/backend/health`

Goal:

- Know quickly if the customer site or backend API goes down.
- Get email/phone/Slack alerts without depending on the VPS itself.

### 2. Process Auto-Restart

Run production services with automatic restart on crash and reboot.

Services to manage:

- DEV Next.js frontend
- DEV FastAPI backend
- PROD Next.js frontend
- PROD FastAPI backend
- MySQL
- Nginx

Recommended setup:

- Use separate `systemd` services for DEV and PROD FastAPI.
- Use separate `systemd` or `pm2` services for DEV and PROD Next.js.
- Enable services to start automatically after server reboot.

Goal:

- The app should recover automatically after a process crash or VPS restart.

### 3. Basic Backups

Create daily backups for PROD, and optional lower-retention backups for DEV.

Back up:

- PROD MySQL database dump
- DEV MySQL database dump if useful for testing recovery
- DEV and PROD `.env` files
- Nginx config
- DEV and PROD systemd service files

Minimum setup:

- Daily PROD `mysqldump`
- Daily or weekly DEV `mysqldump`
- Store backups outside the app directory
- Keep at least 7-14 days of PROD backups
- Keep shorter DEV retention if storage is limited
- Periodically copy backups off the VPS

Goal:

- Recover from accidental data loss, failed deployments, or VPS issues.

### 4. Log Rotation

Configure log rotation so logs do not fill the VPS disk.

Logs to rotate:

- DEV and PROD Nginx access logs
- DEV and PROD Nginx error logs
- DEV and PROD FastAPI service logs
- DEV and PROD Next.js service logs
- MySQL logs

Recommended setup:

- Use `logrotate`
- Keep a limited number of compressed old logs

Goal:

- Prevent disk-full incidents caused by growing logs.

## GitLab Setup

Use GitLab to make deployments repeatable and safer.

GitLab should have two deployment paths:

- pushes or merges to `develop` deploy to DEV
- pushes or merges to `main` deploy to PROD

Recommended rule:

- DEV can auto-deploy from `develop`.
- PROD should deploy from `main`, preferably with a manual approval step.

### 1. GitLab CI/CD Variables

Store deployment secrets in GitLab CI/CD variables instead of hardcoding them.

Suggested variables:

- `DEV_VPS_HOST`
- `DEV_VPS_USER`
- `DEV_VPS_SSH_PRIVATE_KEY`
- `DEV_DEPLOY_PATH`
- `DEV_FRONTEND_ENV`
- `DEV_BACKEND_ENV`
- `PROD_VPS_HOST`
- `PROD_VPS_USER`
- `PROD_VPS_SSH_PRIVATE_KEY`
- `PROD_DEPLOY_PATH`
- `PROD_FRONTEND_ENV`
- `PROD_BACKEND_ENV`
- other environment-specific values as needed

Goal:

- Keep deployment credentials out of the repository.
- Keep DEV and PROD secrets separate.

### 2. Build and Check Pipeline

Before deploying, GitLab should verify that the app builds.

Recommended checks:

- Install frontend dependencies
- Run `npm run build`
- Run lint/tests if available
- Optionally run backend import or smoke checks

Goal:

- Stop broken commits before they reach the VPS.

Recommended branch behavior:

- Run checks on merge requests.
- Run checks on `develop`.
- Run checks on `main`.

### 3. SSH Deployment Pipeline

Use GitLab CI/CD to deploy each environment to the VPS over SSH.

DEV deployment:

- source branch: `develop`
- target environment: DEV
- target database: `kk_v1_dev`
- target app path: `/var/www/kk_v1_dev`

PROD deployment:

- source branch: `main`
- target environment: PROD
- target database: `kk_v1_prod`
- target app path: `/var/www/kk_v1_prod`

Deployment flow:

1. SSH into the VPS.
2. Go to the correct environment app directory.
3. Pull the correct branch.
4. Write the correct environment files from GitLab CI/CD variables.
5. Install/update dependencies.
6. Build the Next.js app.
7. Run database migrations if needed against the correct database.
8. Restart the matching FastAPI and Next.js services.
9. Reload Nginx if config changed.

Goal:

- Deploy with one GitLab pipeline instead of manual terminal steps.
- Avoid accidentally deploying `develop` to PROD or `main` to DEV.
- Avoid accidentally pointing DEV at the PROD database.

### 4. Post-Deploy Health Check

After deployment, GitLab should verify that the app is responding.

DEV check:

- `https://dev.yourdomain.com`
- `https://dev.yourdomain.com/api/backend/health`

PROD check:

- `https://yourdomain.com`
- `https://yourdomain.com/api/backend/health`

Goal:

- Catch failed deployments immediately.

### 5. Rollback Path

Keep deployments tied to Git commits so a previous commit can be redeployed if needed.

Minimum rollback approach:

- Re-run the GitLab deployment pipeline for a previous known-good commit.
- Restart services after rollback.
- Confirm the health check passes.

Goal:

- Recover quickly if a production deployment breaks customer ordering or admin operations.

Environment rule:

- DEV rollback should only affect DEV.
- PROD rollback should only affect PROD.

## Recommended First Milestone

Before launch, complete these in order:

1. Create separate DEV and PROD databases.
2. Create or verify separate LOCAL database.
3. Create local `.env.local` and `backend/.env.local`.
4. Create safe `.env.example` and `backend/.env.example`.
5. Store DEV env values in GitLab CI/CD variables.
6. Store PROD env values in GitLab CI/CD variables.
7. Create separate DEV and PROD deployment directories.
8. Create separate `systemd` services for DEV and PROD FastAPI.
9. Create separate `systemd` or `pm2` services for DEV and PROD Next.js.
10. Configure Nginx reverse proxy and SSL for DEV and PROD domains.
11. Add daily PROD MySQL backups.
12. Add optional DEV MySQL backups.
13. Add log rotation for DEV and PROD logs.
14. Add uptime monitoring for DEV and PROD.
15. Add GitLab build checks.
16. Add GitLab SSH deployment from `develop` to DEV.
17. Add GitLab SSH deployment from `main` to PROD.
18. Add post-deploy health checks for DEV and PROD.
