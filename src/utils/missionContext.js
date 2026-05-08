const SELECTED_STATION_KEY = "nakhla_selected_station";
const ACTIVE_MISSION_KEY = "nakhla_active_mission";

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

export const getSelectedStation = () => {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(SELECTED_STATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setSelectedStation = (station) => {
  if (!canUseStorage()) return;

  const payload = station
    ? {
        id: station.id || station.stationId || "",
        stationId: station.stationId || station.id || "",
        name: station.name || "Unnamed Station",
        location: station.location || "",
        zone: station.zone || station.zoneName || "",
        latitude: station.latitude ?? null,
        longitude: station.longitude ?? null,
      }
    : null;

  if (!payload) {
    window.localStorage.removeItem(SELECTED_STATION_KEY);
    return;
  }

  window.localStorage.setItem(SELECTED_STATION_KEY, JSON.stringify(payload));
};

export const buildMissionId = (station) => {
  const stationPart = String(station?.stationId || station?.id || "STATION")
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase();
  const timestampPart = new Date().toISOString().replace(/[:.]/g, "-");
  return `MISSION-${stationPart}-${timestampPart}`;
};

export const getActiveMission = () => {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(ACTIVE_MISSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setActiveMission = (mission) => {
  if (!canUseStorage()) return;

  if (!mission) {
    window.localStorage.removeItem(ACTIVE_MISSION_KEY);
    return;
  }

  window.localStorage.setItem(
    ACTIVE_MISSION_KEY,
    JSON.stringify({
      missionId: mission.missionId,
      stationId: mission.stationId || "",
      stationName: mission.stationName || "",
      missionDate: mission.missionDate || new Date().toISOString().slice(0, 10),
      uploadedBy: mission.uploadedBy || "",
      status: mission.status || "active",
      fileName: mission.fileName || "",
      uploadStatus: mission.uploadStatus || mission.status || "active",
    })
  );
};
