function PlatformOverview() {
  return (
    <section id="platform" style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={{ color: "#1E5631" }}>
          Data-Driven Decision Support
        </h2>

        <div style={gridStyle}>
          <div style={cardStyle}>
            <h3>Mission Data Processing</h3>
            <p>Upload and analyze drone-collected environmental data.</p>
          </div>

          <div style={cardStyle}>
            <h3>Monitoring Dashboard</h3>
            <p>Visualize zone health and environmental readings.</p>
          </div>

          <div style={cardStyle}>
            <h3>Smart Alert System</h3>
            <p>Receive automated warnings for abnormal conditions.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const sectionStyle = {
  padding: "80px 20px",
  background: "#E6D5B8",
};

const containerStyle = {
  maxWidth: "1200px",
  margin: "auto",
  textAlign: "center",
};

const gridStyle = {
  display: "flex",
  gap: "30px",
  marginTop: "40px",
  justifyContent: "center",
};

const cardStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "10px",
  width: "300px",
};

export default PlatformOverview;
