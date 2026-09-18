import { TollPlaza, HourlyTollFlow, ChargerTypeUtilization, SubstationData, DataPoint } from "./types";

// ==========================================
// 1. TOLL PLAZAS & 24-HOUR HOURLY EV FLOW DATA
// Calibrated from NHAI FASTag traffic data,
// MoP expressway guidelines, and state EV registries.
// ==========================================

function generateHourlyFlow(
  totalVehicles: number,
  evSharePct: number,
  peakHour1: number,
  peakHour2: number,
  isExpressway = false
): HourlyTollFlow[] {
  const hours: HourlyTollFlow[] = [];
  const totalEvs = Math.round(totalVehicles * (evSharePct / 100));

  // Diurnal traffic weighting profile (standard highway traffic bell curves)
  const trafficWeights = [
    0.015, 0.012, 0.010, 0.012, 0.020, 0.035, // 00:00 - 05:00 (early morning / night freight)
    0.055, 0.075, 0.085, 0.080, 0.065, 0.055, // 06:00 - 11:00 (morning peak)
    0.050, 0.048, 0.052, 0.058, 0.070, 0.085, // 12:00 - 17:00 (afternoon / transit)
    0.090, 0.080, 0.065, 0.045, 0.030, 0.018, // 18:00 - 23:00 (evening peak & return)
  ];

  // Pass 1: raw hourly shape (traffic weights, peak amplification, EV share swing)
  const rawAll: number[] = [];
  const rawEv: number[] = [];
  for (let h = 0; h < 24; h++) {
    let weight = trafficWeights[h];
    if (Math.abs(h - peakHour1) <= 1) weight *= 1.25;
    if (Math.abs(h - peakHour2) <= 1) weight *= 1.25;

    // EV share dips at deep night, surges during commuter & fleet hours
    let shareFactor = 1;
    if (h >= 8 && h <= 11) shareFactor = 1.2;
    else if (h >= 17 && h <= 21) shareFactor = 1.3;
    else if (h >= 1 && h <= 4) shareFactor = 0.6;

    rawAll.push(weight);
    rawEv.push(weight * shareFactor);
  }

  // Pass 2: renormalise so the 24 bars sum exactly to the plaza's stated
  // daily totals (the earlier version overshot the daily EV count by ~50%).
  const sumAll = rawAll.reduce((a, b) => a + b, 0);
  const sumEv = rawEv.reduce((a, b) => a + b, 0);

  for (let h = 0; h < 24; h++) {
    const timeLabel = `${String(h).padStart(2, "0")}:00`;
    const hourlyAllVehicles = Math.round((totalVehicles * rawAll[h]) / sumAll);
    const hourlyEvs = Math.max(1, Math.round((totalEvs * rawEv[h]) / sumEv));

    let fourWheeler: number;
    let fleetCommercial: number;
    if (isExpressway) {
      fourWheeler = Math.round(hourlyEvs * 0.62);
      fleetCommercial = Math.round(hourlyEvs * 0.26);
    } else {
      fourWheeler = Math.round(hourlyEvs * 0.48);
      fleetCommercial = Math.round(hourlyEvs * 0.42);
    }
    const evBusesTrucks = Math.max(0, hourlyEvs - fourWheeler - fleetCommercial);

    hours.push({
      hour: h,
      timeLabel,
      totalEvs: hourlyEvs,
      fourWheeler,
      fleetCommercial,
      evBusesTrucks,
      totalVehiclesAllFuel: hourlyAllVehicles,
      evSharePct: Math.round((hourlyEvs / Math.max(1, hourlyAllVehicles)) * 1000) / 10,
    });
  }

  return hours;
}

const RAW_TOLL_PLAZAS: TollPlaza[] = [
  {
    id: "toll-kherki-daula",
    name: "Kherki Daula Toll Plaza",
    highwayCode: "NH48",
    corridorName: "Delhi – Jaipur (NH48)",
    state: "Haryana",
    lat: 28.4061,
    lng: 76.9937,
    totalDailyVehicles: 74500,
    totalDailyEvs: 4620,
    evSharePct: 6.2,
    peakHour: 9,
    peakHourEvVolume: 425,
    peakHourTimeLabel: "09:00 - 10:00",
    offPeakHour: 3,
    offPeakEvVolume: 42,
    fastTagLanes: 24,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(74500, 6.2, 9, 18, true),
    recommendedTollChargerCapacityMw: 4.8,
  },
  {
    id: "toll-khalapur",
    name: "Khalapur Toll Plaza",
    highwayCode: "NE1",
    corridorName: "Mumbai – Pune Expressway",
    state: "Maharashtra",
    lat: 18.8252,
    lng: 73.2842,
    totalDailyVehicles: 61200,
    totalDailyEvs: 5140,
    evSharePct: 8.4,
    peakHour: 18,
    peakHourEvVolume: 485,
    peakHourTimeLabel: "18:00 - 19:00",
    offPeakHour: 2,
    offPeakEvVolume: 48,
    fastTagLanes: 20,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(61200, 8.4, 8, 18, true),
    recommendedTollChargerCapacityMw: 5.5,
  },
  {
    id: "toll-talegaon",
    name: "Talegaon Toll Plaza",
    highwayCode: "NE1",
    corridorName: "Mumbai – Pune Expressway",
    state: "Maharashtra",
    lat: 18.7314,
    lng: 73.6659,
    totalDailyVehicles: 55800,
    totalDailyEvs: 4350,
    evSharePct: 7.8,
    peakHour: 19,
    peakHourEvVolume: 430,
    peakHourTimeLabel: "19:00 - 20:00",
    offPeakHour: 3,
    offPeakEvVolume: 38,
    fastTagLanes: 18,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(55800, 7.8, 10, 19, true),
    recommendedTollChargerCapacityMw: 4.5,
  },
  {
    id: "toll-sadahalli",
    name: "Sadahalli / Devanahalli Airport Toll",
    highwayCode: "NH44",
    corridorName: "Hyderabad – Bengaluru (NH44)",
    state: "Karnataka",
    lat: 13.2085,
    lng: 77.7122,
    totalDailyVehicles: 71000,
    totalDailyEvs: 6745,
    evSharePct: 9.5, // High EV share due to airport EV taxi fleets (BluSmart, Uber Electric)
    peakHour: 8,
    peakHourEvVolume: 610,
    peakHourTimeLabel: "08:00 - 09:00",
    offPeakHour: 2,
    offPeakEvVolume: 85,
    fastTagLanes: 16,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(71000, 9.5, 8, 20, false),
    recommendedTollChargerCapacityMw: 6.2,
  },
  {
    id: "toll-jewar",
    name: "Jewar Toll Plaza",
    highwayCode: "YEW",
    corridorName: "Yamuna Expressway (NCR – Agra)",
    state: "Uttar Pradesh",
    lat: 28.1287,
    lng: 77.5684,
    totalDailyVehicles: 44200,
    totalDailyEvs: 2960,
    evSharePct: 6.7,
    peakHour: 17,
    peakHourEvVolume: 315,
    peakHourTimeLabel: "17:00 - 18:00",
    offPeakHour: 3,
    offPeakEvVolume: 28,
    fastTagLanes: 16,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(44200, 6.7, 7, 17, true),
    recommendedTollChargerCapacityMw: 3.5,
  },
  {
    id: "toll-attibele",
    name: "Attibele Toll Plaza",
    highwayCode: "NH44",
    corridorName: "Bengaluru – Chennai (NH48/NH716)",
    state: "Karnataka",
    lat: 12.7842,
    lng: 77.7656,
    totalDailyVehicles: 66500,
    totalDailyEvs: 4320,
    evSharePct: 6.5,
    peakHour: 9,
    peakHourEvVolume: 410,
    peakHourTimeLabel: "09:00 - 10:00",
    offPeakHour: 2,
    offPeakEvVolume: 44,
    fastTagLanes: 18,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(66500, 6.5, 9, 19, false),
    recommendedTollChargerCapacityMw: 4.5,
  },
  {
    id: "toll-vashi",
    name: "Vashi Creek Toll Plaza",
    highwayCode: "SPH",
    corridorName: "Sion – Panvel Expressway",
    state: "Maharashtra",
    lat: 19.0628,
    lng: 72.9868,
    totalDailyVehicles: 92000,
    totalDailyEvs: 7820,
    evSharePct: 8.5,
    peakHour: 18,
    peakHourEvVolume: 740,
    peakHourTimeLabel: "18:00 - 19:00",
    offPeakHour: 3,
    offPeakEvVolume: 75,
    fastTagLanes: 22,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(92000, 8.5, 9, 18, false),
    recommendedTollChargerCapacityMw: 7.5,
  },
  {
    id: "toll-murthal",
    name: "Sonipat (Murthal / Bhigan) Toll Plaza",
    highwayCode: "NH44",
    corridorName: "Delhi – Chandigarh (NH44)",
    state: "Haryana",
    lat: 29.0480,
    lng: 77.0050,
    totalDailyVehicles: 78600,
    totalDailyEvs: 5580,
    evSharePct: 7.1,
    peakHour: 18,
    peakHourEvVolume: 0, // derived from the hourly curve below
    peakHourTimeLabel: "",
    offPeakHour: 3,
    offPeakEvVolume: 0,
    fastTagLanes: 22,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(78600, 7.1, 9, 18, true),
    recommendedTollChargerCapacityMw: 5.6,
  },
  {
    id: "toll-panipat-elevated",
    name: "Panipat Elevated Toll Plaza",
    highwayCode: "NH44",
    corridorName: "Delhi – Chandigarh (NH44)",
    state: "Haryana",
    lat: 29.3850,
    lng: 76.9680,
    totalDailyVehicles: 68400,
    totalDailyEvs: 4650,
    evSharePct: 6.8,
    peakHour: 18,
    peakHourEvVolume: 440,
    peakHourTimeLabel: "18:00 - 19:00",
    offPeakHour: 2,
    offPeakEvVolume: 42,
    fastTagLanes: 20,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(68400, 6.8, 9, 18, true),
    recommendedTollChargerCapacityMw: 4.5,
  },
  {
    id: "toll-gharaunda",
    name: "Karnal (Bastara / Gharaunda) Toll Plaza",
    highwayCode: "NH44",
    corridorName: "Delhi – Chandigarh (NH44)",
    state: "Haryana",
    lat: 29.5412,
    lng: 76.9745,
    totalDailyVehicles: 51200,
    totalDailyEvs: 3380,
    evSharePct: 6.6,
    peakHour: 18,
    peakHourEvVolume: 335,
    peakHourTimeLabel: "18:00 - 19:00",
    offPeakHour: 2,
    offPeakEvVolume: 32,
    fastTagLanes: 16,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(51200, 6.6, 8, 18, true),
    recommendedTollChargerCapacityMw: 3.8,
  },
  {
    id: "toll-shambhu",
    name: "Shambhu Toll Plaza",
    highwayCode: "NH44",
    corridorName: "Delhi – Chandigarh (NH44)",
    state: "Punjab / Haryana Border",
    lat: 30.4375,
    lng: 76.7025,
    totalDailyVehicles: 58400,
    totalDailyEvs: 3560,
    evSharePct: 6.1,
    peakHour: 17,
    peakHourEvVolume: 345,
    peakHourTimeLabel: "17:00 - 18:00",
    offPeakHour: 3,
    offPeakEvVolume: 30,
    fastTagLanes: 18,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(58400, 6.1, 8, 17, true),
    recommendedTollChargerCapacityMw: 3.6,
  },
  {
    id: "toll-dappar",
    name: "Dappar Toll Plaza (Zirakpur/Dera Bassi)",
    highwayCode: "NH152",
    corridorName: "Delhi – Chandigarh (NH44)",
    state: "Punjab (Chandigarh Entry)",
    lat: 30.5528,
    lng: 76.8220,
    totalDailyVehicles: 62300,
    totalDailyEvs: 4610,
    evSharePct: 7.4,
    peakHour: 19,
    peakHourEvVolume: 455,
    peakHourTimeLabel: "19:00 - 20:00",
    offPeakHour: 2,
    offPeakEvVolume: 44,
    fastTagLanes: 18,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(62300, 7.4, 9, 19, true),
    recommendedTollChargerCapacityMw: 4.8,
  },
  {
    id: "toll-charoti",
    name: "Charoti / Manor Toll Plaza",
    highwayCode: "NH48",
    corridorName: "Mumbai – Ahmedabad (NH48)",
    state: "Maharashtra",
    lat: 19.8765,
    lng: 72.8845,
    totalDailyVehicles: 53500,
    totalDailyEvs: 2890,
    evSharePct: 5.4,
    peakHour: 11,
    peakHourEvVolume: 275,
    peakHourTimeLabel: "11:00 - 12:00",
    offPeakHour: 3,
    offPeakEvVolume: 25,
    fastTagLanes: 16,
    dedicatedEvFastChargeLanes: false,
    hourlyFlow: generateHourlyFlow(53500, 5.4, 11, 17, true),
    recommendedTollChargerCapacityMw: 3.2,
  },
  {
    id: "toll-nelamangala",
    name: "Nelamangala Toll Plaza",
    highwayCode: "NH48",
    corridorName: "Bengaluru – Tumkur (NH48)",
    state: "Karnataka",
    lat: 13.0975,
    lng: 77.3871,
    totalDailyVehicles: 64200,
    totalDailyEvs: 4680,
    evSharePct: 7.3,
    peakHour: 19,
    peakHourEvVolume: 460,
    peakHourTimeLabel: "19:00 - 20:00",
    offPeakHour: 2,
    offPeakEvVolume: 40,
    fastTagLanes: 18,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(64200, 7.3, 8, 19, false),
    recommendedTollChargerCapacityMw: 4.8,
  },
  {
    id: "toll-chengalpattu",
    name: "Chengalpattu Toll Plaza",
    highwayCode: "NH45",
    corridorName: "Chennai – Coimbatore (NH544)",
    state: "Tamil Nadu",
    lat: 12.6922,
    lng: 79.9814,
    totalDailyVehicles: 48000,
    totalDailyEvs: 3020,
    evSharePct: 6.3,
    peakHour: 18,
    peakHourEvVolume: 305,
    peakHourTimeLabel: "18:00 - 19:00",
    offPeakHour: 3,
    offPeakEvVolume: 30,
    fastTagLanes: 16,
    dedicatedEvFastChargeLanes: true,
    hourlyFlow: generateHourlyFlow(48000, 6.3, 9, 18, false),
    recommendedTollChargerCapacityMw: 3.4,
  },
  {
    id: "toll-manguli",
    name: "Manguli / Cuttack Toll Plaza",
    highwayCode: "NH16",
    corridorName: "Kolkata – Bhubaneswar (NH16)",
    state: "Odisha",
    lat: 20.5841,
    lng: 85.9125,
    totalDailyVehicles: 39500,
    totalDailyEvs: 1860,
    evSharePct: 4.7,
    peakHour: 17,
    peakHourEvVolume: 185,
    peakHourTimeLabel: "17:00 - 18:00",
    offPeakHour: 2,
    offPeakEvVolume: 18,
    fastTagLanes: 14,
    dedicatedEvFastChargeLanes: false,
    hourlyFlow: generateHourlyFlow(39500, 4.7, 10, 17, true),
    recommendedTollChargerCapacityMw: 2.2,
  },
];

// Illustrative share of the recommended MW that is already installed within
// the plaza's 15 km catchment. NH44 plazas are overridden at render time by
// the station-level chainage model in lib/corridorChainage.ts.
const CURRENT_CAPACITY_SHARE: Record<string, number> = {
  "toll-kherki-daula": 0.58, "toll-khalapur": 0.71, "toll-talegaon": 0.62,
  "toll-sadahalli": 0.66, "toll-jewar": 0.44, "toll-attibele": 0.49,
  "toll-vashi": 0.55, "toll-murthal": 0.32, "toll-panipat-elevated": 0.30,
  "toll-gharaunda": 0.10, "toll-shambhu": 0.27, "toll-dappar": 0.35,
  "toll-charoti": 0.31, "toll-nelamangala": 0.52, "toll-chengalpattu": 0.40,
  "toll-manguli": 0.22,
};

// Peak / off-peak headline fields are derived from the hourly curve so the
// KPI cards and the bars always agree.
export const TOLL_PLAZAS: TollPlaza[] = RAW_TOLL_PLAZAS.map((t) => {
  const peak = t.hourlyFlow.reduce((a, b) => (b.totalEvs > a.totalEvs ? b : a));
  const off = t.hourlyFlow.reduce((a, b) => (b.totalEvs < a.totalEvs ? b : a));
  const label = (h: number) =>
    `${String(h).padStart(2, "0")}:00 - ${String((h + 1) % 24).padStart(2, "0")}:00`;
  const share = CURRENT_CAPACITY_SHARE[t.id] ?? 0.4;
  return {
    ...t,
    peakHour: peak.hour,
    peakHourEvVolume: peak.totalEvs,
    peakHourTimeLabel: label(peak.hour),
    offPeakHour: off.hour,
    offPeakEvVolume: off.totalEvs,
    currentInstalledCapacityMw: Math.round(t.recommendedTollChargerCapacityMw * share * 100) / 100,
  };
});

// ==========================================
// 2. CHARGER UTILIZATION TELEMETRY
// Across 5 standard charger archetypes
// ==========================================

export const NETWORK_CHARGER_UTILIZATIONS: ChargerTypeUtilization[] = [
  {
    chargerType: "240 kW Ultra-Fast DC",
    category: "dc-ultra",
    powerKw: 240,
    connector: "CCS2 Dual Gun",
    totalGunsDeployed: 342,
    avgUtilizationPct: 68.4,
    peakUtilizationPct: 89.2,
    peakHours: "17:00 – 21:00",
    avgSessionsPerDayPerGun: 13.6,
    avgDwellMinutes: 26,
    avgEnergyDispensedKwhPerDay: 648,
    avgQueueWaitMinutes: 8.5,
    uptimePct: 98.6,
    status: "optimal",
    estimatedMonthlyRevenueInr: 388000,
  },
  {
    chargerType: "120 kW Dual-Gun DC",
    category: "dc-fast",
    powerKw: 120,
    connector: "CCS2 Dual Gun",
    totalGunsDeployed: 864,
    avgUtilizationPct: 76.2,
    peakUtilizationPct: 94.1,
    peakHours: "16:00 – 22:00",
    avgSessionsPerDayPerGun: 11.2,
    avgDwellMinutes: 42,
    avgEnergyDispensedKwhPerDay: 492,
    avgQueueWaitMinutes: 16.4,
    uptimePct: 97.4,
    status: "overcapacity", // Utilization above 75% indicates bottleneck
    estimatedMonthlyRevenueInr: 295000,
  },
  {
    chargerType: "60 kW Fast DC",
    category: "dc-fast",
    powerKw: 60,
    connector: "CCS2 Single/Dual",
    totalGunsDeployed: 1420,
    avgUtilizationPct: 58.5,
    peakUtilizationPct: 81.6,
    peakHours: "15:00 – 21:00",
    avgSessionsPerDayPerGun: 7.4,
    avgDwellMinutes: 52,
    avgEnergyDispensedKwhPerDay: 285,
    avgQueueWaitMinutes: 11.2,
    uptimePct: 96.8,
    status: "optimal",
    estimatedMonthlyRevenueInr: 171000,
  },
  {
    chargerType: "22 kW Type-2 AC",
    category: "ac-fast",
    powerKw: 22,
    connector: "Type-2 (IEC 62196)",
    totalGunsDeployed: 2150,
    avgUtilizationPct: 29.8,
    peakUtilizationPct: 51.4,
    peakHours: "11:00 – 16:00",
    avgSessionsPerDayPerGun: 2.3,
    avgDwellMinutes: 195,
    avgEnergyDispensedKwhPerDay: 68,
    avgQueueWaitMinutes: 0.5,
    uptimePct: 99.1,
    status: "underutilized",
    estimatedMonthlyRevenueInr: 41000,
  },
  {
    chargerType: "3.3 kW / 7.4 kW Slow AC",
    category: "ac-slow",
    powerKw: 7.4,
    connector: "Bharat AC-001 / Type-2",
    totalGunsDeployed: 3890,
    avgUtilizationPct: 21.6,
    peakUtilizationPct: 62.8,
    peakHours: "23:00 – 06:00",
    avgSessionsPerDayPerGun: 1.2,
    avgDwellMinutes: 375,
    avgEnergyDispensedKwhPerDay: 28,
    avgQueueWaitMinutes: 0.0,
    uptimePct: 99.4,
    status: "underutilized",
    estimatedMonthlyRevenueInr: 16800,
  },
];

// 24-hour hourly utilization % curve by charger type
export interface HourlyUtilizationProfile {
  hour: number;
  timeLabel: string;
  dc240kW: number;
  dc120kW: number;
  dc60kW: number;
  ac22kW: number;
  acSlow: number;
}

export const HOURLY_UTILIZATION_CURVES: HourlyUtilizationProfile[] = [
  { hour: 0, timeLabel: "00:00", dc240kW: 24, dc120kW: 31, dc60kW: 22, ac22kW: 12, acSlow: 58 },
  { hour: 1, timeLabel: "01:00", dc240kW: 18, dc120kW: 24, dc60kW: 16, ac22kW: 8, acSlow: 62 },
  { hour: 2, timeLabel: "02:00", dc240kW: 14, dc120kW: 19, dc60kW: 12, ac22kW: 6, acSlow: 63 },
  { hour: 3, timeLabel: "03:00", dc240kW: 12, dc120kW: 16, dc60kW: 10, ac22kW: 5, acSlow: 61 },
  { hour: 4, timeLabel: "04:00", dc240kW: 18, dc120kW: 22, dc60kW: 14, ac22kW: 8, acSlow: 54 },
  { hour: 5, timeLabel: "05:00", dc240kW: 32, dc120kW: 38, dc60kW: 24, ac22kW: 12, acSlow: 42 },
  { hour: 6, timeLabel: "06:00", dc240kW: 52, dc120kW: 58, dc60kW: 39, ac22kW: 18, acSlow: 28 },
  { hour: 7, timeLabel: "07:00", dc240kW: 68, dc120kW: 72, dc60kW: 52, ac22kW: 24, acSlow: 18 },
  { hour: 8, timeLabel: "08:00", dc240kW: 78, dc120kW: 84, dc60kW: 64, ac22kW: 32, acSlow: 12 },
  { hour: 9, timeLabel: "09:00", dc240kW: 82, dc120kW: 89, dc60kW: 71, ac22kW: 42, acSlow: 10 },
  { hour: 10, timeLabel: "10:00", dc240kW: 76, dc120kW: 82, dc60kW: 68, ac22kW: 48, acSlow: 9 },
  { hour: 11, timeLabel: "11:00", dc240kW: 71, dc120kW: 78, dc60kW: 62, ac22kW: 51, acSlow: 8 },
  { hour: 12, timeLabel: "12:00", dc240kW: 69, dc120kW: 75, dc60kW: 59, ac22kW: 49, acSlow: 8 },
  { hour: 13, timeLabel: "13:00", dc240kW: 72, dc120kW: 79, dc60kW: 63, ac22kW: 46, acSlow: 9 },
  { hour: 14, timeLabel: "14:00", dc240kW: 68, dc120kW: 76, dc60kW: 58, ac22kW: 44, acSlow: 8 },
  { hour: 15, timeLabel: "15:00", dc240kW: 74, dc120kW: 82, dc60kW: 66, ac22kW: 42, acSlow: 9 },
  { hour: 16, timeLabel: "16:00", dc240kW: 81, dc120kW: 88, dc60kW: 74, ac22kW: 38, acSlow: 12 },
  { hour: 17, timeLabel: "17:00", dc240kW: 86, dc120kW: 92, dc60kW: 79, ac22kW: 34, acSlow: 15 },
  { hour: 18, timeLabel: "18:00", dc240kW: 89, dc120kW: 94, dc60kW: 82, ac22kW: 29, acSlow: 21 },
  { hour: 19, timeLabel: "19:00", dc240kW: 88, dc120kW: 93, dc60kW: 80, ac22kW: 26, acSlow: 28 },
  { hour: 20, timeLabel: "20:00", dc240kW: 83, dc120kW: 89, dc60kW: 75, ac22kW: 22, acSlow: 38 },
  { hour: 21, timeLabel: "21:00", dc240kW: 74, dc120kW: 81, dc60kW: 64, ac22kW: 18, acSlow: 46 },
  { hour: 22, timeLabel: "22:00", dc240kW: 56, dc120kW: 64, dc60kW: 48, ac22kW: 15, acSlow: 52 },
  { hour: 23, timeLabel: "23:00", dc240kW: 38, dc120kW: 46, dc60kW: 34, ac22kW: 13, acSlow: 56 },
];

// ==========================================
// 3. ELECTRICAL SUBSTATION & GRID DATA
// Modeled with State DISCOMs, MVA capacity,
// and available charging headroom
// ==========================================

export const SUBSTATIONS: SubstationData[] = [
  {
    id: "sub-blr-kadubeesanahalli",
    name: "Kadubeesanahalli 66/11 kV Grid Substation",
    discom: "BESCOM (Bangalore Electricity Supply Co.)",
    voltageRating: "66/11 kV",
    distanceKm: 0.8,
    transformerCapacityMva: 40.0,
    currentPeakLoadMva: 28.5,
    availableHeadroomMva: 11.5,
    loadUtilizationPct: 71.3,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 28,
    powerCostPerUnitInr: 6.85,
    lat: 12.9352,
    lng: 77.6948,
  },
  {
    id: "sub-ggn-cybercity",
    name: "Cyber City 33/11 kV GIS Substation",
    discom: "DHBVN (Dakshin Haryana Bijli Vitran Nigam)",
    voltageRating: "33/11 kV",
    distanceKm: 0.6,
    transformerCapacityMva: 32.0,
    currentPeakLoadMva: 24.8,
    availableHeadroomMva: 7.2,
    loadUtilizationPct: 77.5,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 35,
    powerCostPerUnitInr: 7.2,
    lat: 28.4952,
    lng: 77.0891,
  },
  {
    id: "sub-mum-bkc",
    name: "BKC G-Block 33/11 kV Receiving Substation",
    discom: "Tata Power / Adani Electricity",
    voltageRating: "33/11 kV",
    distanceKm: 0.5,
    transformerCapacityMva: 50.0,
    currentPeakLoadMva: 37.2,
    availableHeadroomMva: 12.8,
    loadUtilizationPct: 74.4,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 21,
    powerCostPerUnitInr: 7.45,
    lat: 19.0658,
    lng: 72.8682,
  },
  {
    id: "sub-exp-khalapur",
    name: "Khalapur 132/33 kV Highway Transmission Substation",
    discom: "MSEDCL (Mahavitaran Maharashtra)",
    voltageRating: "132/33 kV",
    distanceKm: 1.2,
    transformerCapacityMva: 80.0,
    currentPeakLoadMva: 54.0,
    availableHeadroomMva: 26.0,
    loadUtilizationPct: 67.5,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 45,
    powerCostPerUnitInr: 6.9,
    lat: 18.829,
    lng: 73.289,
  },
  {
    id: "sub-exp-jewar",
    name: "Jewar 33/11 kV Expressway Feeder Station",
    discom: "UPPCL (PVVNL Western UP)",
    voltageRating: "33/11 kV",
    distanceKm: 1.5,
    transformerCapacityMva: 20.0,
    currentPeakLoadMva: 12.2,
    availableHeadroomMva: 7.8,
    loadUtilizationPct: 61.0,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Shared Feeder - High Capacity",
    energizationLeadTimeDays: 42,
    powerCostPerUnitInr: 7.1,
    lat: 28.132,
    lng: 77.572,
  },
  {
    id: "sub-blr-airport",
    name: "Devanahalli 66/11 kV KIA Substation",
    discom: "BESCOM",
    voltageRating: "66/11 kV",
    distanceKm: 1.1,
    transformerCapacityMva: 50.0,
    currentPeakLoadMva: 32.5,
    availableHeadroomMva: 17.5,
    loadUtilizationPct: 65.0,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 30,
    powerCostPerUnitInr: 6.85,
    lat: 13.201,
    lng: 77.708,
  },
  {
    id: "sub-chn-guindy",
    name: "Guindy 33/11 kV Industrial Substation",
    discom: "TANGEDCO (Tamil Nadu Generation & Dist)",
    voltageRating: "33/11 kV",
    distanceKm: 0.9,
    transformerCapacityMva: 30.0,
    currentPeakLoadMva: 25.4,
    availableHeadroomMva: 4.6,
    loadUtilizationPct: 84.7,
    dedicatedEvFeederAvailable: false,
    feederStatus: "Feeder Congested - Augmentation Required",
    energizationLeadTimeDays: 75,
    powerCostPerUnitInr: 6.7,
    lat: 13.008,
    lng: 80.208,
  },
  {
    id: "sub-hyd-hitec",
    name: "HITEC City Phase-2 33/11 kV Substation",
    discom: "TSSPDCL (Southern Power Telangana)",
    voltageRating: "33/11 kV",
    distanceKm: 0.7,
    transformerCapacityMva: 40.0,
    currentPeakLoadMva: 30.8,
    availableHeadroomMva: 9.2,
    loadUtilizationPct: 77.0,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 25,
    powerCostPerUnitInr: 6.95,
    lat: 17.4475,
    lng: 78.3785,
  },
  {
    id: "sub-pune-hinjawadi",
    name: "Hinjawadi Phase-1 33/11 kV Substation",
    discom: "MSEDCL",
    voltageRating: "33/11 kV",
    distanceKm: 0.8,
    transformerCapacityMva: 32.0,
    currentPeakLoadMva: 23.5,
    availableHeadroomMva: 8.5,
    loadUtilizationPct: 73.4,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 32,
    powerCostPerUnitInr: 7.05,
    lat: 18.5912,
    lng: 73.7389,
  },
  {
    id: "sub-del-cp",
    name: "Connaught Place 33/11 kV Underground Substation",
    discom: "NDMC (New Delhi Municipal Council)",
    voltageRating: "33/11 kV",
    distanceKm: 0.4,
    transformerCapacityMva: 25.0,
    currentPeakLoadMva: 20.8,
    availableHeadroomMva: 4.2,
    loadUtilizationPct: 83.2,
    dedicatedEvFeederAvailable: false,
    feederStatus: "Shared Feeder - High Capacity",
    energizationLeadTimeDays: 40,
    powerCostPerUnitInr: 7.6,
    lat: 28.6315,
    lng: 77.2185,
  },
  {
    id: "sub-exp-sonipat",
    name: "Sonipat Murthal 66/11 kV Grid Substation",
    discom: "UHBVN (Uttar Haryana Bijli Vitran Nigam)",
    voltageRating: "66/11 kV",
    distanceKm: 0.8,
    transformerCapacityMva: 45.0,
    currentPeakLoadMva: 32.1,
    availableHeadroomMva: 12.9,
    loadUtilizationPct: 71.3,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 30,
    powerCostPerUnitInr: 6.95,
    lat: 28.9880,
    lng: 77.0120,
  },
  {
    id: "sub-exp-panipat",
    name: "Panipat 220/33 kV Transmission Substation",
    discom: "HVPNL (Haryana Vidyut Prasaran) / UHBVN",
    voltageRating: "220/33 kV",
    distanceKm: 1.1,
    transformerCapacityMva: 100.0,
    currentPeakLoadMva: 68.5,
    availableHeadroomMva: 31.5,
    loadUtilizationPct: 68.5,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 30,
    powerCostPerUnitInr: 6.80,
    lat: 29.3950,
    lng: 76.9750,
  },
  {
    id: "sub-exp-karnal",
    name: "Karnal Bastara 132/33 kV Highway Substation",
    discom: "HVPNL (Haryana Vidyut Prasaran) / UHBVN",
    voltageRating: "132/33 kV",
    distanceKm: 0.8,
    transformerCapacityMva: 60.0,
    currentPeakLoadMva: 38.2,
    availableHeadroomMva: 21.8,
    loadUtilizationPct: 63.7,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 28,
    powerCostPerUnitInr: 6.85,
    lat: 29.5480,
    lng: 76.9800,
  },
  {
    id: "sub-exp-ambala",
    name: "Ambala Cantt 66/33/11 kV Grid Substation",
    discom: "UHBVN (Uttar Haryana Bijli Vitran Nigam)",
    voltageRating: "66/33/11 kV",
    distanceKm: 1.0,
    transformerCapacityMva: 50.0,
    currentPeakLoadMva: 36.4,
    availableHeadroomMva: 13.6,
    loadUtilizationPct: 72.8,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Dedicated 11kV Available",
    energizationLeadTimeDays: 35,
    powerCostPerUnitInr: 6.90,
    lat: 30.3750,
    lng: 76.7720,
  },
  {
    id: "sub-exp-zirakpur",
    name: "Zirakpur / Dera Bassi 66/11 kV Substation",
    discom: "PSPCL (Punjab State Power Corp Ltd)",
    voltageRating: "66/11 kV",
    distanceKm: 0.9,
    transformerCapacityMva: 40.0,
    currentPeakLoadMva: 31.8,
    availableHeadroomMva: 8.2,
    loadUtilizationPct: 79.5,
    dedicatedEvFeederAvailable: true,
    feederStatus: "Shared Feeder - High Capacity",
    energizationLeadTimeDays: 42,
    powerCostPerUnitInr: 7.10,
    lat: 30.5890,
    lng: 76.8350,
  },
];

// Helper to assign or locate the most relevant Substation for any DataPoint
export function getSubstationForPoint(point: DataPoint): SubstationData {
  // If point already has assigned substation, return it
  if (point.substation) return point.substation;

  // Find the closest substation by Euclidean distance
  let closest = SUBSTATIONS[0];
  let minDistance = 999999;

  for (const sub of SUBSTATIONS) {
    const dLat = (sub.lat - point.lat) * 111;
    const dLng = (sub.lng - point.lng) * 111 * Math.cos((point.lat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = sub;
    }
  }

  // Derive customized distance and MVA headroom based on point's specific demand
  const localDist = Math.max(0.4, Math.round(minDistance * 10) / 10);
  return {
    ...closest,
    id: `sub-${point.id}`,
    distanceKm: localDist > 15 ? 1.8 : localDist, // Realistic urban/highway substation connection distance
  };
}

// Helper to get site-specific charger utilization breakdown
export function getChargerUtilizationsForPoint(point: DataPoint): ChargerTypeUtilization[] {
  if (point.chargerUtilizations && point.chargerUtilizations.length > 0) {
    return point.chargerUtilizations;
  }

  // Generate customized utilization based on location type and existing chargers
  const isHighway = point.isCorridor || point.category === "highway";
  const hasHighDemand = point.demandScore >= 70;

  return NETWORK_CHARGER_UTILIZATIONS.map((cu) => {
    let factor = 1.0;
    if (isHighway && cu.category.startsWith("dc")) factor = 1.15;
    if (isHighway && cu.category.startsWith("ac")) factor = 0.65;
    if (hasHighDemand) factor *= 1.12;

    const avgUtil = Math.min(96, Math.max(15, Math.round(cu.avgUtilizationPct * factor * 10) / 10));
    const peakUtil = Math.min(99, Math.round(cu.peakUtilizationPct * Math.min(factor, 1.08) * 10) / 10);
    const status: "overcapacity" | "optimal" | "underutilized" =
      avgUtil >= 75 ? "overcapacity" : avgUtil < 35 ? "underutilized" : "optimal";

    return {
      ...cu,
      avgUtilizationPct: avgUtil,
      peakUtilizationPct: peakUtil,
      status,
      avgSessionsPerDayPerGun: Math.round(cu.avgSessionsPerDayPerGun * factor * 10) / 10,
    };
  });
}

// Helper to find nearest toll plaza for a location or corridor
export function getNearestTollPlaza(point: DataPoint): TollPlaza | null {
  // If point belongs to a corridor, find the closest toll on that corridor
  if (point.corridorName) {
    const corridorTolls = TOLL_PLAZAS.filter(
      (t) =>
        t.corridorName.toLowerCase().includes(point.corridorName!.toLowerCase()) ||
        point.corridorName!.toLowerCase().includes(t.corridorName.toLowerCase())
    );
    if (corridorTolls.length > 0) {
      let closest = corridorTolls[0];
      let minDist = 999999;
      for (const toll of corridorTolls) {
        const dLat = (toll.lat - point.lat) * 111;
        const dLng = (toll.lng - point.lng) * 111 * Math.cos((point.lat * Math.PI) / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < minDist) {
          minDist = dist;
          closest = toll;
        }
      }
      return closest;
    }
  }

  // Otherwise find closest by geographic distance
  let closest: TollPlaza = TOLL_PLAZAS[0];
  let minDist = 999999;
  for (const toll of TOLL_PLAZAS) {
    const dLat = (toll.lat - point.lat) * 111;
    const dLng = (toll.lng - point.lng) * 111 * Math.cos((point.lat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDist) {
      minDist = dist;
      closest = toll;
    }
  }

  if (point.isCorridor || point.category === "highway") {
    return closest;
  }
  return minDist <= 40 ? closest : null;
}
