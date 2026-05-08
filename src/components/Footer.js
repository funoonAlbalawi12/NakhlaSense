import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-shell">
        <div className="footer-row d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="footer-brand-block">
            <div className="footer-brand-title">NakhlaSense</div>
            <small className="footer-brand-subtitle">
              Offline-to-Cloud Agricultural Monitoring Platform
            </small>
          </div>

          <div className="footer-links d-flex gap-3">
            <a href="#platform">Platform</a>
            <a href="#contact">Contact</a>
          </div>
        </div>

        <hr style={{ borderColor: "rgba(255,255,255,0.14)" }} />

        <small className="footer-copy">Copyright 2026 NakhlaSense</small>
      </div>
    </footer>
  );
}

export default Footer;
