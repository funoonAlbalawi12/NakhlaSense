import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config";
import { createLocalCollectionStore } from "./localFallback";
import { enrichAlert } from "../../utils/alerts";

const localAlerts = createLocalCollectionStore("nakhla_alerts", []);

const normalizeAlert = (snapshot) => {
  const data = snapshot.data();
  return enrichAlert({
    id: snapshot.id,
    ...data,
    time:
      typeof data.time === "string"
        ? data.time
        : data.time?.toDate?.().toISOString?.() || new Date().toISOString(),
  });
};

export const subscribeToAlerts = (user, callback) => {
  if (!user) {
    callback([]);
    return () => {};
  }

  if (user.isDev) {
    return localAlerts.notify(callback);
  }

  const alertsQuery = query(collection(db, "alerts"), orderBy("time", "desc"));
  return onSnapshot(
    alertsQuery,
    (snapshot) => {
      callback(snapshot.docs.map(normalizeAlert));
    },
    async () => {
      const snapshot = await getDocs(alertsQuery);
      callback(snapshot.docs.map(normalizeAlert));
    }
  );
};

export const createAlertRecord = async (user, alert) => {
  const enrichedAlert = enrichAlert(alert);
  const payload = {
    zone: enrichedAlert.zone,
    stationId: enrichedAlert.stationId || null,
    stationName: enrichedAlert.stationName || null,
    missionId: enrichedAlert.missionId || null,
    severity: enrichedAlert.severity,
    parameter: enrichedAlert.parameter,
    value: enrichedAlert.value,
    measuredValue: enrichedAlert.measuredValue ?? enrichedAlert.value ?? null,
    threshold: enrichedAlert.threshold,
    status: enrichedAlert.status || "Open",
    recommendations: enrichedAlert.recommendations || [],
    time: enrichedAlert.time || new Date().toISOString(),
    createdBy: user?.uid || null,
    category: enrichedAlert.category,
    targetRoles: enrichedAlert.targetRoles,
    title: enrichedAlert.title || null,
    cause: enrichedAlert.cause || null,
    nextStep: enrichedAlert.nextStep || null,
    technicalMessage: enrichedAlert.technicalMessage,
    farmerMessage: enrichedAlert.farmerMessage,
  };

  if (user?.isDev || !user) {
    const id = alert.id || `alert-${Date.now()}`;
    return localAlerts.upsert(id, payload);
  }

  const created = await addDoc(collection(db, "alerts"), {
    ...payload,
    time: serverTimestamp(),
  });

  return { id: created.id, ...payload };
};

export const updateAlertStatus = async (user, alertId, status) => {
  if (user?.isDev || !user) {
    return localAlerts.upsert(alertId, {
      ...localAlerts.readAll().find((item) => item.id === alertId),
      status,
    });
  }

  await updateDoc(doc(db, "alerts", alertId), {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: user?.uid || null,
  });
};
