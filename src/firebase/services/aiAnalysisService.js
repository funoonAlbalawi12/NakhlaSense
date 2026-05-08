import { httpsCallable } from "firebase/functions";
import { functions } from "../config";

const OFFLINE_SCAN_QUESTIONS = [
  {
    id: "visible_sign",
    question: "What symptom is most visible on the palm?",
    choices: [
      { id: "black_spots", label: "Black spots or small raised marks" },
      { id: "yellow_leaves", label: "Yellow or pale leaves" },
      { id: "dry_tips", label: "Dry tips or brown leaf edges" },
    ],
  },
  {
    id: "affected_area",
    question: "Which part looks most affected?",
    choices: [
      { id: "old_fronds", label: "Older fronds" },
      { id: "new_growth", label: "New growth" },
      { id: "whole_palm", label: "Most of the palm" },
    ],
  },
];

function cleanMessage(message = "") {
  return String(message).replace(/^functions\/[a-z-]+:\s*/i, "").trim();
}

function shouldUseOfflineFallback(error) {
  const code = String(error?.code || "");
  return (
    code.includes("internal") ||
    code.includes("unavailable") ||
    code.includes("failed-precondition")
  );
}

function buildOfflineScanResponse() {
  return {
    cannotRead: false,
    reason: "",
    suspectedDiseases: [
      "Graphiola leaf spot (False Smut)",
      "Potassium deficiency",
      "Heat or drought stress",
    ],
    initialObservation:
      "Live AI is unavailable right now, so this fallback asks a few field questions to estimate the palm condition.",
    questions: OFFLINE_SCAN_QUESTIONS,
  };
}

function pickOfflineDiagnosis(answers = {}) {
  const visible = String(answers.visible_sign || "").trim();
  const area = String(answers.affected_area || "").trim();

  if (visible === "black_spots") {
    return {
      status: "Warning",
      severity: "Medium",
      confidence: 68,
      detectedCondition: "Graphiola leaf spot (False Smut)",
      explanation:
        "The answers match a fungal leaf-spot pattern often seen as dark raised marks on palm fronds.",
      summary:
        "Fallback diagnosis suggests Graphiola leaf spot based on the visible symptoms you selected.",
      nextStep:
        "Inspect nearby fronds, remove badly affected material, and schedule a fungicide review if symptoms spread.",
      recommendedActions: [
        "Remove the worst affected fronds if the infection is concentrated.",
        "Improve airflow around the palm and avoid wetting foliage late in the day.",
        "Monitor nearby palms for similar black spots this week.",
      ],
      farmerReport: {
        isHealthy: false,
        cannotRead: false,
        diseaseName: "Graphiola leaf spot (False Smut)",
        plainExplanation:
          "Your answers suggest a fungal leaf-spot problem. It is not usually instant palm death, but it should be treated before it spreads.",
        severity: "medium",
        spreadRisk: "medium",
        symptoms: [
          {
            text: "Dark spots or raised black marks on the fronds",
            detail: "These signs are commonly linked to Graphiola leaf spot on date palms.",
          },
        ],
        steps: [
          {
            when: "Today",
            action: "Check all affected fronds closely",
            detail: "Confirm whether the spots are isolated or spreading across multiple leaves.",
          },
          {
            when: "This week",
            action: "Remove heavily affected plant material",
            detail: "This helps reduce the fungal load before the next humid period.",
          },
        ],
        prevention: [
          "Improve airflow around the canopy.",
          "Avoid prolonged moisture on the leaves late in the day.",
        ],
      },
    };
  }

  if (visible === "yellow_leaves") {
    return {
      status: "Warning",
      severity: area === "whole_palm" ? "High" : "Medium",
      confidence: 66,
      detectedCondition: "Possible potassium deficiency",
      explanation:
        "Yellowing that is strongest on older fronds often points to a nutrient imbalance, especially potassium deficiency.",
      summary:
        "Fallback diagnosis suggests a likely nutrient deficiency pattern from the selected symptoms.",
      nextStep:
        "Review fertilization records and inspect whether yellowing is spreading from older fronds inward.",
      recommendedActions: [
        "Check the last potassium application and irrigation schedule.",
        "Inspect older fronds first for worsening yellowing or necrotic edges.",
        "Plan a nutrient review before the next field round.",
      ],
      farmerReport: {
        isHealthy: false,
        cannotRead: false,
        diseaseName: "Possible potassium deficiency",
        plainExplanation:
          "Your answers look more like a nutrition issue than a fast-spreading disease. The palm still needs attention soon.",
        severity: area === "whole_palm" ? "high" : "medium",
        spreadRisk: "low",
        symptoms: [
          {
            text: "Yellow or pale fronds",
            detail: "Older leaves are often affected first in potassium deficiency cases.",
          },
        ],
        steps: [
          {
            when: "Today",
            action: "Review fertilizer history",
            detail: "Confirm whether potassium feeding has been missed or delayed.",
          },
          {
            when: "Next visit",
            action: "Compare old and new fronds",
            detail: "This helps confirm whether the pattern is nutritional rather than infectious.",
          },
        ],
        prevention: [
          "Keep fertilization consistent across the block.",
          "Avoid uneven irrigation that can worsen nutrient uptake.",
        ],
      },
    };
  }

  return {
    status: "Warning",
    severity: area === "whole_palm" ? "High" : "Medium",
    confidence: 61,
    detectedCondition: "Possible heat or drought stress",
    explanation:
      "Dry tips, brown edges, and whole-palm decline often line up with irrigation stress or heat exposure.",
    summary:
      "Fallback diagnosis suggests a stress-related condition rather than a clearly identifiable disease.",
    nextStep:
      "Check irrigation timing, soil moisture, and whether nearby palms show the same drying pattern.",
    recommendedActions: [
      "Inspect irrigation coverage around the palm root zone.",
      "Check whether damage is worse on the sun-facing side.",
      "Monitor the palm for worsening browning over the next few days.",
    ],
    farmerReport: {
      isHealthy: false,
      cannotRead: false,
      diseaseName: "Possible heat or drought stress",
      plainExplanation:
        "Your answers point to stress from water or heat rather than a specific confirmed disease.",
      severity: area === "whole_palm" ? "high" : "medium",
      spreadRisk: "low",
      symptoms: [
        {
          text: "Dry or brown leaf edges",
          detail: "This often appears when the palm is under irrigation or heat stress.",
        },
      ],
      steps: [
        {
          when: "Today",
          action: "Check irrigation performance",
          detail: "Make sure water is reaching the root zone evenly.",
        },
        {
          when: "This week",
          action: "Watch for rapid worsening",
          detail: "If decline spreads fast, schedule a closer agronomy inspection.",
        },
      ],
      prevention: [
        "Keep irrigation consistent during hot periods.",
        "Inspect palms after extreme heat days.",
      ],
    },
  };
}

function buildOfflineDiagnosisResponse(answers = {}) {
  const fallback = pickOfflineDiagnosis(answers);

  return {
    ...fallback,
    visibleContent:
      "Offline fallback used because the live AI backend is currently unavailable.",
    visualEvidence:
      "This result was estimated from the field symptom answers instead of the cloud vision model.",
    imageCategory: "offline_fallback",
    analysisAccepted: false,
    rejectionReason:
      "Live AI analysis was unavailable, so the app switched to a built-in fallback diagnosis.",
    alternativeConditions: [],
    specificity: "broad",
    needsAlert: fallback.severity === "High",
    model: "offline-fallback",
  };
}

function mapAiError(error) {
  const code = String(error?.code || "");
  const rawMessage = cleanMessage(error?.message || "");
  const normalizedMessage = rawMessage.toLowerCase();

  if (code.includes("unauthenticated")) {
    return "Please sign in again before running image analysis.";
  }

  if (code.includes("permission-denied")) {
    return rawMessage || "Your account cannot run AI image analysis.";
  }

  if (code.includes("resource-exhausted")) {
    return rawMessage || "Please use a smaller image.";
  }

  if (code.includes("invalid-argument")) {
    return rawMessage || "Please upload a valid crop image.";
  }

  if (code.includes("failed-precondition")) {
    return rawMessage || "AI analysis is not configured yet.";
  }

  if (code.includes("internal")) {
    if (
      normalizedMessage.includes("gemini_api_key") ||
      normalizedMessage.includes("google_api_key") ||
      normalizedMessage.includes("anthropic_api_key")
    ) {
      return "AI analysis is not configured yet. Add the Gemini or Google API key to Cloud Functions and deploy again.";
    }

    if (normalizedMessage.includes("empty analysis") || normalizedMessage.includes("invalid analysis format")) {
      return "The AI service returned an incomplete analysis. Please try again in a moment.";
    }

    if (normalizedMessage.includes("anthropic") || normalizedMessage.includes("gemini")) {
      return "The AI provider failed while analyzing this image. Please try again later.";
    }

    return "The backend analysis service failed. Deploy the latest functions and verify the AI configuration.";
  }

  if (code.includes("unavailable")) {
    return "The analysis service is currently unavailable. Please try again after the backend finishes starting.";
  }

  return rawMessage || "We could not analyze this image right now.";
}

function normalizeAnalysisResponse(payload) {
  const analysis = payload?.data?.analysis;

  if (!analysis || typeof analysis !== "object") {
    throw new Error(
      "The backend returned an invalid analysis response. Deploy the latest Cloud Functions and try again."
    );
  }

  return {
    status: String(analysis.status || "Warning").trim(),
    severity: String(analysis.severity || "Medium").trim(),
    confidence: Number.isFinite(Number(analysis.confidence)) ? Number(analysis.confidence) : 0,
    visibleContent: String(analysis.visibleContent || "").trim(),
    visualEvidence: String(analysis.visualEvidence || analysis.visibleContent || "").trim(),
    imageCategory: String(analysis.imageCategory || "").trim(),
    analysisAccepted: Boolean(analysis.analysisAccepted),
    rejectionReason: String(analysis.rejectionReason || "").trim(),
    detectedCondition: String(analysis.detectedCondition || analysis.status || "Palm condition review").trim(),
    alternativeConditions: Array.isArray(analysis.alternativeConditions)
      ? analysis.alternativeConditions.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
    specificity: String(analysis.specificity || "").trim(),
    explanation: String(analysis.explanation || "").trim(),
    summary: String(analysis.summary || "").trim(),
    recommendedActions: Array.isArray(analysis.recommendedActions)
      ? analysis.recommendedActions.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
    nextStep: String(analysis.nextStep || "").trim(),
    needsAlert: Boolean(analysis.needsAlert),
    model: String(analysis.model || "").trim(),
    farmerReport:
      analysis.farmerReport && typeof analysis.farmerReport === "object"
        ? {
            isHealthy: Boolean(analysis.farmerReport.isHealthy),
            cannotRead: Boolean(analysis.farmerReport.cannotRead),
            diseaseName: String(analysis.farmerReport.diseaseName || "").trim(),
            plainExplanation: String(analysis.farmerReport.plainExplanation || "").trim(),
            severity: String(analysis.farmerReport.severity || "").trim(),
            spreadRisk: String(analysis.farmerReport.spreadRisk || "").trim(),
            symptoms: Array.isArray(analysis.farmerReport.symptoms)
              ? analysis.farmerReport.symptoms
                  .map((item) => ({
                    text: String(item?.text || "").trim(),
                    detail: String(item?.detail || "").trim(),
                  }))
                  .filter((item) => item.text || item.detail)
              : [],
            steps: Array.isArray(analysis.farmerReport.steps)
              ? analysis.farmerReport.steps
                  .map((item) => ({
                    when: String(item?.when || "").trim(),
                    action: String(item?.action || "").trim(),
                    detail: String(item?.detail || "").trim(),
                  }))
                  .filter((item) => item.when || item.action || item.detail)
              : [],
            prevention: Array.isArray(analysis.farmerReport.prevention)
              ? analysis.farmerReport.prevention.map((item) => String(item || "").trim()).filter(Boolean)
              : [],
          }
        : null,
  };
}

function normalizeScanResponse(payload) {
  const scan = payload?.data?.scan;

  if (!scan || typeof scan !== "object") {
    throw new Error(
      "The backend returned an invalid scan response. Deploy the latest Cloud Functions and try again."
    );
  }

  return {
    cannotRead: Boolean(scan.cannotRead),
    reason: String(scan.reason || "").trim(),
    suspectedDiseases: Array.isArray(scan.suspectedDiseases)
      ? scan.suspectedDiseases.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
    initialObservation: String(scan.initialObservation || "").trim(),
    questions: Array.isArray(scan.questions)
      ? scan.questions
          .map((question) => ({
            id: String(question?.id || "").trim(),
            question: String(question?.question || "").trim(),
            choices: Array.isArray(question?.choices)
              ? question.choices
                  .map((choice) => ({
                    id: String(choice?.id || "").trim(),
                    label: String(choice?.label || "").trim(),
                  }))
                  .filter((choice) => choice.id && choice.label)
              : [],
          }))
          .filter((question) => question.id && question.question && question.choices.length)
      : [],
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be processed."));
    image.src = dataUrl;
  });
}

export function readImageFileAsDataUrl(file) {
  return readFileAsDataUrl(file);
}

async function optimizeImageDataUrl(originalDataUrl) {
  const image = await loadImage(originalDataUrl);
  const canvas = document.createElement("canvas");
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image processing is not available in this browser.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export async function analyzeCropImage(user, { file, imageDataUrl, zoneName, symptoms = {} }) {
  if (!file && !imageDataUrl) {
    throw new Error("Please choose an image first.");
  }

  if (user?.isDev || !user) {
    return {
      status: "Warning",
      severity: "Medium",
      confidence: 78,
      visibleContent: "Demo mode cannot verify the real visible content of this image.",
      imageCategory: "farm_scene_unclear",
      analysisAccepted: false,
      rejectionReason: "Live image relevance checking needs a signed-in real account.",
      detectedCondition: "Image relevance could not be confirmed",
      alternativeConditions: [],
      specificity: "broad",
      visualEvidence: "Demo mode cannot inspect the real visual evidence in this image.",
      explanation:
        "Demo mode cannot reliably confirm whether the uploaded image actually shows a palm tree, so it does not produce a trusted palm diagnosis.",
      summary: "The image was not analyzed for palm condition because live relevance checking is unavailable in demo mode.",
      recommendedActions: [
        "Sign in with a real account to run live AI image analysis.",
        "Upload a clear image of the palm leaves, trunk, or crown.",
      ],
      nextStep: "Sign in and upload a clear palm image to run a real analysis.",
      selectedSymptoms: symptoms,
      needsAlert: false,
      model: "demo",
    };
  }

  const preparedImageDataUrl = await optimizeImageDataUrl(
    imageDataUrl || (await readFileAsDataUrl(file))
  );
  const callable = httpsCallable(functions, "analyzeCropImage");

  try {
    const result = await callable({
      fileName: String(file.name || "crop-image.jpg").trim(),
      zoneName: String(zoneName || "").trim(),
      symptoms,
      imageDataUrl: preparedImageDataUrl,
    });

    return normalizeAnalysisResponse(result);
  } catch (error) {
    throw new Error(mapAiError(error));
  }
}

export async function scanCropImageQuestions(user, { file, imageDataUrl, zoneName }) {
  if (!file && !imageDataUrl) {
    throw new Error("Please choose an image first.");
  }

  if (user?.isDev || !user) {
    return {
      cannotRead: false,
      suspectedDiseases: ["Graphiola leaf spot (False Smut)", "Potassium deficiency"],
      initialObservation: "Demo mode cannot inspect the real image, so these are only sample questions.",
      questions: [
        {
          id: "q1",
          question: "What do you see most?",
          choices: [
            { id: "a", label: "Black spots" },
            { id: "b", label: "Yellow leaves" },
            { id: "c", label: "Dry leaves" },
          ],
        },
        {
          id: "q2",
          question: "Where is it worst?",
          choices: [
            { id: "a", label: "Old leaves" },
            { id: "b", label: "New leaves" },
            { id: "c", label: "Whole palm" },
          ],
        },
      ],
    };
  }

  const preparedImageDataUrl = await optimizeImageDataUrl(
    imageDataUrl || (await readFileAsDataUrl(file))
  );
  const callable = httpsCallable(functions, "analyzeCropImage");

  try {
    const result = await callable({
      mode: "scan",
      fileName: String(file?.name || "crop-image.jpg").trim(),
      zoneName: String(zoneName || "").trim(),
      imageDataUrl: preparedImageDataUrl,
    });

    return normalizeScanResponse(result);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return buildOfflineScanResponse();
    }

    throw new Error(mapAiError(error));
  }
}

export async function diagnoseCropImage(user, { file, imageDataUrl, zoneName, questions = [], answers = {} }) {
  if (!file && !imageDataUrl) {
    throw new Error("Please choose an image first.");
  }

  if (user?.isDev || !user) {
    return {
      status: "Warning",
      severity: "Medium",
      confidence: 78,
      visibleContent: "Demo mode cannot verify the real visible content of this image.",
      imageCategory: "farm_scene_unclear",
      analysisAccepted: false,
      rejectionReason: "Live image diagnosis needs a signed-in real account.",
      detectedCondition: "Demo diagnosis only",
      alternativeConditions: [],
      specificity: "broad",
      visualEvidence: "Demo mode cannot inspect the real visual evidence in this image.",
      explanation: "Demo mode cannot confirm a real palm diagnosis from the uploaded image.",
      summary: "Demo mode returned a sample diagnosis path only.",
      recommendedActions: ["Sign in with a real account to run a live diagnosis."],
      nextStep: "Sign in and upload a clear palm image to run a real diagnosis.",
      needsAlert: false,
      model: "demo",
      farmerReport: {
        isHealthy: false,
        cannotRead: false,
        diseaseName: "Graphiola leaf spot (False Smut)",
        plainExplanation: "This is a sample answer in demo mode. Sign in to get a real diagnosis.",
        severity: "medium",
        spreadRisk: "medium",
        symptoms: [
          { text: "Sample symptom", detail: "This sample text only shows the layout." },
        ],
        steps: [
          { when: "Today", action: "Sign in first", detail: "Use a real account to run a live diagnosis." },
        ],
        prevention: ["Upload a clear real palm photo after signing in."],
      },
    };
  }

  const preparedImageDataUrl = await optimizeImageDataUrl(
    imageDataUrl || (await readFileAsDataUrl(file))
  );
  const callable = httpsCallable(functions, "analyzeCropImage");

  try {
    const result = await callable({
      mode: "diagnose",
      fileName: String(file?.name || "crop-image.jpg").trim(),
      zoneName: String(zoneName || "").trim(),
      imageDataUrl: preparedImageDataUrl,
      questions,
      answers,
    });

    return normalizeAnalysisResponse(result);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return buildOfflineDiagnosisResponse(answers);
    }

    throw new Error(mapAiError(error));
  }
}
