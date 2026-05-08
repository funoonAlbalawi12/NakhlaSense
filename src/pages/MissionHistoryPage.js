import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Printer,
  Search,
  Target,
} from "lucide-react";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { subscribeToAlerts } from "../firebase/services/alertsService";
import { subscribeToSensorReadingsFeed } from "../firebase/services/sensorReadingsService";
import "./MissionHistoryPage.css";

const groupMissionRows = (rows) => {
  const grouped = new Map();

  rows.forEach((row) => {
    const day = String(row.missionDate || row.timestamp || "").slice(0, 10) || "unknown-day";
    const location = row.stationName || row.stationLocation || row.location || "Unassigned";
    const missionId = row.missionId || `${day}|${location}`;
    const key = missionId;

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        missionId,
        date: day,
        location,
        stationId: row.stationId || "",
        uploadedBy: row.importedByName || row.importedByEmail || "--",
        readings: 0,
        packets: new Set(),
        lastTime: row.timestamp,
        source: row.sourceFileName || "--",
        gpsPackets: 0,
        validPackets: 0,
      });
    }

    const item = grouped.get(key);
    item.readings += 1;
    if (row.packetId != null) item.packets.add(String(row.packetId));
    if (row.groundGPSValid === true || row.droneGPSValid === true) {
      item.gpsPackets += 1;
    }
    if (row.value != null) {
      item.validPackets += 1;
    }
    if (new Date(row.timestamp) > new Date(item.lastTime)) {
      item.lastTime = row.timestamp;
    }
  });

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      packetCount: item.packets.size,
      gpsReliability: item.packetCount ? Math.round((item.gpsPackets / item.packetCount) * 100) : 0,
      validRate: item.readings ? Math.round((item.validPackets / item.readings) * 100) : 0,
    }))
    .sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
};

const formatMissionDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "--";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getMissionTone = (mission, relatedAlerts) => {
  if (!mission.validRate && !mission.gpsReliability) return "red";
  if (relatedAlerts > 5) return "red";
  if (mission.validRate < 100 || mission.gpsReliability < 95 || relatedAlerts > 0) return "yellow";
  return "green";
};

const getMissionStatus = (tone) => {
  if (tone === "red") return "Failed";
  if (tone === "yellow") return "Review Needed";
  return "Completed";
};

const matchesRange = (mission, range) => {
  if (range === "All Time") return true;
  const missionDate = new Date(mission.lastTime || mission.date);
  if (Number.isNaN(missionDate.getTime())) return true;

  const now = Date.now();
  const age = now - missionDate.getTime();
  const day = 24 * 60 * 60 * 1000;

  if (range === "Last 7 Days") return age <= 7 * day;
  if (range === "Last 30 Days") return age <= 30 * day;
  return true;
};

export default function MissionHistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [query, setQuery] = useState("");
  const [stationFilter, setStationFilter] = useState("All Stations");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [rangeFilter, setRangeFilter] = useState("Last 30 Days");
  const [locationFilter, setLocationFilter] = useState("All Locations");

  useEffect(() => {
    const unsubFeed = subscribeToSensorReadingsFeed(user, ({ rows: nextRows }) => setRows(nextRows), 300);
    const unsubAlerts = subscribeToAlerts(user, setAlerts);

    return () => {
      unsubFeed?.();
      unsubAlerts?.();
    };
  }, [user]);

  const missions = useMemo(() => groupMissionRows(rows), [rows]);

  const enrichedMissions = useMemo(
    () =>
      missions.map((mission) => {
        const relatedAlerts = alerts.filter((alert) => {
          const sameMission = alert.missionId && String(alert.missionId) === String(mission.missionId);
          const sameStation = alert.stationId && String(alert.stationId) === String(mission.stationId);
          const sameLocation = alert.zone && String(alert.zone).toLowerCase() === String(mission.location).toLowerCase();
          return sameMission || sameStation || sameLocation;
        }).length;

        const tone = getMissionTone(mission, relatedAlerts);
        return {
          ...mission,
          alerts: relatedAlerts,
          tone,
          status: getMissionStatus(tone),
        };
      }),
    [alerts, missions]
  );

  const stationOptions = useMemo(
    () => ["All Stations", ...Array.from(new Set(enrichedMissions.map((mission) => mission.stationId).filter(Boolean)))],
    [enrichedMissions]
  );

  const locationOptions = useMemo(
    () => ["All Locations", ...Array.from(new Set(enrichedMissions.map((mission) => mission.location).filter(Boolean)))],
    [enrichedMissions]
  );

  const filteredMissions = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return enrichedMissions.filter((mission) => {
      if (
        needle &&
        ![
          mission.stationId,
          mission.location,
          mission.missionId,
          mission.source,
          mission.uploadedBy,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle))
      ) {
        return false;
      }

      if (stationFilter !== "All Stations" && mission.stationId !== stationFilter) return false;
      if (statusFilter !== "All Status" && mission.status !== statusFilter) return false;
      if (locationFilter !== "All Locations" && mission.location !== locationFilter) return false;
      if (!matchesRange(mission, rangeFilter)) return false;

      return true;
    });
  }, [enrichedMissions, locationFilter, query, rangeFilter, stationFilter, statusFilter]);

  const summary = useMemo(
    () => ({
      missions: enrichedMissions.length,
      readings: rows.length,
      unresolvedAlerts: alerts.filter((item) => item.status !== "Resolved").length,
      latestMission: enrichedMissions[0]?.date ? formatMissionDate(enrichedMissions[0].date) : "--",
      packetTotal: enrichedMissions.reduce((sum, mission) => sum + mission.packetCount, 0),
      validAverage: enrichedMissions.length
        ? `${Math.round(enrichedMissions.reduce((sum, mission) => sum + mission.validRate, 0) / enrichedMissions.length)}%`
        : "--",
      gpsAverage: enrichedMissions.length
        ? `${Math.round(enrichedMissions.reduce((sum, mission) => sum + mission.gpsReliability, 0) / enrichedMissions.length)}%`
        : "--",
      reviewCount: enrichedMissions.filter((mission) => mission.status !== "Completed").length,
    }),
    [alerts, enrichedMissions, rows.length]
  );

  const exportCsv = () => {
    if (!filteredMissions.length) {
      return;
    }

    const headers = [
      "station",
      "mission",
      "date",
      "location",
      "readings",
      "packets",
      "uploadedBy",
      "source",
      "gps",
      "valid",
      "alerts",
      "status",
    ];
    const rowsToExport = filteredMissions.map((mission) =>
      [
        mission.stationId || "--",
        mission.missionId,
        formatMissionDate(mission.date),
        mission.location,
        mission.readings,
        mission.packetCount,
        mission.uploadedBy,
        mission.source,
        `${mission.gpsReliability}%`,
        `${mission.validRate}%`,
        mission.alerts,
        mission.status,
      ]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    );

    const csv = [headers.join(","), ...rowsToExport].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mission-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <main className="mission-history-page print:bg-white print:text-black">
        <Navigation navPreset="operator-core" />

        <div className="dashboard-page container-fluid">
          <section className="mission-history-shell print:bg-none">
            <div className="mission-history-container">
              <div className="mission-history-hero print:hidden">
                <div>
                  <div className="mission-history-hero-title">
                    <Target />
                    <h1>Mission History</h1>
                  </div>
                  <p>
                    Review completed mission sessions, uploaded packets, and abnormal conditions across recent work.
                  </p>
                </div>

                <div className="mission-history-hero-actions">
                  <button type="button" className="mission-history-export-button" onClick={exportCsv}>
                    <Download />
                    Export CSV
                  </button>
                  <button type="button" className="mission-history-print-button" onClick={() => window.print()}>
                    <Printer />
                    Print Report
                  </button>
                </div>
              </div>

              <div className="mission-history-print-head">
                <h1>NakhlaSense Mission History Report</h1>
                <p>Generated from operator mission history.</p>
              </div>

              <div className="mission-history-stats">
                <StatCard label="Completed Missions" value={String(summary.missions)} icon={<CheckCircle2 />} tone="green" />
                <StatCard label="Total Readings" value={String(summary.readings)} icon={<FileText />} tone="blue" />
                <StatCard label="Unresolved Alerts" value={String(summary.unresolvedAlerts)} icon={<AlertTriangle />} tone="red" />
                <StatCard label="Latest Mission Day" value={summary.latestMission} icon={<CalendarDays />} tone="yellow" />
              </div>

              <section className="mission-history-panel mission-history-filters print:hidden">
                <div className="mission-history-filter-head">
                  <Filter />
                  <h2>Filter Missions</h2>
                </div>

                <div className="mission-history-filter-grid">
                  <label className="mission-history-search">
                    <Search />
                    <input
                      type="search"
                      placeholder="Search station or mission..."
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>

                  <FilterSelect value={stationFilter} onChange={setStationFilter} options={stationOptions} />
                  <FilterSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={["All Status", "Completed", "Review Needed", "Failed"]}
                  />
                  <FilterSelect
                    value={rangeFilter}
                    onChange={setRangeFilter}
                    options={["Last 30 Days", "Last 7 Days", "All Time"]}
                  />
                  <FilterSelect value={locationFilter} onChange={setLocationFilter} options={locationOptions} />
                </div>
              </section>

              <div className="mission-history-layout print:block">
                <section className="mission-history-panel">
                  <PanelHeader title="Mission Sessions" icon={<Target />} action="View All" />

                  <div className="mission-history-list">
                    {filteredMissions.length ? (
                      filteredMissions.map((mission) => (
                        <MissionCard key={mission.id} mission={mission} />
                      ))
                    ) : (
                      <div className="mission-history-empty">No mission sessions match the current filters.</div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function PanelHeader({ title, icon, action }) {
  return (
    <div className="mission-history-panel-head">
      <div className="mission-history-panel-title">
        <span>{icon}</span>
        <h2>{title}</h2>
      </div>
      {action ? <button type="button" className="mission-history-view-button">{action}</button> : null}
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  return (
    <div className={`mission-history-stat-card tone-${tone}`}>
      <div className="mission-history-stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <label className="mission-history-filter-select">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown />
    </label>
  );
}

function MissionCard({ mission }) {
  return (
    <article className="mission-card print:border-gray-300 print:bg-white">
      <div className="mission-card-head">
        <div>
          <div className="mission-card-title-row">
            <h3>{mission.stationId || mission.location}</h3>
            <StatusPill tone={mission.tone}>{mission.status}</StatusPill>
          </div>
          <p>{mission.missionId}</p>
        </div>
        <div className="mission-card-packets">{mission.packetCount} packets</div>
      </div>

      <div className="mission-card-grid">
        <Meta label="Mission Date" value={formatMissionDate(mission.date)} />
        <Meta label="Location" value={mission.location} />
        <Meta label="Readings" value={mission.readings} />
        <Meta label="Uploaded By" value={mission.uploadedBy} />
        <Meta label="Source" value={mission.source} />
        <Meta label="GPS Reliability" value={`${mission.gpsReliability}%`} danger={mission.gpsReliability === 0} />
        <Meta label="Valid Data Rate" value={`${mission.validRate}%`} danger={mission.validRate === 0} />
        <Meta label="Alerts" value={mission.alerts} danger={mission.alerts > 5} />
      </div>

      <div className="mission-card-actions print:hidden">
        <button type="button" className="mission-card-secondary-button">View Details</button>
        <button type="button" className="mission-card-primary-button">Open Mission</button>
      </div>
    </article>
  );
}

function Meta({ label, value, danger }) {
  return (
    <div className="mission-card-meta">
      <p>{label}</p>
      <strong className={danger ? "is-danger" : ""}>{value}</strong>
    </div>
  );
}

function StatusPill({ children, tone }) {
  return <span className={`mission-status-pill tone-${tone}`}>{children}</span>;
}
