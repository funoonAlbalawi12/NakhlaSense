import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import palmGroveImage from "../assets/ksa-palms.jpg";
import { subscribeToAlerts } from "../firebase/services/alertsService";
import { subscribeToSensorReadingsFeed } from "../firebase/services/sensorReadingsService";
import { subscribeToStations } from "../firebase/services/stationsService";
import { getRoleAwareAlerts } from "../utils/alerts";
import { ROLES } from "../auth/permissions";
import { setSelectedStation } from "../utils/missionContext";
import "./StationsPage.css";

const formatCoordinates = (station) => {
  if (station?.latitude == null || station?.longitude == null) return "Not set";
  return `${Number(station.latitude).toFixed(6)}, ${Number(station.longitude).toFixed(6)}`;
};

const metricAverage = (rows, type) => {
  const values = rows
    .filter((item) => item.sensorType === type)
    .map((item) => Number(item.value))
    .filter((item) => Number.isFinite(item));

  if (!values.length) return "--";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(type === "co2" ? 0 : 1);
};

const FarmerStationDetailIcon = ({ name, className = "" }) => {
  const icons = {
    leaf: <path d="M18.5 5.5c-5.2 0-9 2.1-11.4 6.3-1.5 2.6-1.8 5.3-1.9 6.7 1.4 0 4.1-.3 6.7-1.9 4.2-2.4 6.3-6.2 6.3-11.4 0-.4 0-.7-.1-.9-.2.1-.5.1-.8.1ZM7.7 17.3c2.5-3.2 5.4-5.8 8.6-7.9" />,
    active: (
      <>
        <circle cx="12" cy="12" r="8.8" />
        <path d="m8.8 12.2 2.1 2.1 4.5-4.8" />
      </>
    ),
    temp: (
      <>
        <path d="M12 5.2v8.4" />
        <path d="M9.5 7.2V15a4 4 0 1 0 5 0V7.2a2.5 2.5 0 1 0-5 0Z" />
      </>
    ),
    humidity: (
      <>
        <path d="M12 4.5c3.2 4 4.8 6.6 4.8 8.7A4.8 4.8 0 1 1 7.2 13c0-2.1 1.6-4.7 4.8-8.5Z" />
      </>
    ),
    co2: (
      <>
        <circle cx="9" cy="12" r="4.8" />
        <circle cx="15.4" cy="9.5" r="3.5" />
        <circle cx="15.6" cy="14.6" r="4.1" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3.4 21.2 19H2.8L12 3.4Z" />
        <path d="M12 8.8v5.1" />
        <circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

export default function StationDetailsPage() {
  const { stationId } = useParams();
  const { user } = useAuth();
  const [stations, setStations] = useState([]);
  const [feed, setFeed] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const unsubStations = subscribeToStations(user, setStations);
    const unsubFeed = subscribeToSensorReadingsFeed(user, ({ rows }) => setFeed(rows), 150);
    const unsubAlerts = subscribeToAlerts(user, setAlerts);

    return () => {
      unsubStations?.();
      unsubFeed?.();
      unsubAlerts?.();
    };
  }, [user]);

  const station = useMemo(
    () =>
      stations.find(
        (item) => item.id === stationId || item.stationId === stationId || String(item.stationId || "") === stationId
      ),
    [stationId, stations]
  );

  const stationRows = useMemo(() => {
    if (!station) return [];
    return feed.filter((item) => item.location === station.name || item.location === station.location);
  }, [feed, station]);

  const roleAlerts = useMemo(
    () => getRoleAwareAlerts(alerts, user?.role || ROLES.OPERATOR).filter((item) => item.zone === station?.name),
    [alerts, station?.name, user?.role]
  );

  const stationStatusCopy =
    user?.role === ROLES.FARMER
      ? "See a simple station condition summary and the latest recommended actions."
      : user?.role === ROLES.ADMIN
      ? "Review the station, recent readings, and active mission concerns before opening management tools."
      : "Review the mission target, its latest readings, and current operational alerts before the next step.";

  useEffect(() => {
    if (station) {
      setSelectedStation(station);
    }
  }, [station]);

  if (user?.role === ROLES.FARMER) {
    const activeAlertCount = roleAlerts.filter((item) => item.status !== "Resolved").length;

    return (
      <>
        <Navigation />
        <div className="dashboard-page container-fluid farmer-stations-page" style={{ backgroundImage: `linear-gradient(rgba(8, 39, 19, 0.84), rgba(8, 39, 19, 0.92)), url(${palmGroveImage})` }}>
          <div className="farmer-stations-shell">
            {!station ? (
              <div className="station-empty">This station could not be found.</div>
            ) : (
              <>
                <section className="farmer-stations-hero">
                  <h1 className="farmer-stations-title">
                    <FarmerStationDetailIcon name="leaf" className="farmer-stations-title-leaf" />
                    Station Condition
                    <FarmerStationDetailIcon name="leaf" className="farmer-stations-title-leaf" />
                  </h1>
                  <p className="farmer-stations-subtitle">See the latest readings, alert status, and station condition clearly.</p>
                </section>

                <section className="farmer-stations-summary">
                  <article className="farmer-stations-summary-card">
                    <span className="farmer-stations-summary-icon"><FarmerStationDetailIcon name="active" /></span>
                    <div>
                      <small>Status</small>
                      <strong>{station.status || "Active"}</strong>
                      <p>{station.connectivity || "Online"}</p>
                    </div>
                  </article>
                  <article className="farmer-stations-summary-card">
                    <span className="farmer-stations-summary-icon"><FarmerStationDetailIcon name="temp" /></span>
                    <div>
                      <small>Temperature</small>
                      <strong>{metricAverage(stationRows, "temperature")}</strong>
                      <p>Average reading</p>
                    </div>
                  </article>
                  <article className="farmer-stations-summary-card">
                    <span className="farmer-stations-summary-icon"><FarmerStationDetailIcon name="humidity" /></span>
                    <div>
                      <small>Humidity</small>
                      <strong>{metricAverage(stationRows, "humidity")}</strong>
                      <p>Average reading</p>
                    </div>
                  </article>
                  <article className="farmer-stations-summary-card">
                    <span className="farmer-stations-summary-icon"><FarmerStationDetailIcon name="alert" /></span>
                    <div>
                      <small>Active Alerts</small>
                      <strong>{activeAlertCount}</strong>
                      <p>Needs attention</p>
                    </div>
                  </article>
                </section>

                <section className="farmer-stations-panel">
                  <div className="farmer-stations-panel-head">
                    <h2>{station.name || "Station"}</h2>
                    <p>{station.location || "No location text provided"}</p>
                  </div>

                  <article className="farmer-station-card">
                    <div className="farmer-station-card-top">
                      <div>
                        <h3>{station.stationId || station.id}</h3>
                        <span>{station.zone || station.zoneName || "General farm zone"}</span>
                      </div>
                      <span className="farmer-station-badge">{station.status || "Active"}</span>
                    </div>

                    <div className="farmer-station-meta">
                      <div className="farmer-station-meta-item">
                        <small>Station ID</small>
                        <strong>{station.stationId || station.id}</strong>
                      </div>
                      <div className="farmer-station-meta-item">
                        <small>Type</small>
                        <strong>{station.type || "Ground Station"}</strong>
                      </div>
                      <div className="farmer-station-meta-item">
                        <small>Connection</small>
                        <strong>{station.connectivity || "Online"}</strong>
                      </div>
                      <div className="farmer-station-meta-item">
                        <small>Coordinates</small>
                        <strong>{formatCoordinates(station)}</strong>
                      </div>
                      <div className="farmer-station-meta-item">
                        <small>Temperature</small>
                        <strong>{metricAverage(stationRows, "temperature")} C</strong>
                      </div>
                      <div className="farmer-station-meta-item">
                        <small>Humidity</small>
                        <strong>{metricAverage(stationRows, "humidity")} %</strong>
                      </div>
                      <div className="farmer-station-meta-item">
                        <small>CO2</small>
                        <strong>{metricAverage(stationRows, "co2")} ppm</strong>
                      </div>
                      <div className="farmer-station-meta-item farmer-station-meta-item-wide">
                        <small>Current Alerts</small>
                        <strong>
                          {roleAlerts.length
                            ? roleAlerts
                                .slice(0, 2)
                                .map((alert) => alert.title || alert.displayMessage)
                                .join(" • ")
                            : "No active alerts for this station right now."}
                        </strong>
                      </div>
                    </div>

                    <div className="farmer-station-actions">
                      <Link to="/stations" className="farmer-station-button">Back to Stations</Link>
                    </div>
                  </article>
                </section>
              </>
            )}
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
              <h1 className="page-title mb-2">{station?.name || "Station Details"}</h1>
              <p className="stations-subtitle">{stationStatusCopy}</p>
            </div>
          </div>

          {!station ? (
            <div className="station-empty">This station could not be found.</div>
          ) : (
            <>
              <div className="stations-stats">
                <article className="stations-stat-card">
                  <small>Station ID</small>
                  <strong>{station.stationId || station.id}</strong>
                </article>
                <article className="stations-stat-card">
                  <small>Coordinates</small>
                  <strong style={{ fontSize: "1.15rem" }}>{formatCoordinates(station)}</strong>
                </article>
                <article className="stations-stat-card">
                  <small>Zone</small>
                  <strong style={{ fontSize: "1.15rem" }}>{station.zone || station.zoneName || "Not set"}</strong>
                </article>
                <article className="stations-stat-card">
                  <small>Avg Temperature</small>
                  <strong>{metricAverage(stationRows, "temperature")}</strong>
                </article>
                <article className="stations-stat-card">
                  <small>Active Alerts</small>
                  <strong>{roleAlerts.filter((item) => item.status !== "Resolved").length}</strong>
                </article>
              </div>

              <section className="stations-panel">
                <div className="stations-panel-head">
                  <div>
                    <h2>Station Detail</h2>
                    <p>{station.location || "No location text provided"}</p>
                  </div>
                  <div className="app-page-actions">
                    {user?.role === ROLES.OPERATOR && (
                      <>
                        <Link to="/weather" className="btn btn-outline-success">Pre-Flight Safety</Link>
                        <Link to="/missions" className="btn btn-outline-secondary">Mission History</Link>
                      </>
                    )}
                    {user?.role === ROLES.FARMER && (
                      <>
                        <Link to="/crop-health" className="btn btn-outline-success">Crop Health</Link>
                      </>
                    )}
                    {user?.role === ROLES.ADMIN && (
                      <>
                        <Link to="/stations-management" className="btn btn-outline-success">Manage Station</Link>
                        <Link to="/reports" className="btn btn-outline-secondary">Mission Records</Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="stations-grid">
                  <article className="station-card">
                    <div className="station-card-top">
                      <div>
                        <h3>Monitoring Summary</h3>
                        <p>Latest interpreted values linked to this station.</p>
                      </div>
                    </div>
                    <div className="station-meta">
                      <span><strong>Station:</strong> {station.name}</span>
                      <span><strong>Station ID:</strong> {station.stationId || station.id}</span>
                      <span><strong>Zone:</strong> {station.zone || station.zoneName || "Not set"}</span>
                      <span><strong>Temperature:</strong> {metricAverage(stationRows, "temperature")} C</span>
                      <span><strong>Humidity:</strong> {metricAverage(stationRows, "humidity")} %</span>
                      <span><strong>CO2:</strong> {metricAverage(stationRows, "co2")} ppm</span>
                      <span><strong>Uploaded readings:</strong> {stationRows.length}</span>
                    </div>
                  </article>

                  <article className="station-card">
                    <div className="station-card-top">
                      <div>
                        <h3>Current Alerts</h3>
                        <p>Role-aware alerts related to this station.</p>
                      </div>
                    </div>
                    <div className="station-meta">
                      {roleAlerts.length ? (
                        roleAlerts.slice(0, 4).map((alert) => (
                          <span key={alert.id}>
                            <strong>{alert.parameter}:</strong> {alert.displayMessage}
                          </span>
                        ))
                      ) : (
                        <span>No active alerts for this station right now.</span>
                      )}
                    </div>
                  </article>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
