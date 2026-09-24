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

## 8. Corridor chainage model (Delhi to Chandigarh, NH44)

`lib/corridorChainage.ts` links toll flow, charging stops, charger
availability and white spaces in one deterministic chain. All values are
dummy.

- **Stations sit at kilometre markers.** Nine dummy stations from km 8 to
  km 236. Spacing is deliberate: 16 to 18 km gaps (green), 22 and 24 km gaps
  around Samalkha (amber), an 80 km hole Karnal to Ambala and a 33 km hole
  Ambala to Zirakpur (red).
- **Colour rule, by spacing between consecutive chargers.** Over 30 km is
  red (white space). 20 to 30 km is amber. Under 20 km is green, and turns
  amber in any hour when every gun at both ends is busy (utilization at or
  above 90%).
- **Toll flow.** Each plaza's 24 hourly bars are renormalised so they sum to
  the stated daily EV count; peak and off-peak headline values are read from
  the curve. Flow at a station is a distance-weighted blend of the two tolls
  that bracket it.
- **Stop rate.** Share of passing EVs that pull in at an average station:
  4W 1.7%, fleet and light commercial 3.4%, buses and trucks 4.5%, scaled by
  a site attraction factor and by the spacing around the site (long gaps push
  more drivers to stop).
- **Service.** Sessions per gun per hour = 60 / session minutes (48 min at
  60 kW, 32 min at 120 kW) x uptime. Arrivals beyond capacity queue for up
  to half an hour of throughput; the rest are turned away.
- **Requirement.** Guns needed to serve peak hour arrivals at a 75% target
  utilization. Toll level current vs required MW sums the stations inside a
  15 km catchment of the plaza.

### 8a. Revision, September 2026: carriageways, 15 minute slots, UBC status

- **Two carriageways.** Every station carries a side. `NB` is the left
  carriageway (Delhi to Chandigarh bound), `SB` the right (Chandigarh to
  Delhi bound), as driven on Indian roads. Gaps, colours, stops and white
  spaces are computed per side; a charger across the median counts for
  nothing.
- **50 stations, 25 per side.** Clustered near Murthal, Panipat, Karnal,
  Ambala and Zirakpur, thin between Kurukshetra and Ambala. Each side keeps
  one white space over 30 km (NB km 168 to 200, SB km 127 to 158) and one
  20 to 30 km amber stretch. Roadside fuel station sites carry 2 guns of
  60 kW; hubs carry 6 to 12 guns of 120 kW.
- **15 minute slots.** The hourly toll curve is resampled to 96 slots by
  linear interpolation between hour centres, so each hour's four slots sum
  to the hour. A directional split moves about 7 points through the day:
  Chandigarh to Delhi heavier in the morning, Delhi to Chandigarh heavier in
  the evening.
- **Stop rate.** Unchanged base rates (4W 1.7%, fleet 3.4%, heavy 4.5%),
  scaled by site attraction and by the gap behind the site in the direction
  of travel (weight 0.7) plus the average gap on both sides (weight 0.3).
- **Live status, attributed to Unified Bharat eCharge (UBC).** Each station
  reports Available, All guns busy, or Offline per slot. Offline windows are
  deterministic: sites under 95% uptime drop out for 3 slots, under 91% for
  6 slots. The demo simulates the feed; a production build would read it.
- **Queue tolerance** stays at 30 minutes of throughput (two slots).
- The corridor section now stands apart from the urban and residential
  section, and only the Delhi to Chandigarh corridor carries this model.
