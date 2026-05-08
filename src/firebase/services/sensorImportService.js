import { read, utils } from "xlsx";
import { httpsCallable } from "firebase/functions";
import { functions } from "../config";

const REQUIRED_IMPORT_HEADERS = [
  "PacketID",
  "GroundDate",
  "GroundTime",
  "GroundLat",
  "GroundLon",
  "TempC",
  "RH",
  "AbsHumidity",
  "CO2ppm",
  "GroundGPSValid",
  "DroneDate",
  "DroneTime",
  "DroneLat",
  "DroneLon",
  "DroneGPSValid",
];

function cleanMessage(message = "") {
  return String(message).replace(/^functions\/[a-z-]+:\s*/i, "").trim();
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

const FRIENDLY_HEADER_LABELS = {
  PacketID: "packet ID",
  ImageName: "image name",
  TempC: "temperature",
  Temperature: "temperature",
  RH: "humidity",
  AbsHumidity: "absolute humidity",
  CO2ppm: "CO2",
  GroundDate: "ground date",
  GroundTime: "ground time",
  GroundLat: "ground latitude",
  GroundLon: "ground longitude",
  GroundGPSValid: "ground GPS status",
  DroneDate: "drone date",
  DroneTime: "drone time",
  DroneLat: "drone latitude",
  DroneLon: "drone longitude",
  DroneGPSValid: "drone GPS status",
};

const HEADER_ALIASES = {
  TempC: ["TempC", "Temperature"],
};

function formatFriendlyList(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getFriendlyMissingColumns(message) {
  const match = String(message).match(/Missing required (?:columns|headers):\s*(.+?)\.?$/i);

  if (!match) return [];

  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => FRIENDLY_HEADER_LABELS[item] || item);
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
  return values.map((value) => String(value || "").trim().replace(/^\uFEFF/, ""));
}

function findMissingHeaders(headers = []) {
  const normalizedHeaders = headers.map((header) => String(header || "").trim());

  return REQUIRED_IMPORT_HEADERS.filter((header) => {
    const aliases = HEADER_ALIASES[header] || [header];
    return !aliases.some((alias) => normalizedHeaders.includes(alias));
  });
}

function buildMissingHeadersError(missingHeaders) {
  const friendlyHeaders = missingHeaders.map((header) => FRIENDLY_HEADER_LABELS[header] || header);
  return `Missing required headers: ${formatFriendlyList(friendlyHeaders)}. Download the template if you need the correct format.`;
}

function validateHeaderRow(headers) {
  const missingHeaders = findMissingHeaders(headers);

  if (missingHeaders.length) {
    throw new Error(buildMissingHeadersError(missingHeaders));
  }
}

function mapImportError(error) {
  const code = String(error?.code || "");
  const rawMessage = cleanMessage(error?.message || "");
  const normalizedMessage = rawMessage.toLowerCase();

  if (code.includes("unauthenticated")) {
    return "Please sign in again, then upload your file.";
  }

  if (code.includes("permission-denied")) {
    if (includesAny(normalizedMessage, ["only operators and admins", "cannot import sensor data"])) {
      return "Your account cannot upload farm data here.";
    }

    return "You do not have access to upload data here.";
  }

  if (includesAny(normalizedMessage, ["missing required columns", "headers"])) {
    const missingColumns = getFriendlyMissingColumns(rawMessage);

    if (missingColumns.length) {
      return `Missing required headers: ${formatFriendlyList(missingColumns)}. Download the template if you need the correct format.`;
    }

    return "Invalid file format. Your upload is missing required headers. Download the template if you need the correct format.";
  }

  if (includesAny(normalizedMessage, ["empty"])) {
    return "This file is empty. Please choose a CSV or XLSX file with farm data in it.";
  }

  if (includesAny(normalizedMessage, ["city"])) {
    return "Choose the city for this uploaded data before importing.";
  }

  if (includesAny(normalizedMessage, ["no valid sensor rows"])) {
    return "We could not find usable farm readings in this file. Please check the file and try again.";
  }

  if (includesAny(normalizedMessage, ["csv", "xlsx", "spreadsheet"])) {
    return "Please upload a CSV or XLSX file.";
  }

  if (code.includes("resource-exhausted")) {
    return "This file is too large. Please upload a smaller CSV or XLSX file.";
  }

  if (code.includes("invalid-argument")) {
    return rawMessage || "We could not read this file. Please check it and try again.";
  }

  if (code.includes("already-exists") || includesAny(normalizedMessage, ["already uploaded", "different file"])) {
    return "This mission file was already uploaded before. Please choose a different file.";
  }

  return "We could not upload this file right now. Please try again.";
}

async function readSpreadsheetData(selectedFile) {
  const buffer = await selectedFile.arrayBuffer();
  const workbook = read(buffer, {
    type: "array",
    cellDates: false,
    raw: false,
  });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("This file is empty. Please choose a CSV or XLSX file with farm data in it.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const headerRows = utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  const headers = Array.isArray(headerRows[0]) ? headerRows[0] : [];
  validateHeaderRow(headers);
  const csvContent = utils.sheet_to_csv(worksheet, {
    blankrows: false,
    forceQuotes: false,
  });
  const rows = utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    throw new Error("This file is empty. Please choose a CSV or XLSX file with farm data in it.");
  }

  return {
    rows,
    csvContent,
  };
}

async function readCsvContent(selectedFile) {
  const content = await selectedFile.text();
  const normalizedContent = String(content || "").replace(/^\uFEFF/, "").trim();

  if (!normalizedContent) {
    throw new Error("This file is empty. Please choose a CSV or XLSX file with farm data in it.");
  }

  const separator = detectSeparator(normalizedContent);
  const firstLine = normalizedContent.split(/\r?\n/).find((line) => String(line || "").trim());

  if (!firstLine) {
    throw new Error("This file is empty. Please choose a CSV or XLSX file with farm data in it.");
  }

  validateHeaderRow(parseDelimitedLine(firstLine, separator));
  return content;
}

export async function importSensorReadingsFile(file, city = "", context = {}) {
  const selectedFile = file || null;
  const selectedCity = String(city || "").trim();

  if (!selectedFile) {
    throw new Error("Choose a CSV or XLSX data file first.");
  }

  const fileName = String(selectedFile.name || "").trim();
  const lowerFileName = fileName.toLowerCase();
  const isCsv = /\.csv$/i.test(fileName) || /csv/i.test(selectedFile.type || "");
  const isXlsx =
    /\.xlsx$/i.test(fileName) || /spreadsheetml\.sheet/i.test(selectedFile.type || "");

  if (!isCsv && !isXlsx) {
    throw new Error("Please upload a CSV or XLSX file.");
  }

  if (selectedFile.size > 1024 * 1024) {
    throw new Error("Please keep the CSV or XLSX file under 1 MB.");
  }

  const importCsv = httpsCallable(functions, "importSensorReadingsCsv");

  try {
    const payload = {
      fileName,
      city: selectedCity,
      stationId: String(context.stationId || "").trim(),
      stationName: String(context.stationName || "").trim(),
      stationLocation: String(context.stationLocation || "").trim(),
      zoneName: String(context.zoneName || "").trim(),
      missionId: String(context.missionId || "").trim(),
      missionDate: String(context.missionDate || "").trim(),
    };

    if (isXlsx && lowerFileName.endsWith(".xlsx")) {
      const spreadsheet = await readSpreadsheetData(selectedFile);
      payload.rows = spreadsheet.rows;
      payload.content = spreadsheet.csvContent;
    } else {
      payload.content = await readCsvContent(selectedFile);
    }

    const result = await importCsv(payload);

    return result.data;
  } catch (error) {
    throw new Error(error instanceof Error ? mapImportError(error) : "We could not upload this file right now. Please try again.");
  }
}
