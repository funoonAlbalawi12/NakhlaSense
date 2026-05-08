import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config";
import { subscribeWithPolling } from "./firestorePolling";
import { createLocalCollectionStore } from "./localFallback";

const localAnalyses = createLocalCollectionStore("nakhla_analyses", []);

const normalizeAnalysis = (snapshot) => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : data.createdAt?.toDate?.().toISOString?.() || new Date().toISOString(),
  };
};

export const subscribeToAnalyses = (user, callback) => {
  if (!user) {
    callback([]);
    return () => {};
  }

  if (user.isDev) {
    return localAnalyses.notify(callback);
  }

  const analysesQuery = query(collection(db, "analyses"), orderBy("createdAt", "desc"));
  return subscribeWithPolling(async () => {
    const snapshot = await getDocs(analysesQuery);
    callback(snapshot.docs.map(normalizeAnalysis));
  });
};

export const createAnalysisRecord = async (user, analysis) => {
  const payload = {
    zoneId: analysis.zoneId || "",
    zoneName: analysis.zoneName || "Unassigned",
    stationId: analysis.stationId || "",
    stationName: analysis.stationName || "",
    missionId: analysis.missionId || "",
    fileName: analysis.fileName,
    status: analysis.status,
    severity: analysis.severity,
    confidence: analysis.confidence,
    imageUrl: analysis.imageUrl || "",
    notes: analysis.notes || "",
    detectedCondition: analysis.detectedCondition || analysis.status,
    explanation: analysis.explanation || "",
    nextStep: analysis.nextStep || "",
    symptomAnswers: analysis.symptomAnswers || {},
    selectedSymptoms: analysis.selectedSymptoms || [],
    createdBy: user?.uid || null,
    createdAt: analysis.createdAt || new Date().toISOString(),
  };

  if (!user || user.isDev) {
    const id = analysis.id || `analysis-${Date.now()}`;
    return localAnalyses.upsert(id, payload);
  }

  const created = await addDoc(collection(db, "analyses"), {
    ...payload,
    createdAt: serverTimestamp(),
  });

  return { id: created.id, ...payload };
};
