function Stakeholders() {
  return (
    <section id="stakeholders" style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={{ color: "#1E5631" }}>
          Designed for Agricultural Stakeholders
        </h2>

        <div style={gridStyle}>
          <div style={cardStyle}>
            <h3>Farmers</h3>
            <p>Optimize palm cultivation with real-time insights.</p>
          </div>

          <div style={cardStyle}>
            <h3>Agricultural Companies</h3>
            <p>Manage large-scale farms with monitoring tools.</p>
          </div>

          <div style={cardStyle}>
            <h3>Government Agencies</h3>
            <p>Support sustainability initiatives and agricultural policy.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const sectionStyle = {
  padding: "80px 20px",
  background: "#ffffff",
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
  border: "1px solid #E6D5B8",
  padding: "30px",
  borderRadius: "10px",
  width: "300px",
};

export default Stakeholders;
