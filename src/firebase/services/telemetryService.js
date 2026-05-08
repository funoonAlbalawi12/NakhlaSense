import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config";

export const subscribeToTelemetry = (user, callback, maxItems = 20) => {
  if (user?.isDev || !user) {
    callback([]);
    return () => {};
  }

  const telemetryQuery = query(
    collection(db, "telemetry"),
    orderBy("capturedAt", "desc"),
    limit(maxItems)
  );

  return onSnapshot(telemetryQuery, (snapshot) => {
    callback(
      snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }))
    );
  });
};

export const saveTelemetrySnapshot = async (user, snapshot) => {
  if (user?.isDev || !user) {
    return;
  }

  await addDoc(collection(db, "telemetry"), {
    ...snapshot,
    capturedAt: serverTimestamp(),
    capturedBy: user?.uid || null,
  });
};
