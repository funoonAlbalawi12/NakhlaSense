import { PERMISSIONS, ROLES } from "../auth/permissions";

export const getRoleDisplayName = (role) => {
  if (role === ROLES.ADMIN) return "Admin";
  if (role === ROLES.FARMER) return "Farmer";
  return "Operator";
};

export const getDashboardCopy = (role) => {
  if (role === ROLES.ADMIN) {
    return {
      title: "Admin Control Dashboard",
      subtitle: "Oversee users, stations, missions, and active alerts across the full platform.",
      uploadPrompt: "Review overall system health, recent missions, and operational status from one place.",
      sectionLabel: "System Overview",
    };
  }

  if (role === ROLES.FARMER) {
    return {
      title: "Farm Monitoring",
      subtitle: "See your farm condition, alerts, and what to do next.",
      uploadPrompt: "",
      sectionLabel: "",
    };
  }

  return {
    title: "Operator Mission Dashboard",
    subtitle: "Select stations, review mission status, upload results, and respond to field alerts quickly.",
    uploadPrompt: "Use this space to run the mission workflow from station choice through post-mission review.",
    sectionLabel: "Mission Control",
  };
};

export const getStationsCopy = (role) => {
  if (role === ROLES.ADMIN) {
    return {
      title: "Stations",
      subtitle: "Review all deployed stations, their placement, and monitoring status before opening management tools.",
      panelTitle: "Station Overview",
      panelText: "Use this page to inspect live station context before editing station records.",
      actionLabel: "Open Station",
    };
  }

  if (role === ROLES.FARMER) {
    return {
      title: "Station Overview",
      subtitle: "Choose a farm station and see its latest condition in clear, simple terms.",
      panelTitle: "Monitored Farm Areas",
      panelText: "Open a station to view its latest readings, crop condition, and suggested action.",
      actionLabel: "View Condition",
    };
  }

  return {
    title: "Stations",
    subtitle: "Choose the mission target, inspect station details, and confirm readiness before flight or upload.",
    panelTitle: "Mission Stations",
    panelText: "Open a station to review its details, recent mission context, and next operational step.",
    actionLabel: "Open Details",
  };
};

export const getWeatherCopy = (role) => {
  if (role === ROLES.FARMER) {
    return {
      title: "Weather and Field Conditions",
      subtitle: "Check simple field weather conditions before taking action in the farm.",
    };
  }

  if (role === ROLES.ADMIN) {
    return {
      title: "Flight and Field Safety",
      subtitle: "Review weather-based flight safety and field conditions across the monitored operation.",
    };
  }

  return {
    title: "Pre-Flight Safety",
    subtitle: "Use live weather and location context to decide whether the next drone flight is safe before takeoff.",
  };
};

export const getAlertsCopy = (role) => {
  if (role === ROLES.FARMER) {
    return {
      subtitle: "",
    };
  }

  if (role === ROLES.ADMIN) {
    return {
      subtitle: "Review all technical and environmental alerts, supervise statuses, and track operational follow-up.",
    };
  }

  return {
    subtitle: "Review technical and field alerts, update their status, and export the filtered list for follow-up.",
  };
};

export const getMissionPageCopy = (role) => {
  if (role === ROLES.ADMIN) {
    return {
      title: "Mission Records",
      subtitle: "Review uploaded missions across stations, operators, and dates for full administrative oversight.",
    };
  }

  return {
    title: "Mission History",
    subtitle: "Review completed mission sessions, uploaded packets, and abnormal conditions across recent work.",
  };
};

export const getAccessDeniedMessage = (permission) => {
  if (permission === PERMISSIONS.MANAGE_USERS) {
    return "This area is reserved for user and role administration.";
  }

  if (permission === PERMISSIONS.MANAGE_STATIONS) {
    return "This area is reserved for station management and setup.";
  }

  if (permission === PERMISSIONS.MANAGE_ZONES) {
    return "This area is reserved for zone management.";
  }

  if (permission === PERMISSIONS.VIEW_REPORTS) {
    return "This area is reserved for report and records oversight.";
  }

  return "Your role is not allowed to open this page.";
};
