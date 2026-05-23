# Hostinger VPS Decision Notes for `kk_v1`

## Questions for Discussion

Before selecting a VPS, these 5 questions should be answered.

1. How many concurrent active users do we expect at peak time?
2. At peak time, will users mostly browse, or will many of them place orders and use admin/reporting screens at the same time?
3. What traffic growth do we expect at launch, in the next 6 months, and in the next 12 months?
4. How much storage and backup retention do we want for database growth, snapshots, and recovery?
5. What monthly budget is acceptable after the promotional term ends?

## What "Concurrent Active Users" Means

For planning purposes:

- `concurrent active users` means users actively using the system at the same time
- this does not mean total registered customers
- this does not mean total daily visitors

Example:

- `1,000` registered customers may still mean only `20-40` concurrent active users at a peak moment

## Assumptions Behind the Capacity Estimates

The capacity estimates below assume the application has been optimized in the following ways:

- hot routes do not open unnecessary new raw DB connections
- request-time schema inspection is removed from normal flows
- frontend API calls are routed through a consistent client path
- duplicate auth requests are reduced
- heavy list/report screens are paginated properly
- production config is cleaned up

These numbers are practical planning estimates for this codebase after optimization. They are not Hostinger guarantees.

## Option Comparison

| Plan    | Specs                                                   | Intro Price | Renewal Price | Estimated concurrent active users after optimization | Notes                                                                            |
| ------- | ------------------------------------------------------- | ----------- | ------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `KVM 1` | `1 vCPU`, `4 GB RAM`, `50 GB NVMe`, `4 TB bandwidth`    | `$6.49/mo`  | `$11.99/mo`   | about `10-25`                                        | suitable for testing, staging, or very small production usage                    |
| `KVM 2` | `2 vCPU`, `8 GB RAM`, `100 GB NVMe`, `8 TB bandwidth`   | `$8.99/mo`  | `$14.99/mo`   | about `30-80`                                        | suitable for a more serious production launch with moderate traffic              |
| `KVM 4` | `4 vCPU`, `16 GB RAM`, `200 GB NVMe`, `16 TB bandwidth` | `$12.99/mo` | `$28.99/mo`   | about `80-180`                                       | suitable for heavier traffic, more admin activity, or more headroom from day one |

## Pricing Notes

- The promotional price is not the long-term operating cost.
- Renewal price matters more for planning than the introductory discount.
- For example, `KVM 2` is `$8.99/month` initially but `$14.99/month` on renewal.
- `KVM 4` is `$12.99/month` initially but `$28.99/month` on renewal.

## Interpreting the Options

### `KVM 1`

- Lowest cost
- Lowest headroom
- More sensitive to traffic spikes, admin-heavy usage, and DB pressure
- Better suited to testing, staging, or very light production usage

### `KVM 2`

- Middle option on both price and capacity
- Gives more operating room for frontend, backend, and database together
- More suitable if order peaks and admin usage are expected to be meaningful

### `KVM 4`

- Higher cost
- More headroom for traffic spikes, reports, and future growth
- Better if we expect heavier concurrency or want more buffer from the start

## Summary Table for Discussion

| Question                   | If answer is small/light   | If answer is moderate         | If answer is high/heavy       |
| -------------------------- | -------------------------- | ----------------------------- | ----------------------------- |
| Concurrent active users    | closer to `KVM 1`          | closer to `KVM 2`             | closer to `KVM 4`             |
| Order spikes at meal times | `KVM 1` may still be tight | `KVM 2` becomes more relevant | `KVM 4` becomes more relevant |
| Admin/report usage         | light                      | moderate                      | heavy                         |
| Need for future headroom   | low                        | medium                        | high                          |
| Long-term monthly budget   | smallest budget            | balanced budget               | bigger budget                 |
