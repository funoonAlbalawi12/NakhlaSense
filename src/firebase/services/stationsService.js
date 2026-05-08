import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db } from "../config";
import { functions } from "../config";
import { createLocalCollectionStore } from "./localFallback";

const localStations = createLocalCollectionStore("nakhla_stations", []);
const STATIONS_CACHE_KEY = "nakhla_cached_stations";

const mapStationDoc = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const sortStations = (items) =>
  [...items].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
  );

const readCachedStations = () => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STATIONS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? sortStations(parsed) : [];
  } catch {
    return [];
  }
};

const writeCachedStations = (stations) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(STATIONS_CACHE_KEY, JSON.stringify(sortStations(stations)));
  } catch {
    // ignore storage write issues
  }
};

const upsertCachedStation = (station) => {
  if (!station) return;
  const stations = readCachedStations();
  const nextStations = [
    station,
    ...stations.filter((item) => String(item.id || item.stationId) !== String(station.id || station.stationId)),
  ];
  writeCachedStations(nextStations);
};

const removeCachedStation = (stationId) => {
  const stations = readCachedStations();
  writeCachedStations(stations.filter((item) => String(item.id) !== String(stationId)));
};

export const subscribeToStations = (user, callback) => {
  if (!user) {
    callback([]);
    return () => {};
  }

  if (user.isDev) {
    return localStations.notify(callback);
  }

  const cachedStations = readCachedStations();
  if (cachedStations.length) {
    callback(cachedStations);
  }

  const stationsQuery = query(collection(db, "stations"), orderBy("updatedAt", "desc"));
  return onSnapshot(
    stationsQuery,
    (snapshot) => {
      const stations = snapshot.docs.map(mapStationDoc);
      writeCachedStations(stations);
      callback(stations);
    },
    () => {
      callback(readCachedStations());
    }
  );
};

export const saveStation = async (user, station) => {
  const payload = {
    name: station.name,
    location: station.location,
    latitude: station.latitude ?? null,
    longitude: station.longitude ?? null,
    type: station.type,
    status: station.status,
    connectivity: station.connectivity,
    coverage: station.coverage || "",
    notes: station.notes || "",
    lastSeen: station.lastSeen || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: user?.email || "unknown",
  };

  if (user?.isDev || !user) {
    const id = station.id || `station-${Date.now()}`;
    const existingStations = localStations.getAll();
    const maxSequence = existingStations.reduce((highest, item) => {
      const match = String(item.stationId || "").match(/^ST(\d{3})$/i);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    const generatedStationId = station.stationId || `ST${String(maxSequence + 1).padStart(3, "0")}`;
    return localStations.upsert(id, { ...payload, stationId: generatedStationId, name: station.name || generatedStationId });
  }

  const saveStationRecord = httpsCallable(functions, "saveStationRecord");
  const result = await saveStationRecord({
    stationId: station.id || "",
    ...payload,
  });

  const savedStation = result.data?.station;
  upsertCachedStation(savedStation);
  return savedStation;
};

export const deleteStationRecord = async (user, stationId) => {
  if (user?.isDev || !user) {
    localStations.remove(stationId);
    return;
  }

  const deleteStationRecordCallable = httpsCallable(functions, "deleteStationRecord");
  await deleteStationRecordCallable({ stationId });
  removeCachedStation(stationId);
};
