import { useEffect, useRef, useState } from "react";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { subscribeToAlerts } from "../firebase/services/alertsService";
import { subscribeToAnalyses } from "../firebase/services/analysesService";
import { recordActivity } from "../firebase/services/activityLogService";
import {
  deleteZoneRecord,
  saveZone,
  subscribeToZones,
} from "../firebase/services/zonesService";
import "./ZoneManagementPage.css";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };

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

const emptyDraft = {
  name: "",
  assignee: "",
  cropType: "Palm",
  status: "Healthy",
  purpose: "Monitoring",
  notes: "",
  points: [],
};

const formatCoordinate = ({ lat, lng }) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

export default function ZoneManagementPage() {
  const { user } = useAuth();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapClickRef = useRef(null);
  const mapMoveRef = useRef(null);
  const markersRef = useRef([]);
  const polygonsRef = useRef([]);
  const previewShapeRef = useRef(null);
  const hoverLineRef = useRef(null);
  const userLocationMarkerRef = useRef(null);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [search, setSearch] = useState("");
  const [cursorPoint, setCursorPoint] = useState(null);
  const [mapState, setMapState] = useState({
    loading: true,
    ready: false,
    error: "",
  });

  useEffect(() => {
    const unsubscribe = subscribeToZones(user, setZones);
    const unsubscribeAlerts = subscribeToAlerts(user, setAlerts);
    const unsubscribeAnalyses = subscribeToAnalyses(user, setAnalyses);
    return () => {
      unsubscribe?.();
      unsubscribeAlerts?.();
      unsubscribeAnalyses?.();
    };
  }, [user]);

  useEffect(() => {
    let disposed = false;

    loadGoogleMapsApi()
      .then(() => {
        if (disposed || !mapContainerRef.current) return;

        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 10,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (disposed) return;

              const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };

              map.setCenter(userLocation);
              map.setZoom(14);

              if (userLocationMarkerRef.current) {
                userLocationMarkerRef.current.setMap(null);
              }

              userLocationMarkerRef.current = new window.google.maps.Marker({
                position: userLocation,
                map,
                title: "Your Location",
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#4285F4",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                },
              });
            },
            () => {
              console.warn("Location permission denied or unavailable.");
            }
          );
        }

        mapClickRef.current = map.addListener("click", (event) => {
          setDraft((prev) => ({
            ...prev,
            points: [
              ...prev.points,
              { lat: event.latLng.lat(), lng: event.latLng.lng() },
            ],
          }));
        });
        mapMoveRef.current = map.addListener("mousemove", (event) => {
          setCursorPoint({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        });

        setMapState({ loading: false, ready: true, error: "" });
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
      if (mapMoveRef.current) {
        window.google?.maps?.event.removeListener(mapMoveRef.current);
      }
      markersRef.current.forEach((marker) => marker.setMap(null));
      polygonsRef.current.forEach((polygon) => polygon.setMap(null));
      if (previewShapeRef.current) {
        previewShapeRef.current.setMap(null);
      }
      if (hoverLineRef.current) {
        hoverLineRef.current.setMap(null);
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    polygonsRef.current.forEach((polygon) => polygon.setMap(null));
    if (previewShapeRef.current) {
      previewShapeRef.current.setMap(null);
      previewShapeRef.current = null;
    }
    if (hoverLineRef.current) {
      hoverLineRef.current.setMap(null);
      hoverLineRef.current = null;
    }

    const nextMarkers = [];
    const nextPolygons = [];

    zones.forEach((zone) => {
      if (zone.points.length < 3) return;

      const polygon = new window.google.maps.Polygon({
        map: mapRef.current,
        paths: zone.points,
        strokeColor: "#1E5631",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: "#F5C451",
        fillOpacity: 0.2,
      });

      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: zone.points[0],
        title: zone.name,
        label: zone.name.slice(0, 1).toUpperCase(),
      });

      nextPolygons.push(polygon);
      nextMarkers.push(marker);
    });

    if (draft.points.length >= 2) {
      const PreviewClass =
        draft.points.length >= 3 ? window.google.maps.Polygon : window.google.maps.Polyline;
      previewShapeRef.current = new PreviewClass({
        map: mapRef.current,
        ...(draft.points.length >= 3 ? { paths: draft.points } : { path: draft.points }),
        strokeColor: "#dc3545",
        strokeOpacity: 1,
        strokeWeight: 3,
        fillColor: "#dc3545",
        fillOpacity: 0.12,
      });
    }

    if (draft.points.length >= 1 && cursorPoint) {
      const anchor = draft.points[draft.points.length - 1];
      hoverLineRef.current = new window.google.maps.Polyline({
        map: mapRef.current,
        path: [anchor, cursorPoint],
        strokeColor: "#f59e0b",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              scale: 3,
            },
            offset: "0",
            repeat: "12px",
          },
        ],
      });
    }

    draft.points.forEach((point, index) => {
      nextMarkers.push(
        new window.google.maps.Marker({
          map: mapRef.current,
          position: point,
          title: `Draft point ${index + 1}`,
          label: String(index + 1),
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: "#dc3545",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        })
      );
    });

    markersRef.current = nextMarkers;
    polygonsRef.current = nextPolygons;
  }, [zones, draft.points, cursorPoint]);

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setCursorPoint(null);
  };

  const handleSaveZone = async () => {
    if (!draft.name.trim()) {
      alert("Zone name is required.");
      return;
    }

    if (draft.points.length < 3) {
      alert("Select at least three coordinates to create a valid zone.");
      return;
    }

    const zoneRecord = {
      id: editingId || undefined,
      name: draft.name.trim(),
      assignee: draft.assignee.trim() || "Unassigned",
      cropType: draft.cropType,
      status: draft.status,
      purpose: draft.purpose,
      notes: draft.notes.trim(),
      points: draft.points,
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveZone(user, zoneRecord);
    await recordActivity(user, {
      type: editingId ? "zone_updated" : "zone_created",
      entity: "zone",
      entityId: saved?.id || editingId || "",
      message: `${editingId ? "Updated" : "Created"} zone ${zoneRecord.name}`,
    });
    resetDraft();
  };

  const handleEditZone = (zone) => {
    setEditingId(zone.id);
    setDraft({
      name: zone.name,
      assignee: zone.assignee,
      cropType: zone.cropType || "Palm",
      status: zone.status || "Healthy",
      purpose: zone.purpose,
      notes: zone.notes || "",
      points: zone.points,
    });

    if (mapRef.current && zone.points[0]) {
      mapRef.current.panTo(zone.points[0]);
      mapRef.current.setZoom(14);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    const zone = zones.find((item) => item.id === zoneId);
    await deleteZoneRecord(user, zoneId);
    await recordActivity(user, {
      type: "zone_deleted",
      entity: "zone",
      entityId: zoneId,
      message: `Deleted zone ${zone?.name || zoneId}`,
    });
    if (editingId === zoneId) {
      resetDraft();
    }
  };

  const filteredZones = zones.filter((zone) =>
    zone.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedZone =
    zones.find((zone) => zone.id === selectedZoneId) || filteredZones[0] || null;

  const selectedZoneAlerts = alerts.filter((alert) => alert.zone === selectedZone?.name);
  const selectedZoneAnalyses = analyses.filter(
    (analysis) => analysis.zoneId === selectedZone?.id || analysis.zoneName === selectedZone?.name
  );

  const handleRemoveLastPoint = () => {
    setDraft((prev) => ({
      ...prev,
      points: prev.points.slice(0, -1),
    }));
    setCursorPoint(null);
  };

  return (
    <>
      <Navigation />

      <div className="dashboard-page container-fluid">
        <div className="container py-5">
          <div className="app-page-header">
            <div className="app-page-header-copy">
              <h1 className="page-title mb-3">Zone Management</h1>
              <p className="zone-page-subtitle">
                Define operational zones on Google Maps, save polygon coordinates, and assign each
                zone to a team or workflow.
              </p>
            </div>
          </div>

          <div className="zone-grid">
            <section className="zone-card zone-editor-card">
              <div className="zone-card-header">
                <div>
                  <h2>{editingId ? "Edit Zone" : "Create Zone"}</h2>
                  <p>Click the map to add boundary points in order.</p>
                </div>
                <div className="zone-editor-actions">
                  <button className="btn btn-outline-secondary" onClick={handleRemoveLastPoint}>
                    Undo Point
                  </button>
                  <button className="btn btn-outline-secondary" onClick={resetDraft}>
                    Clear Draft
                  </button>
                </div>
              </div>

              <div className="zone-form-grid">
                <label>
                  Zone Name
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="North Orchard"
                  />
                </label>

                <label>
                  Assignee
                  <input
                    type="text"
                    value={draft.assignee}
                    onChange={(e) => setDraft((prev) => ({ ...prev, assignee: e.target.value }))}
                    placeholder="Operator Team A"
                  />
                </label>

                <label>
                  Crop Type
                  <select
                    value={draft.cropType}
                    onChange={(e) => setDraft((prev) => ({ ...prev, cropType: e.target.value }))}
                  >
                    <option value="Palm">Palm</option>
                    <option value="Dates">Dates</option>
                    <option value="Mixed Orchard">Mixed Orchard</option>
                    <option value="Nursery">Nursery</option>
                  </select>
                </label>

                <label>
                  Zone Status
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Monitoring">Monitoring</option>
                    <option value="Warning">Warning</option>
                    <option value="Restricted">Restricted</option>
                  </select>
                </label>

                <label>
                  Purpose
                  <select
                    value={draft.purpose}
                    onChange={(e) => setDraft((prev) => ({ ...prev, purpose: e.target.value }))}
                  >
                    <option value="Monitoring">Monitoring</option>
                    <option value="Irrigation">Irrigation</option>
                    <option value="Restricted">Restricted</option>
                    <option value="Inspection">Inspection</option>
                  </select>
                </label>

                <label>
                  Boundary Points
                  <input type="text" value={`${draft.points.length} selected`} readOnly />
                </label>
              </div>

              <label className="zone-notes-field">
                Notes
                <textarea
                  rows="3"
                  value={draft.notes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional operational notes for this zone."
                />
              </label>

              <div className="map-shell">
                {mapState.loading && <div className="map-status">Loading Google Maps...</div>}

                {!mapState.loading && mapState.error && (
                  <div className="map-status error">
                    <strong>Map unavailable.</strong>
                    <span>{mapState.error}</span>
                    {!GOOGLE_MAPS_API_KEY && (
                      <span>
                        Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to your environment to
                        enable the map picker.
                      </span>
                    )}
                  </div>
                )}

                <div
                  ref={mapContainerRef}
                  className={`zone-map ${!mapState.ready ? "zone-map-hidden" : ""}`}
                />
              </div>

              <div className="coordinate-panel">
                <div className="coordinate-panel-header">
                  <h3>Draft Coordinates</h3>
                  <span>{draft.points.length} points</span>
                </div>
                <div className="coordinate-list">
                  {draft.points.length ? (
                    draft.points.map((point, index) => (
                      <div key={`${point.lat}-${point.lng}-${index}`} className="coordinate-row">
                        <strong>P{index + 1}</strong>
                        <span>{formatCoordinate(point)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="coordinate-empty">
                      Click on the map to start defining the zone polygon.
                    </div>
                  )}
                </div>
              </div>

              <div className="zone-save-actions">
                <button className="btn btn-success" onClick={handleSaveZone}>
                  {editingId ? "Update Zone" : "Save Zone"}
                </button>
              </div>
            </section>

            <aside className="zone-card zone-list-card">
              <div className="zone-card-header">
                <div>
                  <h2>Saved Zones</h2>
                  <p>Stored in Firestore for shared admin access.</p>
                </div>
                <div className="zone-count-badge">{zones.length}</div>
              </div>

              <input
                type="text"
                className="mb-3"
                placeholder="Search zones"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="saved-zone-list">
                {filteredZones.length ? (
                  filteredZones.map((zone) => (
                    <article key={zone.id} className="saved-zone-card">
                      <div className="saved-zone-top">
                        <div>
                          <h3>{zone.name}</h3>
                          <p>
                            {zone.cropType || "Palm"} • {zone.purpose}
                          </p>
                        </div>
                        <span>{zone.points.length} pts</span>
                      </div>

                      <div className="saved-zone-meta">
                        <span>Assigned to: {zone.assignee}</span>
                        <span>Status: {zone.status || "Healthy"}</span>
                        <span>Updated: {new Date(zone.updatedAt).toLocaleString()}</span>
                      </div>

                      {zone.notes && <p className="saved-zone-notes">{zone.notes}</p>}

                      <div className="saved-zone-actions">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => {
                            setSelectedZoneId(zone.id);
                            handleEditZone(zone);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => setSelectedZoneId(zone.id)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDeleteZone(zone.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="saved-zone-empty">
                    No zones saved yet. Create one from the map and assign it to an operator.
                  </div>
                )}
              </div>

              {selectedZone && (
                <div className="saved-zone-card mt-3">
                  <div className="saved-zone-top">
                    <div>
                      <h3>{selectedZone.name}</h3>
                      <p>Zone detail</p>
                    </div>
                    <span>{selectedZone.status || "Healthy"}</span>
                  </div>
                  <div className="saved-zone-meta">
                    <span>Alerts: {selectedZoneAlerts.length}</span>
                    <span>Analyses: {selectedZoneAnalyses.length}</span>
                  </div>
                  <div className="saved-zone-meta">
                    <span>Crop: {selectedZone.cropType || "Palm"}</span>
                    <span>Assignee: {selectedZone.assignee}</span>
                  </div>
                  <div className="saved-zone-notes">
                    Recent detection:{" "}
                    {selectedZoneAnalyses[0]?.status || "No crop health record yet"}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
