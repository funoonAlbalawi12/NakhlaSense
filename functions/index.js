const crypto = require("crypto");
require("dotenv").config();
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

admin.initializeApp();

const db = admin.firestore();

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || "").trim();
const SMTP_FROM = String(process.env.SMTP_FROM || SMTP_USER).trim();

const ALLOWED_ROLES = ["admin", "operator", "farmer"];
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const CSV_IMPORT_ROLES = ["admin", "operator"];
const MAX_IMPORT_FILE_SIZE = 1024 * 1024;
const AI_ANALYSIS_ROLES = ["admin", "operator", "farmer"];
const MAX_ANALYSIS_IMAGE_BYTES = 5 * 1024 * 1024;
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.GEMINI_VISION_MODEL || process.env.ANTHROPIC_VISION_MODEL || "gemini-2.5-flash";
const SUPPORT_CHAT_MODEL = process.env.OPENAI_SUPPORT_MODEL || OPENAI_MODEL;
const PALM_DISEASES = [
  "Graphiola leaf spot (False Smut)",
  "Fusarium wilt (Bayoud disease)",
  "Ganoderma butt rot",
  "Black scorch (Ceratocystis)",
  "Khamedj disease",
  "Pink rot (Nalanthamala)",
  "Red palm weevil",
  "Lesser date moth",
  "Dubas bug",
  "Parlatoria date scale",
  "Potassium deficiency",
  "Magnesium deficiency",
  "Iron deficiency",
  "Sudden decline syndrome",
  "Lethal yellowing",
];
const STATION_MANAGEMENT_ROLES = ["admin", "operator"];
const REQUIRED_IMPORT_HEADERS = [
  "PacketID",
  "TempC",
  "RH",
  "AbsHumidity",
  "CO2ppm",
  "GroundDate",
  "GroundTime",
  "GroundLat",
  "GroundLon",
  "GroundGPSValid",
  "DroneDate",
  "DroneTime",
  "DroneLat",
  "DroneLon",
  "DroneGPSValid",
];
const IMPORT_HEADER_ALIASES = {
  TempC: ["TempC", "Temperature"],
};
const SUPPORT_KNOWLEDGE = [
  {
    topic: "ai_analysis_workflow",
    keywords: ["analyze", "analysis", "image", "upload image", "zone", "crop health"],
    answer:
      "On the Crop Health page, choose a zone, upload an image, and select Analyze Image. Admins and operators can run AI image analysis. Farmers can still open the page and review analysis history.",
  },
  {
    topic: "analysis_status_meaning",
    keywords: ["healthy", "warning", "abnormal", "status", "result meaning"],
    answer:
      "Healthy means the image does not show a clear visible issue. Warning means the crop may need attention. Abnormal means the image suggests a stronger visible problem and should be inspected in the field.",
  },
  {
    topic: "csv_upload_help",
    keywords: ["csv", "upload", "file", "import", "headers", "columns", "format"],
    answer:
      `CSV uploads are handled from the dashboard. The file must be a CSV under 1 MB and include required headers: ${REQUIRED_IMPORT_HEADERS.join(", ")}.`,
  },
  {
    topic: "dashboard_help",
    keywords: ["dashboard", "readings", "filters", "trend", "latest reading", "chart"],
    answer:
      "The dashboard shows sensor trends, the latest packet details, alert summaries, crop health counts, and import or export tools. It is the main page for reviewing field readings and uploaded data.",
  },
  {
    topic: "permissions",
    keywords: ["permission", "permissions", "role", "admin", "operator", "farmer", "access"],
    answer:
      "Admins can manage users, alerts, zones, reports, recommendations, stations, uploads, exports, and AI analysis. Operators can use dashboard tools, uploads, exports, weather, stations, and AI analysis. Farmers can view the dashboard, stations, crop health, and weather.",
  },
  {
    topic: "login_otp",
    keywords: ["login", "otp", "sign in", "verification", "code", "invalid otp"],
    answer:
      "NakhlaSense sign-in uses email plus OTP verification. If OTP fails, confirm you are using the same signed-in email, the latest code, and that the code has not expired.",
  },
  {
    topic: "export_data",
    keywords: ["export", "download", "report export", "export data"],
    answer:
      "Data export is available to admins and operators. If export is blocked, the current role probably does not include export permission.",
  },
  {
    topic: "error_permission_denied",
    keywords: ["permission denied", "access denied", "not allowed", "cannot run"],
    answer:
      "A permission-denied message usually means the current role does not include the action you tried to use. Admins have the widest access, operators have operational tools, and farmers have view-focused access.",
  },
  {
    topic: "error_invalid_csv",
    keywords: ["invalid csv", "invalid format", "wrong format", "missing headers", "missing columns"],
    answer:
      "Invalid CSV format usually means the file is missing one or more required headers, is not a real CSV file, or contains rows the importer cannot parse. Check the header names carefully and keep the file under 1 MB.",
  },
  {
    topic: "error_no_data",
    keywords: ["no data", "no analysis", "empty result", "nothing shows"],
    answer:
      "If the system shows no data, check whether records have been uploaded yet, whether the selected filters are hiding results, and whether you are viewing demo data or live Firestore data.",
  },
  {
    topic: "navigation_help",
    keywords: ["where", "page", "navigation", "alerts page", "reports page", "users page", "weather page"],
    answer:
      "Use Dashboard for readings and CSV uploads, Crop Health for image analysis, Alerts for admin alert review, Zones for admin zone management, Reports for admin summaries, Users for admin role management, and Weather for flight and field conditions.",
  },
  {
    topic: "field_tempc",
    keywords: ["tempc", "temperature"],
    answer: "TempC is the temperature reading in degrees Celsius.",
  },
  {
    topic: "field_rh",
    keywords: ["rh", "relative humidity", "humidity"],
    answer: "RH is the relative humidity reading, expressed as a percentage.",
  },
  {
    topic: "field_abshumidity",
    keywords: ["abshumidity", "absolute humidity"],
    answer: "AbsHumidity is the absolute humidity value, representing water vapor concentration in the air.",
  },
  {
    topic: "field_co2ppm",
    keywords: ["co2ppm", "co2", "carbon dioxide"],
    answer: "CO2ppm is the carbon dioxide concentration measured in parts per million.",
  },
  {
    topic: "field_groundlat",
    keywords: ["groundlat", "ground latitude"],
    answer: "GroundLat is the latitude captured from the ground-side reading for that packet.",
  },
  {
    topic: "field_groundlon",
    keywords: ["groundlon", "ground longitude"],
    answer: "GroundLon is the longitude captured from the ground-side reading for that packet.",
  },
  {
    topic: "field_dronelat",
    keywords: ["dronelat", "drone latitude"],
    answer: "DroneLat is the latitude recorded from the drone when the drone-side data was captured.",
  },
  {
    topic: "field_dronelon",
    keywords: ["dronelon", "drone longitude"],
    answer: "DroneLon is the longitude recorded from the drone when the drone-side data was captured.",
  },
  {
    topic: "field_groundgpsvalid",
    keywords: ["groundgpsvalid", "ground gps valid", "gps valid"],
    answer: "GroundGPSValid shows whether the ground GPS reading was valid for that packet.",
  },
  {
    topic: "field_dronegpsvalid",
    keywords: ["dronegpsvalid", "drone gps valid", "dronegps"],
    answer: "DroneGPSValid shows whether the drone GPS reading was valid when the drone data was captured.",
  },
];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function hashOtp(email, otp) {
  return crypto.createHash("sha256").update(`${email}:${otp}`).digest("hex");
}

function hashImportFingerprint(input) {
  return crypto.createHash("sha256").update(String(input || "")).digest("hex");
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createTransporter() {
  if (!SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new HttpsError(
      "failed-precondition",
      "SMTP_USER, SMTP_PASS, and SMTP_FROM must be configured in Cloud Functions."
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function rethrowKnownError(error, fallbackMessage) {
  logger.error(fallbackMessage, error);

  if (error instanceof HttpsError) {
    throw error;
  }

  throw new HttpsError("internal", error?.message || fallbackMessage);
}

function serializeFirestoreValue(value) {
  if (!value) {
    return value ?? null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreValue(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeFirestoreValue(item)])
    );
  }

  return value;
}

function detectSeparator(content) {
  const firstLine = String(content || "").split(/\r?\n/, 1)[0] || "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function parseDelimitedLine(line, separator) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === separator && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseDelimitedContent(content) {
  const normalizedContent = String(content || "").replace(/^\uFEFF/, "").trim();

  if (!normalizedContent) {
    throw new HttpsError("invalid-argument", "The uploaded file is empty.");
  }

  const separator = detectSeparator(normalizedContent);
  const lines = normalizedContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new HttpsError("invalid-argument", "The uploaded file must include headers and at least one row.");
  }

  const headers = parseDelimitedLine(lines[0], separator);
  const missingHeaders = REQUIRED_IMPORT_HEADERS.filter((header) => {
    const aliases = IMPORT_HEADER_ALIASES[header] || [header];
    return !aliases.some((alias) => headers.includes(alias));
  });

  if (missingHeaders.length) {
    throw new HttpsError(
      "invalid-argument",
      `Missing required columns: ${missingHeaders.join(", ")}.`
    );
  }

  const rows = lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, separator);
    const entry = {};

    headers.forEach((header, index) => {
      entry[header] = values[index] ?? "";
    });

    Object.entries(IMPORT_HEADER_ALIASES).forEach(([canonicalHeader, aliases]) => {
      if (!entry[canonicalHeader]) {
        const matchedAlias = aliases.find((alias) => entry[alias]);
        if (matchedAlias) {
          entry[canonicalHeader] = entry[matchedAlias];
        }
      }
    });

    return entry;
  });

  return { rows, separator };
}

function normalizeImportedRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new HttpsError("invalid-argument", "The uploaded file is empty.");
  }

  const normalizedRows = rows
    .filter((row) => row && typeof row === "object" && !Array.isArray(row))
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [String(key || "").trim(), String(value ?? "").trim()])
      )
    );

  if (!normalizedRows.length) {
    throw new HttpsError("invalid-argument", "The uploaded file is empty.");
  }

  const headerSet = new Set(
    normalizedRows.flatMap((row) => Object.keys(row).filter(Boolean))
  );
  const missingHeaders = REQUIRED_IMPORT_HEADERS.filter((header) => {
    const aliases = IMPORT_HEADER_ALIASES[header] || [header];
    return !aliases.some((alias) => headerSet.has(alias));
  });

  if (missingHeaders.length) {
    throw new HttpsError(
      "invalid-argument",
      `Missing required columns: ${missingHeaders.join(", ")}.`
    );
  }

  return normalizedRows.map((row) => {
    const nextRow = { ...row };

    Object.entries(IMPORT_HEADER_ALIASES).forEach(([canonicalHeader, aliases]) => {
      if (!nextRow[canonicalHeader]) {
        const matchedAlias = aliases.find((alias) => nextRow[alias]);
        if (matchedAlias) {
          nextRow[canonicalHeader] = nextRow[matchedAlias];
        }
      }
    });

    return nextRow;
  });
}

function toNumber(value) {
  const parsed = Number(String(value || "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toCleanString(value) {
  return String(value ?? "").trim();
}

function toBoolean(value) {
  return String(value || "").trim() === "1";
}

function cleanImageName(value) {
  const normalized = String(value || "").trim();
  return !normalized || normalized === "NO_IMAGE" ? null : normalized;
}

function normalizeStationIdentityPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStationUniqueKey(station) {
  return [
    normalizeStationIdentityPart(station.name),
    normalizeStationIdentityPart(station.location),
    normalizeStationIdentityPart(station.type),
  ]
    .filter(Boolean)
    .join("__");
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStationPayload(raw) {
  const name = String(raw?.name || "").trim();
  const location = String(raw?.location || "").trim();
  const type = String(raw?.type || "").trim();

  if (!name || !location || !type) {
    throw new HttpsError("invalid-argument", "Station name, location, and type are required.");
  }

  return {
    name,
    location,
    type,
    status: String(raw?.status || "Active").trim() || "Active",
    connectivity: String(raw?.connectivity || "Online").trim() || "Online",
    coverage: String(raw?.coverage || "").trim(),
    notes: String(raw?.notes || "").trim(),
    lastSeen: String(raw?.lastSeen || "").trim() || new Date().toISOString(),
    latitude: toNullableNumber(raw?.latitude),
    longitude: toNullableNumber(raw?.longitude),
  };
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";

  if (!base64) {
    return 0;
  }

  const paddingMatch = base64.match(/=+$/);
  const paddingLength = paddingMatch ? paddingMatch[0].length : 0;
  return Math.floor((base64.length * 3) / 4) - paddingLength;
}

function parseImageDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i);

  if (!match) {
    throw new HttpsError("invalid-argument", "Please upload a PNG, JPG, GIF, or WEBP image.");
  }

  const mediaType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const base64 = match[2].trim();

  if (!base64) {
    throw new HttpsError("invalid-argument", "No image data was provided.");
  }

  return {
    mediaType,
    base64,
  };
}

function readResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const outputs = Array.isArray(payload?.output) ? payload.output : [];

  for (const output of outputs) {
    const content = Array.isArray(output?.content) ? output.content : [];

    for (const item of content) {
      if (typeof item?.text === "string" && item.text.trim()) {
        return item.text;
      }
    }
  }

  return "";
}

function readAnthropicResponseText(message) {
  const blocks = Array.isArray(message?.content) ? message.content : [];

  for (const block of blocks) {
    if (block?.type === "text" && typeof block.text === "string" && block.text.trim()) {
      return block.text;
    }
  }

  return "";
}

function getGeminiApiKey() {
  return String(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      ""
  ).trim();
}

function readGeminiResponseText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];

    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text;
      }
    }
  }

  return "";
}

async function requestGeminiVisionJson({ imageDataUrl, promptText, maxOutputTokens = 1500 }) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "GEMINI_API_KEY or GOOGLE_API_KEY is not configured in Cloud Functions."
    );
  }

  const { mediaType, base64 } = parseImageDataUrl(imageDataUrl);
  const endpoint = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mediaType,
                data: base64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: maxOutputTokens,
        temperature: 0.2,
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message || payload?.promptFeedback?.blockReason || "Gemini vision request failed.";
    if (response.status === 401 || response.status === 403) {
      throw new HttpsError("internal", "GEMINI_API_KEY is invalid.");
    }
    if (response.status === 429) {
      throw new HttpsError("resource-exhausted", "Too many requests. Please wait a moment and try again.");
    }
    throw new HttpsError("internal", apiMessage);
  }

  const raw = readGeminiResponseText(payload);
  const cleaned = raw.replace(/```json|```/g, "").trim();

  if (!cleaned) {
    throw new HttpsError("internal", "Gemini returned an empty analysis.");
  }

  return {
    raw,
    cleaned,
  };
}

const GEMINI_SCAN_SCHEMA = {
  type: "OBJECT",
  properties: {
    cannotRead: { type: "BOOLEAN" },
    reason: { type: "STRING" },
    suspectedDiseases: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    initialObservation: { type: "STRING" },
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          question: { type: "STRING" },
          choices: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                label: { type: "STRING" },
              },
              required: ["id", "label"],
            },
          },
        },
        required: ["id", "question", "choices"],
      },
    },
  },
  required: ["cannotRead"],
};

const GEMINI_DIAGNOSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    isHealthy: { type: "BOOLEAN" },
    cannotRead: { type: "BOOLEAN" },
    diseaseName: { type: "STRING" },
    plainExplanation: { type: "STRING" },
    severity: { type: "STRING", enum: ["low", "medium", "high"] },
    spreadRisk: { type: "STRING", enum: ["low", "medium", "high"] },
    symptoms: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          detail: { type: "STRING" },
        },
        required: ["text", "detail"],
      },
    },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          when: { type: "STRING" },
          action: { type: "STRING" },
          detail: { type: "STRING" },
        },
        required: ["when", "action", "detail"],
      },
    },
    prevention: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: [
    "isHealthy",
    "diseaseName",
    "plainExplanation",
    "severity",
    "spreadRisk",
    "symptoms",
    "steps",
    "prevention",
  ],
};

const OPENAI_SCAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cannotRead: { type: "boolean" },
    reason: { type: "string" },
    suspectedDiseases: {
      type: "array",
      items: { type: "string" },
    },
    initialObservation: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          choices: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                label: { type: "string" },
              },
              required: ["id", "label"],
            },
          },
        },
        required: ["id", "question", "choices"],
      },
    },
  },
  required: ["cannotRead", "reason", "suspectedDiseases", "initialObservation", "questions"],
};

const OPENAI_DIAGNOSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    isHealthy: { type: "boolean" },
    cannotRead: { type: "boolean" },
    diseaseName: { type: "string" },
    plainExplanation: { type: "string" },
    severity: { type: "string", enum: ["low", "medium", "high"] },
    spreadRisk: { type: "string", enum: ["low", "medium", "high"] },
    symptoms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          detail: { type: "string" },
        },
        required: ["text", "detail"],
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          when: { type: "string" },
          action: { type: "string" },
          detail: { type: "string" },
        },
        required: ["when", "action", "detail"],
      },
    },
    prevention: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "isHealthy",
    "cannotRead",
    "diseaseName",
    "plainExplanation",
    "severity",
    "spreadRisk",
    "symptoms",
    "steps",
    "prevention",
  ],
};

async function requestOpenAiVisionStructuredJson({
  imageDataUrl,
  promptText,
  jsonSchema,
  schemaName,
}) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();

  if (!apiKey) {
    throw new HttpsError("failed-precondition", "OPENAI_API_KEY is not configured in Cloud Functions.");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: promptText,
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const apiMessage = payload?.error?.message || "OpenAI vision request failed.";
    if (response.status === 401 || response.status === 403) {
      throw new HttpsError("internal", "OPENAI_API_KEY is invalid.");
    }
    if (response.status === 429) {
      throw new HttpsError("resource-exhausted", "Too many requests. Please wait a moment and try again.");
    }
    throw new HttpsError("internal", apiMessage);
  }

  const raw = readResponseText(payload);
  const cleaned = raw.replace(/```json|```/g, "").trim();

  if (!cleaned) {
    throw new HttpsError("internal", "OpenAI returned an empty analysis.");
  }

  return {
    raw,
    cleaned,
  };
}

async function requestGeminiVisionStructuredJson({
  imageDataUrl,
  promptText,
  responseSchema,
  maxOutputTokens = 1500,
}) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "GEMINI_API_KEY or GOOGLE_API_KEY is not configured in Cloud Functions."
    );
  }

  const { mediaType, base64 } = parseImageDataUrl(imageDataUrl);
  const endpoint = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mediaType,
                data: base64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        maxOutputTokens: maxOutputTokens,
        temperature: 0.1,
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message || payload?.promptFeedback?.blockReason || "Gemini vision request failed.";
    if (response.status === 401 || response.status === 403) {
      throw new HttpsError("internal", "GEMINI_API_KEY is invalid.");
    }
    if (response.status === 429) {
      throw new HttpsError("resource-exhausted", "Too many requests. Please wait a moment and try again.");
    }
    throw new HttpsError("internal", apiMessage);
  }

  const raw = readGeminiResponseText(payload);
  const cleaned = raw.replace(/```json|```/g, "").trim();

  if (!cleaned) {
    throw new HttpsError("internal", "Gemini returned an empty analysis.");
  }

  return {
    raw,
    cleaned,
  };
}

function normalizeSymptomAnswers(rawSymptoms) {
  const symptomMap = {
    leavesYellow: "yellow leaves",
    darkSpots: "dark spots on leaves",
    trunkHoles: "holes or damage in the trunk",
    insectsSeen: "insects seen around the palm",
    dryWeak: "tree looks dry or weak",
  };

  const normalized = {};
  const activeSymptoms = [];

  Object.entries(symptomMap).forEach(([key, label]) => {
    const enabled = rawSymptoms?.[key] === true;
    normalized[key] = enabled;

    if (enabled) {
      activeSymptoms.push(label);
    }
  });

  return {
    values: normalized,
    activeSymptoms,
  };
}

function inferHybridConditionFromSymptoms(symptomValues) {
  const leavesYellow = symptomValues.leavesYellow === true;
  const darkSpots = symptomValues.darkSpots === true;
  const trunkHoles = symptomValues.trunkHoles === true;
  const insectsSeen = symptomValues.insectsSeen === true;
  const dryWeak = symptomValues.dryWeak === true;

  if (trunkHoles && insectsSeen) {
    return {
      likelyCondition: "Red Palm Weevil",
      reasoning: "Trunk holes or trunk damage together with insect activity often suggest red palm weevil risk.",
      suggestedActions: [
        "Inspect the trunk closely for deeper holes or soft tissue.",
        "Limit movement of affected palm material until inspected.",
        "Contact a specialist or field operator for urgent review.",
      ],
      severity: "High",
    };
  }

  if (darkSpots && leavesYellow) {
    return {
      likelyCondition: "Leaf Disease or Nutrient Stress",
      reasoning: "Dark spots plus yellowing leaves can indicate a leaf disease pattern or nutrient-related stress.",
      suggestedActions: [
        "Inspect several leaves to confirm whether the spotting is spreading.",
        "Remove clearly damaged leaf material only if field procedure allows it.",
        "Request an operator review for treatment guidance.",
      ],
      severity: "Medium",
    };
  }

  if (leavesYellow && dryWeak) {
    return {
      likelyCondition: "Water Stress or Nutrient Deficiency",
      reasoning: "Yellowing with a dry or weak appearance often matches water stress or nutrient deficiency.",
      suggestedActions: [
        "Check irrigation coverage and recent watering.",
        "Inspect soil moisture around the palm.",
        "Review recent nutrient treatment history if available.",
      ],
      severity: "Medium",
    };
  }

  if (darkSpots) {
    return {
      likelyCondition: "Leaf Spot Risk",
      reasoning: "Visible dark spots on leaves can point to a leaf spot issue or surface damage that needs checking.",
      suggestedActions: [
        "Inspect nearby leaves for the same symptom.",
        "Keep a photo record for comparison during the next check.",
      ],
      severity: "Medium",
    };
  }

  if (dryWeak) {
    return {
      likelyCondition: "General Palm Stress",
      reasoning: "A dry or weak appearance can indicate environmental stress even when a single disease is not obvious.",
      suggestedActions: [
        "Check irrigation, heat exposure, and overall palm vigor.",
        "Capture another image if the condition changes.",
      ],
      severity: "Low",
    };
  }

  return {
    likelyCondition: "General Palm Review Needed",
    reasoning: "The guided answers do not strongly indicate one issue, so the image should be reviewed together with field inspection.",
    suggestedActions: [
      "Inspect the palm directly for symptoms that are hard to capture in the image.",
      "Upload another image if a clearer affected area is available.",
    ],
    severity: "Low",
  };
}

function normalizeSupportText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getSupportKnowledgeMatches(message) {
  const normalizedMessage = normalizeSupportText(message);

  return SUPPORT_KNOWLEDGE.map((entry) => {
    const score = entry.keywords.reduce((total, keyword) => {
      return normalizedMessage.includes(normalizeSupportText(keyword)) ? total + 1 : total;
    }, 0);

    return {
      ...entry,
      score,
    };
  })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

function buildSupportContextBlock(context = {}) {
  const currentPage = String(context.currentPage || "").trim() || "unknown";
  const role = String(context.role || "").trim() || "unknown";
  const selectedZoneName = String(context.selectedZoneName || "").trim() || "none selected";
  const hasImageSelected = context.hasImageSelected ? "yes" : "no";
  const canRunAnalysis = context.canRunAnalysis ? "yes" : "no";
  const latestAnalysisStatus = String(context.latestAnalysisStatus || "").trim() || "none";

  return [
    `Current page: ${currentPage}`,
    `Current role: ${role}`,
    `Selected zone: ${selectedZoneName}`,
    `Image selected: ${hasImageSelected}`,
    `Can run AI analysis: ${canRunAnalysis}`,
    `Latest analysis status: ${latestAnalysisStatus}`,
  ].join("\n");
}

function buildRoleLanguageGuidance(context = {}) {
  const role = String(context.role || "").trim().toLowerCase();

  if (role === "farmer") {
    return "Use very simple language. Avoid technical jargon where possible. Explain features as plain farm tasks and keep the answer friendly and easy to scan.";
  }

  if (role === "operator") {
    return "Use simple practical language. Focus on steps the operator can take and avoid heavy technical wording unless necessary.";
  }

  return "Use clear direct product language.";
}

async function requestOpenAiSupportReply({ message, context, matchedKnowledge, relatedKnowledge }) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();

  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "OPENAI_API_KEY is not configured in Cloud Functions."
    );
  }

  const trustedKnowledgeText = relatedKnowledge
    .map((entry) => `- (${entry.topic}) ${entry.answer}`)
    .join("\n");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SUPPORT_CHAT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `
You are NakhlaSense Assistant.

You can answer user questions about:
- palm health and diseases
- pest symptoms
- drone monitoring
- sensor readings
- temperature, humidity, CO₂
- farm conditions
- dashboard usage
- uploaded crop images
- recommendations and next steps
- general agriculture questions
- simple technical questions about the system

Answer clearly and simply for normal users.

If the question is outside agriculture or the NakhlaSense system, still answer if it is safe and helpful.

Do not claim certainty for disease diagnosis. Use words like:
"possible", "likely", or "recommended to confirm with a specialist."

Do not answer dangerous, illegal, or harmful requests.

If the user asks about pesticides or treatment, give general safety advice and recommend checking with a specialist.
`.trim(),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `User question:\n${String(message || "").trim()}\n\n` +
                `Page and role context:\n${buildSupportContextBlock(context)}\n\n` +
                `Trusted support knowledge:\n${trustedKnowledgeText}\n\n` +
                (matchedKnowledge
                  ? `Primary answer to preserve:\n${matchedKnowledge.answer}\n\nRewrite it naturally without changing the facts.`
                  : "Use the trusted support knowledge above to answer. If the question is outside that scope, say what you can help with instead of guessing."),
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const apiMessage = payload?.error?.message || "OpenAI support request failed.";
    throw new HttpsError("internal", apiMessage);
  }

  const outputText = readResponseText(payload).trim();

  if (!outputText) {
    throw new HttpsError("internal", "OpenAI returned an empty support response.");
  }

  return outputText;
}

function buildPalmAnalysisPrompt() {
  return `
You are a palm disease expert. A farmer with no technical background sent you a photo of their palm tree.

Analyze the image and respond ONLY with valid JSON. No markdown, no backticks, and no extra text outside the JSON.

Known disease list:
${PALM_DISEASES.map((disease, index) => `${index + 1}. ${disease}`).join("\n")}

Required JSON format:
{
  "isHealthy": false,
  "cannotRead": false,
  "diseaseName": "Exact name from the list above, or 'Healthy palm'",
  "plainExplanation": "2-3 short sentences. Simple words only. Explain what the disease does to the tree and why it is dangerous. Write as if talking to a farmer standing in his field.",
  "severity": "low",
  "spreadRisk": "high",
  "symptoms": [
    {
      "text": "What the farmer can see on their palm right now",
      "detail": "What this sign means, in simple words"
    }
  ],
  "steps": [
    {
      "when": "Today",
      "action": "Short action title - max 6 words",
      "detail": "Exactly what to do. Name the product if needed. One idea per sentence. Simple words."
    }
  ],
  "prevention": [
    "One prevention action per item. Simple sentence. Direct instruction."
  ]
}

Rules:
- Use ONLY simple words a farmer understands. No scientific terms like 'pustules', 'pathogen', or 'paraphyses'.
- severity must be one of: "low", "medium", "high"
- spreadRisk must be one of: "low", "medium", "high"
- steps must be in order from most urgent to least urgent
- "when" in each step must be one of: "Today", "This week", "Every 2 weeks", "Every month", "Always"
- symptoms must list ONLY what is visible in THIS specific photo. Do not invent symptoms.
- If the palm looks completely healthy: set isHealthy=true, symptoms=[], steps=[]
- If the image is too blurry, not a palm, or impossible to diagnose: set cannotRead=true and explain that in plainExplanation
- ALWAYS name the exact disease from the list. Never say "possible infection" or "suspected fungus".
- Write all text as if talking directly to a farmer. Short sentences. One idea per sentence. No comma-heavy lists.
`.trim();
}

function buildPalmScanPrompt() {
  return `
You are a palm disease expert. A farmer uploaded a photo of their palm tree.

Look at the image carefully. Identify the 2-3 most likely diseases from this list:
${PALM_DISEASES.map((disease, index) => `${index + 1}. ${disease}`).join("\n")}

Then generate 3-4 short questions that would help you separate those specific diseases from each other.
Each question must have exactly 3-4 answer choices. All text must be simple so a farmer understands immediately.

Respond ONLY with valid JSON. No markdown and no extra text.
{
  "cannotRead": false,
  "suspectedDiseases": ["disease name 1", "disease name 2"],
  "initialObservation": "One sentence about what you see in the photo, in simple words",
  "questions": [
    {
      "id": "q1",
      "question": "Short simple question - max 10 words",
      "choices": [
        { "id": "a", "label": "Choice A - max 5 words" },
        { "id": "b", "label": "Choice B - max 5 words" },
        { "id": "c", "label": "Choice C - max 5 words" }
      ]
    }
  ]
}

Rules:
- Max 4 questions total
- Questions must only target differences between the suspected diseases. Do not ask generic questions.
- Every choice must be a simple tap. No free typing.
- Write everything as if talking to a farmer standing in his field.
- If the image is too blurry or not a palm, return:
  { "cannotRead": true, "reason": "one sentence explanation" }
`.trim();
}

function buildPalmDiagnosisPrompt(questions = [], answers = {}) {
  const qaText = questions
    .map((question) => {
      const choices = Array.isArray(question?.choices) ? question.choices : [];
      const chosen = choices.find((choice) => choice?.id === answers?.[question?.id]);
      return `Q: ${String(question?.question || "").trim()}\nFarmer answered: ${chosen ? String(chosen.label || "").trim() : "Not answered"}`;
    })
    .join("\n\n");

  return `
You are a palm disease expert. A farmer sent you a photo of their palm tree AND answered these questions:

${qaText}

Based on BOTH the image AND the farmer's answers, give a precise diagnosis.

Known disease list:
${PALM_DISEASES.map((disease, index) => `${index + 1}. ${disease}`).join("\n")}

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "isHealthy": false,
  "diseaseName": "Exact name from the list, or 'Healthy palm'",
  "plainExplanation": "2-3 short sentences. Simple words only. What the disease does to the tree and why it is dangerous.",
  "severity": "low",
  "spreadRisk": "high",
  "symptoms": [
    { "text": "Visible symptom the farmer can see right now", "detail": "What it means in simple words" }
  ],
  "steps": [
    { "when": "Today", "action": "Short action title - max 6 words", "detail": "Exactly what to do. Name products if needed. One idea per sentence." }
  ],
  "prevention": [
    "One prevention action per item. Simple. Direct."
  ]
}

Rules:
- The farmer's answers are strong evidence. Use them heavily to confirm the diagnosis.
- Name the exact disease. Never say "possible" or "suspected".
- Use only simple words. No scientific terms like pustules, pathogen, or paraphyses.
- severity and spreadRisk must be: "low", "medium", or "high"
- steps must be ordered from most urgent to least urgent
- "when" in each step must be: "Today", "This week", "Every 2 weeks", "Every month", or "Always"
- If healthy: isHealthy=true, symptoms=[], steps=[]
- Write everything as if talking directly to a farmer. Short sentences. One idea per sentence.
`.trim();
}

function normalizePalmScanResult(rawScan) {
  if (rawScan?.cannotRead === true) {
    return {
      cannotRead: true,
      reason: String(rawScan?.reason || "").trim() || "The photo is too blurry or does not show a palm clearly.",
      suspectedDiseases: [],
      initialObservation: "",
      questions: [],
    };
  }

  const suspectedDiseases = Array.isArray(rawScan?.suspectedDiseases)
    ? rawScan.suspectedDiseases
        .map((item) => String(item || "").trim())
        .filter((item) => PALM_DISEASES.includes(item))
        .slice(0, 3)
    : [];
  const questions = Array.isArray(rawScan?.questions)
    ? rawScan.questions
        .map((question, index) => ({
          id: String(question?.id || `q${index + 1}`).trim(),
          question: String(question?.question || "").trim(),
          choices: Array.isArray(question?.choices)
            ? question.choices
                .map((choice, choiceIndex) => ({
                  id: String(choice?.id || String.fromCharCode(97 + choiceIndex)).trim(),
                  label: String(choice?.label || "").trim(),
                }))
                .filter((choice) => choice.id && choice.label)
                .slice(0, 4)
            : [],
        }))
        .filter((question) => question.id && question.question && question.choices.length >= 3)
        .slice(0, 4)
    : [];

  return {
    cannotRead: false,
    suspectedDiseases,
    initialObservation:
      String(rawScan?.initialObservation || "").trim() ||
      "I can see the palm clearly enough to ask a few quick questions.",
    questions,
  };
}

function normalizeAnthropicPalmAnalysis(rawAnalysis) {
  const isHealthy = rawAnalysis?.isHealthy === true;
  const cannotRead = rawAnalysis?.cannotRead === true;
  const normalizedSeverity = String(rawAnalysis?.severity || "").trim().toLowerCase();
  const normalizedSpreadRisk = String(rawAnalysis?.spreadRisk || "").trim().toLowerCase();
  const severityMap = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };
  const status = cannotRead
    ? "Warning"
    : isHealthy
    ? "Healthy"
    : "Abnormal";
  const severity = severityMap[normalizedSeverity] || (isHealthy ? "Low" : "Medium");
  const confidence = cannotRead ? 35 : isHealthy ? 92 : normalizedSpreadRisk === "high" ? 88 : normalizedSpreadRisk === "medium" ? 76 : 68;
  const diseaseName = String(rawAnalysis?.diseaseName || "").trim() || (isHealthy ? "Healthy palm" : "Sudden decline syndrome");
  const symptoms = Array.isArray(rawAnalysis?.symptoms)
    ? rawAnalysis.symptoms
        .map((item) => ({
          text: String(item?.text || "").trim(),
          detail: String(item?.detail || "").trim(),
        }))
        .filter((item) => item.text && item.detail)
        .slice(0, 5)
    : [];
  const steps = Array.isArray(rawAnalysis?.steps)
    ? rawAnalysis.steps
        .map((item) => ({
          when: String(item?.when || "").trim(),
          action: String(item?.action || "").trim(),
          detail: String(item?.detail || "").trim(),
        }))
        .filter((item) => item.when && item.action && item.detail)
        .slice(0, 5)
    : [];
  const prevention = Array.isArray(rawAnalysis?.prevention)
    ? rawAnalysis.prevention.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
    : [];
  const symptomEvidence = symptoms.map((item) => `${item.text}: ${item.detail}`);
  const visibleContent = symptoms.length
    ? symptoms.map((item) => item.text).join(" ")
    : cannotRead
    ? "The image is too unclear or does not show a palm clearly enough to diagnose."
    : isHealthy
    ? "The palm looks healthy in this photo."
    : "The visible signs in the photo suggest palm stress or disease.";
  const visualEvidence = symptomEvidence.length
    ? symptomEvidence.join(" ")
    : visibleContent;
  const recommendedActions = steps.length
    ? steps.map((item) => `${item.when}: ${item.action}. ${item.detail}`)
    : [];
  const alternativeConditions = prevention.slice(0, 3);
  const explanation =
    String(rawAnalysis?.plainExplanation || "").trim() ||
    (cannotRead
      ? "I cannot read this photo well enough to give a safe answer."
      : isHealthy
      ? "This palm looks healthy in the photo."
      : "This photo shows signs that match the named palm problem.");
  const summary = cannotRead
    ? explanation
    : isHealthy
    ? "The photo looks like a healthy palm."
    : `${diseaseName}. ${explanation}`;

  return {
    status,
    severity,
    confidence,
    detectedCondition: diseaseName,
    explanation,
    summary,
    specificity: cannotRead ? "broad" : confidence >= 75 ? "exact" : confidence >= 50 ? "probable" : "broad",
    alternativeConditions,
    visualEvidence,
    recommendedActions,
    nextStep:
      String(steps[0]?.detail || recommendedActions[0] || "").trim() ||
      (cannotRead
        ? "Upload a clearer image focused on the palm leaves, trunk, or crown."
        : isHealthy
        ? "Keep watching the palm and upload a new photo if something changes."
        : "Start with the first step today and check the palm again soon."),
    needsAlert: !cannotRead && !isHealthy && (severity === "High" || normalizedSpreadRisk === "high"),
    visibleContent,
    imageCategory: cannotRead ? "unusable_image" : "palm_tree_clear",
    analysisAccepted: !cannotRead,
    rejectionReason: cannotRead ? "The image is too blurry, unclear, or not a palm." : "",
    model: ANTHROPIC_MODEL,
    farmerReport: {
      isHealthy,
      cannotRead,
      diseaseName,
      plainExplanation: explanation,
      severity: ["low", "medium", "high"].includes(normalizedSeverity) ? normalizedSeverity : isHealthy ? "low" : "medium",
      spreadRisk: ["low", "medium", "high"].includes(normalizedSpreadRisk) ? normalizedSpreadRisk : isHealthy ? "low" : "medium",
      symptoms,
      steps,
      prevention,
    },
  };
}

async function requestAnthropicCropAnalysis({ imageDataUrl }) {
  try {
    const { cleaned, raw } = await requestGeminiVisionStructuredJson({
      imageDataUrl,
      promptText: buildPalmAnalysisPrompt(),
      responseSchema: GEMINI_DIAGNOSIS_SCHEMA,
      maxOutputTokens: 1500,
    });
    return normalizeAnthropicPalmAnalysis(JSON.parse(cleaned));
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("Failed to parse Gemini analysis response.", error);
    throw new HttpsError("internal", "Gemini returned an invalid analysis format.");
  }
}

async function requestAnthropicPalmScan({ imageDataUrl }) {
  try {
    const { cleaned, raw } = await requestGeminiVisionStructuredJson({
      imageDataUrl,
      promptText: buildPalmScanPrompt(),
      responseSchema: GEMINI_SCAN_SCHEMA,
      maxOutputTokens: 1200,
    });
    return normalizePalmScanResult(JSON.parse(cleaned));
  } catch (error) {
    logger.warn("Gemini palm scan failed. Falling back to OpenAI.", error);

    try {
      const { cleaned } = await requestOpenAiVisionStructuredJson({
        imageDataUrl,
        promptText: buildPalmScanPrompt(),
        jsonSchema: OPENAI_SCAN_JSON_SCHEMA,
        schemaName: "palm_scan_questions",
      });
      return normalizePalmScanResult(JSON.parse(cleaned));
    } catch (fallbackError) {
      if (fallbackError instanceof HttpsError) {
        throw fallbackError;
      }
      logger.error("Failed to parse OpenAI palm scan response.", fallbackError);
      throw new HttpsError("internal", "OpenAI returned an invalid palm scan format.");
    }
  }
}

async function requestAnthropicPalmDiagnosis({ imageDataUrl, questions, answers }) {
  try {
    const { cleaned } = await requestGeminiVisionStructuredJson({
      imageDataUrl,
      promptText: buildPalmDiagnosisPrompt(questions, answers),
      responseSchema: GEMINI_DIAGNOSIS_SCHEMA,
      maxOutputTokens: 1500,
    });
    return normalizeAnthropicPalmAnalysis(JSON.parse(cleaned));
  } catch (error) {
    logger.warn("Gemini palm diagnosis failed. Falling back to OpenAI.", error);

    try {
      const { cleaned } = await requestOpenAiVisionStructuredJson({
        imageDataUrl,
        promptText: buildPalmDiagnosisPrompt(questions, answers),
        jsonSchema: OPENAI_DIAGNOSIS_JSON_SCHEMA,
        schemaName: "palm_diagnosis",
      });
      return normalizeAnthropicPalmAnalysis(JSON.parse(cleaned));
    } catch (fallbackError) {
      if (fallbackError instanceof HttpsError) {
        throw fallbackError;
      }
      logger.error("Failed to parse OpenAI palm diagnosis response.", fallbackError);
      throw new HttpsError("internal", "OpenAI returned an invalid palm diagnosis format.");
    }
  }
}

function buildReadingTimestamp(dateValue, timeValue) {
  const datePart = String(dateValue || "").trim();
  const timePart = String(timeValue || "").trim();

  if (!datePart) {
    return admin.firestore.Timestamp.now();
  }

  const dateMatch = datePart.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (dateMatch) {
    const [, first, second, yearValue] = dateMatch;
    const day = Number(first);
    const month = Number(second);
    const year = Number(yearValue.length === 2 ? `20${yearValue}` : yearValue);
    const hours = timeMatch ? Number(timeMatch[1]) : 0;
    const minutes = timeMatch ? Number(timeMatch[2]) : 0;
    const seconds = timeMatch ? Number(timeMatch[3] || 0) : 0;
    const parsedDate = new Date(year, month - 1, day, hours, minutes, seconds);

    if (!Number.isNaN(parsedDate.getTime())) {
      return admin.firestore.Timestamp.fromDate(parsedDate);
    }
  }

  const candidate = timePart ? `${datePart}T${timePart}` : datePart;
  const parsed = new Date(candidate);

  if (Number.isNaN(parsed.getTime())) {
    return admin.firestore.Timestamp.now();
  }

  return admin.firestore.Timestamp.fromDate(parsed);
}

function sanitizeReadingIdPart(value, fallback = "na") {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[\/\\]+/g, "-")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "-");

  return cleaned || fallback;
}

function buildSensorReadingDocId(packetId, readingDate, readingTime, sensorType) {
  return [
    sanitizeReadingIdPart(packetId, "packet"),
    sanitizeReadingIdPart(readingDate || "no-date", "no-date"),
    sanitizeReadingIdPart(readingTime || "no-time", "no-time"),
    sanitizeReadingIdPart(sensorType || "reading", "reading"),
  ].join("-");
}

function buildSensorDocs(row, city, uploader = {}, context = {}) {
  const packetId = toNumber(row.PacketID);

  if (packetId == null) {
    return [];
  }

  const timestamp = buildReadingTimestamp(row.GroundDate || row.DroneDate, row.GroundTime || row.DroneTime);
  const location =
    String(row.ImageName || "").trim() && cleanImageName(row.ImageName)
      ? `Packet ${packetId} / ${cleanImageName(row.ImageName)}`
      : `Packet ${packetId}`;

  const coords = {
    lat: toNumber(row.GroundLat),
    lon: toNumber(row.GroundLon),
  };

  const commonFields = {
    packetId,
    packetIdRaw: toCleanString(row.PacketID),
    imageName: cleanImageName(row.ImageName),
    location,
    status: "active",
    timestamp,
    groundDate: String(row.GroundDate || "").trim(),
    groundTime: String(row.GroundTime || "").trim(),
    groundGPSValid: toBoolean(row.GroundGPSValid),
    droneDate: String(row.DroneDate || "").trim(),
    droneTime: String(row.DroneTime || "").trim(),
    droneGPSValid: toBoolean(row.DroneGPSValid),
    lat: coords.lat,
    lon: coords.lon,
    latRaw: toCleanString(row.GroundLat),
    lonRaw: toCleanString(row.GroundLon),
    coords,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
    importedBy: uploader.uid || null,
    importedByName: String(uploader.name || "").trim() || null,
    importedByEmail: String(uploader.email || "").trim().toLowerCase() || null,
    importedByRole: String(uploader.role || "").trim().toLowerCase() || null,
    stationId: String(context.stationId || "").trim() || null,
    stationName: String(context.stationName || "").trim() || null,
    stationLocation: String(context.stationLocation || "").trim() || null,
    zoneName: String(context.zoneName || "").trim() || null,
    missionId: String(context.missionId || "").trim() || null,
    missionDate: String(context.missionDate || "").trim() || null,
    sourceFileName: String(context.fileName || "").trim() || null,
  };

  if (city) {
    commonFields.city = city;
  }

  const metrics = [
    { sensorType: "temperature", sensorId: "csv_temperature_sensor", unit: "C", value: toNumber(row.TempC) },
    { sensorType: "humidity", sensorId: "csv_humidity_sensor", unit: "%", value: toNumber(row.RH) },
    { sensorType: "co2", sensorId: "csv_co2_sensor", unit: "ppm", value: toNumber(row.CO2ppm) },
    {
      sensorType: "absoluteHumidity",
      sensorId: "csv_abs_humidity_sensor",
      unit: "g/m3",
      value: toNumber(row.AbsHumidity),
    },
  ];

  return metrics
    .filter((metric) => metric.value != null)
    .map((metric) => ({
      id: buildSensorReadingDocId(
        packetId,
        commonFields.groundDate || commonFields.droneDate || "no-date",
        commonFields.groundTime || commonFields.droneTime || "no-time",
        metric.sensorType
      ),
      ...commonFields,
      sensorId: metric.sensorId,
      sensorType: metric.sensorType,
      value: metric.value,
      rawValue: toCleanString(
        metric.sensorType === "temperature"
          ? row.TempC
          : metric.sensorType === "humidity"
          ? row.RH
          : metric.sensorType === "co2"
          ? row.CO2ppm
          : row.AbsHumidity
      ),
      unit: metric.unit,
    }));
}

async function commitImportDocs(documents) {
  let batch = db.batch();
  let operationCount = 0;
  let insertedCount = 0;

  for (const document of documents) {
    const docRef = db.collection("sensor_readings").doc(document.id);
    batch.set(docRef, document, { merge: true });
    operationCount += 1;
    insertedCount += 1;

    if (operationCount === 400) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  return insertedCount;
}

async function reserveImportFingerprint(fingerprint, metadata = {}) {
  const importRef = db.collection("sensor_imports").doc();

  await importRef.set({
    ...metadata,
    fingerprint,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return importRef;
}

async function getRoleFromUserProfile(uid) {
  const userSnap = await db.collection("users").doc(uid).get();

  if (!userSnap.exists) {
    throw new HttpsError("permission-denied", "No user profile found for this account.");
  }

  const userRole = normalizeRole(userSnap.data()?.role);

  if (!ALLOWED_ROLES.includes(userRole)) {
    throw new HttpsError("permission-denied", "This account has an invalid role.");
  }

  return userRole;
}

async function getUserProfileSummary(uid) {
  const userSnap = await db.collection("users").doc(uid).get();

  if (!userSnap.exists) {
    throw new HttpsError("permission-denied", "No user profile found for this account.");
  }

  const data = userSnap.data() || {};
  const role = normalizeRole(data.role);

  if (!ALLOWED_ROLES.includes(role)) {
    throw new HttpsError("permission-denied", "This account has an invalid role.");
  }

  return {
    uid,
    role,
    email: String(data.email || "").trim().toLowerCase(),
    name: String(data.name || data.displayName || "").trim(),
  };
}

async function getAuthorizedRole(uid, allowedRoles, fallbackMessage) {
  const role = await getRoleFromUserProfile(uid);

  if (!allowedRoles.includes(role)) {
    throw new HttpsError("permission-denied", fallbackMessage);
  }

  return role;
}

exports.sendOtp = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    try {
      const { email } = request.data || {};
      const cleanEmail = normalizeEmail(email);
      const authEmail = normalizeEmail(request.auth?.token?.email);
      const uid = request.auth?.uid;

      if (!uid || !authEmail) {
        throw new HttpsError("unauthenticated", "Password verification is required first.");
      }

      if (!cleanEmail) {
        throw new HttpsError("invalid-argument", "Email is required.");
      }

      if (authEmail !== cleanEmail) {
        throw new HttpsError("permission-denied", "Signed-in email does not match the OTP request.");
      }

      const profileRole = await getRoleFromUserProfile(uid);

      const otpRef = db.collection("emailOtps").doc(cleanEmail);
      const existingSnap = await otpRef.get();

      if (existingSnap.exists) {
        const existingData = existingSnap.data() || {};
        const lastSentMillis = existingData.lastSentAt?.toMillis?.() || 0;

        if (Date.now() - lastSentMillis < RESEND_COOLDOWN_MS) {
          throw new HttpsError(
            "resource-exhausted",
            "Please wait before requesting another OTP."
          );
        }
      }

      const otp = generateOtp();
      const otpHash = hashOtp(cleanEmail, otp);
      const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + OTP_TTL_MS);

      const transporter = createTransporter();
      await transporter.verify();

      await transporter.sendMail({
        from: SMTP_FROM,
        to: cleanEmail,
        subject: "Your NakhlaSense OTP Code",
        text: `Your OTP code is ${otp}. It expires in 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>NakhlaSense Login</h2>
            <p>Your OTP code is:</p>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">
              ${otp}
            </div>
            <p>This code expires in 5 minutes.</p>
          </div>
        `,
      });

      await otpRef.set({
        uid,
        email: cleanEmail,
        role: profileRole,
        otpHash,
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
      });

      return {
        success: true,
        message: "OTP sent successfully.",
        role: profileRole,
      };
    } catch (error) {
      rethrowKnownError(error, "Failed to send OTP.");
    }
  }
);

exports.importSensorReadingsCsv = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    let reservedImportRef = null;

    try {
      const uid = request.auth?.uid;
      const fileName = String(request.data?.fileName || "").trim();
      const city = String(request.data?.city || "").trim();
      const content = String(request.data?.content || "");
      const incomingRows = request.data?.rows;
      const importContext = {
        stationId: String(request.data?.stationId || "").trim(),
        stationName: String(request.data?.stationName || "").trim(),
        stationLocation: String(request.data?.stationLocation || "").trim(),
        zoneName: String(request.data?.zoneName || "").trim(),
        missionId: String(request.data?.missionId || "").trim(),
        missionDate: String(request.data?.missionDate || "").trim(),
        fileName,
      };

      if (!uid) {
        throw new HttpsError("unauthenticated", "You must be signed in before importing a data file.");
      }

      const uploader = await getUserProfileSummary(uid);
      const role = uploader.role;

      if (!CSV_IMPORT_ROLES.includes(role)) {
        throw new HttpsError("permission-denied", "Only operators and admins can import sensor data.");
      }

      if (!fileName || !/\.(csv|xlsx)$/i.test(fileName)) {
        throw new HttpsError("invalid-argument", "Please upload a CSV or XLSX data file.");
      }

      if (!content.trim() && (!Array.isArray(incomingRows) || !incomingRows.length)) {
        throw new HttpsError("invalid-argument", "The uploaded file is empty.");
      }

      if (content.trim() && Buffer.byteLength(content, "utf8") > MAX_IMPORT_FILE_SIZE) {
        throw new HttpsError("resource-exhausted", "Please keep the CSV or XLSX file under 1 MB.");
      }

      const rows = Array.isArray(incomingRows) && incomingRows.length
        ? normalizeImportedRows(incomingRows)
        : parseDelimitedContent(content).rows;
      const fingerprintSource =
        Array.isArray(incomingRows) && incomingRows.length
          ? JSON.stringify(rows)
          : content.trim();
      const importFingerprint = hashImportFingerprint(fingerprintSource);

      reservedImportRef = await reserveImportFingerprint(importFingerprint, {
        fileName,
        uploadedBy: uploader.email || "",
        uploadedByName: uploader.name || "",
        stationId: importContext.stationId,
        stationName: importContext.stationName,
        missionId: importContext.missionId,
        missionDate: importContext.missionDate,
      });

      const documents = rows.flatMap((row) => buildSensorDocs(row, city, uploader, importContext));

      if (!documents.length) {
        throw new HttpsError("invalid-argument", "No valid sensor rows were found in the uploaded file.");
      }

      const insertedCount = await commitImportDocs(documents);
      const skippedRows = rows.length - new Set(documents.map((document) => document.packetId)).size;

      if (reservedImportRef) {
        await reservedImportRef.set(
          {
            status: "completed",
            packetsProcessed: rows.length,
            readingsWritten: insertedCount,
            skippedRows,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return {
        success: true,
        fileName,
        city,
        stationId: importContext.stationId,
        stationName: importContext.stationName,
        missionId: importContext.missionId,
        missionDate: importContext.missionDate,
        packetsProcessed: rows.length,
        readingsWritten: insertedCount,
        skippedRows,
        message: `Imported ${insertedCount} sensor readings from ${rows.length} packet rows.`,
      };
    } catch (error) {
    if (reservedImportRef) {
      try {
        await reservedImportRef.delete();
      } catch (cleanupError) {
        logger.warn("Failed to clean up pending import reservation.", cleanupError);
      }
      }

      rethrowKnownError(error, "Failed to import sensor readings.");
    }
  }
);

exports.getLatestSensorReadings = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    try {
      const uid = request.auth?.uid;
      const maxItems = Math.min(Math.max(Number(request.data?.maxItems || 80), 1), 400);

      if (!uid) {
        throw new HttpsError("unauthenticated", "You must be signed in before loading sensor readings.");
      }

      await getAuthorizedRole(
        uid,
        ALLOWED_ROLES,
        "Your account cannot read uploaded sensor data."
      );

      const snapshot = await db
        .collection("sensor_readings")
        .orderBy("timestamp", "desc")
        .limit(maxItems)
        .get();

      const rows = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...serializeFirestoreValue(doc.data()),
      }));

      return {
        rows,
        count: rows.length,
      };
    } catch (error) {
      rethrowKnownError(error, "Failed to load sensor readings.");
    }
  }
);

exports.saveStationRecord = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    try {
      const uid = request.auth?.uid;
      const stationId = String(request.data?.stationId || "").trim();

      if (!uid) {
        throw new HttpsError("unauthenticated", "You must be signed in before saving a station.");
      }

      await getAuthorizedRole(
        uid,
        STATION_MANAGEMENT_ROLES,
        "Only operators and admins can manage stations."
      );

      const payload = normalizeStationPayload(request.data || {});
      const uniqueKey = buildStationUniqueKey(payload);

      if (!uniqueKey) {
        throw new HttpsError("invalid-argument", "Station identity is incomplete.");
      }

      const result = await db.runTransaction(async (transaction) => {
        const stationsCollection = db.collection("stations");
        const keysCollection = db.collection("station_unique_keys");
        const countersCollection = db.collection("system_counters");

        if (stationId) {
          const stationRef = stationsCollection.doc(stationId);
          const stationSnap = await transaction.get(stationRef);

          if (!stationSnap.exists) {
            throw new HttpsError("not-found", "Station not found.");
          }

          const currentData = stationSnap.data() || {};
          const currentUniqueKey = String(currentData.uniqueKey || "");

          if (currentUniqueKey && currentUniqueKey !== uniqueKey) {
            const currentKeyRef = keysCollection.doc(currentUniqueKey);
            transaction.delete(currentKeyRef);
          }

          const nextKeyRef = keysCollection.doc(uniqueKey);
          const nextKeySnap = await transaction.get(nextKeyRef);

          if (nextKeySnap.exists && nextKeySnap.data()?.stationDocId !== stationId) {
            throw new HttpsError(
              "already-exists",
              "A station with the same name, location, and type already exists."
            );
          }

          transaction.set(
            nextKeyRef,
            {
              stationDocId: stationId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          transaction.update(stationRef, {
            ...payload,
            uniqueKey,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: uid,
          });

          return {
            id: stationId,
            stationId: currentData.stationId || null,
            ...payload,
            uniqueKey,
          };
        }

        const keyRef = keysCollection.doc(uniqueKey);
        const existingKeySnap = await transaction.get(keyRef);

        if (existingKeySnap.exists) {
          throw new HttpsError(
            "already-exists",
            "A station with the same name, location, and type already exists."
          );
        }

        const counterRef = countersCollection.doc("stations");
        const counterSnap = await transaction.get(counterRef);
        const nextSequence = Number(counterSnap.data()?.lastSequence || 0) + 1;
        const generatedStationId = `ST${String(nextSequence).padStart(3, "0")}`;
        const stationRef = stationsCollection.doc();

        transaction.set(counterRef, {
          lastSequence: nextSequence,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.set(keyRef, {
          stationDocId: stationRef.id,
          stationId: generatedStationId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.set(stationRef, {
          ...payload,
          stationId: generatedStationId,
          uniqueKey,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: uid,
          updatedBy: uid,
        });

        return {
          id: stationRef.id,
          stationId: generatedStationId,
          ...payload,
          uniqueKey,
        };
      });

      return {
        success: true,
        station: result,
      };
    } catch (error) {
      rethrowKnownError(error, "Failed to save station.");
    }
  }
);

exports.deleteStationRecord = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    try {
      const uid = request.auth?.uid;
      const stationId = String(request.data?.stationId || "").trim();

      if (!uid) {
        throw new HttpsError("unauthenticated", "You must be signed in before deleting a station.");
      }

      await getAuthorizedRole(
        uid,
        STATION_MANAGEMENT_ROLES,
        "Only operators and admins can manage stations."
      );

      if (!stationId) {
        throw new HttpsError("invalid-argument", "Station document id is required.");
      }

      await db.runTransaction(async (transaction) => {
        const stationRef = db.collection("stations").doc(stationId);
        const stationSnap = await transaction.get(stationRef);

        if (!stationSnap.exists) {
          throw new HttpsError("not-found", "Station not found.");
        }

        const stationData = stationSnap.data() || {};
        const uniqueKey = String(stationData.uniqueKey || "");

        if (uniqueKey) {
          transaction.delete(db.collection("station_unique_keys").doc(uniqueKey));
        }

        transaction.delete(stationRef);
      });

      return {
        success: true,
        stationId,
      };
    } catch (error) {
      rethrowKnownError(error, "Failed to delete station.");
    }
  }
);

exports.verifyOtp = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    try {
      const { email, otp } = request.data || {};
      const cleanEmail = normalizeEmail(email);
      const cleanOtp = String(otp || "").trim();

      const authEmail = normalizeEmail(request.auth?.token?.email);
      const uid = request.auth?.uid;

      if (!uid || !authEmail) {
        throw new HttpsError("unauthenticated", "You must be signed in before verifying OTP.");
      }

      if (!cleanEmail || !cleanOtp) {
        throw new HttpsError("invalid-argument", "Email and OTP are required.");
      }

      if (authEmail !== cleanEmail) {
        throw new HttpsError("permission-denied", "Signed-in email does not match the OTP verification request.");
      }

      const otpRef = db.collection("emailOtps").doc(cleanEmail);
      const snap = await otpRef.get();

      if (!snap.exists) {
        throw new HttpsError("not-found", "No OTP found for this email.");
      }

      const data = snap.data() || {};

      if (data.uid && data.uid !== uid) {
        await otpRef.delete();
        throw new HttpsError("permission-denied", "This OTP does not belong to the current session.");
      }

      if (!data.expiresAt) {
        await otpRef.delete();
        throw new HttpsError("internal", "OTP record is invalid.");
      }

      if (Date.now() > data.expiresAt.toMillis()) {
        await otpRef.delete();
        throw new HttpsError("deadline-exceeded", "OTP expired.");
      }

      const currentAttempts = Number(data.attempts || 0);

      if (currentAttempts >= MAX_ATTEMPTS) {
        await otpRef.delete();
        throw new HttpsError("resource-exhausted", "Maximum OTP attempts exceeded.");
      }

      const expectedHash = data.otpHash;
      const providedHash = hashOtp(cleanEmail, cleanOtp);

      if (providedHash !== expectedHash) {
        await otpRef.update({
          attempts: admin.firestore.FieldValue.increment(1),
        });

        throw new HttpsError("permission-denied", "Invalid OTP.");
      }

      const profileRole = await getRoleFromUserProfile(uid);
      const otpRole = normalizeRole(data.role);

      if (otpRole && otpRole !== profileRole) {
        await otpRef.delete();
        throw new HttpsError(
          "permission-denied",
          "Role changed during verification. Request a new OTP."
        );
      }

      await otpRef.delete();

      return {
        success: true,
        role: profileRole,
      };
    } catch (error) {
      rethrowKnownError(error, "Failed to verify OTP.");
    }
  }
);

exports.analyzeCropImage = onCall(
  {
    region: "us-central1",
    cors: true,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    try {
      const uid = request.auth?.uid;
      const mode = String(request.data?.mode || "diagnose").trim().toLowerCase();
      const fileName = String(request.data?.fileName || "").trim();
      const zoneName = String(request.data?.zoneName || "").trim();
      const imageDataUrl = String(request.data?.imageDataUrl || "").trim();
      const symptoms = request.data?.symptoms || {};
      const questions = Array.isArray(request.data?.questions) ? request.data.questions : [];
      const answers =
        request.data?.answers && typeof request.data.answers === "object"
          ? request.data.answers
          : {};

      if (!uid) {
        throw new HttpsError("unauthenticated", "You must be signed in before analyzing an image.");
      }

      const role = await getRoleFromUserProfile(uid);

      if (!AI_ANALYSIS_ROLES.includes(role)) {
        throw new HttpsError("permission-denied", "Your account cannot run AI image analysis.");
      }

      if (!fileName) {
        throw new HttpsError("invalid-argument", "Image file name is required.");
      }

      if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageDataUrl)) {
        throw new HttpsError("invalid-argument", "Please upload a PNG, JPG, or WEBP image.");
      }

      if (estimateDataUrlBytes(imageDataUrl) > MAX_ANALYSIS_IMAGE_BYTES) {
        throw new HttpsError("resource-exhausted", "Please keep the image under 5 MB.");
      }

      if (mode === "scan") {
        const scan = await requestAnthropicPalmScan({
          imageDataUrl,
        });

        return {
          success: true,
          fileName,
          zoneName: zoneName || "Unassigned",
          scan,
        };
      }

      if (mode === "diagnose") {
        const analysis = await requestAnthropicPalmDiagnosis({
          imageDataUrl,
          questions,
          answers,
        });

        return {
          success: true,
          fileName,
          zoneName: zoneName || "Unassigned",
          symptoms: normalizeSymptomAnswers(symptoms).values,
          analysis,
        };
      }

      const analysis = await requestAnthropicCropAnalysis({
        imageDataUrl,
      });

      return {
        success: true,
        fileName,
        zoneName: zoneName || "Unassigned",
        symptoms: normalizeSymptomAnswers(symptoms).values,
        analysis,
      };
    } catch (error) {
      rethrowKnownError(error, "Failed to analyze crop image.");
    }
  }
);

exports.getSupportChatReply = onCall(
  {
    region: "us-central1",
    cors: true,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    try {
      const uid = request.auth?.uid;
      const message = String(request.data?.message || "").trim();
      const context = request.data?.context || {};

      if (!uid) {
        throw new HttpsError("unauthenticated", "You must be signed in before using support chat.");
      }

      if (!message) {
        throw new HttpsError("invalid-argument", "A message is required.");
      }

      const role = await getRoleFromUserProfile(uid);
      const mergedContext = {
        ...context,
        role,
      };

      const relatedKnowledge = getSupportKnowledgeMatches(message).slice(0, 3);
      const matchedKnowledge = relatedKnowledge[0] || null;

      try {
        const answer = await requestOpenAiSupportReply({
          message,
          context: mergedContext,
          matchedKnowledge,
          relatedKnowledge,
        });

        return {
          success: true,
          answer,
          topic: matchedKnowledge?.topic || "general_chat",
          source: "ai-chat",
        };
      } catch (error) {
        logger.warn("OpenAI support reply failed.", error);

        return {
          success: true,
          answer:
            "I could not generate an AI reply right now. Please try again in a moment.",
          topic: "ai_error",
          source: "fallback",
        };
      }
    } catch (error) {
      rethrowKnownError(error, "Failed to generate a support reply.");
    }
  }
);
