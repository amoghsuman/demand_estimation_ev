# Data assumptions behind Ampere Atlas

Every number in this demo is synthetic. There is no real vehicle registration
data, no real charger location data, and no real traffic-count data behind
it. This document exists so that anyone reviewing the dashboard can see
exactly which patterns were assumed, why, and how each on-screen figure is
derived from them, so the demo reads as illustrative-but-defensible rather
than arbitrary.

The dataset is generated once, deterministically, from a seeded random
number generator (`lib/data.ts`), so it looks identical on every load but
still varies location to location within the bounds described below.

## 1. City tiers and EV registration base

Each of the 10 city hubs is assigned a tier (1, 2, or 3) and, from that
tier, a total current EV registration base (a single random draw per city,
within these ranges, reflecting roughly how India's EV adoption scales with
city size and income):

| Tier | Example cities in this demo | EV registration base |
|---|---|---|
| 1 | Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai | 40,000 – 90,000 |
| 2 | Pune, Kolkata, Ahmedabad, Jaipur | 15,000 – 35,000 |
| 3 | Surat | 5,000 – 12,000 |

That city total is then split unevenly across the city's sub-locations
(neighbourhoods/hubs) using random per-location weights, so within one city
some areas naturally end up denser than others, the same way a real city's
EV parc isn't spread evenly across neighbourhoods.

## 2. Vehicle segment mix, by area category and city tier

Each sub-location has an area category (residential, commercial, industrial)
and inherits a category-and-tier baseline percentage split across
2-wheeler / 3-wheeler / 4-wheeler / fleet, then a small random jitter
(±6 points per segment, renormalized back to 100%) so two locations in the
same category never look identical.

Baselines reflect India's general EV adoption pattern:

- **2-wheelers** dominate dense residential areas (55–65%+), and that share
  grows in tier 2/3 cities (up to ~70%) where 2W is a larger fraction of all
  personal mobility.
- **3-wheelers** concentrate in commercial and industrial zones (15–25%),
  reflecting last-mile delivery and shared/auto-rickshaw use.
- **4-wheelers** concentrate in commercial hubs and higher-income
  residential pockets, and are a larger share in tier-1 cities (20–35%) than
  tier 2/3.
- **Fleet/bus** vehicles concentrate in industrial zones and highway
  corridors. They're a small share of the *national* EV parc overall (most
  locations are residential/commercial, where fleet is minimal), but each
  fleet vehicle is assumed to charge far more often (see §4), so its
  contribution to *charging demand* is disproportionate to its count.

| Category | Tier | 2W | 3W | 4W | Fleet |
|---|---|---|---|---|---|
| Residential | 1 | 58% | 12% | 24% | 6% |
| Residential | 2 | 64% | 12% | 18% | 6% |
| Residential | 3 | 70% | 10% | 15% | 5% |
| Commercial | 1 | 32% | 18% | 35% | 15% |
| Commercial | 2 | 38% | 20% | 28% | 14% |
| Commercial | 3 | 44% | 20% | 22% | 14% |
| Industrial | 1 | 20% | 24% | 20% | 36% |
| Industrial | 2 | 23% | 23% | 17% | 37% |
| Industrial | 3 | 26% | 22% | 14% | 38% |
| Highway (corridor stops) | - | 5% | 5% | 45% | 45% |

Multiplying a location's EV registration total by its (jittered) mix gives
its absolute `segmentCounts` per vehicle type, rounded so the four segments
always sum exactly back to the total.

## 3. Charger density benchmarks (the under-supply)

Rather than picking a random number of chargers per location, each
location's `existingChargers` is derived from its EV count and an assumed
current public-charger density benchmark, i.e. "how many registered EVs
share one public charger today":

| Area | EVs per public charger today |
|---|---|
| Tier-1 cities | 1 per 500 – 800 |
| Tier-2/3 cities | 1 per 900 – 1,400 (worse, reflecting real under-supply outside major metros) |
| Highway corridor stops | 1 per 1,500 – 3,000 estimated daily transiting EVs |

`existingChargers = round(evRegistrations / benchmark ratio)`, with the
ratio itself drawn once per location within the bands above. This is why
smaller or newer locations can legitimately show 0 chargers. That's not a
data error, it's the under-supply the demo is illustrating.

## 4. Demand score

`demandScore` (0–99) is not a random city-tier multiplier. It's a
normalized **charging-demand intensity**: each vehicle segment's count is
weighted by an illustrative relative charging frequency, because a fleet
vehicle or shared 3-wheeler visits a charger far more often per day than a
privately owned 2-wheeler or 4-wheeler:

| Segment | Demand weight |
|---|---|
| 2-wheeler | ×1.0 |
| 3-wheeler | ×1.3 |
| 4-wheeler | ×1.1 |
| Fleet | ×3.5 |

`demandRaw = Σ (segment count × segment weight)`, then min-max normalized to
a 0–99 scale, separately across urban points and across corridor points,
since the two represent different phenomena (resident EV parc vs. daily
transiting traffic) and are never ranked against each other in the UI.

## 5. Gap score

`gapScore` (0–99) is a normalized **EV-count-to-charger undersupply ratio**:

`gapRaw = evRegistrations / (existingChargers + 1)`

...min-max normalized to 0–99, again separately for urban vs. corridor
points. Locations with many EVs and few chargers land near 99; locations
with ample charging relative to their EV count land near 0.

## 6. State aggregates

Each state's `evRegistrations` and `currentChargers` are **real sums** of
its underlying location data (not separately randomized). `targetChargers`
is an aspirational figure: what full coverage would need if the state hit
the *best-observed* (tier-1) density benchmark of 1 charger per 500 EVs.
`targetChargers = round(evRegistrations / 500)`. `avgGapScore` is the
average of the state's location-level gap scores.

`urbanCoveragePct` / `ruralCoveragePct` remain independently randomized.
There's no underlying location-level urban/rural split in this dataset to
sum from, so these two fields stay flagged as illustrative only.

## 7. What this is *not*

- Not real vehicle registration data (Vahan or otherwise).
- Not real charger location or count data (no OCM/utility feed).
- Not real traffic or footfall data for highway corridors.
- City tiers, category baselines, and the demand/charger-ratio weights above
  are directionally reasonable but hand-picked for this demo, not sourced
  from a specific study.

Swapping in real data means replacing the generation functions in
`lib/data.ts` with real feeds while keeping the same `DataPoint` /
`StateAggregate` shapes. The dashboard and charts don't need to change.
