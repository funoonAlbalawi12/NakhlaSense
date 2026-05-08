import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Search,
  XCircle,
} from "lucide-react";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import palmGroveImage from "../assets/ksa-palms.jpg";
import { useAuth } from "../contexts/AuthContext";
import { PERMISSIONS } from "../auth/permissions";
import { recordActivity } from "../firebase/services/activityLogService";
import {
  subscribeToAlerts,
  updateAlertStatus,
} from "../firebase/services/alertsService";
import { subscribeToZones } from "../firebase/services/zonesService";
import { getRoleAwareAlerts } from "../utils/alerts";
import "./AlertSystemPage.css";

const defaultFilter = {
  zone: "All",
  severity: "All",
  status: "All",
  query: "",
};

const formatDelay = (delayMs) => {
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    return "--";
  }

  return `${(delayMs / 1000).toFixed(2)} s`;
};

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
  if (kind === "task") return containsAny(`${alert?.title || ""} ${alert?.displayMessage || ""}`, ["record", "monthly", "reminder"]) ? "reminder" : "task";
  return "disease";
};

const formatAlertTimeAgo = (time) => {
  const date = new Date(time);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "Just now";
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const AlertIcon = ({ name, className = "" }) => {
  const icons = {
    leaf: (
      <path d="M18.5 5.5c-5.2 0-9 2.1-11.4 6.3-1.5 2.6-1.8 5.3-1.9 6.7 1.4 0 4.1-.3 6.7-1.9 4.2-2.4 6.3-6.2 6.3-11.4 0-.4 0-.7-.1-.9-.2.1-.5.1-.8.1ZM7.7 17.3c2.5-3.2 5.4-5.8 8.6-7.9" />
    ),
    high: (
      <>
        <path d="M12 2.4 20.2 6v6.2c0 5.3-3.4 10.1-8.2 11.4C7.2 22.3 3.8 17.5 3.8 12.2V6L12 2.4Z" />
        <path d="M12 7.3v6.1" />
        <circle cx="12" cy="16.9" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
    medium: (
      <>
        <path d="M12 3.4 21.2 19H2.8L12 3.4Z" />
        <path d="M12 8.6v5.2" />
        <circle cx="12" cy="17.1" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
    low: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v5.3" />
        <circle cx="12" cy="7.2" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
    task: (
      <>
        <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
        <path d="M8 3.8v3.1M16 3.8v3.1M4 9.8h16" />
        <path d="M8 13h2M12 13h2M16 13h0M8 16.2h2M12 16.2h2" />
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
    reminder: (
      <>
        <rect x="5.2" y="4.8" width="13.6" height="14.4" rx="2.2" />
        <path d="M8.5 3.5v3M15.5 3.5v3M8 9h8M9.2 12.1h2.2M13.1 12.1h2.2M9.2 15.3h6.1" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.8v4.6l3 1.8" />
      </>
    ),
    chevron: <path d="m9 6 6 6-6 6" />,
    shield: (
      <>
        <path d="M12 3.2 19 6v5.3c0 4.5-2.8 8.6-7 9.8-4.2-1.2-7-5.3-7-9.8V6l7-2.8Z" />
        <path d="M12 8.2v6.3" />
      </>
    ),
    sprout: (
      <>
        <path d="M12 20v-6.3" />
        <path d="M12 13.7c0-3.6 2.5-6.3 6.2-6.3.1 3.7-2.5 6.3-6.2 6.3Z" />
        <path d="M12 15.2c0-3.3-2.2-5.5-5.6-5.5-.1 3.3 2.2 5.5 5.6 5.5Z" />
      </>
    ),
    gear: (
      <>
        <path d="m12 4.6 1 .4.8 1.7 1.9.5 1.5-1 1.4 1.4-1 1.5.5 1.9 1.7.8.4 1-1.7 1-.4 1 .4 1 1.7 1-.4 1-1.4 1.4-1.5-1-1.9.5-.8 1.7-1 .4-1-.4-.8-1.7-1.9-.5-1.5 1-1.4-1.4 1-1.5-.5-1.9-1.7-.8-.4-1 .4-1 1.7-1 .5-1.9-1-1.5 1.4-1.4 1.5 1 1.9-.5.8-1.7 1-.4Z" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
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

export default function AlertsPage() {
  const { user, hasPermission } = useAuth();
  const pageOpenedAtRef = useRef(Date.now());
  const seenAlertIdsRef = useRef(new Set());
  const [alerts, setAlerts] = useState([]);
  const [zonesData, setZonesData] = useState([]);
  const [filter, setFilter] = useState(defaultFilter);
  const [loading, setLoading] = useState(true);
  const [alertDisplayTimings, setAlertDisplayTimings] = useState({});
  const [farmerViewFilter, setFarmerViewFilter] = useState("All");
  const canManageAlerts = hasPermission(PERMISSIONS.MANAGE_ALERTS);
  const canExportAlerts = hasPermission(PERMISSIONS.EXPORT_DATA);
  const isFarmer = user?.role === "farmer";
  const role = user?.role || "operator";

  useEffect(() => {
    const unsubscribeAlerts = subscribeToAlerts(user, (nextAlerts) => {
      setAlerts(nextAlerts);
      setLoading(false);
    });

    const unsubscribeZones = subscribeToZones(user, (nextZones) => {
      setZonesData(nextZones);
    });

    return () => {
      unsubscribeAlerts?.();
      unsubscribeZones?.();
    };
  }, [user]);

  const roleAwareAlerts = useMemo(() => getRoleAwareAlerts(alerts, role), [alerts, role]);

  useEffect(() => {
    setAlertDisplayTimings({});
    seenAlertIdsRef.current = new Set();
    pageOpenedAtRef.current = Date.now();
  }, [user?.uid, role]);

  useEffect(() => {
    const now = Date.now();

    roleAwareAlerts.forEach((alert) => {
      if (!alert?.id || seenAlertIdsRef.current.has(alert.id)) {
        return;
      }

      seenAlertIdsRef.current.add(alert.id);

      const alertTime = new Date(alert.time).getTime();
      if (!Number.isFinite(alertTime) || alertTime < pageOpenedAtRef.current) {
        return;
      }

      const delayMs = Math.max(0, now - alertTime);

      setAlertDisplayTimings((current) => ({
        ...current,
        [alert.id]: delayMs,
      }));
    });
  }, [roleAwareAlerts]);

  const zones = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set([
          ...roleAwareAlerts.map((a) => a.zone),
          ...zonesData.map((zone) => zone.name),
        ])
      ),
    ],
    [roleAwareAlerts, zonesData]
  );

  const filtered = useMemo(() => {
    return roleAwareAlerts
      .filter((a) => {
        if (filter.zone !== "All" && a.zone !== filter.zone) return false;
        if (filter.severity !== "All" && a.severity !== filter.severity) return false;
        if (filter.status !== "All" && a.status !== filter.status) return false;
        if (
          filter.query &&
          !`${a.zone} ${a.parameter} ${a.severity} ${a.category} ${a.displayMessage}`
            .toLowerCase()
            .includes(filter.query.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [filter, roleAwareAlerts]);

  const farmerAlerts = useMemo(
    () =>
      roleAwareAlerts
        .filter((alert) => alert.status !== "Resolved")
        .map((alert) => ({
          ...alert,
          priority: getFarmerSeverityLevel(alert.severity),
          icon: getFarmerAlertIcon(alert),
          message: alert.displayMessage,
        }))
        .sort((a, b) => new Date(b.time) - new Date(a.time)),
    [roleAwareAlerts]
  );

  const farmerSummary = useMemo(
    () => ({
      high: farmerAlerts.filter((alert) => alert.priority === "High").length,
      medium: farmerAlerts.filter((alert) => alert.priority === "Medium").length,
      low: farmerAlerts.filter((alert) => alert.priority === "Low").length,
      tasks: farmerAlerts.filter((alert) => getFarmerAlertKind(alert) === "task").length,
    }),
    [farmerAlerts]
  );

  const farmerVisibleAlerts = useMemo(() => {
    if (farmerViewFilter === "All") {
      return farmerAlerts.slice(0, 5);
    }

    if (farmerViewFilter === "Tasks") {
      return farmerAlerts.filter((alert) => alert.icon === "task" || alert.icon === "reminder").slice(0, 5);
    }

    return farmerAlerts.filter((alert) => alert.priority === farmerViewFilter).slice(0, 5);
  }, [farmerAlerts, farmerViewFilter]);

  const stats = useMemo(() => {
    return {
      total: roleAwareAlerts.length,
      open: roleAwareAlerts.filter((a) => a.status === "Open").length,
      critical: roleAwareAlerts.filter((a) => a.severity === "Critical").length,
      resolved: roleAwareAlerts.filter((a) => a.status === "Resolved").length,
    };
  }, [roleAwareAlerts]);

  const liveDelayStats = useMemo(() => {
    const values = Object.values(alertDisplayTimings).filter((value) => Number.isFinite(value));

    if (!values.length) {
      return {
        latest: null,
        average: null,
        count: 0,
      };
    }

    return {
      latest: values[values.length - 1],
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      count: values.length,
    };
  }, [alertDisplayTimings]);

  const setStatus = async (id, status) => {
    if (!canManageAlerts) {
      return;
    }

    await updateAlertStatus(user, id, status);
    await recordActivity(user, {
      type: "alert_status_updated",
      entity: "alert",
      entityId: id,
      message: `Alert ${id} updated to ${status}`,
    });
  };

  const exportCsv = () => {
    if (!canExportAlerts) {
      return;
    }

    if (!filtered.length) {
      alert("No alerts to export for the selected filters.");
      return;
    }

    const headers = [
      "time",
      "zone",
      "severity",
      "parameter",
      "value",
      "threshold",
      "status",
    ];
    const rows = filtered.map((a) =>
      [a.time, a.zone, a.severity, a.parameter, a.value, a.threshold, a.status]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const operatorAlertRows = useMemo(
    () =>
      filtered.map((alert) => ({
        ...alert,
        tone: alert.severity === "Critical" ? "red" : alert.severity === "Warning" ? "yellow" : "green",
        source: `${alert.stationName || alert.stationId || "--"}${alert.missionId ? ` / Mission-${alert.missionId}` : ""}`,
        message:
          alert.displayMessage ||
          alert.title ||
          alert.nextStep ||
          "Review this alert and verify the related mission or station data.",
      })),
    [filtered]
  );

  return (
    <>
      <Navigation />

      <div
        className={`dashboard-page alerts-page container-fluid ${isFarmer ? "farmer-alerts-page" : ""}`}
        style={isFarmer ? { backgroundImage: `linear-gradient(rgba(8, 39, 19, 0.84), rgba(8, 39, 19, 0.92)), url(${palmGroveImage})` } : undefined}
      >
        <div className={isFarmer ? "farmer-alerts-shell" : "operator-alerts-shell"}>
          {!isFarmer ? (
            <div className="operator-alerts-hero">
              <div>
                <div className="operator-alerts-hero-title">
                  <Bell />
                  <h1>Operator Alerts</h1>
                </div>
                <p>Review technical and field alerts before they are shown to farmers.</p>
              </div>

              <div className="operator-alerts-hero-actions">
                <button type="button" className="operator-alerts-date-button">
                  <CalendarDays />
                  {new Date().toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  <ChevronDown />
                </button>
                {canExportAlerts ? (
                  <button type="button" className="operator-alerts-export-button" onClick={exportCsv}>
                    <Download />
                    Export CSV
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {loading && <p>Loading alerts from Firestore...</p>}

          {!loading && isFarmer ? (
            <div className="farmer-alerts-scene">
              <div className="farmer-alerts-layout">
                <div className="farmer-alerts-hero">
                  <h1 className="farmer-alerts-title">
                    <AlertIcon name="leaf" className="farmer-title-leaf" />
                    Alerts
                    <AlertIcon name="leaf" className="farmer-title-leaf" />
                  </h1>
                  <p className="farmer-alerts-subtitle">
                    Get timely alerts about disease risks, weather threats, and important farm activities.
                  </p>
                </div>

                <div className="farmer-alerts-summary">
                  <div className="farmer-alerts-summary-card priority-high">
                    <div className="farmer-alerts-summary-icon-wrap">
                      <span className="farmer-alerts-summary-icon summary-high">
                        <AlertIcon name="high" />
                      </span>
                      <div className="farmer-alerts-summary-copy">
                        <small>High Priority</small>
                        <strong>{farmerSummary.high}</strong>
                        <span>Needs immediate action</span>
                      </div>
                    </div>
                  </div>
                  <div className="farmer-alerts-summary-card priority-medium">
                    <div className="farmer-alerts-summary-icon-wrap">
                      <span className="farmer-alerts-summary-icon summary-medium">
                        <AlertIcon name="medium" />
                      </span>
                      <div className="farmer-alerts-summary-copy">
                        <small>Medium Priority</small>
                        <strong>{farmerSummary.medium}</strong>
                        <span>Action recommended</span>
                      </div>
                    </div>
                  </div>
                  <div className="farmer-alerts-summary-card priority-low">
                    <div className="farmer-alerts-summary-icon-wrap">
                      <span className="farmer-alerts-summary-icon summary-low">
                        <AlertIcon name="low" />
                      </span>
                      <div className="farmer-alerts-summary-copy">
                        <small>Low Priority</small>
                        <strong>{farmerSummary.low}</strong>
                        <span>For your awareness</span>
                      </div>
                    </div>
                  </div>
                  <div className="farmer-alerts-summary-card priority-task">
                    <div className="farmer-alerts-summary-icon-wrap">
                      <span className="farmer-alerts-summary-icon summary-task">
                        <AlertIcon name="task" />
                      </span>
                      <div className="farmer-alerts-summary-copy">
                        <small>Upcoming Tasks</small>
                        <strong>{farmerSummary.tasks}</strong>
                        <span>Due in the next 7 days</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="farmer-alerts-content">
                  <section className="farmer-alerts-panel farmer-alerts-panel-main">
                    <div className="farmer-alerts-panel-head">
                      <div className="farmer-alerts-panel-title">
                        <AlertIcon name="leaf" className="farmer-inline-leaf" />
                        <h2>Recent Alerts</h2>
                      </div>
                      <label className="farmer-alert-filter">
                        <span>Filter by:</span>
                        <select value={farmerViewFilter} onChange={(event) => setFarmerViewFilter(event.target.value)}>
                          <option value="All">All</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="Tasks">Tasks</option>
                        </select>
                      </label>
                    </div>

                    <div className="farmer-alerts-list">
                      {farmerVisibleAlerts.length ? (
                        farmerVisibleAlerts.map((alert) => (
                          <article key={alert.id} className="farmer-alert-row">
                            <div className={`farmer-alert-row-icon icon-${alert.priority.toLowerCase()}`}>
                              <AlertIcon name={alert.icon} />
                            </div>
                            <div className="farmer-alert-row-copy">
                              <div>
                                <h3>{alert.title}</h3>
                                <p className="farmer-alert-message">{alert.message}</p>
                              </div>
                            </div>
                            <span className={`farmer-alert-priority priority-${alert.priority.toLowerCase()}`}>
                              {alert.priority}
                            </span>
                            <div className="farmer-alert-row-meta">
                              <span className="farmer-alert-row-time">
                                <AlertIcon name="clock" className="farmer-meta-icon" />
                                {formatAlertTimeAgo(alert.time)}
                              </span>
                              <button type="button" className="farmer-alert-row-action" aria-label={`View alert for ${alert.title}`}>
                                <AlertIcon name="chevron" className="farmer-chevron-icon" />
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="farmer-alerts-empty">No active alerts match your current filter.</div>
                      )}
                    </div>

                    <button type="button" className="farmer-alerts-ghost-button" onClick={() => setFarmerViewFilter("All")}>
                      View All Alerts
                      <AlertIcon name="chevron" className="farmer-button-chevron" />
                    </button>
                  </section>

                </div>
              </div>
            </div>
          ) : null}

          {!isFarmer && (
            <>
              <div className="operator-alerts-stats">
                <div className="operator-alerts-stat-card tone-green">
                  <div className="operator-alerts-stat-icon"><Bell /></div>
                  <div><small>Total Alerts</small><strong>{stats.total}</strong></div>
                </div>
                <div className="operator-alerts-stat-card tone-yellow">
                  <div className="operator-alerts-stat-icon"><AlertTriangle /></div>
                  <div><small>Open</small><strong>{stats.open}</strong></div>
                </div>
                <div className="operator-alerts-stat-card tone-red">
                  <div className="operator-alerts-stat-icon"><XCircle /></div>
                  <div><small>Critical</small><strong>{stats.critical}</strong></div>
                </div>
                <div className="operator-alerts-stat-card tone-green">
                  <div className="operator-alerts-stat-icon"><CheckCircle2 /></div>
                  <div><small>Resolved</small><strong>{stats.resolved}</strong></div>
                </div>
                <div className="operator-alerts-stat-card tone-blue">
                  <div className="operator-alerts-stat-icon"><Clock /></div>
                  <div><small>Latest Delay</small><strong>{liveDelayStats.latest != null ? formatDelay(liveDelayStats.latest) : "--"}</strong></div>
                </div>
                <div className="operator-alerts-stat-card tone-blue">
                  <div className="operator-alerts-stat-icon"><Clock /></div>
                  <div><small>Avg. Live Delay</small><strong>{liveDelayStats.average != null ? formatDelay(liveDelayStats.average) : "--"}</strong></div>
                </div>
              </div>

              <div className="operator-alerts-filters">
                <label className="operator-alerts-search">
                  <Search />
                  <input
                    type="search"
                    placeholder="Search alerts..."
                    value={filter.query}
                    onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
                  />
                </label>

                <div className="operator-alerts-filter">
                  <select value={filter.zone} onChange={(e) => setFilter((f) => ({ ...f, zone: e.target.value }))}>
                    {zones.map((z) => (
                      <option key={z} value={z}>
                        {z === "All" ? "All Categories" : z}
                      </option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>

                <div className="operator-alerts-filter">
                  <select value={filter.severity} onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value }))}>
                    <option value="All">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="Warning">Warning</option>
                  </select>
                  <ChevronDown />
                </div>

                <div className="operator-alerts-filter">
                  <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
                    <option value="All">All Status</option>
                    <option value="New">New</option>
                    <option value="Open">Open</option>
                    <option value="Acknowledged">Acknowledged</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <ChevronDown />
                </div>
              </div>

              <div className="operator-alerts-layout">
                <section className="operator-alerts-panel">
                  <div className="operator-alerts-panel-head">
                    <div className="operator-alerts-panel-title">
                      <AlertTriangle className="tone-red-text" />
                      <h2>Alert Review Queue</h2>
                    </div>
                  </div>

                  <div className="operator-alerts-table">
                    <div className="operator-alerts-table-head">
                      <span>Time</span>
                      <span>Station / Mission</span>
                      <span>Zone</span>
                      <span>Severity</span>
                      <span>Category</span>
                      <span>Message</span>
                      <span>Status</span>
                      <span>Action</span>
                    </div>

                    {operatorAlertRows.length ? (
                      operatorAlertRows.map((alert) => (
                        <div key={alert.id} className="operator-alerts-row">
                          <span>{new Date(alert.time).toLocaleString()}</span>
                          <span className="source-cell">{alert.source}</span>
                          <span>{alert.zone || "--"}</span>
                          <span>
                            <span className={`operator-alerts-pill severity-${alert.tone}`}>{alert.severity}</span>
                          </span>
                          <span>
                            <span className="operator-alerts-pill category-pill">{alert.category || "General"}</span>
                          </span>
                          <span>{alert.message}</span>
                          <span>
                            <span className={`operator-alerts-pill status-${String(alert.status || "").toLowerCase() === "resolved" ? "resolved" : "open"}`}>
                              {alert.status}
                            </span>
                          </span>
                          <span>
                            {canManageAlerts ? (
                              <button
                                type="button"
                                className="operator-alerts-row-action"
                                onClick={() =>
                                  setStatus(
                                    alert.id,
                                    ["Open", "New"].includes(alert.status) ? "Acknowledged" : "Resolved"
                                  )
                                }
                              >
                                {["Open", "New"].includes(alert.status) ? "Review" : "View"}
                                <ChevronRight />
                              </button>
                            ) : (
                              <button type="button" className="operator-alerts-row-action">
                                View
                                <ChevronRight />
                              </button>
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="operator-alerts-empty">No alerts match the selected filters.</div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
