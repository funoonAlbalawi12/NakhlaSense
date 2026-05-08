import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { subscribeToAlerts } from "../firebase/services/alertsService";
import { subscribeToAnalyses } from "../firebase/services/analysesService";
import { subscribeToSensorReadingsByDate } from "../firebase/services/sensorReadingsService";
import { subscribeToZones } from "../firebase/services/zonesService";
import { getActiveMission, getSelectedStation } from "../utils/missionContext";
import "./ReportsPage.css";

const COLORS = ["#b45309", "#dc2626", "#15803d", "#1d4ed8"];

const average = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export default function ReportsPage() {
  const { user } = useAuth();
  const selectedStation = getSelectedStation();
  const activeMission = getActiveMission();
  const [alerts, setAlerts] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dayReadings, setDayReadings] = useState([]);
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedAnalysisStatus, setSelectedAnalysisStatus] = useState("all");
  const [selectedSensorType, setSelectedSensorType] = useState("all");

  useEffect(() => {
    const unsubscribeAlerts = subscribeToAlerts(user, setAlerts);
    const unsubscribeAnalyses = subscribeToAnalyses(user, setAnalyses);
    const unsubscribeZones = subscribeToZones(user, setZones);

    return () => {
      unsubscribeAlerts?.();
      unsubscribeAnalyses?.();
      unsubscribeZones?.();
    };
  }, [user]);

  useEffect(() => {
    const unsubscribeReadings = subscribeToSensorReadingsByDate(user, setDayReadings, selectedDate, 500);
    return () => unsubscribeReadings?.();
  }, [selectedDate, user]);

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        const matchesDate = String(alert?.time || "").slice(0, 10) === selectedDate;
        const matchesZone = selectedZone === "all" || alert.zone === selectedZone;
        const matchesSeverity =
          selectedSeverity === "all" || alert.severity === selectedSeverity;

        return matchesDate && matchesZone && matchesSeverity;
      }),
    [alerts, selectedDate, selectedSeverity, selectedZone]
  );

  const filteredAnalyses = useMemo(
    () =>
      analyses.filter((analysis) => {
        const matchesDate = String(analysis?.createdAt || "").slice(0, 10) === selectedDate;
        const matchesZone =
          selectedZone === "all" ||
          analysis.zoneName === selectedZone ||
          analysis.zone === selectedZone;
        const matchesStatus =
          selectedAnalysisStatus === "all" || analysis.status === selectedAnalysisStatus;

        return matchesDate && matchesZone && matchesStatus;
      }),
    [analyses, selectedAnalysisStatus, selectedDate, selectedZone]
  );

  const filteredDayReadings = useMemo(
    () =>
      dayReadings.filter((reading) => {
        const matchesZone = selectedZone === "all" || reading.location === selectedZone;
        const matchesSensor =
          selectedSensorType === "all" || reading.sensorType === selectedSensorType;

        return matchesZone && matchesSensor;
      }),
    [dayReadings, selectedSensorType, selectedZone]
  );

  const alertsByZone = useMemo(() => {
    const counts = filteredAlerts.reduce((acc, alert) => {
      acc[alert.zone] = (acc[alert.zone] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([zone, total]) => ({ zone, total }));
  }, [filteredAlerts]);

  const alertsBySeverity = useMemo(() => {
    const counts = filteredAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {});
    return ["Critical", "Warning", "Low"].map((severity) => ({
      name: severity,
      value: counts[severity] || 0,
    }));
  }, [filteredAlerts]);

  const analysesByStatus = useMemo(() => {
    const counts = filteredAnalyses.reduce((acc, analysis) => {
      acc[analysis.status] = (acc[analysis.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([status, total]) => ({ status, total }));
  }, [filteredAnalyses]);

  const dayInsights = useMemo(() => {
    const grouped = filteredDayReadings.reduce((acc, reading) => {
      if (!acc[reading.sensorType]) {
        acc[reading.sensorType] = [];
      }
      acc[reading.sensorType].push(Number(reading.value));
      return acc;
    }, {});

    return {
      packets: new Set(filteredDayReadings.map((item) => item.packetId).filter(Boolean)).size,
      readings: filteredDayReadings.length,
      avgTemperature: average(grouped.temperature || []),
      avgHumidity: average(grouped.humidity || []),
      avgCo2: average(grouped.co2 || []),
    };
  }, [filteredDayReadings]);

  const zoneOptions = useMemo(() => {
    const values = new Set();

    zones.forEach((zone) => values.add(zone.name));
    alerts.forEach((alert) => alert.zone && values.add(alert.zone));
    analyses.forEach((analysis) => {
      if (analysis.zoneName) values.add(analysis.zoneName);
      if (analysis.zone) values.add(analysis.zone);
    });
    dayReadings.forEach((reading) => reading.location && values.add(reading.location));

    return [...values].filter(Boolean).sort();
  }, [alerts, analyses, dayReadings, zones]);

  const sensorTypeOptions = useMemo(
    () => [...new Set(dayReadings.map((reading) => reading.sensorType).filter(Boolean))].sort(),
    [dayReadings]
  );

  const summary = useMemo(() => {
    const unresolved = filteredAlerts.filter((alert) => alert.status !== "Resolved").length;
    const mostAffectedZone =
      [...alertsByZone].sort((a, b) => b.total - a.total)[0]?.zone || "No active zone";
    const missionCount = new Set(filteredDayReadings.map((reading) => reading.missionId).filter(Boolean)).size;

    return {
      totalZones: zones.length,
      totalAlerts: filteredAlerts.length,
      unresolved,
      mostAffectedZone,
      missionCount,
    };
  }, [alertsByZone, filteredAlerts, filteredDayReadings, zones]);

  const exportExcel = () => {
    const summaryRows = [
      ["Selected Date", selectedDate],
      ["Metric", "Value"],
      ["Total Zones", summary.totalZones],
      ["Total Alerts", summary.totalAlerts],
      ["Unresolved Alerts", summary.unresolved],
      ["Most Affected Zone", summary.mostAffectedZone],
      ["Packet Rows", dayInsights.packets],
      ["Sensor Readings", dayInsights.readings],
      ["Average Temperature", dayInsights.avgTemperature ?? "--"],
      ["Average Humidity", dayInsights.avgHumidity ?? "--"],
      ["Average CO2", dayInsights.avgCo2 ?? "--"],
    ];
    const readingRows = [
      ["Packet ID", "Sensor", "Value", "Unit", "Coordinates", "Timestamp"],
      ...filteredDayReadings.map((reading) => [
        reading.packetId || "--",
        reading.sensorType || "--",
        reading.value ?? "--",
        reading.unit || "--",
        reading.lat != null && reading.lon != null
          ? `${Number(reading.lat).toFixed(6)}, ${Number(reading.lon).toFixed(6)}`
          : "--",
        reading.timestamp ? new Date(reading.timestamp).toLocaleString() : "--",
      ]),
    ];

    const sheetXml = (name, rows) => `
      <Worksheet ss:Name="${escapeXml(name)}">
        <Table>
          ${rows
            .map(
              (row) => `
                <Row>
                  ${row
                    .map(
                      (cell) => `
                        <Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>
                      `
                    )
                    .join("")}
                </Row>
              `
            )
            .join("")}
        </Table>
      </Worksheet>
    `;

    const workbook = `<?xml version="1.0"?>
      <?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:html="http://www.w3.org/TR/REC-html40">
        ${sheetXml("Summary", summaryRows)}
        ${sheetXml("Readings", readingRows)}
      </Workbook>`;

    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nakhla-reports-${selectedDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <>
      <Navigation />
      <div className="dashboard-page container-fluid">
        <div className="container py-5 reports-page">
          <div className="reports-header">
            <div>
              <h1 className="page-title mb-2">Reports and Analytics</h1>
              <p className="reports-subtitle">
                Choose a specific date to review historical insights, export a report, or print it.
              </p>
              <p className="reports-subtitle">
                {selectedStation?.name
                  ? `Station: ${selectedStation.name} (${selectedStation.stationId || selectedStation.id})`
                  : "Station: not selected"}
                {activeMission?.missionId ? ` · Mission: ${activeMission.missionId}` : ""}
              </p>
            </div>

            <div className="reports-actions">
              <input
                type="date"
                className="reports-date-input"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
              <button className="btn btn-outline-primary" onClick={exportExcel}>
                Export Excel Report
              </button>
              <button className="btn btn-success" onClick={printReport}>
                Print Report
              </button>
            </div>
          </div>

          <div className="reports-filters">
            <label>
              Zone
              <select value={selectedZone} onChange={(event) => setSelectedZone(event.target.value)}>
                <option value="all">All zones</option>
                {zoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alert Severity
              <select
                value={selectedSeverity}
                onChange={(event) => setSelectedSeverity(event.target.value)}
              >
                <option value="all">All severities</option>
                <option value="Critical">Critical</option>
                <option value="Warning">Warning</option>
                <option value="Low">Low</option>
              </select>
            </label>
            <label>
              Analysis Status
              <select
                value={selectedAnalysisStatus}
                onChange={(event) => setSelectedAnalysisStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="Healthy">Healthy</option>
                <option value="Warning">Warning</option>
                <option value="Abnormal">Abnormal</option>
              </select>
            </label>
            <label>
              Sensor Type
              <select
                value={selectedSensorType}
                onChange={(event) => setSelectedSensorType(event.target.value)}
              >
                <option value="all">All sensor types</option>
                {sensorTypeOptions.map((sensorType) => (
                  <option key={sensorType} value={sensorType}>
                    {sensorType}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="reports-metrics">
            <div className="report-metric-card">
              <small>Selected Date</small>
              <strong>{selectedDate}</strong>
            </div>
            <div className="report-metric-card">
              <small>Total Zones</small>
              <strong>{summary.totalZones}</strong>
            </div>
            <div className="report-metric-card">
              <small>Total Alerts</small>
              <strong>{summary.totalAlerts}</strong>
            </div>
            <div className="report-metric-card">
              <small>Missions</small>
              <strong>{summary.missionCount}</strong>
            </div>
            <div className="report-metric-card">
              <small>Unresolved Alerts</small>
              <strong>{summary.unresolved}</strong>
            </div>
            <div className="report-metric-card">
              <small>Most Affected Zone</small>
              <strong>{summary.mostAffectedZone}</strong>
            </div>
          </div>

          <div className="reports-metrics">
            <div className="report-metric-card">
              <small>Packet Rows</small>
              <strong>{dayInsights.packets}</strong>
            </div>
            <div className="report-metric-card">
              <small>Sensor Readings</small>
              <strong>{dayInsights.readings}</strong>
            </div>
            <div className="report-metric-card">
              <small>Average Temperature</small>
              <strong>{dayInsights.avgTemperature != null ? `${dayInsights.avgTemperature.toFixed(1)} C` : "--"}</strong>
            </div>
            <div className="report-metric-card">
              <small>Average Humidity</small>
              <strong>{dayInsights.avgHumidity != null ? `${dayInsights.avgHumidity.toFixed(1)} %` : "--"}</strong>
            </div>
            <div className="report-metric-card">
              <small>Average CO2</small>
              <strong>{dayInsights.avgCo2 != null ? `${Math.round(dayInsights.avgCo2)} ppm` : "--"}</strong>
            </div>
          </div>

          <div className="reports-grid">
            <section className="report-card">
              <h3>Alerts by Zone</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={alertsByZone}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zone" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#1E5631" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="report-card">
              <h3>Alerts by Severity</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={alertsBySeverity} dataKey="value" nameKey="name" innerRadius={60} outerRadius={96}>
                    {alertsBySeverity.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </section>

            <section className="report-card report-card-wide">
              <h3>Crop Health Outcomes</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analysesByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#F5C451" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="report-card report-card-wide">
              <h3>Historical Readings for {selectedDate}</h3>
              {filteredDayReadings.length ? (
                <div className="reports-table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Packet ID</th>
                        <th>Sensor</th>
                        <th>Value</th>
                        <th>Unit</th>
                        <th>Coordinates</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDayReadings.slice(0, 50).map((reading) => (
                        <tr key={reading.id}>
                          <td>{reading.packetId || "--"}</td>
                          <td>{reading.sensorType || "--"}</td>
                          <td>{reading.value ?? "--"}</td>
                          <td>{reading.unit || "--"}</td>
                          <td>
                            {reading.lat != null && reading.lon != null
                              ? `${Number(reading.lat).toFixed(6)}, ${Number(reading.lon).toFixed(6)}`
                              : "--"}
                          </td>
                          <td>{reading.timestamp ? new Date(reading.timestamp).toLocaleString() : "--"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="reports-empty-state">
                  No uploaded readings were found for this day.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
