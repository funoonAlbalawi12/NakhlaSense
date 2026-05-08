import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import "./Hero.css";

function Hero() {
  const { language, isRTL } = useLanguage();

  const copy =
    language === "ar"
      ? {
          kicker: "Palm Farm Intelligence",
          titleLine1: "See every zone clearly.",
          titleLine2: "Respond before risk spreads.",
          subtext:
            "NakhlaSense brings zone monitoring, crop-health review, alerts, weather context, and team coordination into one focused operating view for modern palm farms.",
          primaryAction: "Access Platform",
          secondaryAction: "Explore Features",
        }
      : {
          kicker: "Palm Farm Intelligence",
          titleLine1: "See every zone clearly.",
          titleLine2: "Respond before risk spreads.",
          subtext:
            "NakhlaSense brings zone monitoring, crop-health review, alerts, weather context, and team coordination into one focused operating view for modern palm farms.",
          primaryAction: "Access Platform",
          secondaryAction: "Explore Features",
        };

  return (
    <section className={`hero ${isRTL ? "hero-rtl" : ""}`}>
      <div className="hero-overlay" />

      <div className="hero-content">
        <div className="hero-kicker">{copy.kicker}</div>

        <h1 className="hero-title">
          <span className="hero-title-line">{copy.titleLine1}</span>
          <span className="hero-title-accent">{copy.titleLine2}</span>
        </h1>

        <p className="hero-subtext">{copy.subtext}</p>

        <div className="hero-actions">
          <Link to="/login" className="hero-btn-primary">
            {copy.primaryAction}
          </Link>
          <a href="#platform" className="hero-btn-secondary">
            {copy.secondaryAction}
          </a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
