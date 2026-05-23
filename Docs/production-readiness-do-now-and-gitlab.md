# Production Readiness: Do Now + GitLab Setup

This is the recommended minimum setup before putting `kk_v1` on a production VPS.

## Do Now

### 1. Uptime Monitoring

Set up an external uptime monitor for the public site and backend health endpoint.

Recommended tools:

- UptimeRobot
- Better Stack

Monitor these URLs:

- `https://yourdomain.com`
- `https://yourdomain.com/api/backend/health`

Goal:

- Know quickly if the customer site or backend API goes down.
- Get email/phone/Slack alerts without depending on the VPS itself.

### 2. Process Auto-Restart

Run production services with automatic restart on crash and reboot.

Services to manage:

- Next.js frontend
- FastAPI backend
- Nginx
- MySQL

Recommended setup:

- Use `systemd` for FastAPI.
- Use `systemd` or `pm2` for Next.js.
- Enable services to start automatically after server reboot.

Goal:

- The app should recover automatically after a process crash or VPS restart.

### 3. Basic Backups

Create daily backups for the MySQL database and important deployment config.

Back up:

- MySQL database dump
- `.env` files
- Nginx config
- systemd service files

Minimum setup:

- Daily `mysqldump`
- Store backups outside the app directory
- Keep at least 7-14 days of backups
- Periodically copy backups off the VPS

Goal:

- Recover from accidental data loss, failed deployments, or VPS issues.

### 4. Log Rotation

Configure log rotation so logs do not fill the VPS disk.

Logs to rotate:

- Nginx access logs
- Nginx error logs
- FastAPI service logs
- Next.js service logs
- MySQL logs

Recommended setup:

- Use `logrotate`
- Keep a limited number of compressed old logs

Goal:

- Prevent disk-full incidents caused by growing logs.

## GitLab Setup

Use GitLab to make deployments repeatable and safer.

### 1. GitLab CI/CD Variables

Store deployment secrets in GitLab CI/CD variables instead of hardcoding them.

Suggested variables:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_PRIVATE_KEY`
- `DEPLOY_PATH`
- production environment values as needed

Goal:

- Keep deployment credentials out of the repository.

### 2. Build and Check Pipeline

Before deploying, GitLab should verify that the app builds.

Recommended checks:

- Install frontend dependencies
- Run `npm run build`
- Run lint/tests if available
- Optionally run backend import or smoke checks

Goal:

- Stop broken commits before they reach the VPS.

### 3. SSH Deployment Pipeline

Use GitLab CI/CD to deploy to the VPS over SSH.

Deployment flow:

1. SSH into the VPS.
2. Go to the app directory.
3. Pull the latest production branch.
4. Install/update dependencies.
5. Build the Next.js app.
6. Run database migrations if needed.
7. Restart FastAPI and Next.js services.
8. Reload Nginx if config changed.

Goal:

- Deploy with one GitLab pipeline instead of manual terminal steps.

### 4. Post-Deploy Health Check

After deployment, GitLab should verify that the app is responding.

Check:

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

## Recommended First Milestone

Before launch, complete these in order:

1. Create `systemd` services for FastAPI and Next.js.
2. Configure Nginx reverse proxy and SSL.
3. Add daily MySQL backups.
4. Add log rotation.
5. Add uptime monitoring.
6. Add GitLab build checks.
7. Add GitLab SSH deployment.
8. Add post-deploy health checks.
