import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Database,
  Leaf,
  MapPin,
  ShieldCheck,
  Thermometer,
  UploadCloud,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import palmGroveImage from "../assets/ksa-palms.jpg";
import { PERMISSIONS } from "../auth/permissions";
import { recordActivity } from "../firebase/services/activityLogService";
import { createAlertRecord, subscribeToAlerts } from "../firebase/services/alertsService";
import { subscribeToRecommendations } from "../firebase/services/recommendationsService";
import { importSensorReadingsFile } from "../firebase/services/sensorImportService";
import {
  fetchLatestSensorReadingsFeed,
  subscribeToSensorReadingsFeed,
} from "../firebase/services/sensorReadingsService";
import { subscribeToStations } from "../firebase/services/stationsService";
import { saveTelemetrySnapshot } from "../firebase/services/telemetryService";
import { getRoleAwareAlerts } from "../utils/alerts";
import { buildMissionId, getActiveMission, getSelectedStation, setActiveMission, setSelectedStation } from "../utils/missionContext";
import "./Dashboard.css";

const RULES = {
  Temperature: { warning: 42, critical: 48, direction: "high", unit: "C" },
  CO2: { warning: 1000, critical: 1400, direction: "high", unit: "ppm" },
  Humidity: { warning: 30, critical: 22, direction: "low", unit: "%" },
};

const ALERT_ACTIONS = {
  Temperature: [
    "Water this area now to help cool the crop.",
    "Wait before spraying until the weather gets cooler.",
    "Check the leaves for heat damage or dryness.",
  ],
  CO2: [
    "Let more fresh air into this area now.",
    "Check that fans or air openings are working.",
    "Watch this area closely and check the reading again soon.",
  ],
  Humidity: [
    "Add water or light misting to this area now.",
    "Check the soil to make sure it is not too dry.",
    "Avoid pruning or heavy work in this area for now.",
  ],
};

const GPS_RELIABILITY_WARNING_THRESHOLD = 90;
const GPS_RELIABILITY_CRITICAL_THRESHOLD = 75;
const ANOMALY_RATE_WARNING_THRESHOLD = 5;
const ANOMALY_RATE_CRITICAL_THRESHOLD = 15;

const containsAny = (value, terms) => {
  const source = String(value || "").toLowerCase();
  return terms.some((term) => source.includes(term));
};

const getFarmerAlertKind = (alert) => {
  const joined = `${alert?.title || ""} ${alert?.parameter || ""} ${alert?.displayMessage || ""} ${alert?.nextStep || ""}`.toLowerCase();

  if (containsAny(joined, ["rain", "heat", "wind", "weather", "flight"])) {
    return "weather";
  }

  if (containsAny(joined, ["fertil", "irrig", "inspection", "due", "reminder", "task", "record"])) {
    return "task";
  }

  return "disease";
};

const getFarmerSeverityLevel = (severity) => {
  if (severity === "Critical") return "High";
  if (severity === "Warning") return "Medium";
  return "Low";
};

const getFarmerAlertIcon = (alert) => {
  const kind = getFarmerAlertKind(alert);

  if (kind === "weather") return "weather";
  if (kind === "task") {
    return containsAny(`${alert?.title || ""} ${alert?.displayMessage || ""}`, ["record", "monthly", "reminder"])
      ? "task"
      : "task";
  }

  return "disease";
};

const formatAlertTimeAgo = (time) => {
  const date = new Date(time);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs) || diffMs < 0) return "Just now";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const FarmerDashboardIcon = ({ name, className = "" }) => {
  const icons = {
    leaf: <path d="M18.5 5.5c-5.2 0-9 2.1-11.4 6.3-1.5 2.6-1.8 5.3-1.9 6.7 1.4 0 4.1-.3 6.7-1.9 4.2-2.4 6.3-6.2 6.3-11.4 0-.4 0-.7-.1-.9-.2.1-.5.1-.8.1ZM7.7 17.3c2.5-3.2 5.4-5.8 8.6-7.9" />,
    stations: (
      <>
        <path d="M12 4.6v14.8" />
        <path d="M8.2 8.3a5.4 5.4 0 0 0 0 7.4M15.8 8.3a5.4 5.4 0 0 1 0 7.4" />
        <path d="M5.5 5.6a9.2 9.2 0 0 0 0 12.8M18.5 5.6a9.2 9.2 0 0 1 0 12.8" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
    active: (
      <>
        <circle cx="12" cy="12" r="8.8" />
        <path d="m8.8 12.2 2.1 2.1 4.5-4.8" />
      </>
    ),
    online: (
      <>
        <circle cx="12" cy="12" r="8.8" />
        <path d="M7.7 12h8.6M12 7.7c1.4 1.2 2.2 2.7 2.2 4.3S13.4 15.1 12 16.3M12 7.7c-1.4 1.2-2.2 2.7-2.2 4.3s.8 3.1 2.2 4.3M12 3.8v16.4" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3.4 21.2 19H2.8L12 3.4Z" />
        <path d="M12 8.8v5.1" />
        <circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
    disease: (
      <>
        <circle cx="12" cy="12" r="8.7" />
        <path d="M8.4 8.7c1.1.1 1.9.8 2.4 1.6.4.6.7 1.3 1.2 1.8.6.6 1.5 1 2.5 1.2M7.7 15.4c1.2-.4 2.5-.6 3.8-.6 1.8 0 3.6.4 5.1 1.3M9.3 7.1l5.6 9.8" />
      </>
    ),
    weather: (
      <>
        <path d="M7.8 16.4h8a3.2 3.2 0 0 0 .2-6.4 4.7 4.7 0 0 0-8.9 1.5A2.7 2.7 0 0 0 7.8 16.4Z" />
        <path d="M9.3 18.1v2M12 18.8v2M14.7 18.1v2" />
      </>
    ),
    task: (
      <>
        <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
        <path d="M8 3.8v3.1M16 3.8v3.1M4 9.8h16" />
        <path d="M8 13h2M12 13h2M8 16.2h2M12 16.2h2" />
      </>
    ),
    chevron: <path d="m9 6 6 6-6 6" />,
    bulb: (
      <>
        <path d="M12 3.8a5.5 5.5 0 0 0-3.8 9.5c.8.7 1.2 1.6 1.4 2.6h4.8c.2-1 .6-1.9 1.4-2.6A5.5 5.5 0 0 0 12 3.8Z" />
        <path d="M9.8 18h4.4M10.4 20h3.2" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

const getSeverity = (value, rule) => {
  if (!rule) return null;

  if (rule.direction === "high") {
    if (value >= rule.critical) return "Critical";
    if (value >= rule.warning) return "Warning";
    return null;
  }

  if (value <= rule.critical) return "Critical";
  if (value <= rule.warning) return "Warning";
  return null;
};

const calculateAbsoluteHumidity = (temperature, relativeHumidity) => {
  const saturation = 6.112 * Math.exp((17.67 * temperature) / (temperature + 243.5));
  return (2.1674 * ((relativeHumidity / 100) * saturation)) / (273.15 + temperature) * 100;
};

const getPacketGroupingKey = (reading) =>
  [
    reading.packetId ?? "packet",
    reading.groundDate || reading.droneDate || String(reading.timestamp || "").slice(0, 10) || "date",
    reading.groundTime || reading.droneTime || String(reading.timestamp || "").slice(11, 19) || reading.id,
  ].join("|");

const formatMetricValue = (value, unit, digits = 1) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "--";
  }

  const numericValue = Number(value);
  const formattedValue =
    digits === 0 ? Math.round(numericValue).toString() : numericValue.toFixed(digits);

  return unit ? `${formattedValue} ${unit}` : formattedValue;
};

const getAverageMetricValue = (readings, sensorType) => {
  const numericValues = readings
    .filter((item) => item.sensorType === sensorType)
    .map((item) => Number(item.value))
    .filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return null;
  }

  return numericValues.reduce((total, value) => total + value, 0) / numericValues.length;
};

const getMetricStats = (rows, key) => {
  const numericValues = rows
    .map((item) => Number(item[key]))
    .filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return {
      avg: null,
      min: null,
      max: null,
    };
  }

  return {
    avg: numericValues.reduce((total, value) => total + value, 0) / numericValues.length,
    min: Math.min(...numericValues),
    max: Math.max(...numericValues),
  };
};

const formatRangeValue = (value, unit, digits = 2) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "--";
  }

  return `${Number(value).toFixed(digits)}${unit ? ` ${unit}` : ""}`;
};

const formatPercentValue = (value, digits = 0) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "--";
  }

  return `${Number(value).toFixed(digits)}%`;
};

const formatDuration = (startText, endText) => {
  if (!startText || !endText) return "No session window";

  const start = new Date(startText);
  const end = new Date(endText);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "No session window";
  }

  const totalSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${String(seconds).padStart(2, "0")}s session`;
};

const normalizeCoordinateForComparison = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric.toFixed(6) : normalized;
};

const detectSessionAnomalies = (rows) => {
  const anomalies = [];
  const orderedRows = [...rows].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  orderedRows.forEach((row, index) => {
    const packetLabel = row.packetRaw || row.packet || `Row ${index + 1}`;
    const rowLabel = index + 1;

    if (row.droneGPSValid === false) {
      anomalies.push({
        rowLabel,
        packetLabel,
        severity: "Error",
        message: "Drone GPS is marked invalid for this uploaded packet.",
      });
    }

    if (row.groundGPSValid === false) {
      anomalies.push({
        rowLabel,
        packetLabel,
        severity: "Error",
        message: "Ground GPS is marked invalid for this uploaded packet.",
      });
    }

    const latValue = Number(row.latRaw || row.lat);
    const lonValue = Number(row.lonRaw || row.lon);

    if (
      (Number.isFinite(latValue) && Math.abs(latValue) < 1) ||
      (Number.isFinite(lonValue) && Math.abs(lonValue) < 1)
    ) {
      anomalies.push({
        rowLabel,
        packetLabel,
        severity: "Warning",
        message: "Coordinates look suspiciously close to zero and may indicate a sensor glitch.",
      });
    }

    if (/(firmware|timeout|i2c|error|log)/i.test(String(row.imageName || ""))) {
      anomalies.push({
        rowLabel,
        packetLabel,
        severity: "Warning",
        message: "Image name looks like a device log or error string instead of a normal image reference.",
      });
    }
  });

  let runStart = 0;

  while (runStart < orderedRows.length) {
    const row = orderedRows[runStart];
    const startCoordKey = `${normalizeCoordinateForComparison(row.latRaw || row.lat)}|${normalizeCoordinateForComparison(row.lonRaw || row.lon)}`;

    if (!startCoordKey || startCoordKey === "|") {
      runStart += 1;
      continue;
    }

    let runEnd = runStart + 1;

    while (runEnd < orderedRows.length) {
      const next = orderedRows[runEnd];
      const nextCoordKey = `${normalizeCoordinateForComparison(next.latRaw || next.lat)}|${normalizeCoordinateForComparison(next.lonRaw || next.lon)}`;

      if (nextCoordKey !== startCoordKey) {
        break;
      }

      runEnd += 1;
    }

    if (runEnd - runStart >= 5) {
      const startPacket = orderedRows[runStart].packetRaw || orderedRows[runStart].packet || runStart + 1;
      const endPacket = orderedRows[runEnd - 1].packetRaw || orderedRows[runEnd - 1].packet || runEnd;
      anomalies.push({
        rowLabel: `${runStart + 1}-${runEnd}`,
        packetLabel: `${startPacket}-${endPacket}`,
        severity: "Warning",
        message: "Coordinates stayed frozen across multiple consecutive packets, which may mean GPS stopped updating.",
      });
    }

    runStart = runEnd;
  }

  return anomalies.slice(0, 8);
};

const getMetricSeverity = (sensorType, value) => {
  if (value == null) return null;

  if (sensorType === "temperature") {
    return getSeverity(value, RULES.Temperature);
  }

  if (sensorType === "humidity") {
    return getSeverity(value, RULES.Humidity);
  }

  if (sensorType === "co2") {
    return getSeverity(value, RULES.CO2);
  }

  return null;
};

const buildPacketMetricRows = (readings) => {
  const grouped = {};

  readings.forEach((reading) => {
    const packetKey = getPacketGroupingKey(reading);

    if (!grouped[packetKey]) {
      grouped[packetKey] = {
        packet: reading.packetId ?? packetKey,
        packetRaw: reading.packetIdRaw || "",
        packetKey,
        timestamp: reading.timestamp || null,
        location: reading.location || "",
        imageName: reading.imageName || "",
        importedByName: reading.importedByName || "",
        importedByEmail: reading.importedByEmail || "",
        stationId: reading.stationId || "",
        stationName: reading.stationName || "",
        missionId: reading.missionId || "",
        lat: reading.lat ?? reading.coords?.lat ?? null,
        lon: reading.lon ?? reading.coords?.lon ?? null,
        latRaw: reading.latRaw || "",
        lonRaw: reading.lonRaw || "",
        groundGPSValid: reading.groundGPSValid ?? null,
        droneGPSValid: reading.droneGPSValid ?? null,
        temperature: null,
        temperatureRaw: "",
        humidity: null,
        humidityRaw: "",
        co2: null,
        co2Raw: "",
        absoluteHumidity: null,
        absoluteHumidityRaw: "",
      };
    }

    if (
      reading.timestamp &&
      (!grouped[packetKey].timestamp || new Date(reading.timestamp) > new Date(grouped[packetKey].timestamp))
    ) {
      grouped[packetKey].timestamp = reading.timestamp;
    }

    if (!grouped[packetKey].location && reading.location) grouped[packetKey].location = reading.location;
    if (!grouped[packetKey].imageName && reading.imageName) grouped[packetKey].imageName = reading.imageName;
    if (!grouped[packetKey].importedByName && reading.importedByName) grouped[packetKey].importedByName = reading.importedByName;
    if (!grouped[packetKey].importedByEmail && reading.importedByEmail) grouped[packetKey].importedByEmail = reading.importedByEmail;
    if (!grouped[packetKey].stationId && reading.stationId) grouped[packetKey].stationId = reading.stationId;
    if (!grouped[packetKey].stationName && reading.stationName) grouped[packetKey].stationName = reading.stationName;
    if (!grouped[packetKey].missionId && reading.missionId) grouped[packetKey].missionId = reading.missionId;
    if (grouped[packetKey].lat == null) grouped[packetKey].lat = reading.lat ?? reading.coords?.lat ?? null;
    if (grouped[packetKey].lon == null) grouped[packetKey].lon = reading.lon ?? reading.coords?.lon ?? null;
    if (!grouped[packetKey].latRaw && reading.latRaw) grouped[packetKey].latRaw = reading.latRaw;
    if (!grouped[packetKey].lonRaw && reading.lonRaw) grouped[packetKey].lonRaw = reading.lonRaw;
    if (grouped[packetKey].groundGPSValid == null && reading.groundGPSValid != null) {
      grouped[packetKey].groundGPSValid = reading.groundGPSValid;
    }
    if (grouped[packetKey].droneGPSValid == null && reading.droneGPSValid != null) {
      grouped[packetKey].droneGPSValid = reading.droneGPSValid;
    }

    if (reading.sensorType === "temperature") {
      grouped[packetKey].temperature = Number(reading.value);
      grouped[packetKey].temperatureRaw = String(reading.rawValue || "").trim();
    }
    if (reading.sensorType === "humidity") {
      grouped[packetKey].humidity = Number(reading.value);
      grouped[packetKey].humidityRaw = String(reading.rawValue || "").trim();
    }
    if (reading.sensorType === "co2") {
      grouped[packetKey].co2 = Number(reading.value);
      grouped[packetKey].co2Raw = String(reading.rawValue || "").trim();
    }
    if (reading.sensorType === "absoluteHumidity") {
      grouped[packetKey].absoluteHumidity = Number(reading.value);
      grouped[packetKey].absoluteHumidityRaw = String(reading.rawValue || "").trim();
    }
  });

  return Object.values(grouped)
    .map((item) => {
      const temperatureSeverity = getMetricSeverity("temperature", item.temperature);
      const humiditySeverity = getMetricSeverity("humidity", item.humidity);
      const co2Severity = getMetricSeverity("co2", item.co2);
      const severities = [temperatureSeverity, humiditySeverity, co2Severity].filter(Boolean);
      const overallSeverity = severities.includes("Critical")
        ? "Critical"
        : severities.includes("Warning")
        ? "Warning"
        : "Normal";

      return {
        ...item,
        absoluteHumidity:
          item.absoluteHumidity != null
            ? item.absoluteHumidity
            : item.temperature != null && item.humidity != null
            ? calculateAbsoluteHumidity(item.temperature, item.humidity)
            : null,
        temperatureSeverity,
        humiditySeverity,
        co2Severity,
        overallSeverity,
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const buildMissionOperatorAlerts = (packetRows, anomalies, context = {}) => {
  const alerts = [];
  const missionTime = packetRows[0]?.timestamp || new Date().toISOString();
  const stationId = context.stationId || packetRows[0]?.stationId || "";
  const stationName = context.stationName || packetRows[0]?.stationName || "";
  const zone = context.zoneName || context.stationLocation || packetRows[0]?.location || "Selected station";
  const missionId = context.missionId || packetRows[0]?.missionId || "";

  packetRows.forEach((row) => {
    [
      {
        parameter: "Temperature",
        severity: row.temperatureSeverity,
        value: row.temperature,
        threshold: RULES.Temperature[row.temperatureSeverity === "Critical" ? "critical" : "warning"],
        title: `Temperature abnormal in packet ${row.packetRaw || row.packet}`,
        cause: "Temperature exceeded the configured mission threshold.",
      },
      {
        parameter: "Humidity",
        severity: row.humiditySeverity,
        value: row.humidity,
        threshold: RULES.Humidity[row.humiditySeverity === "Critical" ? "critical" : "warning"],
        title: `Humidity abnormal in packet ${row.packetRaw || row.packet}`,
        cause: "Humidity moved outside the configured mission threshold.",
      },
      {
        parameter: "CO2",
        severity: row.co2Severity,
        value: row.co2,
        threshold: RULES.CO2[row.co2Severity === "Critical" ? "critical" : "warning"],
        title: `CO2 abnormal in packet ${row.packetRaw || row.packet}`,
        cause: "CO2 exceeded the configured mission threshold.",
      },
    ].forEach((item) => {
      if (!item.severity || item.value == null) return;

      alerts.push({
        id: `${missionId || "mission"}-${row.packet}-${item.parameter.toLowerCase()}-${item.severity.toLowerCase()}`,
        title: item.title,
        parameter: item.parameter,
        severity: item.severity,
        value: item.value,
        measuredValue: item.value,
        threshold: item.threshold,
        conditionDetected: item.cause,
        status: "Open",
        time: row.timestamp || missionTime,
        zone,
        stationId,
        stationName,
        missionId,
        category: "environmental",
        targetRoles: ["operator", "farmer"],
        cause: item.cause,
        nextStep: "Open mission results, inspect the affected packet, and verify the station condition.",
        recommendations: ALERT_ACTIONS[item.parameter] || [],
      });
    });
  });

  const gpsValidCount = packetRows.filter(
    (packet) => packet.groundGPSValid === true || packet.droneGPSValid === true
  ).length;
  const gpsReliability = packetRows.length ? (gpsValidCount / packetRows.length) * 100 : null;

  if (gpsReliability != null && gpsReliability < GPS_RELIABILITY_WARNING_THRESHOLD) {
    const severity =
      gpsReliability < GPS_RELIABILITY_CRITICAL_THRESHOLD ? "Critical" : "Warning";
    alerts.push({
      id: `${missionId || "mission"}-gps-reliability`,
      title: "GPS reliability is below the mission target",
      parameter: "GPS Reliability",
      severity,
      value: Number(gpsReliability.toFixed(1)),
      measuredValue: Number(gpsReliability.toFixed(1)),
      threshold:
        severity === "Critical"
          ? GPS_RELIABILITY_CRITICAL_THRESHOLD
          : GPS_RELIABILITY_WARNING_THRESHOLD,
      conditionDetected: "Too many uploaded packets do not have valid GPS.",
      status: "Open",
      time: missionTime,
      zone,
      stationId,
      stationName,
      missionId,
      category: "operational",
      targetRoles: ["operator"],
      cause: "GPS reliability dropped below the required mission threshold.",
      nextStep: "Review invalid GPS packets and confirm whether the mission path can be trusted.",
      recommendations: [
        "Check the GPS validity flags for this mission.",
        "Review packet locations before using this mission for mapping or station review.",
      ],
    });
  }

  const anomalyRate = packetRows.length ? (anomalies.length / packetRows.length) * 100 : 0;

  if (packetRows.length && anomalyRate > ANOMALY_RATE_WARNING_THRESHOLD) {
    const severity =
      anomalyRate > ANOMALY_RATE_CRITICAL_THRESHOLD ? "Critical" : "Warning";
    alerts.push({
      id: `${missionId || "mission"}-anomaly-rate`,
      title: "Mission anomaly rate is above the allowed limit",
      parameter: "Anomaly Rate",
      severity,
      value: Number(anomalyRate.toFixed(1)),
      measuredValue: Number(anomalyRate.toFixed(1)),
      threshold:
        severity === "Critical"
          ? ANOMALY_RATE_CRITICAL_THRESHOLD
          : ANOMALY_RATE_WARNING_THRESHOLD,
      conditionDetected: "Too many uploaded packets were flagged as abnormal.",
      status: "Open",
      time: missionTime,
      zone,
      stationId,
      stationName,
      missionId,
      category: "operational",
      targetRoles: ["operator"],
      cause: "Mission anomaly rate exceeded the defined quality threshold.",
      nextStep: "Open the anomalies table and verify whether the mission should be accepted or repeated.",
      recommendations: [
        "Inspect flagged packets in the anomaly list.",
        "Confirm whether the mission results are reliable enough for operator review.",
      ],
    });
  }

  const invalidGpsPacketCount = packetRows.filter(
    (packet) => packet.groundGPSValid === false || packet.droneGPSValid === false
  ).length;

  if (invalidGpsPacketCount > 0) {
    alerts.push({
      id: `${missionId || "mission"}-invalid-gps-packets`,
      title: "Invalid GPS packets were detected in the uploaded mission",
      parameter: "Invalid GPS Packets",
      severity: invalidGpsPacketCount >= 3 ? "Critical" : "Warning",
      value: invalidGpsPacketCount,
      measuredValue: invalidGpsPacketCount,
      threshold: 0,
      conditionDetected: "One or more packets have invalid GPS flags.",
      status: "Open",
      time: missionTime,
      zone,
      stationId,
      stationName,
      missionId,
      category: "operational",
      targetRoles: ["operator"],
      cause: "Uploaded packets include invalid GPS readings.",
      nextStep: "Check the packet-level GPS flags and confirm whether station position analysis is still safe to use.",
      recommendations: [
        "Review the invalid GPS packets listed in the mission anomalies.",
        "Do not rely on GPS-dependent interpretation until the invalid packets are reviewed.",
      ],
    });
  }

  const suspiciousCoordinateIssue = anomalies.find((item) =>
    /coordinate|gps stopped updating|frozen/i.test(String(item.message || ""))
  );

  if (suspiciousCoordinateIssue) {
    alerts.push({
      id: `${missionId || "mission"}-suspicious-coordinates`,
      title: "Suspicious coordinates detected in uploaded mission data",
      parameter: "Coordinates",
      severity: "Warning",
      value: suspiciousCoordinateIssue.packetLabel,
      measuredValue: suspiciousCoordinateIssue.packetLabel,
      threshold: "Valid coordinates expected",
      conditionDetected: suspiciousCoordinateIssue.message,
      status: "Open",
      time: missionTime,
      zone,
      stationId,
      stationName,
      missionId,
      category: "operational",
      targetRoles: ["operator"],
      cause: "Uploaded coordinates appear frozen or unreliable.",
      nextStep: "Review the mission route and verify whether the uploaded coordinates match the selected station.",
      recommendations: [
        "Check the mission map or packet coordinates before using the upload for operator decisions.",
      ],
    });
  }

  return alerts;
};

const estimateReadingPayloadSizeGb = (readings) => {
  if (!readings.length) {
    return 0;
  }

  const totalBytes = new Blob([JSON.stringify(readings)]).size;
  return totalBytes / (1024 * 1024 * 1024);
};

const formatImportSummary = (result) => {
  if (!result) return "";

  const packets = Number(result.packetsProcessed || 0);
  const readings = Number(result.readingsWritten || 0);
  const skipped = Number(result.skippedRows || 0);
  const city = String(result.city || "").trim();
  const parts = [`${readings} readings added from ${packets} packet rows`];

  if (skipped > 0) {
    parts.push(`${skipped} rows skipped`);
  }

  if (city) {
    parts.push(`city: ${city}`);
  }

  return `${parts.join(", ")}.`;
};


const TEMPLATE_HEADERS = [
  "PacketID",
  "GroundDate",
  "GroundTime",
  "GroundLat",
  "GroundLon",
  "TempC",
  "RH",
  "AbsHumidity",
  "CO2ppm",
  "GroundGPSValid",
  "DroneDate",
  "DroneTime",
  "DroneLat",
  "DroneLon",
  "DroneGPSValid",
];

const IMPORT_FIELD_LABELS = {
  "packet id": "Packet ID",
  "image name": "Image Name",
  temperature: "Temperature",
  humidity: "Humidity",
  "absolute humidity": "Absolute Humidity",
  co2: "CO2 Level",
  "ground date": "Ground Date",
  "ground time": "Ground Time",
  "ground latitude": "Ground Latitude",
  "ground longitude": "Ground Longitude",
  "ground gps status": "Ground GPS Status",
  "drone date": "Drone Date",
  "drone time": "Drone Time",
  "drone latitude": "Drone Latitude",
  "drone longitude": "Drone Longitude",
  "drone gps status": "Drone GPS Status",
};


const extractMissingColumns = (message) => {
  const match = String(message || "").match(/(?:Missing(?: required headers?)?:)\s*(.+?)\.?$/i);

  if (!match) return [];

  return match[1]
    .split(/,| and /i)
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((item) => IMPORT_FIELD_LABELS[item.toLowerCase()] || item)
    .slice(0, 8);
};

const getImportModalContent = (status, message, language) => {
  const normalizedMessage = String(message || "").toLowerCase();
  const missingColumns = extractMissingColumns(message);
  const copy = {
    en: {
      uploadComplete: "Upload Complete",
      successTitle: "Data updated successfully.",
      successDescription: "Your farm data is ready, and you can see the updated readings now.",
      viewData: "View Data",
      uploading: "Uploading",
      loadingTitle: "Your data is being uploaded.",
      ok: "OK",
      uploadIssue: "File Validation Failed",
      fileNotSupported: "File validation failed",
      missingColumnsText: "Missing required headers:",
      tryAgain: "Try Again",
      downloadTemplate: "Download CSV Template",
      fileError: "File Error",
      fileUploadIssue: "File Upload Issue",
    },
    ar: {
      city: "City",
      chooseCity: "Select data city",
      readingCity: "City",
      uploadComplete: "اكتمل الرفع",
      successTitle: "تم تحديث البيانات بنجاح.",
      successDescription: "أصبحت بيانات المزرعة جاهزة ويمكنك الآن رؤية القراءات المحدثة.",
      viewData: "عرض البيانات",
      uploading: "جارٍ الرفع",
      loadingTitle: "جارٍ رفع بياناتك.",
      ok: "حسنًا",
      uploadIssue: "مشكلة في الرفع",
      fileNotSupported: "تنسيق الملف غير مدعوم",
      missingColumnsText: "ملف CSV ينقصه بعض الأعمدة المطلوبة:",
      tryAgain: "حاول مرة أخرى",
      downloadTemplate: "تنزيل القالب",
      fileError: "خطأ في الملف",
      fileUploadIssue: "مشكلة في رفع الملف",
    },
  }[language];

  if (status === "success") {
    return {
      badge: copy.uploadComplete,
      title: copy.successTitle,
      description: copy.successDescription,
      actionLabel: copy.viewData,
      secondaryActionLabel: "",
      missingColumns: [],
    };
  }

  if (status === "loading") {
    return {
      badge: copy.uploading,
      title: copy.loadingTitle,
      description: message,
      actionLabel: copy.ok,
      secondaryActionLabel: "",
      missingColumns: [],
    };
  }

  if (
    normalizedMessage.includes("missing required headers") ||
    normalizedMessage.includes("missing required columns") ||
    normalizedMessage.includes("download the template")
  ) {
    return {
      badge: copy.uploadIssue,
      title: copy.fileNotSupported,
      description: copy.missingColumnsText,
      actionLabel: copy.tryAgain,
      secondaryActionLabel: copy.downloadTemplate,
      missingColumns,
    };
  }

  return {
    badge: copy.fileError,
    title: copy.fileUploadIssue,
    description: message,
    actionLabel: copy.tryAgain,
    secondaryActionLabel: "",
    missingColumns: [],
  };
};

const formatOperatorDate = (value, options = {}) => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
};

const formatOperatorDateTime = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Waiting for upload";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getOperatorToneBySeverity = (severity) => {
  if (severity === "Critical" || severity === "Error" || severity === "High") return "red";
  if (severity === "Warning" || severity === "Medium") return "yellow";
  if (severity === "Info" || severity === "Low") return "blue";
  return "green";
};

const getOperatorIssueIcon = (title = "", description = "") => {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes("gps") || text.includes("coordinate")) return MapPin;
  if (text.includes("upload") || text.includes("file") || text.includes("missing")) return UploadCloud;
  if (text.includes("temperature") || text.includes("heat")) return Thermometer;
  return AlertTriangle;
};

const OperatorPanel = ({ children, className = "" }) => (
  <section className={`operator-dashboard-panel ${className}`.trim()}>{children}</section>
);

const OperatorPanelHeader = ({ title, subtitle, icon: Icon, actionLabel, onAction }) => (
  <div className="operator-dashboard-panel-head">
    <div className="operator-dashboard-panel-title">
      <span className="operator-dashboard-panel-icon">{Icon ? <Icon size={22} strokeWidth={2.2} /> : null}</span>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
    {actionLabel ? (
      <button type="button" className="operator-dashboard-panel-action" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </div>
);

const OperatorRoundIcon = ({ tone = "green", children }) => (
  <span className={`operator-round-icon ${tone}`}>{children}</span>
);

const OperatorMetricCard = ({ icon: Icon, label, value, detail, tone = "green", progress = null }) => (
  <article className="operator-metric-card">
    <div className="operator-metric-card-top">
      <OperatorRoundIcon tone={tone}>{Icon ? <Icon size={34} strokeWidth={2.3} /> : null}</OperatorRoundIcon>
      <div className="operator-metric-copy">
        <span>{label}</span>
        <strong className={tone}>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
    {progress != null ? (
      <div className="operator-metric-progress">
        <div className={tone} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
    ) : null}
  </article>
);

const OperatorLastUploadCard = ({ timestamp, packetCount, onOpenHistory }) => (
  <article className="operator-metric-card operator-last-upload-card">
    <div className="operator-metric-card-top">
      <OperatorRoundIcon tone="neutral">
        <Database size={34} strokeWidth={2.2} />
      </OperatorRoundIcon>
      <div className="operator-metric-copy">
        <span>Last Upload</span>
        <strong>{timestamp ? formatOperatorDateTime(timestamp) : "No uploads yet"}</strong>
        <small>{packetCount ? `${packetCount} packets uploaded` : ""}</small>
      </div>
    </div>
    <button type="button" className="operator-link-button" onClick={onOpenHistory}>
      View Upload History <ChevronRight size={16} strokeWidth={2.4} />
    </button>
  </article>
);

const OperatorTrendChart = ({ data }) => {
  const chartWidth = 700;
  const chartHeight = 170;
  const left = 44;
  const right = 18;
  const top = 18;
  const bottom = 26;
  const innerWidth = chartWidth - left - right;
  const innerHeight = chartHeight - top - bottom;
  const maxValue = 100;
  const getX = (index) =>
    left + (data.length <= 1 ? innerWidth / 2 : (innerWidth / (data.length - 1)) * index);
  const getY = (value) => top + innerHeight - ((Number(value) || 0) / maxValue) * innerHeight;

  const buildPoints = (key) =>
    data
      .map((item, index) => {
        const x = getX(index);
        const y = getY(item[key]);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="operator-trend-chart">
      <div className="operator-trend-legend">
        <span><i className="validity" />Validity Rate (%)</span>
        <span><i className="anomaly" />Anomaly Rate (%)</span>
        <span><i className="gps" />GPS Reliability (%)</span>
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="operator-trend-svg" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => {
          const y = top + (innerHeight / 4) * index;
          return <line key={index} x1={left} x2={chartWidth - right} y1={y} y2={y} />;
        })}
        <polyline className="validity" points={buildPoints("validity")} />
        <polyline className="gps" points={buildPoints("gps")} />
        <polyline className="anomaly" points={buildPoints("anomaly")} />
        {data.map((item, index) => (
          <g key={`${item.label}-points`}>
            <circle className="validity-point" cx={getX(index)} cy={getY(item.validity)} r="4.5" />
            <circle className="gps-point" cx={getX(index)} cy={getY(item.gps)} r="4.5" />
            <circle className="anomaly-point" cx={getX(index)} cy={getY(item.anomaly)} r="4.5" />
          </g>
        ))}
        {data.map((item, index) => {
          const x = getX(index);
          return (
            <text key={item.label} x={x} y={chartHeight - 4} textAnchor="middle">
              {item.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

const OperatorIssuesTable = ({ issues, onAction }) => (
  <div className="operator-table-card">
    {issues.length ? (
      <div className="operator-table operator-issues-table">
        <div className="operator-table-head">
          <span>Issue</span>
          <span>Affected</span>
          <span>Severity</span>
          <span>Action</span>
        </div>
        {issues.map((issue) => {
          const Icon = issue.icon;
          return (
            <div key={issue.id} className="operator-table-row">
              <div className="operator-issue-main">
                <OperatorRoundIcon tone={issue.tone}>
                  <Icon size={20} strokeWidth={2.2} />
                </OperatorRoundIcon>
                <div>
                  <strong>{issue.title}</strong>
                  <small>{issue.description}</small>
                </div>
              </div>
              <span>{issue.affected}</span>
              <span className={`operator-severity-pill ${issue.tone}`}>{issue.severity}</span>
              <button type="button" className="operator-table-action" onClick={onAction}>
                {issue.actionLabel}
              </button>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="operator-table-empty-state">No issues were generated from the uploaded data.</div>
    )}
  </div>
);

const OperatorUploadsTable = ({ rows }) => (
  <div className="operator-uploads-table">
    <div className="operator-uploads-head">
      <span>Station ID</span>
      <span>Location</span>
      <span>Packets</span>
      <span>Upload Time</span>
      <span>Status</span>
      <span>Validity</span>
      <span>Anomalies</span>
    </div>
    {rows.map((row) => (
      <div key={row.stationId} className={`operator-uploads-row ${row.status.toLowerCase()}`}>
        <span>{row.stationId}</span>
        <span>{row.location}</span>
        <span>{row.packetCount}</span>
        <span>{row.uploadTime}</span>
        <span className="operator-uploads-status">
          <i />
          {row.status}
        </span>
        <span>{row.validity}</span>
        <span>{row.anomalies}</span>
      </div>
    ))}
  </div>
);

function Dashboard({ embedded = false }) {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { language } = useLanguage();
  const shownAlertIdsRef = useRef(new Set());
  const fileInputRef = useRef(null);
  const alertTimingMeasurementRef = useRef(null);

  const [alerts, setAlerts] = useState([]);
  const [, setRecommendations] = useState([]);
  const [stations, setStations] = useState([]);
  const [sensorReadings, setSensorReadings] = useState([]);
  const [sensorFeedSource, setSensorFeedSource] = useState("firestore");
  const [sensorFeedError, setSensorFeedError] = useState("");
  const [rbacMessage, setRbacMessage] = useState("");
  const [alertPopup, setAlertPopup] = useState(null);
  const [generatedMissionAlerts, setGeneratedMissionAlerts] = useState([]);
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const [selectedSummaryDate, setSelectedSummaryDate] = useState("");
  const [importState, setImportState] = useState({
    status: "idle",
    message: "",
  });
  const [, setAlertTimingEstimate] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(() => getSelectedStation()?.stationId || "");
  const [activeMissionState, setActiveMissionState] = useState(() => getActiveMission());

  const availableStations = useMemo(
    () =>
      stations.filter((station) => {
        const status = String(station.status || "").trim().toLowerCase();
        return status !== "inactive" && status !== "disabled";
      }),
    [stations]
  );

  const selectedStation = useMemo(
    () =>
      availableStations.find(
        (station) =>
          String(station.stationId || station.id) === String(selectedStationId || "") ||
          String(station.id) === String(selectedStationId || "")
      ) || null,
    [availableStations, selectedStationId]
  );
  const stationScopedReadings = useMemo(() => {
    if (!selectedStation) return sensorReadings;

    return sensorReadings.filter(
      (item) =>
        item.stationId === selectedStation.stationId ||
        item.stationId === selectedStation.id ||
        item.stationName === selectedStation.name ||
        item.stationLocation === selectedStation.location
    );
  }, [selectedStation, sensorReadings]);
  const hasBackendReadings = stationScopedReadings.length > 0;
  const displaySensorReadings = stationScopedReadings;
  const canViewAlerts = hasPermission(PERMISSIONS.VIEW_ALERTS);
  const canImportSensorData = hasPermission(PERMISSIONS.IMPORT_SENSOR_DATA);
  const canManageStations = hasPermission(PERMISSIONS.MANAGE_STATIONS);
  const isNormalUser = user?.role !== "admin";
  const isFarmer = user?.role === "farmer";
  const importModalContent = getImportModalContent(importState.status, importState.message, language);
  const copy = {
    en: {
      title: "Your Palm Farm Status Today",
      subtitle: "Check current conditions, spot issues early, and take action.",
      startHere: "Start Here",
      uploadPrompt: "Do you have new data you want to check, or are you still collecting data from your farm?",
      selectedStation: "Selected Station",
      stationReference: "Station Reference",
      zone: "Zone",
      missionReference: "Mission Reference",
      missionDate: "Mission Date",
      uploadedFile: "Uploaded File",
      uploadStatus: "Upload Status",
      chooseStation: "Choose station",
      uploadEnabled: "Upload enabled",
      readOnly: "Read-only",
      chooseCsv: "Choose CSV or XLSX data file",
      uploadData: "Upload Data",
      uploading: "Uploading...",
      alertTimingTitle: "Alert Timing Estimate",
      alertTimingIdle: "Start an upload with abnormal data to measure how quickly the alert appears.",
      alertTimingMeasuring: "Measuring time from upload start to first visible abnormal alert...",
      alertTimingNoAlert: "No abnormal alert was triggered from the latest uploaded data.",
      alertTimingDetected: "First abnormal alert became visible in",
      alertTimingPass: "Meets the 5 second target",
      alertTimingFail: "Above the 5 second target",
      temperature: "Temperature",
      humidity: "Humidity",
      co2: "CO2",
      absHumidity: "Abs Humidity",
      dataSource: "Data Source",
      sensorSource: "Sensor Source",
      gpsStatus: "GPS Status",
      actions: "Actions",
      exportData: "Export Data",
      environmentalTrend: "Farm Conditions",
      feedMode: "Feed Mode",
      focus: "Focus",
      status: "Status",
      alertDistribution: "Alert Distribution",
      systemSnapshot: "System Snapshot",
      recentAlerts: "Recent Alerts",
      latestReadingInfo: "Latest Reading Info",
      recommendedActions: "Recommended Actions",
      recentReadings: "Recent Readings",
      updated: "Updated",
      valid: "Valid",
      invalid: "Invalid",
      location: "Location",
      imageName: "Image Name",
      uploadedBy: "Uploaded By",
      coordinates: "Coordinates",
      packetId: "Packet ID",
      time: "Time",
      source: "Source",
      gps: "GPS",
      gpsCoverage: "GPS Coverage",
      packets: "Packets",
      alerts: "Alerts",
      zones: "Zones",
      cropHealthBtn: "Crop Health",
      viewAll: "View all",
      close: "Close",
      needReview: "Need review",
      healthyZones: "Healthy Zones",
      battery: "Battery",
      dataSynced: "Data Synced",
      activeAlerts: "Active Alerts",
      missionStatus: "Mission Status",
      dataValidity: "Data Validity",
      gpsReliability: "GPS Reliability",
      anomalyRate: "Anomaly Rate",
      sessionDuration: "Session Duration",
      alertResponseTime: "Alert Response Time",
    },
    ar: {
      city: "City",
      chooseCity: "Select data city",
      readingCity: "City",
      title: "حالة مزرعة النخيل اليوم",
      subtitle: "تحقق من الحالة الحالية، واكتشف المشكلات مبكرًا، واتخذ الإجراء المناسب.",
      startHere: "ابدأ من هنا",
      uploadPrompt: "هل لديك بيانات جديدة تريد فحصها، أم أنك ما زلت تجمع البيانات من المزرعة؟",
      uploadEnabled: "الرفع متاح",
      readOnly: "عرض فقط",
      chooseCsv: "اختر ملف بيانات CSV",
      uploadData: "رفع البيانات",
      uploading: "جارٍ الرفع...",
      alertTimingTitle: "تقدير زمن التنبيه",
      alertTimingIdle: "ابدأ رفع بيانات تحتوي على حالة غير طبيعية لقياس سرعة ظهور التنبيه.",
      alertTimingMeasuring: "يتم الآن قياس الزمن من بدء الرفع حتى ظهور أول تنبيه غير طبيعي...",
      alertTimingNoAlert: "لم يتم إنشاء تنبيه غير طبيعي من آخر بيانات تم رفعها.",
      alertTimingDetected: "ظهر أول تنبيه غير طبيعي خلال",
      alertTimingPass: "يحقق هدف 5 ثوانٍ",
      alertTimingFail: "تجاوز هدف 5 ثوانٍ",
      temperature: "الحرارة",
      humidity: "الرطوبة",
      co2: "ثاني أكسيد الكربون",
      absHumidity: "الرطوبة المطلقة",
      dataSource: "مصدر البيانات",
      sensorSource: "مصدر الحساس",
      gpsStatus: "حالة GPS",
      actions: "الإجراءات",
      exportData: "تصدير البيانات",
      environmentalTrend: "ظروف المزرعة",
      feedMode: "وضع التغذية",
      focus: "التركيز",
      status: "الحالة",
      alertDistribution: "توزيع التنبيهات",
      systemSnapshot: "ملخص النظام",
      recentAlerts: "أحدث التنبيهات",
      latestReadingInfo: "معلومات آخر قراءة",
      recommendedActions: "الإجراءات الموصى بها",
      recentReadings: "القراءات الأخيرة",
      updated: "تم التحديث",
      valid: "صالح",
      invalid: "غير صالح",
      location: "الموقع",
      uploadedBy: "تم الرفع بواسطة",
      coordinates: "الإحداثيات",
      time: "الوقت",
      source: "المصدر",
      gps: "نظام GPS",
      pressure: "الضغط",
      alerts: "التنبيهات",
      zones: "المناطق",
      cropHealthBtn: "صحة المحصول",
      viewAll: "عرض الكل",
      close: "إغلاق",
      needReview: "تحتاج مراجعة",
      healthyZones: "المناطق السليمة",
      battery: "البطارية",
      dataSynced: "البيانات المتزامنة",
      activeAlerts: "التنبيهات النشطة",
    },
  }[language];

  const handleDownloadTemplate = () => {
    const separator = ";";
    const templateRow = [
      "178",
      "05/04/2026",
      "15:03:42",
      "26.298893",
      "50.148941",
      "23.35",
      "50.77",
      "10.65",
      "345",
      "1",
      "05/04/2026",
      "15:03:41",
      "0.000000",
      "0.000000",
      "0",
    ];

    const csvContent = `\uFEFF${TEMPLATE_HEADERS.join(separator)}\n${templateRow.join(separator)}\n`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nakhlasense-sample-template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let cancelled = false;
    const canLoadRecommendations = hasPermission(PERMISSIONS.MANAGE_RECOMMENDATIONS);

    const bootstrapReadings = async () => {
      const initialFeed = await fetchLatestSensorReadingsFeed(user);

      if (cancelled) {
        return;
      }

      setSensorReadings(initialFeed.rows);
      setSensorFeedSource(initialFeed.source);
      setSensorFeedError(initialFeed.error);
    };

    bootstrapReadings();

    const unsubscribeAlerts = subscribeToAlerts(user, setAlerts);
    const unsubscribeRecommendations = canLoadRecommendations
      ? subscribeToRecommendations(user, setRecommendations)
      : () => {};
    const unsubscribeStations = subscribeToStations(user, setStations);
    const unsubscribeReadings = subscribeToSensorReadingsFeed(user, ({ rows, source, error }) => {
      setSensorReadings(rows);
      setSensorFeedSource(source);
      setSensorFeedError(error);
    });

    if (!canLoadRecommendations) {
      setRecommendations([]);
    }

    return () => {
      cancelled = true;
      unsubscribeAlerts?.();
      unsubscribeRecommendations?.();
      unsubscribeStations?.();
      unsubscribeReadings?.();
    };
  }, [hasPermission, user]);

  useEffect(() => {
    if (!availableStations.length || selectedStationId) {
      return;
    }

    const storedStation = getSelectedStation();
    const fallbackStation = storedStation
      ? availableStations.find((item) => String(item.stationId || item.id) === String(storedStation.stationId || storedStation.id))
      : availableStations[0];

    if (fallbackStation) {
      setSelectedStationId(fallbackStation.stationId || fallbackStation.id);
      setSelectedStation(fallbackStation);
    }
  }, [availableStations, selectedStationId]);

  useEffect(() => {
    if (selectedStation) {
      setSelectedStation(selectedStation);
    }
  }, [selectedStation]);

  const latestReading = useMemo(
    () => [...displaySensorReadings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null,
    [displaySensorReadings]
  );
  const availableReadingDates = useMemo(
    () =>
      [...new Set(
        displaySensorReadings
          .map((item) => String(item.timestamp || "").slice(0, 10))
          .filter(Boolean)
      )].sort((a, b) => new Date(b) - new Date(a)),
    [displaySensorReadings]
  );

  const packetSummaries = useMemo(() => {
    const groupedPackets = new Map();

    displaySensorReadings.forEach((reading) => {
      const packetKey = getPacketGroupingKey(reading);
      const existingPacket = groupedPackets.get(packetKey) || {
        packetId: reading.packetId ?? packetKey,
        packetIdRaw: reading.packetIdRaw || "",
        packetKey,
        timestamp: reading.timestamp || null,
        location: reading.location || "",
        imageName: reading.imageName || "",
        importedByName: reading.importedByName || "",
        importedByEmail: reading.importedByEmail || "",
        stationId: reading.stationId || "",
        stationName: reading.stationName || "",
        missionId: reading.missionId || "",
        lat: reading.lat ?? reading.coords?.lat ?? null,
        lon: reading.lon ?? reading.coords?.lon ?? null,
        latRaw: reading.latRaw || "",
        lonRaw: reading.lonRaw || "",
        groundGPSValid: reading.groundGPSValid ?? null,
        droneGPSValid: reading.droneGPSValid ?? null,
      };

      if (
        reading.timestamp &&
        (!existingPacket.timestamp || new Date(reading.timestamp) > new Date(existingPacket.timestamp))
      ) {
        existingPacket.timestamp = reading.timestamp;
      }

      if (!existingPacket.location && reading.location) {
        existingPacket.location = reading.location;
      }

      if (!existingPacket.imageName && reading.imageName) {
        existingPacket.imageName = reading.imageName;
      }

      if (!existingPacket.importedByName && reading.importedByName) {
        existingPacket.importedByName = reading.importedByName;
      }

      if (!existingPacket.importedByEmail && reading.importedByEmail) {
        existingPacket.importedByEmail = reading.importedByEmail;
      }

      if (existingPacket.lat == null) {
        existingPacket.lat = reading.lat ?? reading.coords?.lat ?? null;
      }

      if (existingPacket.lon == null) {
        existingPacket.lon = reading.lon ?? reading.coords?.lon ?? null;
      }

      if (!existingPacket.latRaw && reading.latRaw) {
        existingPacket.latRaw = reading.latRaw;
      }

      if (!existingPacket.lonRaw && reading.lonRaw) {
        existingPacket.lonRaw = reading.lonRaw;
      }

      if (existingPacket.groundGPSValid == null && reading.groundGPSValid != null) {
        existingPacket.groundGPSValid = reading.groundGPSValid;
      }

      if (existingPacket.droneGPSValid == null && reading.droneGPSValid != null) {
        existingPacket.droneGPSValid = reading.droneGPSValid;
      }

      groupedPackets.set(packetKey, existingPacket);
    });

    return [...groupedPackets.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [displaySensorReadings]);

  const packetMetricRows = useMemo(() => buildPacketMetricRows(displaySensorReadings), [displaySensorReadings]);

  useEffect(() => {
    console.log("sensorReadings", sensorReadings);
  }, [sensorReadings]);

  useEffect(() => {
    console.log("packetMetricRows", packetMetricRows);
  }, [packetMetricRows]);

  useEffect(() => {
    console.log("dashboardUser", user);
  }, [user]);

  useEffect(() => {
    console.log("sensorFeedSource", sensorFeedSource);
    console.log("sensorFeedError", sensorFeedError);
  }, [sensorFeedError, sensorFeedSource]);

  useEffect(() => {
    if (!availableReadingDates.length) {
      if (selectedSummaryDate) {
        setSelectedSummaryDate("");
      }
      return;
    }

    if (!selectedSummaryDate || !availableReadingDates.includes(selectedSummaryDate)) {
      setSelectedSummaryDate(availableReadingDates[0]);
    }
  }, [availableReadingDates, selectedSummaryDate]);

  const lastUpdated = useMemo(
    () => (latestReading?.timestamp ? new Date(latestReading.timestamp) : null),
    [latestReading?.timestamp]
  );
  const latestPacket = packetSummaries[0] || null;
  const packetCount = packetSummaries.length;

  useEffect(() => {
    console.log("latestPacket", latestPacket);
  }, [latestPacket]);
  const gpsValidPacketCount = packetSummaries.filter(
    (packet) => packet.groundGPSValid === true || packet.droneGPSValid === true
  ).length;
  const gpsCoverage = packetCount ? (gpsValidPacketCount / packetCount) * 100 : null;
  const summaryDayReadings = useMemo(
    () =>
      selectedSummaryDate
        ? displaySensorReadings.filter(
            (item) => String(item.timestamp || "").slice(0, 10) === selectedSummaryDate
          )
        : [],
    [displaySensorReadings, selectedSummaryDate]
  );
  const summaryPacketRows = useMemo(
    () =>
      packetMetricRows
        .filter((item) => String(item.timestamp || "").slice(0, 10) === selectedSummaryDate)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [packetMetricRows, selectedSummaryDate]
  );
  const sessionStart = summaryPacketRows[0]?.timestamp || "";
  const sessionEnd = summaryPacketRows[summaryPacketRows.length - 1]?.timestamp || "";
  const temperatureStats = useMemo(() => getMetricStats(summaryPacketRows, "temperature"), [summaryPacketRows]);
  const humidityStats = useMemo(() => getMetricStats(summaryPacketRows, "humidity"), [summaryPacketRows]);
  const co2Stats = useMemo(() => getMetricStats(summaryPacketRows, "co2"), [summaryPacketRows]);
  const absoluteHumidityStats = useMemo(() => getMetricStats(summaryPacketRows, "absoluteHumidity"), [summaryPacketRows]);
  const sessionAnomalies = useMemo(() => detectSessionAnomalies(summaryPacketRows), [summaryPacketRows]);
  const latestTemperature = getAverageMetricValue(summaryDayReadings, "temperature");
  const latestHumidity = getAverageMetricValue(summaryDayReadings, "humidity");
  const latestCo2 = getAverageMetricValue(summaryDayReadings, "co2");
  const dataTransferred = estimateReadingPayloadSizeGb(displaySensorReadings);
  const farmerLatestPacket = packetMetricRows[0] || null;
  const farmerDashboardTrendData = useMemo(
    () =>
      packetMetricRows
        .filter(
          (row) =>
            row.temperature != null ||
            row.humidity != null ||
            row.co2 != null
        )
        .slice(0, 20)
        .reverse()
        .map((row, index) => ({
          label: String(index + 1),
          temperature: row.temperature,
          humidity: row.humidity,
          co2Scaled: row.co2 != null ? Math.min(Math.max(row.co2 / 30, 0), 60) : null,
          co2: row.co2,
          timestamp: row.timestamp,
        })),
    [packetMetricRows]
  );

  useEffect(() => {
    if (!sensorReadings.length) return;
    if (!user || user.role === "farmer") return;

    saveTelemetrySnapshot(user, {
      packetCount,
      gpsCoverage: gpsCoverage != null ? Math.round(gpsCoverage) : null,
      dataTransferred,
      temperature: latestTemperature,
      co2: latestCo2,
      humidity: latestHumidity,
      latestPacketId: latestPacket?.packetId || null,
    }).catch(() => {
      // Keep the dashboard readable even if background telemetry writes are blocked.
    });
  }, [dataTransferred, gpsCoverage, latestCo2, latestHumidity, latestPacket?.packetId, latestTemperature, packetCount, sensorReadings.length, user]);

  const temperatureSeverity = getSeverity(latestTemperature, RULES.Temperature);
  const humiditySeverity = getSeverity(latestHumidity, RULES.Humidity);
  const co2Severity = getSeverity(latestCo2, RULES.CO2);

  const derivedAlerts = useMemo(
    () =>
      buildMissionOperatorAlerts(packetMetricRows, sessionAnomalies, {
        stationId: selectedStation?.stationId || selectedStation?.id || "",
        stationName: selectedStation?.name || "",
        stationLocation: selectedStation?.location || "",
        zoneName: selectedStation?.zone || selectedStation?.zoneName || "",
        missionId: activeMissionState?.missionId || "",
      }),
    [
      activeMissionState?.missionId,
      packetMetricRows,
      selectedStation?.id,
      selectedStation?.location,
      selectedStation?.name,
      selectedStation?.stationId,
      selectedStation?.zone,
      selectedStation?.zoneName,
      sessionAnomalies,
    ]
  );

  const visibleAlerts = useMemo(() => {
    const baseAlerts = [
      ...generatedMissionAlerts,
      ...alerts,
      ...(alerts.length ? [] : hasBackendReadings ? derivedAlerts : []),
    ];
    const dedupedAlerts = Array.from(
      new Map(baseAlerts.map((item) => [item.id, item])).values()
    );
    return getRoleAwareAlerts(dedupedAlerts, user?.role || "operator");
  }, [alerts, derivedAlerts, generatedMissionAlerts, hasBackendReadings, user?.role]);

  const missionScopedPopupAlerts = useMemo(() => {
    if (activeMissionState?.status !== "uploaded" || !activeMissionState?.missionId) {
      return [];
    }

    return visibleAlerts.filter((item) => {
      const sameMission = item.missionId && item.missionId === activeMissionState.missionId;
      const sameStation =
        selectedStation &&
        (item.stationId === selectedStation.stationId || item.stationId === selectedStation.id);

      return ["Critical", "Warning"].includes(item.severity) && item.status !== "Resolved" && (sameMission || sameStation);
    });
  }, [
    activeMissionState?.missionId,
    activeMissionState?.status,
    selectedStation,
    visibleAlerts,
  ]);

  const farmerRoleAlerts = useMemo(
    () =>
      visibleAlerts
        .filter((item) => item.status !== "Resolved")
        .map((item) => ({
          ...item,
          farmerKind: getFarmerAlertKind(item),
          farmerSeverity: getFarmerSeverityLevel(item.severity),
          farmerIcon: getFarmerAlertIcon(item),
        }))
        .sort((a, b) => new Date(b.time) - new Date(a.time)),
    [visibleAlerts]
  );

  const farmerDashboardSummary = useMemo(
    () => [
      {
        key: "stations",
        label: "Total Stations",
        value: String(availableStations.length || 0),
        note: availableStations.length === 1 ? "All stations" : "Available stations",
        icon: "stations",
        tone: "olive",
      },
      {
        key: "active",
        label: "Active Now",
        value: String(availableStations.filter((station) => String(station.status || "").toLowerCase() === "active").length),
        note: "Online & reporting",
        icon: "active",
        tone: "olive",
      },
      {
        key: "online",
        label: "Online",
        value: String(availableStations.filter((station) => String(station.connectivity || "").toLowerCase() === "online").length),
        note: "Currently online",
        icon: "online",
        tone: "green",
      },
      {
        key: "alerts",
        label: "Active Alerts",
        value: String(farmerRoleAlerts.filter((alert) => ["High", "Medium"].includes(alert.farmerSeverity)).length),
        note: "Needs attention",
        icon: "alert",
        tone: "red",
      },
    ],
    [availableStations, farmerRoleAlerts]
  );

  const farmerDashboardAlerts = useMemo(
    () =>
      farmerRoleAlerts.slice(0, 3).map((alert) => ({
        id: alert.id,
        title: alert.title || alert.displayMessage,
        priority: alert.farmerSeverity,
        time: formatAlertTimeAgo(alert.time),
        icon: alert.farmerIcon,
      })),
    [farmerRoleAlerts]
  );

  useEffect(() => {
    if (activeMissionState?.status !== "uploaded") {
      setAlertPopup(null);
      return;
    }

    if (!isNormalUser || !missionScopedPopupAlerts.length) return;

    const newestImportantAlert = [...missionScopedPopupAlerts]
      .sort((a, b) => new Date(b.time) - new Date(a.time))[0];

    if (!newestImportantAlert) return;
    if (shownAlertIdsRef.current.has(newestImportantAlert.id)) return;

    shownAlertIdsRef.current.add(newestImportantAlert.id);
    setAlertPopup(newestImportantAlert);
  }, [activeMissionState?.status, isNormalUser, missionScopedPopupAlerts]);

  useEffect(() => {
    if (!isFarmer) {
      return;
    }

    const newestImportantAlert = [...farmerRoleAlerts]
      .filter((alert) => ["High", "Medium"].includes(alert.farmerSeverity))
      .sort((a, b) => new Date(b.time) - new Date(a.time))[0];

    if (!newestImportantAlert) return;
    if (shownAlertIdsRef.current.has(newestImportantAlert.id)) return;

    shownAlertIdsRef.current.add(newestImportantAlert.id);
    setAlertPopup(newestImportantAlert);
  }, [farmerRoleAlerts, isFarmer]);

  useEffect(() => {
    const measurement = alertTimingMeasurementRef.current;

    if (!measurement || measurement.status !== "pending") {
      return;
    }

    const firstImportantAlert = [...missionScopedPopupAlerts]
      .sort((a, b) => new Date(a.time) - new Date(b.time))[0];

    if (firstImportantAlert) {
      const durationMs = Date.now() - measurement.startedAt;
      const withinTarget = durationMs <= 5000;

      setAlertTimingEstimate({
        status: "detected",
        durationMs,
        withinTarget,
        alertId: firstImportantAlert.id,
        measuredAt: new Date().toISOString(),
        fileName: measurement.fileName,
      });
      alertTimingMeasurementRef.current = null;
      return;
    }

    if (importState.status === "success") {
      setAlertTimingEstimate({
        status: "no_alert",
        durationMs: null,
        withinTarget: null,
        alertId: null,
        measuredAt: new Date().toISOString(),
        fileName: measurement.fileName,
      });
      alertTimingMeasurementRef.current = null;
    }
  }, [importState.status, missionScopedPopupAlerts]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Avg temperature",
        value: formatMetricValue(temperatureStats.avg, "C", 2),
        tone: temperatureSeverity ? "warning" : "normal",
        note:
          temperatureStats.avg != null
            ? `Min ${formatRangeValue(temperatureStats.min, "C")} • Max ${formatRangeValue(temperatureStats.max, "C")}`
            : "No uploaded value",
      },
      {
        label: "Avg humidity",
        value: formatMetricValue(humidityStats.avg, "%", 2),
        tone: humiditySeverity ? "warning" : "normal",
        note:
          humidityStats.avg != null
            ? `Min ${formatRangeValue(humidityStats.min, "%")} • Max ${formatRangeValue(humidityStats.max, "%")}`
            : "No uploaded value",
      },
      {
        label: "Avg CO2",
        value: formatMetricValue(co2Stats.avg, "ppm", 0),
        tone: co2Severity ? "warning" : "normal",
        note:
          co2Stats.avg != null
            ? `Min ${formatRangeValue(co2Stats.min, "ppm", 0)} • Max ${formatRangeValue(co2Stats.max, "ppm", 0)}`
            : "No uploaded value",
      },
      {
        label: "Avg abs. humidity",
        value: formatMetricValue(absoluteHumidityStats.avg, "g/m3", 2),
        tone: "normal",
        note:
          absoluteHumidityStats.avg != null
            ? `Min ${formatRangeValue(absoluteHumidityStats.min, "g/m3")} • Max ${formatRangeValue(absoluteHumidityStats.max, "g/m3")}`
            : "No uploaded value",
      },
      {
        label: "Total readings",
        value: String(summaryPacketRows.length || 0),
        tone: "normal",
        note: summaryPacketRows.length ? formatDuration(sessionStart, sessionEnd) : "No packets for this day",
      },
      {
        label: "Data anomalies",
        value: String(sessionAnomalies.length || 0),
        tone: sessionAnomalies.length ? "warning" : "normal",
        note: sessionAnomalies.length ? "GPS and file-quality flags detected" : "No data quality flags found",
      },
    ],
    [
      absoluteHumidityStats.avg,
      absoluteHumidityStats.max,
      absoluteHumidityStats.min,
      co2Severity,
      co2Stats.avg,
      co2Stats.max,
      co2Stats.min,
      humiditySeverity,
      humidityStats.avg,
      humidityStats.max,
      humidityStats.min,
      sessionAnomalies.length,
      sessionEnd,
      sessionStart,
      summaryPacketRows.length,
      temperatureStats.avg,
      temperatureStats.max,
      temperatureStats.min,
      temperatureSeverity,
    ]
  );

  const missionKpis = useMemo(() => {
    const completePacketCount = summaryPacketRows.filter(
      (item) =>
        Number.isFinite(item.temperature) &&
        Number.isFinite(item.humidity) &&
        Number.isFinite(item.co2)
    ).length;
    const dataValidityRate = summaryPacketRows.length
      ? (completePacketCount / summaryPacketRows.length) * 100
      : null;
    const gpsReliableCount = summaryPacketRows.filter(
      (item) => item.groundGPSValid === true || item.droneGPSValid === true
    ).length;
    const gpsReliabilityRate = summaryPacketRows.length
      ? (gpsReliableCount / summaryPacketRows.length) * 100
      : null;
    const anomalyRate = summaryPacketRows.length
      ? (sessionAnomalies.length / summaryPacketRows.length) * 100
      : null;
    return [
      {
        label: copy.dataValidity || "Data Validity",
        value: formatPercentValue(dataValidityRate, 0),
        tone: dataValidityRate != null && dataValidityRate < 100 ? "warning" : "normal",
        note: "How much of the uploaded data is usable",
      },
      {
        label: copy.gpsReliability || "GPS Reliability",
        value: formatPercentValue(gpsReliabilityRate, 0),
        tone: gpsReliabilityRate != null && gpsReliabilityRate < 100 ? "warning" : "normal",
        note: "How many readings have valid GPS",
      },
      {
        label: copy.anomalyRate || "Anomalies",
        value: formatPercentValue(anomalyRate, 0),
        tone: sessionAnomalies.length ? "warning" : "normal",
        note: "How many problems exist in the uploaded data",
      },
    ];
  }, [
    copy.anomalyRate,
    copy.dataValidity,
    copy.gpsReliability,
    sessionAnomalies.length,
    summaryPacketRows,
  ]);
  const dataValidityWidget = useMemo(() => {
    const validReadings = summaryPacketRows.filter(
      (item) =>
        Number.isFinite(item.temperature) &&
        Number.isFinite(item.humidity) &&
        Number.isFinite(item.co2)
    ).length;
    const totalReadings = summaryPacketRows.length;
    const percentage = totalReadings ? (validReadings / totalReadings) * 100 : 0;

    return {
      validReadings,
      totalReadings,
      percentage,
      percentageLabel: formatPercentValue(percentage, 0),
    };
  }, [summaryPacketRows]);
  const farmerAverageCards = useMemo(() => summaryCards.slice(0, 4), [summaryCards]);
  void summaryCards;

  const handleImportFileChange = async (event) => {
    const nextFile = event.target.files?.[0] || null;

    if (!nextFile) {
      return;
    }

    if ((user?.role === "operator" || user?.role === "admin") && !selectedStation) {
      setImportState({
        status: "error",
        message: "Choose the station for this mission before uploading the data file.",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectedImportFile(nextFile);
    setImportState({ status: "idle", message: "" });
    await handleImportSubmit(nextFile);
  };

  const handleStationChange = (event) => {
    const nextStationId = event.target.value;

    if (nextStationId === "__create_station__") {
      navigate("/stations-management?returnTo=/dashboard");
      return;
    }

    setSelectedStationId(nextStationId);
    const nextStation = availableStations.find(
      (item) => String(item.stationId || item.id) === String(nextStationId)
    );

    if (nextStation) {
      setSelectedStation(nextStation);
      const nextMissionState = {
        missionId: buildMissionId(nextStation),
        stationId: nextStation.stationId || nextStation.id || "",
        stationName: nextStation.name || "",
        missionDate: new Date().toISOString().slice(0, 10),
        uploadedBy: user?.email || "",
        status: "ready",
        uploadStatus: "Waiting for upload",
        fileName: "",
      };
      setActiveMissionState(nextMissionState);
      setActiveMission(nextMissionState);
      return;
    }

    setActiveMissionState(null);
    setActiveMission(null);
  };

  const handleImportSubmit = async (fileOverride = null) => {
    const importFile = fileOverride || selectedImportFile;

    if (!canImportSensorData) {
      setRbacMessage("Access denied: your role cannot import sensor data.");
      return;
    }

    if (user?.isDev) {
      setImportState({
        status: "error",
        message: "File import requires a real Firebase account because the backend validates your role.",
      });
      return;
    }

    if (!importFile) {
      setImportState({
        status: "error",
        message: "Choose a CSV or XLSX data file before starting the import.",
      });
      return;
    }

    if ((user?.role === "operator" || user?.role === "admin") && !selectedStation) {
      setImportState({
        status: "error",
        message: "Choose the station for this mission before uploading the data file.",
      });
      return;
    }

    const missionContext =
      activeMissionState?.stationId === (selectedStation?.stationId || selectedStation?.id)
        ? activeMissionState
        : {
            missionId: buildMissionId(selectedStation),
            stationId: selectedStation?.stationId || selectedStation?.id || "",
            stationName: selectedStation?.name || "",
            missionDate: new Date().toISOString().slice(0, 10),
            uploadedBy: user?.email || "",
            status: "active",
            uploadStatus: "Preparing upload",
            fileName: importFile.name,
          };

    setActiveMissionState(missionContext);
    setActiveMission(missionContext);

    setImportState({
      status: "loading",
      message: `Uploading ${importFile.name}...`,
    });
    alertTimingMeasurementRef.current = {
      startedAt: Date.now(),
      fileName: importFile.name,
      missionId: missionContext.missionId,
      status: "pending",
    };
    setAlertTimingEstimate({
      status: "measuring",
      durationMs: null,
      withinTarget: null,
      alertId: null,
      measuredAt: new Date().toISOString(),
      fileName: importFile.name,
    });

    try {
      const result = await importSensorReadingsFile(importFile, "", {
        stationId: missionContext.stationId,
        stationName: missionContext.stationName,
        stationLocation: selectedStation?.location || "",
        zoneName: selectedStation?.zone || selectedStation?.zoneName || "",
        missionId: missionContext.missionId,
        missionDate: missionContext.missionDate,
      });
      const refreshedFeed = await fetchLatestSensorReadingsFeed(user);
      const missionRows = refreshedFeed.rows.filter(
        (item) => item.missionId === missionContext.missionId
      );
      const missionPacketRows = buildPacketMetricRows(missionRows);
      const missionAnomalies = detectSessionAnomalies(
        [...missionPacketRows].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      );
      const missionAlerts = buildMissionOperatorAlerts(missionPacketRows, missionAnomalies, {
        stationId: missionContext.stationId,
        stationName: missionContext.stationName,
        stationLocation: selectedStation?.location || "",
        zoneName: selectedStation?.zone || selectedStation?.zoneName || "",
        missionId: missionContext.missionId,
      });
      const createdMissionAlerts = missionAlerts.length
        ? await Promise.all(missionAlerts.map((alert) => createAlertRecord(user, alert)))
        : [];

      setSensorReadings(refreshedFeed.rows);
      setSensorFeedSource(refreshedFeed.source);
      setSensorFeedError(refreshedFeed.error);
      setGeneratedMissionAlerts(createdMissionAlerts);

      setImportState({
        status: "success",
        message: formatImportSummary(result) || "Sensor data imported successfully.",
      });
      const uploadedMissionState = {
        ...missionContext,
        status: "uploaded",
        uploadStatus: "Upload complete",
        fileName: importFile.name,
      };
      setActiveMissionState(uploadedMissionState);
      setActiveMission(uploadedMissionState);
      setSelectedImportFile(null);
      await recordActivity(user, {
        type: "mission_upload_completed",
        entity: "mission",
        entityId: missionContext.missionId,
        message: `Uploaded ${importFile.name} for ${missionContext.stationName || "unassigned station"}`,
        metadata: {
          missionId: missionContext.missionId,
          stationId: missionContext.stationId,
          stationName: missionContext.stationName,
          fileName: importFile.name,
        },
      });

      if (alertTimingMeasurementRef.current?.missionId === missionContext.missionId) {
        if (createdMissionAlerts.length) {
          const durationMs = Date.now() - alertTimingMeasurementRef.current.startedAt;
          setAlertTimingEstimate({
            status: "detected",
            durationMs,
            withinTarget: durationMs <= 5000,
            alertId: createdMissionAlerts[0]?.id || null,
            measuredAt: new Date().toISOString(),
            fileName: importFile.name,
          });
        } else {
          setAlertTimingEstimate({
            status: "no_alert",
            durationMs: null,
            withinTarget: null,
            alertId: null,
            measuredAt: new Date().toISOString(),
            fileName: importFile.name,
          });
        }

        alertTimingMeasurementRef.current = null;
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      alertTimingMeasurementRef.current = null;
      setAlertTimingEstimate({
        status: "failed",
        durationMs: null,
        withinTarget: null,
        alertId: null,
        measuredAt: new Date().toISOString(),
        fileName: importFile.name,
      });
      setImportState({
        status: "error",
        message: error?.message || "We could not import this file right now.",
      });

      setSelectedImportFile(importFile);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const uploadStatusLabel =
    user?.role === "farmer"
      ? activeMissionState?.status === "uploaded"
        ? activeMissionState?.uploadStatus || "Latest upload available"
        : selectedStation
        ? "Waiting for operator upload"
        : "Select a station first"
      : importState.status === "loading"
      ? "Uploading now"
      : importState.status === "error"
      ? "Upload issue"
      : activeMissionState?.status === "uploaded"
      ? activeMissionState?.uploadStatus || "Upload complete"
      : selectedStation
      ? "Waiting for file upload"
      : "Select a station first";
  const currentMissionFileName =
    selectedImportFile?.name || activeMissionState?.fileName || "No file selected yet";
  const allPacketMetricRows = useMemo(() => buildPacketMetricRows(sensorReadings), [sensorReadings]);
  const operatorDateLabel = useMemo(
    () => formatOperatorDate(selectedSummaryDate || lastUpdated || new Date()),
    [lastUpdated, selectedSummaryDate]
  );
  const operatorTrendData = useMemo(() => {
    const dateMap = new Map();

    allPacketMetricRows.forEach((row) => {
      const dateKey = String(row.timestamp || "").slice(0, 10);
      if (!dateKey) return;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey).push(row);
    });

    return [...dateMap.entries()]
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-7)
      .map(([dateKey, rows]) => {
        const validCount = rows.filter(
          (item) =>
            Number.isFinite(item.temperature) &&
            Number.isFinite(item.humidity) &&
            Number.isFinite(item.co2)
        ).length;
        const gpsCount = rows.filter((item) => item.groundGPSValid === true || item.droneGPSValid === true).length;
        const anomalies = detectSessionAnomalies([...rows].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));

        return {
          label: formatOperatorDate(dateKey, { month: "short", day: "numeric", year: undefined }),
          validity: rows.length ? Math.round((validCount / rows.length) * 100) : 0,
          gps: rows.length ? Math.round((gpsCount / rows.length) * 100) : 0,
          anomaly: rows.length ? Math.round((anomalies.length / rows.length) * 100) : 0,
        };
      });
  }, [allPacketMetricRows]);
  const operatorUploadRows = useMemo(() => {
    const rows = availableStations.map((station) => {
      const stationId = station.stationId || station.id || station.name;
      const stationRows = allPacketMetricRows.filter(
        (item) =>
          item.stationId === station.stationId ||
          item.stationId === station.id ||
          item.stationName === station.name
      );
      const orderedRows = [...stationRows].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const validRows = stationRows.filter(
        (item) =>
          Number.isFinite(item.temperature) &&
          Number.isFinite(item.humidity) &&
          Number.isFinite(item.co2)
      ).length;
      const anomalies = detectSessionAnomalies([...stationRows].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      const validity = stationRows.length ? `${Math.round((validRows / stationRows.length) * 100)}%` : "--";
      const status = stationRows.length ? (validRows === 0 && anomalies.length ? "Failed" : "Uploaded") : "Pending";

      return {
        stationId: stationId || "Unknown",
        location: station.location || station.name || "Unassigned",
        packetCount: stationRows.length || 0,
        uploadTime: orderedRows[0]?.timestamp ? formatOperatorDateTime(orderedRows[0].timestamp) : "Waiting",
        status,
        validity,
        anomalies: anomalies.length,
        sortTime: orderedRows[0]?.timestamp ? new Date(orderedRows[0].timestamp).getTime() : 0,
      };
    });

    return rows
      .sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0))
      .slice(0, 6);
  }, [allPacketMetricRows, availableStations]);
  const pendingUploadCount = useMemo(
    () => operatorUploadRows.filter((item) => item.status !== "Uploaded").length,
    [operatorUploadRows]
  );
  const operatorIssues = useMemo(() => {
    const alertIssues = visibleAlerts
      .filter((item) => item.status !== "Resolved")
      .slice(0, 3)
      .map((item) => {
        const tone = getOperatorToneBySeverity(item.severity);
        const Icon = getOperatorIssueIcon(item.title || item.parameter, item.displayMessage || item.cause);

        return {
          id: item.id,
          icon: Icon,
          title: item.title || item.parameter || "Detected issue",
          description: item.displayMessage || item.cause || "Operator review is required.",
          affected: item.missionId ? "Mission data" : "Station data",
          severity: item.severity || "Warning",
          actionLabel: item.severity === "Critical" ? "Fix Now" : "Review",
          tone,
        };
      });

    if (alertIssues.length) {
      return alertIssues;
    }

    return sessionAnomalies.slice(0, 3).map((item) => {
      const tone = getOperatorToneBySeverity(item.severity);
      const Icon = getOperatorIssueIcon(item.message, item.packetLabel);

      return {
        id: `${item.rowLabel}-${item.packetLabel}-${item.message}`,
        icon: Icon,
        title: item.message.includes("GPS")
          ? "GPS Invalid"
          : item.message.includes("file") || item.message.includes("File")
          ? "File Quality Issue"
          : "Detected anomaly",
        description: item.message,
        affected: item.packetLabel || item.rowLabel,
        severity: item.severity,
        actionLabel: item.severity === "Error" ? "Fix Now" : "Review",
        tone,
      };
    });
  }, [sessionAnomalies, visibleAlerts]);
  const handleOperatorUploadAction = () => {
    if (importState.status === "loading") return;

    if ((user?.role === "operator" || user?.role === "admin") && !selectedStation) {
      setImportState({
        status: "error",
        message: "Choose the station for this mission before uploading the data file.",
      });
      return;
    }

    fileInputRef.current?.click();
  };
  if (!isFarmer) {
    return (
      <>
        {!embedded && <Navigation />}
        <div className={`dashboard-page container-fluid ${embedded ? "dashboard-page-embedded" : ""}`}>
          <div className="dashboard-shell operator-dashboard-shell py-5">
            <section className="operator-dashboard-hero">
              <div>
                <div className="operator-dashboard-kicker">
                  <Leaf size={28} strokeWidth={2.4} />
                  <h1>Welcome back, Operator</h1>
                </div>
                <p>Upload station data, validate quality, and resolve issues before farmers see it.</p>
              </div>

              <div className="operator-dashboard-hero-actions">
                <button type="button" className="operator-dashboard-date-button">
                  <CalendarDays size={22} strokeWidth={2.2} />
                  {operatorDateLabel}
                </button>
                <button
                  type="button"
                  className="operator-dashboard-upload-button-hero"
                  onClick={handleOperatorUploadAction}
                  disabled={!canImportSensorData || importState.status === "loading"}
                >
                  <UploadCloud size={22} strokeWidth={2.2} />
                  {importState.status === "loading" ? copy.uploading : "Upload Station Data"}
                </button>
              </div>
            </section>

            {rbacMessage && (
              <div className="dashboard-rbac-banner">
                <span>{rbacMessage}</span>
                <button type="button" onClick={() => setRbacMessage("")}>{copy.close}</button>
              </div>
            )}

            <section className="operator-dashboard-toolbar">
              <div className="operator-dashboard-toolbar-copy">
                <strong>Mission Controls</strong>
                <span>Choose the station, confirm the file, and review upload status before publishing field data.</span>
              </div>
              <div className="operator-dashboard-toolbar-grid">
                <label className="operator-dashboard-field">
                  <span>{copy.selectedStation}</span>
                  <select value={selectedStationId} onChange={handleStationChange}>
                    <option value="">{copy.chooseStation}</option>
                    {availableStations.map((station) => (
                      <option key={station.id} value={station.stationId || station.id}>
                        {station.name}
                      </option>
                    ))}
                    {canManageStations ? <option value="__create_station__">+ Create new station</option> : null}
                  </select>
                </label>

                <div className="operator-dashboard-field">
                  <span>{copy.uploadedFile || "Uploaded File"}</span>
                  <div className="operator-dashboard-field-value">{currentMissionFileName}</div>
                </div>

                <div className="operator-dashboard-field">
                  <span>{copy.uploadStatus || "Upload Status"}</span>
                  <div className="operator-dashboard-field-value">{uploadStatusLabel}</div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                className="operator-dashboard-hidden-input"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleImportFileChange}
                disabled={!canImportSensorData || importState.status === "loading"}
              />
            </section>

            <section className="operator-metrics-grid">
              <OperatorMetricCard
                icon={ShieldCheck}
                label="Data Validity Rate"
                value={missionKpis[0]?.value || "--"}
                detail={`Valid: ${dataValidityWidget.validReadings} / Total: ${dataValidityWidget.totalReadings}`}
                tone="green"
                progress={dataValidityWidget.percentage}
              />
              <OperatorMetricCard
                icon={MapPin}
                label="GPS Reliability"
                value={missionKpis[1]?.value || "--"}
                detail={`Reliable: ${gpsValidPacketCount} / Total: ${packetCount}`}
                tone="yellow"
                progress={Number.parseFloat(String(missionKpis[1]?.value || "0").replace("%", ""))}
              />
              <OperatorMetricCard
                icon={BarChart3}
                label="Anomaly Rate"
                value={missionKpis[2]?.value || "--"}
                detail={`Anomalies: ${sessionAnomalies.length} / Total: ${summaryPacketRows.length}`}
                tone="red"
                progress={100 - (Number.parseFloat(String(missionKpis[2]?.value || "0").replace("%", "")) || 0)}
              />
              <OperatorMetricCard
                icon={UploadCloud}
                label="Pending Uploads"
                value={String(pendingUploadCount)}
                detail="Stations awaiting upload"
                tone="blue"
              />
              <OperatorLastUploadCard
                timestamp={latestPacket?.timestamp}
                packetCount={packetCount}
                onOpenHistory={() => navigate("/missions")}
              />
            </section>

            <section className="operator-top-panels">
              <OperatorPanel className="operator-trend-panel">
                <OperatorPanelHeader title="Data Quality Trend" subtitle="Last 7 Days" icon={Activity} />
                {operatorTrendData.length >= 7 ? (
                  <OperatorTrendChart data={operatorTrendData} />
                ) : (
                  <div className="operator-trend-empty-state" aria-hidden="true" />
                )}
              </OperatorPanel>

              <OperatorPanel className="operator-issues-panel">
                <OperatorPanelHeader
                  title="Issues Detected"
                  icon={AlertTriangle}
                  actionLabel="View All"
                  onAction={() => navigate("/alerts")}
                />
                <OperatorIssuesTable
                  issues={operatorIssues}
                  onAction={() => navigate("/alerts")}
                />
              </OperatorPanel>
            </section>

            <section className="operator-bottom-panels">
              <OperatorPanel className="operator-uploads-panel">
                <OperatorPanelHeader
                  title="Recent Station Uploads"
                  icon={Database}
                  actionLabel="View All"
                  onAction={() => navigate("/stations")}
                />
                <OperatorUploadsTable rows={operatorUploadRows} />
              </OperatorPanel>
            </section>
          </div>
        </div>

        {importState.message && (
          <div className="dashboard-upload-modal-backdrop">
            <div className={`dashboard-upload-modal ${importState.status}`} role="dialog" aria-modal="true">
              <div className="dashboard-upload-modal-head">
                <div className="dashboard-upload-modal-icon" aria-hidden="true">
                  {importState.status === "error" ? "!" : importState.status === "success" ? "OK" : "..."}
                </div>

                <div className="dashboard-upload-modal-head-copy">
                  <div className="dashboard-upload-modal-mark">{importModalContent.badge}</div>
                  <h3>{importModalContent.title}</h3>
                </div>

                <button
                  type="button"
                  className="dashboard-upload-modal-close"
                  onClick={() => setImportState((current) => ({ ...current, message: "", status: "idle" }))}
                  aria-label="Close upload message"
                >
                  &times;
                </button>
              </div>

              <div className="dashboard-upload-modal-body">
                <p>{importModalContent.description}</p>

                {!!importModalContent.missingColumns.length && (
                  <div className="dashboard-upload-modal-checklist">
                    {importModalContent.missingColumns.map((item) => (
                      <div key={item} className="dashboard-upload-modal-check">
                        <span aria-hidden="true" className="dashboard-upload-modal-dot" />
                        <strong>{item}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {importModalContent.secondaryActionLabel ? (
                  <div className="dashboard-upload-modal-hint">
                    <span aria-hidden="true" className="dashboard-upload-modal-hint-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </span>
                    <span>Need help? Download the CSV template to match the required upload format.</span>
                  </div>
                ) : null}

                <div className="dashboard-upload-modal-actions">
                  {importModalContent.secondaryActionLabel ? (
                    <button
                      type="button"
                      className="dashboard-upload-modal-button secondary"
                      onClick={handleDownloadTemplate}
                    >
                      {importModalContent.secondaryActionLabel}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="dashboard-upload-modal-button primary"
                    onClick={() => setImportState((current) => ({ ...current, message: "", status: "idle" }))}
                  >
                    {importModalContent.actionLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {alertPopup && (
          <div className="dashboard-alert-popup">
            <div className={`dashboard-alert-popup-card ${alertPopup.severity?.toLowerCase() || "normal"}`}>
              <strong>{alertPopup.title || "Mission alert"}</strong>
              <p>{alertPopup.displayMessage || alertPopup.conditionDetected || "Review the latest mission warning."}</p>
              <div className="dashboard-alert-popup-meta">
                <span>{alertPopup.stationName || selectedStation?.name || "Selected station"}</span>
                <span>{new Date(alertPopup.time).toLocaleTimeString()}</span>
              </div>
              <div className="dashboard-alert-popup-actions">
                {canViewAlerts ? (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setAlertPopup(null);
                      navigate("/alerts");
                    }}
                  >
                    Open Alerts
                  </button>
                ) : null}
                <button type="button" onClick={() => setAlertPopup(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {!embedded && <Footer />}
      </>
    );
  }

  if (isFarmer) {
    return (
      <>
        {!embedded && <Navigation />}
        <div className={`dashboard-page container-fluid farmer-dashboard-page ${embedded ? "dashboard-page-embedded" : ""}`} style={{ backgroundImage: `linear-gradient(rgba(8, 39, 19, 0.84), rgba(8, 39, 19, 0.92)), url(${palmGroveImage})` }}>
          <div className="farmer-dashboard-shell">
            <section className="farmer-dashboard-hero">
              <h1 className="farmer-dashboard-title">
                <FarmerDashboardIcon name="leaf" className="farmer-dashboard-title-leaf" />
                Farm Monitoring
                <FarmerDashboardIcon name="leaf" className="farmer-dashboard-title-leaf" />
              </h1>
              <p className="farmer-dashboard-subtitle">See your farm condition, alerts, and what to do next.</p>
            </section>

            <section className="farmer-dashboard-summary">
              {farmerDashboardSummary.map((card) => (
                <article key={card.key} className={`farmer-dashboard-summary-card ${card.tone}`}>
                  <span className="farmer-dashboard-summary-icon">
                    <FarmerDashboardIcon name={card.icon} />
                  </span>
                  <div>
                    <small>{card.label}</small>
                    <strong>{card.value}</strong>
                    <p>{card.note}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="farmer-dashboard-grid">
              <article className="farmer-dashboard-panel farmer-dashboard-chart-panel">
                <div className="farmer-dashboard-panel-head">
                  <h2>Farm Conditions</h2>
                </div>
                <div className="farmer-dashboard-chip-row farmer-dashboard-live-chip-row">
                  <span className="farmer-dashboard-chip metric-temperature">
                    Temperature {formatMetricValue(farmerLatestPacket?.temperature, "°C", 1)}
                  </span>
                  <span className="farmer-dashboard-chip metric-humidity">
                    Humidity {formatMetricValue(farmerLatestPacket?.humidity, "%", 1)}
                  </span>
                  <span className="farmer-dashboard-chip metric-co2">
                    CO2 {formatMetricValue(farmerLatestPacket?.co2, "ppm", 0)}
                  </span>
                </div>
                <div className="farmer-dashboard-chip-row">
                  <span className="farmer-dashboard-chip metric-temperature">Temperature 49.8°C</span>
                  <span className="farmer-dashboard-chip metric-humidity">Humidity 31.9%</span>
                  <span className="farmer-dashboard-chip metric-co2">CO2 465 ppm</span>
                </div>
                <div className="farmer-dashboard-chart-wrap">
                  {farmerDashboardTrendData.length ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={farmerDashboardTrendData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke="rgba(196, 226, 165, 0.12)" vertical={false} />
                        <XAxis dataKey="label" stroke="#89a489" tick={{ fill: "#c5d0bf", fontSize: 11 }} />
                        <YAxis stroke="#89a489" tick={{ fill: "#c5d0bf", fontSize: 11 }} domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="co2Scaled" name="CO2 / 30" stroke="#f16142" strokeWidth={3} dot={farmerDashboardTrendData.length === 1} />
                        <Line type="monotone" dataKey="humidity" name="Humidity" stroke="#d8b12a" strokeWidth={2.5} dot={farmerDashboardTrendData.length === 1} />
                        <Line type="monotone" dataKey="temperature" name="Temperature" stroke="#49b86d" strokeWidth={2.5} dot={farmerDashboardTrendData.length === 1} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="farmer-dashboard-chart-empty">
                      No uploaded station readings yet for this chart.
                    </div>
                  )}
                </div>
                {farmerDashboardTrendData.length ? (
                  <div className="farmer-dashboard-legend">
                    <span><i className="co2" />CO2 / 30</span>
                    <span><i className="humidity" />Humidity</span>
                    <span><i className="temperature" />Temperature</span>
                  </div>
                ) : null}
              </article>

              <article className="farmer-dashboard-panel farmer-dashboard-alerts-panel">
                <div className="farmer-dashboard-panel-head">
                  <h2>Recent Alerts</h2>
                  <button type="button" className="farmer-dashboard-outline-button" onClick={() => navigate("/alerts")}>View All</button>
                </div>
                <div className="farmer-dashboard-alert-list">
                  {farmerDashboardAlerts.length ? (
                    farmerDashboardAlerts.map((alert) => (
                      <div key={alert.id} className="farmer-dashboard-alert-row">
                        <span className={`farmer-dashboard-alert-icon ${alert.priority.toLowerCase()}`}>
                          <FarmerDashboardIcon name={alert.icon} />
                        </span>
                        <div className="farmer-dashboard-alert-copy">
                          <strong>{alert.title}</strong>
                          <small>{alert.time}</small>
                        </div>
                        <span className={`farmer-dashboard-alert-pill ${alert.priority.toLowerCase()}`}>{alert.priority}</span>
                      </div>
                    ))
                  ) : (
                    <div className="dashboard-empty-state">No active alerts yet.</div>
                  )}
                </div>
              </article>
            </section>

            <section className="farmer-dashboard-averages">
              {farmerAverageCards.map((card) => (
                <article key={card.label} className={`farmer-dashboard-average-card ${card.tone || "normal"}`}>
                  <small>{card.label}</small>
                  <strong>{card.value}</strong>
                  <p>{card.note}</p>
                </article>
              ))}
            </section>

          </div>
        </div>
        {!embedded && <Footer />}
        {alertPopup && (
          <div className="dashboard-alert-popup">
            <div className={`dashboard-alert-popup-card ${alertPopup.severity?.toLowerCase() || "normal"}`}>
              <div className="dashboard-alert-popup-head">
                <div>
                  <small>{alertPopup.farmerSeverity || alertPopup.severity} Alert</small>
                  <strong>{alertPopup.title || alertPopup.parameter || "Crop warning"}</strong>
                </div>
                <button type="button" onClick={() => setAlertPopup(null)}>
                  Close
                </button>
              </div>
              <p>{alertPopup.displayMessage || "This area needs attention."}</p>
              <div className="dashboard-alert-popup-meta">
                <span>Area: {alertPopup.zone || alertPopup.stationName || "Field area"}</span>
                <span>{formatAlertTimeAgo(alertPopup.time)}</span>
              </div>
              <div className="dashboard-alert-popup-guide">
                <strong>What you should do now</strong>
                <ul>
                  {(alertPopup.displayRecommendations?.length
                    ? alertPopup.displayRecommendations
                    : ["Check the affected area and take simple field action if needed."]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="dashboard-alert-popup-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setAlertPopup(null);
                    navigate("/alerts");
                  }}
                >
                  Open Alerts
                </button>
                <button type="button" onClick={() => setAlertPopup(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

}

export default Dashboard;




