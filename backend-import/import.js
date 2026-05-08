const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

const REQUIRED_HEADERS = [
  "PacketID",
  "ImageName",
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
  "DroneGPSValid"
];

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function toBoolean(value) {
  return String(value).trim() === "1";
}

function cleanImage(name) {
  const v = String(name || "").trim();
  return v === "NO_IMAGE" || v === "" ? null : v;
}

function detectSeparator(filePath) {
  const firstChunk = fs.readFileSync(filePath, "utf8").split(/\r?\n/)[0] || "";

  const commaCount = (firstChunk.match(/,/g) || []).length;
  const semicolonCount = (firstChunk.match(/;/g) || []).length;

  if (semicolonCount > commaCount) {
    return ";";
  }

  return ",";
}

const filePath = "data.csv";
const separator = detectSeparator(filePath);

console.log("Using separator:", JSON.stringify(separator));

let headersChecked = false;
let rejected = false;

fs.createReadStream(filePath)
  .pipe(csv({ separator }))
  .on("data", async (row) => {
    try {
      if (rejected) return;

      if (!headersChecked) {
        const fileHeaders = Object.keys(row).map((h) => h.trim());

        console.log("Detected headers:", fileHeaders);

        const missing = REQUIRED_HEADERS.filter(
          (header) => !fileHeaders.includes(header)
        );

        if (missing.length > 0) {
          console.error("Missing headers:", missing);
          console.error("File rejected!");
          rejected = true;
          process.exit(1);
        }

        console.log("Headers validated successfully");
        headersChecked = true;
      }

      const packetId = Number(row.PacketID);

      // Skip corrupted or invalid rows
      if (!row.PacketID || Number.isNaN(packetId)) {
        console.log("Skipping invalid row:", row);
        return;
      }

      const doc = {
        packetId,
        imageName: cleanImage(row.ImageName),

        temperatureC: Number(row.TempC),
        relativeHumidity: Number(row.RH),
        absoluteHumidity: Number(row.AbsHumidity),
        co2ppm: Number(row.CO2ppm),

        groundDate: row.GroundDate,
        groundTime: row.GroundTime,
        groundLat: Number(row.GroundLat),
        groundLon: Number(row.GroundLon),
        groundGPSValid: toBoolean(row.GroundGPSValid),

        droneDate: row.DroneDate,
        droneTime: row.DroneTime,
        droneLat: Number(row.DroneLat),
        droneLon: Number(row.DroneLon),
        droneGPSValid: toBoolean(row.DroneGPSValid),

        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db
        .collection("sensor_readings")
        .doc(String(packetId))
        .set(doc, { merge: true });

      console.log("Inserted:", packetId);
    } catch (err) {
      console.error("Error inserting row:", err.message);
    }
  })
  .on("end", () => {
    if (!rejected) {
      console.log("CSV import completed");
    }
  })
  .on("error", (err) => {
    console.error("Error reading CSV file:", err.message);
  });