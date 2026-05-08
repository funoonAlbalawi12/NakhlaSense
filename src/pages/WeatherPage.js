import { useEffect, useMemo, useState } from "react";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import WeatherFlightAdvisor from "../components/WeatherFlightAdvisor";
import { useAuth } from "../contexts/AuthContext";
import { subscribeToSensorReadingsFeed } from "../firebase/services/sensorReadingsService";
import { getWeatherCopy } from "../utils/roleExperience";
import "./WeatherPage.css";

export default function WeatherPage() {
  const { user } = useAuth();
  const [sensorReadings, setSensorReadings] = useState([]);
  const pageCopy = getWeatherCopy(user?.role);

  useEffect(() => {
    const unsubscribe = subscribeToSensorReadingsFeed(user, ({ rows }) => {
      setSensorReadings(rows);
    }, 80);

    return () => unsubscribe?.();
  }, [user]);

  const latestUploadedCity = useMemo(() => {
    const latestReadingWithCity = sensorReadings.find((reading) => String(reading.city || "").trim());
    return String(latestReadingWithCity?.city || "").trim();
  }, [sensorReadings]);

  return (
    <>
      <Navigation />
      <div className="dashboard-page container-fluid">
        <div className="container py-5 weather-page">
          <div className="app-page-header">
            <div className="app-page-header-copy">
              <h1 className="page-title mb-2">{pageCopy.title}</h1>
              <p className="weather-subtitle">
                {pageCopy.subtitle}
                {latestUploadedCity ? ` The latest uploaded farm data is linked to ${latestUploadedCity}.` : ""}
              </p>
            </div>
          </div>

          <WeatherFlightAdvisor preferredCity={latestUploadedCity} />
        </div>
      </div>
      <Footer />
    </>
  );
}
