import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  MapPin,
  Plus,
  RadioTower,
  Search,
  Trash2,
} from "lucide-react";
import Navigation from "../components/Navigation";
import { useAuth } from "../contexts/AuthContext";
import { recordActivity } from "../firebase/services/activityLogService";
import {
  deleteStationRecord,
  saveStation,
  subscribeToStations,
} from "../firebase/services/stationsService";
import Footer from "../components/Footer";
import { setSelectedStation } from "../utils/missionContext";
import "./StationsManagementPage.css";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const DEFAULT_STATION_CENTER = { lat: 24.713551, lng: 46.675296 };

const emptyDraft = {
  name: "",
  location: "",
  latitude: "",
  longitude: "",
  type: "Ground Station",
  status: "Active",
  connectivity: "Online",
  coverage: "",
  lastSeen: "",
  notes: "",
};

const formatInputDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const formatCoordinates = (station) => {
  if (station.latitude == null || station.longitude == null) {
    return "Not set";
  }

  return `${Number(station.latitude).toFixed(6)}, ${Number(station.longitude).toFixed(6)}`;
};

const extractCityName = (result) => {
  const components = result?.address_components || [];
  const preferredTypes = [
    "locality",
    "administrative_area_level_2",
    "administrative_area_level_1",
    "sublocality",
  ];

  for (const type of preferredTypes) {
    const match = components.find((component) => component.types?.includes(type));
    if (match?.long_name) {
      return match.long_name;
    }
  }

  return result?.formatted_address?.split(",")[0]?.trim() || "";
};

const loadGoogleMapsApi = () => {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Missing Google Maps API key."));
  }

  if (window.__nakhlaGoogleMapsPromise) {
    return window.__nakhlaGoogleMapsPromise;
  }

  window.__nakhlaGoogleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Failed to load Google Maps."));
    document.head.appendChild(script);
  });

  return window.__nakhlaGoogleMapsPromise;
};

export default function StationsManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const formPanelRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapClickRef = useRef(null);
  const geocoderRef = useRef(null);
  const [stations, setStations] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [currentPage, setCurrentPage] = useState(1);
  const [mapState, setMapState] = useState({
    loading: true,
    ready: false,
    error: "",
  });
  const [locationState, setLocationState] = useState({
    status: "idle",
    message: "Allow location access to center the map on your current position.",
  });
  const [saveState, setSaveState] = useState({
    status: "idle",
    message: "",
  });
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "";

  const updateCoordinatesFromMap = useCallback((latitude, longitude) => {
    setDraft((prev) => ({
      ...prev,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));

    if (!geocoderRef.current) {
      return;
    }

    geocoderRef.current.geocode(
      { location: { lat: latitude, lng: longitude } },
      (results, status) => {
        if (status !== "OK" || !results?.length) {
          return;
        }

        const cityName = extractCityName(results[0]);
        if (!cityName) {
          return;
        }

        setDraft((prev) => ({
          ...prev,
          location: cityName,
        }));
      }
    );
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToStations(user, setStations);
    return () => unsubscribe?.();
  }, [user]);

  useEffect(() => {
    let disposed = false;

    loadGoogleMapsApi()
      .then(() => {
        if (disposed || !mapContainerRef.current) return;

        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: DEFAULT_STATION_CENTER,
          zoom: 11,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;
        geocoderRef.current = new window.google.maps.Geocoder();
        markerRef.current = new window.google.maps.Marker({
          map,
          position: DEFAULT_STATION_CENTER,
          title: "Selected station position",
          draggable: true,
        });

        mapClickRef.current = map.addListener("click", (event) => {
          updateCoordinatesFromMap(event.latLng.lat(), event.latLng.lng());
        });

        markerRef.current.addListener("dragend", (event) => {
          updateCoordinatesFromMap(event.latLng.lat(), event.latLng.lng());
        });

        setMapState({ loading: false, ready: true, error: "" });

        if (navigator.geolocation) {
          setLocationState({
            status: "loading",
            message: "Reading your current location...",
          });

          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (disposed) return;

              const latitude = position.coords.latitude;
              const longitude = position.coords.longitude;
              const currentPosition = { lat: latitude, lng: longitude };

              map.setCenter(currentPosition);
              map.setZoom(15);
              markerRef.current?.setPosition(currentPosition);
              updateCoordinatesFromMap(latitude, longitude);
              setLocationState({
                status: "success",
                message: "Map centered on your current location.",
              });
            },
            () => {
              if (disposed) return;
              setLocationState({
                status: "error",
                message: "Current location was not allowed. You can still click the map or use the button below.",
              });
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        } else {
          setLocationState({
            status: "error",
            message: "This browser does not support live location access.",
          });
        }
      })
      .catch((error) => {
        if (disposed) return;
        setMapState({
          loading: false,
          ready: false,
          error: error.message || "Google Maps could not be loaded.",
        });
      });

    return () => {
      disposed = true;
      if (mapClickRef.current) {
        window.google?.maps?.event.removeListener(mapClickRef.current);
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [updateCoordinatesFromMap]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const position = { lat: latitude, lng: longitude };
    markerRef.current.setPosition(position);
    mapRef.current.panTo(position);
  }, [draft.latitude, draft.longitude]);

  const nextStationCode = useMemo(() => {
    const maxSequence = stations.reduce((highest, station) => {
      const match = String(station.stationId || "").match(/^ST(\d{3})$/i);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);

    return `ST${String(maxSequence + 1).padStart(3, "0")}`;
  }, [stations]);

  useEffect(() => {
    if (editingId) {
      return;
    }

    setDraft((prev) => ({
      ...prev,
      name: nextStationCode,
    }));
  }, [editingId, nextStationCode]);

  const filteredStations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return stations.filter((station) => {
      const matchesSearch =
        !term ||
        [station.id, station.stationId, station.name, station.location, station.type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const stationStatus = String(station.status || "").trim();
      const matchesStatus =
        statusFilter === "All Status" || stationStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [search, stations, statusFilter]);

  const paginatedStations = useMemo(() => {
    const pageSize = 4;
    const start = (currentPage - 1) * pageSize;
    return filteredStations.slice(start, start + pageSize);
  }, [currentPage, filteredStations]);

  const totalPages = Math.max(1, Math.ceil(filteredStations.length / 4));
  const statusOptions = ["All Status", "Active", "Monitoring", "Maintenance", "Offline"];

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const resetDraft = () => {
    setDraft({
      ...emptyDraft,
      name: nextStationCode,
    });
    setEditingId(null);
    setSaveState({
      status: "idle",
      message: "",
    });
  };

  const handleSave = async () => {
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);

    if (!draft.location.trim()) {
      setSaveState({
        status: "error",
        message: "Location is still empty. Click the map, use your current location, or type the city name before saving.",
      });
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSaveState({
        status: "error",
        message: "Pick the station position on the map first so latitude and longitude can be saved.",
      });
      return;
    }

    setSaveState({
      status: "saving",
      message: editingId ? "Updating station..." : "Saving station...",
    });

    try {
      const payload = {
        id: editingId || undefined,
        ...draft,
        name: draft.name.trim() || nextStationCode,
        location: draft.location.trim(),
        latitude,
        longitude,
        coverage: draft.coverage.trim(),
        notes: draft.notes.trim(),
        lastSeen: draft.lastSeen ? new Date(draft.lastSeen).toISOString() : new Date().toISOString(),
      };

      const saved = await saveStation(user, payload);
      if (!saved) {
        throw new Error("The station could not be saved. Please try again.");
      }

      setStations((current) => [
        saved,
        ...current.filter((item) => String(item.id || item.stationId) !== String(saved.id || saved.stationId)),
      ]);
      setSelectedStation(saved);
      await recordActivity(user, {
        type: editingId ? "station_updated" : "station_created",
        entity: "station",
        entityId: saved.id || editingId || "",
        message: `${editingId ? "Updated" : "Created"} station ${payload.name}`,
      });

      resetDraft();

      setSaveState({
        status: "success",
        message: `${saved.stationId || payload.name} was saved successfully.`,
      });

      if (returnTo) {
        navigate(returnTo);
      }
    } catch (error) {
      setSaveState({
        status: "error",
        message: error?.message || "Failed to save station.",
      });
    }
  };

  const handleEdit = (station) => {
    setEditingId(station.id);
    setSaveState({
      status: "idle",
      message: "",
    });
    setDraft({
      name: station.name || "",
      location: station.location || "",
      latitude: station.latitude ?? "",
      longitude: station.longitude ?? "",
      type: station.type || "Ground Station",
      status: station.status || "Active",
      connectivity: station.connectivity || "Online",
      coverage: station.coverage || "",
      lastSeen: formatInputDateTime(station.lastSeen),
      notes: station.notes || "",
    });
  };

  const handleDelete = async (station) => {
    await deleteStationRecord(user, station.id);
    setStations((current) => current.filter((item) => item.id !== station.id));
    await recordActivity(user, {
      type: "station_deleted",
      entity: "station",
      entityId: station.id,
      message: `Deleted station ${station.name || station.id}`,
    });
    if (editingId === station.id) {
      resetDraft();
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationState({
        status: "error",
        message: "This browser does not support live location access.",
      });
      return;
    }

    setLocationState({
      status: "loading",
      message: "Reading your current location...",
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        updateCoordinatesFromMap(latitude, longitude);
        if (mapRef.current) {
          mapRef.current.setCenter({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(15);
        }
        setLocationState({
          status: "success",
          message: "Map centered on your current location.",
        });
      },
      () => {
        setLocationState({
          status: "error",
          message: "Current location was not allowed. You can still click the map manually.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const getStationTone = (station) => {
    const status = String(station.status || "").toLowerCase();
    const connectivity = String(station.connectivity || "").toLowerCase();

    if (connectivity === "offline" || status === "offline") return "red";
    if (status === "maintenance" || status === "monitoring" || connectivity === "intermittent") return "yellow";
    return "green";
  };

  return (
    <main className="stations-ops-page">
      <Navigation navPreset="operator-core" />
      <div className="dashboard-page container-fluid">
        <section className="stations-ops-shell">
          <div className="stations-ops-container">
            <div className="stations-ops-hero">
              <div className="stations-ops-hero-copy">
                <div className="stations-ops-hero-icon">
                  <RadioTower />
                </div>
                <div>
                  <h1>Stations Management</h1>
                  <p>Add, update, and organize the stations that collect data across the farm.</p>
                </div>
              </div>

              <div className="stations-ops-hero-actions">
                {returnTo ? (
                  <button
                    type="button"
                    className="stations-ops-secondary-button"
                    onClick={() => navigate(returnTo)}
                  >
                    Back to Mission Upload
                  </button>
                ) : null}

                <button
                  type="button"
                  className="stations-ops-primary-button"
                  onClick={() => {
                    resetDraft();
                    formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <Plus />
                  Add New Station
                </button>
              </div>
            </div>

            <div className="stations-ops-grid">
              <section className="stations-ops-panel" ref={formPanelRef}>
                <div className="stations-ops-panel-head">
                  <div>
                    <div className="stations-ops-panel-title">
                      <RadioTower />
                      <h2>{editingId ? "Edit Station" : "Add Station"}</h2>
                    </div>
                    <p>Enter station details and location.</p>
                  </div>
                </div>

                {saveState.status !== "idle" ? (
                  <div className={`stations-ops-message stations-ops-message-${saveState.status}`}>
                    {saveState.message}
                  </div>
                ) : null}

                <div className="stations-ops-form-grid">
                  <label className="stations-ops-field">
                    <span>Station Name</span>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="ST001"
                      readOnly={!editingId}
                    />
                  </label>

                  <label className="stations-ops-field">
                    <span>Location</span>
                    <input
                      type="text"
                      value={draft.location}
                      onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                      placeholder="Detected city from map"
                    />
                  </label>

                  <label className="stations-ops-field">
                    <span>Latitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={draft.latitude}
                      onChange={(event) => setDraft((prev) => ({ ...prev, latitude: event.target.value }))}
                      placeholder="24.713551"
                    />
                  </label>

                  <label className="stations-ops-field">
                    <span>Longitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={draft.longitude}
                      onChange={(event) => setDraft((prev) => ({ ...prev, longitude: event.target.value }))}
                      placeholder="46.675296"
                    />
                  </label>
                </div>

                <div className="stations-ops-map-panel">
                  <div className="stations-ops-map-head">
                    <div>
                      <h3>Map Preview</h3>
                      <p>Click the map or drag the marker to fill coordinates.</p>
                    </div>
                    <button
                      type="button"
                      className="stations-ops-ghost-button"
                      onClick={handleUseCurrentLocation}
                    >
                      <MapPin />
                      Use Current Location
                    </button>
                  </div>

                  <div
                    className={`stations-ops-map ${!mapState.ready ? "stations-ops-map-hidden" : ""}`}
                    ref={mapContainerRef}
                  />

                  {mapState.loading ? <div className="stations-ops-map-state">Loading Google Maps...</div> : null}
                  {mapState.error ? <div className="stations-ops-map-state is-error">{mapState.error}</div> : null}
                  {!mapState.error ? (
                    <div className={`stations-ops-map-state ${locationState.status === "error" ? "is-error" : ""}`}>
                      {locationState.message}
                    </div>
                  ) : null}
                </div>

                <div className="stations-ops-form-grid stations-ops-form-grid-secondary">
                  <label className="stations-ops-field">
                    <span>Type</span>
                    <div className="stations-ops-select-wrap">
                      <select
                        value={draft.type}
                        onChange={(event) => setDraft((prev) => ({ ...prev, type: event.target.value }))}
                      >
                        <option value="Ground Station">Ground Station</option>
                        <option value="Relay Station">Relay Station</option>
                        <option value="Drone Dock">Drone Dock</option>
                        <option value="Weather Unit">Weather Unit</option>
                      </select>
                      <ChevronDown />
                    </div>
                  </label>

                  <label className="stations-ops-field">
                    <span>Status</span>
                    <div className="stations-ops-select-wrap">
                      <select
                        value={draft.status}
                        onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
                      >
                        <option value="Active">Active</option>
                        <option value="Monitoring">Monitoring</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Offline">Offline</option>
                      </select>
                      <ChevronDown />
                    </div>
                  </label>

                  <label className="stations-ops-field">
                    <span>Connectivity</span>
                    <div className="stations-ops-select-wrap">
                      <select
                        value={draft.connectivity}
                        onChange={(event) => setDraft((prev) => ({ ...prev, connectivity: event.target.value }))}
                      >
                        <option value="Online">Online</option>
                        <option value="Intermittent">Intermittent</option>
                        <option value="Offline">Offline</option>
                      </select>
                      <ChevronDown />
                    </div>
                  </label>

                  <label className="stations-ops-field">
                    <span>Coverage</span>
                    <input
                      type="text"
                      value={draft.coverage}
                      onChange={(event) => setDraft((prev) => ({ ...prev, coverage: event.target.value }))}
                      placeholder="Temperature, humidity, CO2"
                    />
                  </label>

                  <label className="stations-ops-field stations-ops-field-wide">
                    <span>Last Update</span>
                    <div className="stations-ops-input-icon">
                      <input
                        type="datetime-local"
                        value={draft.lastSeen}
                        onChange={(event) => setDraft((prev) => ({ ...prev, lastSeen: event.target.value }))}
                      />
                      <CalendarDays />
                    </div>
                  </label>
                </div>

                <div className="stations-ops-form-actions">
                  <button
                    type="button"
                    className="stations-ops-save-button"
                    onClick={handleSave}
                    disabled={saveState.status === "saving"}
                  >
                    {saveState.status === "saving"
                      ? "Saving..."
                      : editingId
                        ? "Update Station"
                        : "Save Station"}
                  </button>
                  <button type="button" className="stations-ops-clear-button" onClick={resetDraft}>
                    Clear
                  </button>
                </div>
              </section>

              <aside className="stations-ops-panel">
                <div className="stations-ops-panel-head stations-ops-panel-head-saved">
                  <div>
                    <div className="stations-ops-panel-title">
                      <RadioTower />
                      <h2>Saved Stations</h2>
                    </div>
                    <p>Manage all farm stations from one place.</p>
                  </div>
                  <div className="stations-ops-count-badge">{filteredStations.length}</div>
                </div>

                <div className="stations-ops-toolbar">
                  <label className="stations-ops-search">
                    <Search />
                    <input
                      type="search"
                      placeholder="Search stations..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>

                  <div className="stations-ops-filter">
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown />
                  </div>
                </div>

                <div className="stations-ops-list">
                  {paginatedStations.length ? (
                    paginatedStations.map((station) => {
                      const tone = getStationTone(station);
                      return (
                        <article key={station.id} className="stations-ops-card">
                          <div className={`stations-ops-card-icon tone-${tone}`}>
                            <RadioTower />
                          </div>

                          <div className="stations-ops-card-body">
                            <div className="stations-ops-card-top">
                              <div>
                                <h3>{station.name || station.stationId || station.id}</h3>
                                <p>
                                  {station.stationId || station.id} · {station.location || "Location pending"}
                                </p>
                              </div>
                              <span className={`stations-ops-status tone-${tone}`}>
                                {station.status || "Active"}
                              </span>
                            </div>

                            <div className="stations-ops-card-meta">
                              <div>
                                <span>Type</span>
                                <strong>{station.type || "Ground Station"}</strong>
                              </div>
                              <div>
                                <span>Coordinates</span>
                                <strong>{formatCoordinates(station)}</strong>
                              </div>
                              <div>
                                <span>Connection</span>
                                <strong className={String(station.connectivity || "").toLowerCase() === "online" ? "is-online" : ""}>
                                  {station.connectivity || "Unknown"}
                                </strong>
                              </div>
                              <div>
                                <span>Last update</span>
                                <strong>
                                  {station.lastSeen ? new Date(station.lastSeen).toLocaleString() : "No recent update"}
                                </strong>
                              </div>
                            </div>

                            {station.coverage ? (
                              <div className="stations-ops-card-extra">
                                <p>
                                  <strong>Coverage:</strong> {station.coverage}
                                </p>
                              </div>
                            ) : null}
                          </div>

                          <div className="stations-ops-card-actions">
                            <button
                              type="button"
                              className="stations-ops-icon-button is-edit"
                              onClick={() => handleEdit(station)}
                            >
                              <Edit3 />
                            </button>
                            <button
                              type="button"
                              className="stations-ops-icon-button is-delete"
                              onClick={() => handleDelete(station)}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="stations-ops-empty">
                      No stations match the current filters. Save a station to start building your network.
                    </div>
                  )}
                </div>

                <div className="stations-ops-pagination">
                  <span>
                    Showing {filteredStations.length ? (currentPage - 1) * 4 + 1 : 0} to{" "}
                    {Math.min(currentPage * 4, filteredStations.length)} of {filteredStations.length} stations
                  </span>

                  <div className="stations-ops-pagination-controls">
                    <button
                      type="button"
                      className="stations-ops-page-button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft />
                    </button>
                    <button type="button" className="stations-ops-page-button is-active">
                      {currentPage}
                    </button>
                    <button
                      type="button"
                      className="stations-ops-page-button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight />
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
