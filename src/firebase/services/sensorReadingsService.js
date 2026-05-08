import {
  collection,
  getDocs,
  Timestamp,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../config";
import { subscribeWithPolling } from "./firestorePolling";
import { createLocalCollectionStore } from "./localFallback";

const toIsoString = (value) =>
  typeof value === "string"
    ? value
    : value?.toDate?.().toISOString?.() || new Date().toISOString();

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return null;

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "valid"].includes(normalized)) return true;
  if (["0", "false", "no", "invalid"].includes(normalized)) return false;

  return null;
};

const normalizeSensorType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "";
  if (["temperature", "temp", "tempc"].includes(normalized)) return "temperature";
  if (["humidity", "rh", "relativehumidity"].includes(normalized)) return "humidity";
  if (["co2", "co2ppm", "carbondioxide"].includes(normalized)) return "co2";
  if (["absolutehumidity", "abshumidity", "abs_humidity"].includes(normalized)) {
    return "absoluteHumidity";
  }

  return value;
};

const inferPacketId = (snapshotId, data) => {
  if (data.packetId != null && data.packetId !== "") {
    return data.packetId;
  }

  const directCandidates = [data.packet, data.packetID, data.PacketID];
  const directMatch = directCandidates.find((candidate) => candidate != null && candidate !== "");

  if (directMatch != null) {
    return directMatch;
  }

  const idMatch = String(snapshotId || "").match(/^(\d+)/);
  return idMatch ? idMatch[1] : null;
};

const inferLocation = (data, packetId) => {
  if (data.location) return data.location;
  if (data.zoneName) return data.zoneName;
  if (data.zone) return data.zone;
  if (data.imageName && packetId != null) return `Packet ${packetId} / ${data.imageName}`;
  if (packetId != null) return `Packet ${packetId}`;
  return "";
};

const localReadings = createLocalCollectionStore("nakhla_sensor_readings", []);

const normalizeReadingData = (id, data = {}) => {
  const packetId = inferPacketId(id, data);

  return {
    id,
    ...data,
    packetId,
    packetIdRaw: data.packetIdRaw || "",
    sensorType: normalizeSensorType(data.sensorType || data.type || data.metric || data.sensor),
    location: inferLocation(data, packetId),
    lat: data.lat ?? data.latitude ?? data.coords?.lat ?? null,
    lon: data.lon ?? data.longitude ?? data.coords?.lon ?? null,
    latRaw: data.latRaw || "",
    lonRaw: data.lonRaw || "",
    rawValue: data.rawValue || "",
    groundGPSValid: normalizeBoolean(data.groundGPSValid),
    droneGPSValid: normalizeBoolean(data.droneGPSValid),
    importedByName: data.importedByName || data.createdByName || "",
    importedByEmail: data.importedByEmail || data.createdByEmail || "",
    stationId: data.stationId || "",
    stationName: data.stationName || "",
    stationLocation: data.stationLocation || "",
    zoneName: data.zoneName || "",
    missionId: data.missionId || "",
    missionDate: data.missionDate || "",
    sourceFileName: data.sourceFileName || "",
    timestamp: toIsoString(data.timestamp || data.importedAt || data.createdAt),
  };
};

const normalizeReading = (snapshot) => normalizeReadingData(snapshot.id, snapshot.data());

const buildReadingsQuery = (maxItems = 80) =>
  query(collection(db, "sensor_readings"), orderBy("timestamp", "desc"), limit(maxItems));

const buildRawReadingsQuery = (maxItems = 80) =>
  query(collection(db, "sensor_readings"), limit(maxItems));

const sortReadingsByTimestampDesc = (rows) =>
  [...rows].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

const loadBackendReadings = async (maxItems = 80) => {
  const getLatestSensorReadings = httpsCallable(functions, "getLatestSensorReadings");
  const result = await getLatestSensorReadings({ maxItems });
  const rows = Array.isArray(result.data?.rows) ? result.data.rows : [];
  return sortReadingsByTimestampDesc(rows.map((item) => normalizeReadingData(item.id, item)));
};

const loadNormalizedReadings = async (maxItems = 80) => {
  try {
    const backendRows = await loadBackendReadings(maxItems);

    if (backendRows.length) {
      return backendRows;
    }
  } catch {
    // Fall back to direct Firestore reads below.
  }

  try {
    const orderedSnapshot = await getDocs(buildReadingsQuery(maxItems));
    const orderedRows = orderedSnapshot.docs.map(normalizeReading);

    if (orderedRows.length) {
      return orderedRows;
    }
  } catch {
    // Fall back to a raw collection read below.
  }

  const rawSnapshot = await getDocs(buildRawReadingsQuery(maxItems * 4));
  return sortReadingsByTimestampDesc(rawSnapshot.docs.map(normalizeReading)).slice(0, maxItems);
};

export const fetchLatestSensorReadingsFeed = async (user, maxItems = 80) => {
  if (!user) {
    return {
      rows: [],
      source: "unauthenticated",
      error: "",
    };
  }

  if (user.isDev) {
    return {
      rows: localReadings.readAll(),
      source: "local",
      error: "",
    };
  }

  try {
    const rows = await loadNormalizedReadings(maxItems);
    return {
      rows,
      source: "firestore",
      error: "",
    };
  } catch (error) {
    return {
      rows: [],
      source: "firestore",
      error: error?.message || "Unable to load sensor readings from Firestore.",
    };
  }
};

export const subscribeToSensorReadings = (
  user,
  callback,
  maxItems = 80
) => {
  if (!user) {
    callback([]);
    return () => {};
  }

  if (user.isDev) {
    return localReadings.notify(callback);
  }

  return subscribeWithPolling(async () => {
    try {
      const rows = await loadNormalizedReadings(maxItems);
      callback(rows);
    } catch {
      callback(localReadings.readAll());
    }
  });
};

export const subscribeToSensorReadingsFeed = (
  user,
  callback,
  maxItems = 80
) => {
  if (!user) {
    callback({
      rows: [],
      source: "unauthenticated",
      error: "",
    });
    return () => {};
  }

  if (user.isDev) {
    return localReadings.notify((rows) => {
      callback({
        rows,
        source: "local",
        error: "",
      });
    });
  }

  return subscribeWithPolling(async () => {
    try {
      const rows = await loadNormalizedReadings(maxItems);
      callback({
        rows,
        source: "firestore",
        error: "",
      });
    } catch (error) {
      callback({
        rows: [],
        source: "firestore",
        error: error?.message || "Unable to load sensor readings from Firestore.",
      });
    }
  });
};

export const subscribeToSensorReadingsByDate = (
  user,
  callback,
  selectedDate,
  maxItems = 200
) => {
  if (!selectedDate) {
    callback([]);
    return () => {};
  }

  if (!user) {
    callback([]);
    return () => {};
  }

  if (user.isDev) {
    const dayRows = localReadings
      .readAll()
      .filter((item) => String(item.timestamp || "").slice(0, 10) === selectedDate)
      .slice(0, maxItems);

    callback(dayRows);
    return () => {};
  }

  const startDate = new Date(`${selectedDate}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  const readingsQuery = query(
    collection(db, "sensor_readings"),
    where("timestamp", ">=", Timestamp.fromDate(startDate)),
    where("timestamp", "<", Timestamp.fromDate(endDate)),
    orderBy("timestamp", "desc"),
    limit(maxItems)
  );

  return subscribeWithPolling(async () => {
    try {
      const snapshot = await getDocs(readingsQuery);
      callback(snapshot.docs.map(normalizeReading));
    } catch {
      callback([]);
    }
  });
};
