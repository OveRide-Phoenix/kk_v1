# Hostinger VPS Recommendation for Kuteera Kitchen (`kk_v1`)

## Recommendation

Buy `Hostinger VPS KVM 2`.

This is the best starting plan for `kk_v1` because it is the lowest-cost VPS tier that reasonably fits the current architecture:

- Next.js frontend
- FastAPI backend
- MySQL database
- Nginx + SSL
- future AI API calls to external services

`KVM 1` is too tight for reliable production use.
`KVM 4` is stronger, but likely unnecessary at launch if traffic is still modest.

## Why VPS Is the Right Choice

This project needs a VPS because it is not a simple website or a single app runtime.

It requires:

- a Node.js process for Next.js
- a Python process for FastAPI
- MySQL
- root access for server setup
- Nginx reverse proxy and SSL
- service/process management

Hostinger's own support documentation says Python projects are supported on VPS only. For this codebase, VPS is the only practical single-plan setup on Hostinger.

## Plan Comparison

These estimates are practical planning numbers based on this codebase and deployment shape. They are not Hostinger guarantees.

Assumptions behind the estimates:

- one VPS runs Next.js, FastAPI, MySQL, and Nginx
- production deployment, not dev mode
- AI features are normal external API calls, not self-hosted models
- usage is typical for ordering, admin operations, and reports

| Plan    | Specs                          | Recommendation                                 | Rough concurrent active users | Rough peak comfort level                                        | Main risk                                         |
| ------- | ------------------------------ | ---------------------------------------------- | ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| `KVM 1` | 1 vCPU, 4 GB RAM, 50 GB NVMe   | Do not buy for production                      | `5-15`                        | about `10` comfortable, `20+` risky                             | too little CPU/RAM headroom for app + DB together |
| `KVM 2` | 2 vCPU, 8 GB RAM, 100 GB NVMe  | Best starting choice                           | `15-50`                       | about `30` comfortable, `50-60` manageable, `60+` watch closely | needs clean deployment and query discipline       |
| `KVM 4` | 4 vCPU, 16 GB RAM, 200 GB NVMe | Buy only if higher traffic is already expected | `50-120`                      | about `80` comfortable, `120+` depends on workload              | higher cost than needed for an early-stage launch |

## What "Peak Users" Means

For stakeholders, "peak users" should be read as:

- users actively using the site at the same time
- not total registered customers
- not total daily visitors

Examples:

- `4 concurrent users`: very small usage, any VPS can handle this
- `40 concurrent users`: realistic early production peak for a growing app
- `400 concurrent users`: much larger scale and not a realistic target for this current single-VPS setup

## Why `KVM 2` Is the Best Choice

### 1. It fits the real app, not just the website

This is not just a marketing site. It includes:

- customer ordering
- admin workflows
- menu management
- production planning
- packing and logistics flows
- database-backed business operations

`KVM 2` is the first Hostinger tier that gives reasonable production headroom for all of that on one server.

### 2. It is the best cost-to-safety balance

`KVM 1` saves money, but the likely result is:

- slower performance at order peaks
- more chance of RAM pressure
- less room for MySQL and admin screens
- faster need to upgrade

`KVM 4` gives more safety, but costs more before the traffic justifies it.

`KVM 2` is the middle ground: enough room to run properly without unnecessary overspend.

### 3. It supports the expected AI roadmap

If AI features are normal API calls to providers like OpenAI or Gemini:

- no GPU is needed
- no large local AI compute is needed
- the VPS mainly needs enough RAM and CPU for request handling, not model execution

That keeps `KVM 2` viable.

### 4. It keeps the upgrade path simple

Hostinger's VPS documentation says VPS upgrades can be done from the dashboard and preserve files/configuration. That makes `KVM 2` a low-risk starting point.

## Why Not `KVM 1`

Do not position `KVM 1` as the production choice.

Reasons:

- 4 GB RAM is tight for Next.js + FastAPI + MySQL on one box
- deployments and builds will have less breathing room
- admin/report workloads will feel strain sooner
- one traffic spike can make the server feel slow

It may run, but it is not the responsible recommendation for a live business app.

## Why Not Start with `KVM 4`

`KVM 4` becomes the better purchase only if one of these is already true:

- you expect regular peaks above `50` concurrent active users
- heavy admin/reporting usage is already known
- more background processing is planned very soon
- you want extra headroom from day one and budget is not a concern

If not, `KVM 4` is likely buying capacity before it is needed.

## Final Purchase Ask

Approve `Hostinger VPS KVM 2` as the initial production server for `kk_v1`.

Reason:

- `KVM 1` is too risky
- `KVM 2` is the right launch plan
- `KVM 4` can be adopted later if real traffic proves it is needed

## Sources

- Hostinger VPS pricing and specs: https://www.hostinger.com/vps-hosting
- Hostinger Python support: https://support.hostinger.com/en/articles/3648030-is-python-supported-at-hostinger
- Hostinger Node.js support: https://support.hostinger.com/en/articles/1583661-is-node-js-supported-at-hostinger
- Hostinger VPS upgrade guide: https://support.hostinger.com/en/articles/1583229-how-to-upgrade-a-vps-server
