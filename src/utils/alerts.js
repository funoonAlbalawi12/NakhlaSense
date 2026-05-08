const OPERATOR = "operator";
const FARMER = "farmer";

const containsAny = (value, terms) => {
  const source = String(value || "").toLowerCase();
  return terms.some((term) => source.includes(term));
};

const inferCategory = (alert) => {
  const parameter = String(alert?.parameter || "").toLowerCase();
  const title = String(alert?.title || "").toLowerCase();
  const message = String(alert?.message || alert?.technicalMessage || "").toLowerCase();
  const combined = `${parameter} ${title} ${message}`;

  if (
    containsAny(combined, [
      "gps",
      "drone",
      "mission",
      "timeout",
      "upload",
      "firmware",
      "packet",
      "signal",
      "device",
    ])
  ) {
    return "operational";
  }

  if (containsAny(combined, ["temperature", "humidity", "co2", "environment"])) {
    return "environmental";
  }

  if (containsAny(combined, ["crop", "leaf", "disease", "irrigation"])) {
    return "crop";
  }

  return "system";
};

const inferTargetRoles = (alert, category) => {
  if (Array.isArray(alert?.targetRoles) && alert.targetRoles.length) {
    return alert.targetRoles;
  }

  if (category === "operational" || category === "system") {
    return [OPERATOR];
  }

  return [OPERATOR, FARMER];
};

const buildOperatorMessage = (alert, category) => {
  const stationReference = alert?.stationName || alert?.zone;
  const missionReference = alert?.missionId ? ` Mission ${alert.missionId}.` : "";

  if (alert?.technicalMessage) {
    return alert.technicalMessage;
  }

  if (category === "operational") {
    return (
      alert?.title ||
      alert?.message ||
      `${stationReference ? `${stationReference}: ` : ""}A mission or device issue needs operator review.${missionReference}`
    );
  }

  if (alert?.value != null && alert?.parameter) {
    return `${stationReference ? `${stationReference}: ` : ""}${alert.parameter} reached ${alert.value}. Review the station condition and follow the recommended action.${missionReference}`;
  }

  return alert?.title || alert?.message || `${stationReference ? `${stationReference}: ` : ""}An alert needs operator review.${missionReference}`;
};

const buildFarmerMessage = (alert, category) => {
  if (alert?.farmerMessage) {
    return alert.farmerMessage;
  }

  if (category === "operational" || category === "system") {
    return "Some mission data may not be fully reliable right now.";
  }

  if (alert?.parameter === "Temperature") {
    return "Temperature is outside the safe range for this area. Check irrigation and crop stress.";
  }

  if (alert?.parameter === "Humidity") {
    return "Humidity needs attention in this area. Check watering and field conditions.";
  }

  if (alert?.parameter === "CO2") {
    return "Air conditions need attention near this area. Review the station readings.";
  }

  return alert?.title || "This area needs attention.";
};

const normalizeRecommendations = (alert, role, category) => {
  if (Array.isArray(alert?.roleRecommendations?.[role]) && alert.roleRecommendations[role].length) {
    return alert.roleRecommendations[role];
  }

  if (Array.isArray(alert?.recommendations) && alert.recommendations.length) {
    if (role === FARMER && (category === "operational" || category === "system")) {
      return ["Check the field area and ask the operator to review the mission data."];
    }

    return alert.recommendations;
  }

  if (role === FARMER) {
    return ["Check the affected area and take simple field action if needed."];
  }

  return ["Review the alert details and verify the station or mission condition."];
};

export const enrichAlert = (alert) => {
  const category = alert?.category || inferCategory(alert);
  const targetRoles = inferTargetRoles(alert, category);

  return {
    ...alert,
    category,
    targetRoles,
    technicalMessage: buildOperatorMessage(alert, category),
    farmerMessage: buildFarmerMessage(alert, category),
  };
};

export const getRoleAwareAlert = (alert, role = OPERATOR) => {
  const enriched = enrichAlert(alert);

  if (!enriched.targetRoles.includes(role)) {
    return null;
  }

  return {
    ...enriched,
    displayMessage: role === FARMER ? enriched.farmerMessage : enriched.technicalMessage,
    displayRecommendations: normalizeRecommendations(enriched, role, enriched.category),
  };
};

export const getRoleAwareAlerts = (alerts = [], role = OPERATOR) =>
  alerts.map((alert) => getRoleAwareAlert(alert, role)).filter(Boolean);
