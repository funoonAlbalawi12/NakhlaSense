import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config";

export const recordActivity = async (user, event) => {
  if (!user || user.isDev) {
    return;
  }

  await addDoc(collection(db, "activity_logs"), {
    type: event.type,
    entity: event.entity || null,
    entityId: event.entityId || null,
    message: event.message || "",
    metadata: event.metadata || {},
    actorUid: user.uid,
    actorEmail: user.email || "",
    createdAt: serverTimestamp(),
  });
};

export const subscribeToActivityLogs = (user, callback) => {
  if (!user || user.isDev) {
    callback([]);
    return () => {};
  }

  const activityQuery = query(collection(db, "activity_logs"), orderBy("createdAt", "desc"));
  return onSnapshot(activityQuery, (snapshot) => {
    callback(
      snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          createdAt:
            typeof data.createdAt === "string"
              ? data.createdAt
              : data.createdAt?.toDate?.().toISOString?.() || new Date().toISOString(),
        };
      })
    );
  });
};
