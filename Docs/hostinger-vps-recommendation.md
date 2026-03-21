# Hostinger VPS Recommendation for Kuteera Kitchen (`kk_v1`)

## Executive Summary

`kk_v1` should be deployed on a Hostinger VPS, not regular web hosting.

This is because the application is a custom multi-process stack:

- Next.js frontend
- FastAPI backend
- MySQL database
- Reverse proxy and SSL layer
- Future AI API integrations

The recommended purchase is `Hostinger VPS KVM 2`.

Why `KVM 2` is the best fit:

- It is the lowest-cost plan that gives enough headroom for a production deployment of this stack.
- It supports the current architecture without forcing an immediate redesign.
- It gives room for modest traffic growth and normal AI API usage.
- It can be upgraded to `KVM 4` later with low operational friction if traffic grows.

In short:

- `KVM 1` is too tight for reliable production use.
- `KVM 2` is the best balance of cost, performance, and upgrade flexibility.
- `KVM 4` is stronger, but not necessary on day one unless higher traffic is already expected.

## Why VPS Is the Right Hosting Model

### Why regular hosting is not a good fit

This project is not a static site and not a single Node.js app.

It includes:

- a Next.js application that must be built and run as a long-lived process
- a FastAPI application that must run continuously as a separate Python process
- a MySQL database dependency
- custom environment variables, auth, and process control
- the need for root-level server configuration, package installation, service management, SSL, and reverse proxying

Hostinger's own support documentation states that Python projects are supported on VPS only, because Python deployment requires root access and custom dependency management. That matters here because FastAPI is a core part of the platform.

### Why VPS is the only practical single-plan option for this project

A VPS gives us:

- full root access
- control over Node.js and Python versions
- ability to run both frontend and backend as services
- ability to install and manage MySQL
- control over Nginx, SSL, firewall, and process manager setup
- freedom to tune and scale the app later

Without a VPS, we would need to split the system across multiple products or providers. That adds cost, deployment complexity, and operational risk.

### Repo facts that support this recommendation

The current codebase is already structured like a VPS-style deployment:

- The frontend runs with `next build` and `next start`.
- The backend runs with `uvicorn backend.main:app`.
- The frontend rewrites `/api/backend/*` to a backend server on port `8000`.
- The backend expects MySQL on `localhost`.

This means the current application is already designed around a self-managed server model.

## Current Application Shape

The current production shape is:

1. `Nginx` accepts public traffic over HTTPS.
2. `Next.js` runs on an internal port such as `3000`.
3. `FastAPI` runs on an internal port such as `8000`.
4. `MySQL` runs locally on the VPS.
5. AI features call external APIs and do not require local GPU infrastructure.

This is a very normal VPS deployment pattern.

## Hostinger Plan Comparison

Pricing and specs below reflect Hostinger's public VPS pricing and support documentation reviewed on `March 21, 2026`. Promotional pricing can change, so the final purchase decision should consider both introductory and renewal pricing.

| Plan | Specs | Fit for `kk_v1` | Pros | Risks / Drawbacks |
| --- | --- | --- | --- | --- |
| `KVM 1` | 1 vCPU, 4 GB RAM, 50 GB NVMe, 4 TB bandwidth | Not recommended for production | Cheapest option | Too little headroom for Next.js + FastAPI + MySQL together. Higher risk of slowdowns during peak order times, deploys, builds, report generation, and memory pressure. |
| `KVM 2` | 2 vCPU, 8 GB RAM, 100 GB NVMe, 8 TB bandwidth | Recommended starting plan | Best balance of cost and performance. Enough for low-to-moderate live traffic, admin operations, MySQL, and modest AI API usage. Easy path to upgrade later. | Needs disciplined deployment and some codebase efficiency improvements to stay smooth under growth. |
| `KVM 4` | 4 vCPU, 16 GB RAM, 200 GB NVMe, 16 TB bandwidth | Stronger option, but not required initially | More buffer for traffic spikes, reports, background work, and future growth. Lower risk of resource contention. | Higher cost from day one. May be overbuying if actual traffic is still modest. |

## Why `KVM 2` Is the Best Choice

### 1. It is the minimum plan that fits the real architecture

This project is not just a website. It is:

- a frontend runtime
- a backend runtime
- a database-backed business application
- an admin platform
- a customer ordering platform

`KVM 2` is the first plan in the Hostinger range that gives enough room for all of that to run together with acceptable reliability.

### 2. It is cost-efficient without being reckless

`KVM 1` is cheaper, but the savings come with a meaningful operational downside:

- less memory headroom
- higher chance of CPU contention
- slower deploys and rebuilds
- greater risk of the app feeling slow at meal-order peaks

`KVM 2` avoids those early-stage problems without jumping straight to `KVM 4`.

### 3. It supports expected near-term usage

For this project, `KVM 2` is a realistic fit if:

- traffic is low to moderate
- AI features are normal external API calls
- there are not heavy local ML jobs
- reporting/export workloads stay reasonable
- production is deployed properly

That makes it a sensible business purchase for launch and early growth.

### 4. It has a low-friction upgrade path

Hostinger's support documentation says VPS plans can be upgraded from the dashboard, upgrades can complete in about 10 minutes, and files/configuration remain unchanged. That lowers the risk of starting on `KVM 2`.

This is important for stakeholders because it means:

- we do not need to overbuy immediately
- we can validate traffic and resource usage first
- we retain a clear path to scale up later

### 5. It aligns with the product stage

At this stage, the best infrastructure choice is usually not "the biggest server we can afford." It is the smallest server that can reliably support production use while preserving a clean upgrade path.

That is exactly where `KVM 2` fits.

## Why `KVM 1` Is Not the Right Purchase

`KVM 1` is the wrong optimization.

It may run the app, but it is much more likely to create avoidable problems:

- memory pressure when Next.js, FastAPI, and MySQL are active together
- slower page loads during concurrent usage
- reduced tolerance for admin reporting or exports
- more sensitivity to deployment/build spikes
- less room for background tasks, logs, or caching
- more chance of the team needing to upgrade quickly after launch

This would save money upfront while increasing operational risk and reducing confidence.

For a business system that handles ordering, menu management, production planning, packing, and admin workflows, that is not a good trade.

## Why `KVM 4` Is Not the Best Initial Purchase

`KVM 4` is a strong plan, but it is not the best initial purchase if traffic is still expected to be modest.

It becomes the better option when one or more of these are true:

- daily traffic is already known to be significant
- many concurrent users are expected at peak times
- large admin reports or exports are common
- more automation/background processing is planned soon
- staging or additional services will share the same server

If those conditions are not yet true, `KVM 4` is more of a comfort purchase than a necessary one.

## Benefits of Choosing `KVM 2`

- Lower initial infrastructure cost than `KVM 4`
- Enough headroom for a proper production deployment
- Better stability than `KVM 1`
- Room for moderate growth
- Supports AI API integrations without needing a GPU
- Straightforward upgrade path later
- Keeps the current application architecture intact

## Risks and Mitigations with `KVM 2`

### Risk: performance may degrade if the app is deployed inefficiently

Mitigation:

- run Next.js in production mode only
- use Nginx in front of the app
- run FastAPI as a service
- avoid dev-mode tooling on the server
- tune DB usage and keep request patterns efficient

### Risk: admin-heavy queries and reports can stress a smaller VPS

Mitigation:

- paginate admin endpoints
- optimize expensive SQL
- reduce unnecessary duplicate frontend fetches
- add indexes where needed

### Risk: traffic growth may eventually exceed `KVM 2`

Mitigation:

- monitor CPU, RAM, and MySQL load
- upgrade to `KVM 4` when sustained usage justifies it
- take snapshots before major changes

## Estimated Suitability for `KVM 2`

This is a practical estimate, not a Hostinger guarantee.

With a proper production deployment, `KVM 2` should be comfortable for:

- low-to-moderate real-world traffic
- modest concurrent user activity
- normal admin usage
- standard customer ordering flows
- normal external AI API calls

It is not the right plan if we expect heavy concurrent traffic from day one or if we plan to run compute-heavy jobs on the same machine.

## Recommended Purchase Decision

### Recommendation

Purchase `Hostinger VPS KVM 2`.

### Rationale

- It is the best cost-to-capability match for the current application.
- It avoids the avoidable risk of `KVM 1`.
- It avoids overcommitting budget to `KVM 4` before usage data exists.
- It gives the team a credible production starting point with a simple upgrade path.

## Purchase and Deployment Path

### What to buy

- `Hostinger VPS KVM 2`
- `Ubuntu 24.04 LTS` as the operating system template

### What not to choose during setup

- not a control panel template
- not a prebuilt application template
- not Docker unless the deployment strategy is intentionally being changed

### Planned server components

- `Nginx`
- `Node.js`
- `Python 3.11`
- `venv`
- `MySQL 8`
- `systemd` services for Next.js and FastAPI
- `Certbot` for SSL

## Upgrade Strategy

If usage grows, the recommended next step is `KVM 4`.

Upgrade trigger examples:

- RAM regularly stays above `70% to 80%`
- CPU spikes frequently during order peaks
- admin pages or customer flows slow down during normal business usage
- more background work is added
- traffic becomes consistently higher than launch assumptions

Hostinger's current VPS documentation indicates that upgrading is straightforward and preserves files/configuration, which makes the `KVM 2` starting decision lower risk.

## Final Recommendation for Stakeholders

Approve the purchase of `Hostinger VPS KVM 2` as the initial production server for `kk_v1`.

This is the right decision because it:

- matches the technical architecture of the current platform
- provides enough production capacity without unnecessary overspend
- reduces launch risk compared with `KVM 1`
- keeps a clear and low-friction upgrade path to `KVM 4`

It is the most responsible starting point from both a technical and budget perspective.

## Sources

- Hostinger VPS pricing and specs: https://www.hostinger.com/vps-hosting
- Hostinger Python support: https://support.hostinger.com/en/articles/3648030-is-python-supported-at-hostinger
- Hostinger Node.js support: https://support.hostinger.com/en/articles/1583661-is-node-js-supported-at-hostinger
- Hostinger VPS upgrade guide: https://support.hostinger.com/en/articles/1583229-how-to-upgrade-a-vps-server
