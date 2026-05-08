import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import palmGroveImage from "../assets/ksa-palms.jpg";
import { subscribeToStations } from "../firebase/services/stationsService";
import { getStationsCopy } from "../utils/roleExperience";
import { setSelectedStation } from "../utils/missionContext";
import "./StationsPage.css";

const statusClassMap = {
  Active: "success",
  Monitoring: "warning",
  Maintenance: "danger",
};

const formatLastSeen = (value) => {
  if (!value) return "No recent update";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No recent update";
  return date.toLocaleString();
};

const formatCoordinates = (station) => {
  if (station.latitude == null || station.longitude == null) return "Not set";
  return `${Number(station.latitude).toFixed(6)}, ${Number(station.longitude).toFixed(6)}`;
};

const farmerStationSummary = [
  { key: "total", label: "Total Stations", value: "1", note: "All stations", icon: "stations" },
  { key: "active", label: "Active Now", value: "1", note: "Online & reporting", icon: "active" },
  { key: "online", label: "Online", value: "1", note: "Currently online", icon: "online" },
];

const FarmerStationsIcon = ({ name, className = "" }) => {
  const icons = {
    leaf: <path d="M18.5 5.5c-5.2 0-9 2.1-11.4 6.3-1.5 2.6-1.8 5.3-1.9 6.7 1.4 0 4.1-.3 6.7-1.9 4.2-2.4 6.3-6.2 6.3-11.4 0-.4 0-.7-.1-.9-.2.1-.5.1-.8.1ZM7.7 17.3c2.5-3.2 5.4-5.8 8.6-7.9" />,
    stations: (
      <>
        <path d="M12 4.6v14.8" />
        <path d="M8.2 8.3a5.4 5.4 0 0 0 0 7.4M15.8 8.3a5.4 5.4 0 0 1 0 7.4" />
        <path d="M5.5 5.6a9.2 9.2 0 0 0 0 12.8M18.5 5.6a9.2 9.2 0 0 1 0 12.8" />
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
  };

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

export default function StationsPage() {
  const { user } = useAuth();
  const [stations, setStations] = useState([]);
  const pageCopy = getStationsCopy(user?.role);
  const isFarmer = user?.role === "farmer";

  useEffect(() => {
    const unsubscribe = subscribeToStations(user, setStations);
    return () => unsubscribe?.();
  }, [user]);

  const stats = useMemo(() => {
    const active = stations.filter((station) => station.status === "Active").length;
    const online = stations.filter((station) => station.connectivity === "Online").length;
    return {
      total: stations.length,
      active,
      online,
    };
  }, [stations]);

  if (isFarmer) {
    const farmerStation = stations[0];
    const stationRouteId = encodeURIComponent(farmerStation?.stationId || farmerStation?.id || "ST002");

    return (
      <>
        <Navigation />
        <div className="dashboard-page container-fluid farmer-stations-page" style={{ backgroundImage: `linear-gradient(rgba(8, 39, 19, 0.84), rgba(8, 39, 19, 0.92)), url(${palmGroveImage})` }}>
          <div className="farmer-stations-shell">
            <section className="farmer-stations-hero">
              <h1 className="farmer-stations-title">
                <FarmerStationsIcon name="leaf" className="farmer-stations-title-leaf" />
                Station Overview
                <FarmerStationsIcon name="leaf" className="farmer-stations-title-leaf" />
              </h1>
              <p className="farmer-stations-subtitle">Choose a farm station and see its latest condition clearly.</p>
            </section>

            <section className="farmer-stations-summary">
              {farmerStationSummary.map((card) => (
                <article key={card.key} className="farmer-stations-summary-card">
                  <span className="farmer-stations-summary-icon">
                    <FarmerStationsIcon name={card.icon} />
                  </span>
                  <div>
                    <small>{card.label}</small>
                    <strong>{card.value}</strong>
                    <p>{card.note}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="farmer-stations-panel">
              <div className="farmer-stations-panel-head">
                <h2>Monitored Stations</h2>
                <p>Open a station to view its latest readings, condition, and suggested action.</p>
              </div>

              <article className="farmer-station-card">
                <div className="farmer-station-card-top">
                  <div>
                    <h3>ST001</h3>
                    <span>Krulpalm</span>
                  </div>
                  <span className="farmer-station-badge">Active</span>
                </div>

                <div className="farmer-station-meta">
                  <div className="farmer-station-meta-item">
                    <small>Station ID</small>
                    <strong>ST002</strong>
                  </div>
                  <div className="farmer-station-meta-item">
                    <small>Type</small>
                    <strong>Ground Station</strong>
                  </div>
                  <div className="farmer-station-meta-item">
                    <small>Connection</small>
                    <strong>Online</strong>
                  </div>
                  <div className="farmer-station-meta-item">
                    <small>Last Update</small>
                    <strong>4/3/2025, 49.153991</strong>
                  </div>
                  <div className="farmer-station-meta-item farmer-station-meta-item-wide">
                    <small>Reads</small>
                    <strong>General farm readings</strong>
                  </div>
                </div>

                <div className="farmer-station-actions">
                  <Link
                    to={`/stations/${stationRouteId}`}
                    className="farmer-station-button"
                    onClick={() => farmerStation && setSelectedStation(farmerStation)}
                  >
                    View Station Condition
                  </Link>
                </div>
              </article>
            </section>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="dashboard-page container-fluid">
        <div className="container py-5 stations-page">
          <div className="app-page-header">
            <div className="app-page-header-copy">
              <h1 className="page-title mb-2">{pageCopy.title}</h1>
              <p className="stations-subtitle">{pageCopy.subtitle}</p>
            </div>
          </div>

          <div className="stations-stats">
            <article className="stations-stat-card">
              <small>Total Stations</small>
              <strong>{stats.total}</strong>
            </article>
            <article className="stations-stat-card">
              <small>Active Now</small>
              <strong>{stats.active}</strong>
            </article>
            <article className="stations-stat-card">
              <small>Online</small>
              <strong>{stats.online}</strong>
            </article>
          </div>

          <section className="stations-panel">
            <div className="stations-panel-head">
              <div>
                <h2>{pageCopy.panelTitle}</h2>
                <p>{pageCopy.panelText}</p>
              </div>
            </div>

            <div className="stations-grid">
              {stations.length ? (
                stations.map((station) => (
                  <article key={station.id} className="station-card">
                    <div className="station-card-top">
                      <div>
                        <h3>{station.name}</h3>
                        <p>{station.location}</p>
                      </div>
                      <span className={`station-badge ${statusClassMap[station.status] || ""}`}>
                        {station.status || "Unknown"}
                      </span>
                    </div>

                    <div className="station-meta">
                      <div className="station-meta-item">
                        <small>Station ID</small>
                        <strong>{station.stationId || station.id}</strong>
                      </div>
                      <div className="station-meta-item">
                        <small>Type</small>
                        <strong>{station.type || "Not set"}</strong>
                      </div>
                      <div className="station-meta-item">
                        <small>Connection</small>
                        <strong>{station.connectivity || "Unknown"}</strong>
                      </div>
                      <div className="station-meta-item station-meta-item-wide">
                        <small>Coordinates</small>
                        <strong>{formatCoordinates(station)}</strong>
                      </div>
                      <div className="station-meta-item station-meta-item-wide">
                        <small>Last update</small>
                        <strong>{formatLastSeen(station.lastSeen)}</strong>
                      </div>
                    </div>

                    <div className="station-coverage">
                      <small>Reads</small>
                      <strong>{station.coverage || "General farm readings"}</strong>
                    </div>

                    {station.notes && <p className="station-notes">{station.notes}</p>}

                    <div className="station-actions">
                      <Link
                        to={`/stations/${encodeURIComponent(station.stationId || station.id)}`}
                        className="btn btn-outline-success"
                        onClick={() => setSelectedStation(station)}
                      >
                        {pageCopy.actionLabel}
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="station-empty">
                  No stations are available yet. Ask an admin to add the first station.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
