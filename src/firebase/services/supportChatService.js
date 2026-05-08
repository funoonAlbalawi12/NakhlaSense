import { httpsCallable } from "firebase/functions";
import { functions } from "../config";

const LOCAL_SUPPORT_KNOWLEDGE = [
  {
    topic: "ai_analysis_workflow",
    keywords: ["analyze", "analysis", "image", "upload", "zone", "crop health"],
    answer:
      "To run crop analysis, choose a zone, upload an image, and select Analyze Image. Admins and operators can run AI analysis. Farmers can still review the page and analysis history.",
  },
  {
    topic: "analysis_status",
    keywords: ["healthy", "warning", "abnormal", "status", "result"],
    answer:
      "Healthy means the image does not show a clear visible issue. Warning means the crop may need attention. Abnormal means the image suggests a stronger visible problem and should be checked in the field.",
  },
  {
    topic: "csv_upload",
    keywords: ["csv", "upload", "file", "headers", "format", "columns"],
    answer:
      "CSV uploads work from the dashboard. The file must be a CSV under 1 MB and include required headers such as PacketID, TempC, RH, AbsHumidity, CO2ppm, GroundLat, GroundLon, DroneLat, DroneLon, GroundGPSValid, and DroneGPSValid.",
  },
  {
    topic: "permissions",
    keywords: ["permission", "role", "admin", "operator", "farmer", "access"],
    answer:
      "Admins can manage users, alerts, zones, reports, recommendations, stations, uploads, exports, and AI analysis. Operators can use dashboard tools, uploads, exports, weather, stations, and AI analysis. Farmers can view dashboard, stations, crop health, and weather.",
  },
  {
    topic: "login",
    keywords: ["login", "otp", "sign in", "code", "verification"],
    answer:
      "NakhlaSense sign-in uses email and OTP verification. If OTP fails, check that you are using the same signed-in email, the latest code, and that it has not expired.",
  },
  {
    topic: "gps_valid",
    keywords: ["gpsvalid", "dronegpsvalid", "groundgpsvalid", "gps"],
    answer:
      "GroundGPSValid shows whether the ground GPS reading was valid for that packet. DroneGPSValid shows whether the drone GPS reading was valid when the drone data was captured.",
  },
  {
    topic: "sensor_fields",
    keywords: ["tempc", "rh", "abshumidity", "co2ppm", "what does", "field meaning"],
    answer:
      "TempC is temperature in Celsius, RH is relative humidity, AbsHumidity is absolute humidity, and CO2ppm is carbon dioxide concentration in parts per million.",
  },
  {
    topic: "navigation",
    keywords: ["where", "page", "dashboard", "reports", "users", "navigation"],
    answer:
      "Use Dashboard for live readings and CSV uploads, Crop Health for image analysis, Alerts for admin alert review, Zones for admin zone management, Reports for admin summaries, Users for admin role control, and Weather for flight and field conditions.",
  },
];

function cleanMessage(message = "") {
  return String(message).replace(/^functions\/[a-z-]+:\s*/i, "").trim();
}

function normalizeText(text = "") {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function simplifySupportAnswer(answer, context = {}, topic = "") {
  const role = String(context.role || "user").toLowerCase();

  if (topic === "permissions") {
    if (role === "farmer") {
      return "As a farmer, you can open your main pages, check crop results, and view weather and station information. If a tool is blocked, it usually needs operator or admin access.";
    }

    if (role === "operator") {
      return "As an operator, you can upload data, run image checks, work with stations, and handle daily system tasks. User control and main settings stay with the admin.";
    }
  }

  if (topic === "ai_analysis_workflow" && role === "farmer") {
    return "This page helps you review crop results. Running AI image checks is limited to operators and admins, but you can still read the page and past results.";
  }

  return answer;
}

function getLocalSupportReply(message, context = {}) {
  const normalizedMessage = normalizeText(message);
  const scoredMatches = LOCAL_SUPPORT_KNOWLEDGE.map((entry) => {
    const score = entry.keywords.reduce((total, keyword) => {
      return normalizedMessage.includes(normalizeText(keyword)) ? total + 1 : total;
    }, 0);

    return {
      ...entry,
      score,
    };
  }).sort((left, right) => right.score - left.score);

  const bestMatch = scoredMatches[0];

  if (bestMatch?.score > 0) {
    return {
      answer: simplifySupportAnswer(bestMatch.answer, context, bestMatch.topic),
      topic: bestMatch.topic,
      source: "knowledge-base",
    };
  }

  const role = String(context.role || "user").toLowerCase();
  const pageName = context.currentPage === "crop-health" ? "the Crop Health page" : "this page";

  if (role === "farmer") {
    return {
      answer: `I can help you understand ${pageName}, crop results, sensor names, and where to find your farm information. Ask in simple words and I will keep the answer simple too.`,
      topic: "general_support",
      source: "fallback",
    };
  }

  if (role === "operator") {
    return {
      answer: `I can help with ${pageName}, uploads, alerts, sensor names, and image checks. Ask what step you want to do and I will explain it simply.`,
      topic: "general_support",
      source: "fallback",
    };
  }

  return {
    answer: `I can help with ${pageName}, CSV uploads, sensor fields, navigation, login, and role permissions. You are currently signed in as ${role}. Try asking about analysis steps, CSV format, or what a field means.`,
    topic: "general_support",
    source: "fallback",
  };
}

function mapSupportError(error) {
  const code = String(error?.code || "");
  const rawMessage = cleanMessage(error?.message || "");

  if (code.includes("unauthenticated")) {
    return "Please sign in again before using support chat.";
  }

  if (code.includes("resource-exhausted")) {
    return "Support chat is busy right now. Please try again in a moment.";
  }

  if (code.includes("failed-precondition")) {
    return rawMessage || "AI support is not configured yet.";
  }

  return rawMessage || "Support chat is not available right now.";
}

export async function requestSupportChatReply(user, { message, context = {} }) {
  const cleanInput = String(message || "").trim();

  if (!cleanInput) {
    throw new Error("Type a support question first.");
  }

  if (!user || user.isDev) {
    return getLocalSupportReply(cleanInput, context);
  }

  const callable = httpsCallable(functions, "getSupportChatReply");

  try {
    const result = await callable({
      message: cleanInput,
      context,
    });

    return {
      answer: String(result.data?.answer || "").trim(),
      topic: result.data?.topic || "general_support",
      source: result.data?.source || "knowledge-base",
    };
  } catch (error) {
    const fallback = getLocalSupportReply(cleanInput, context);
    const friendlyError = mapSupportError(error);

    return {
      ...fallback,
      answer: fallback.answer || friendlyError,
    };
  }
}
