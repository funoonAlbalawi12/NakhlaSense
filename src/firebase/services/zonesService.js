import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config";
import { subscribeWithPolling } from "./firestorePolling";
import { createLocalCollectionStore } from "./localFallback";

const localZones = createLocalCollectionStore("nakhla_zones", []);

const mapZoneDoc = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

export const subscribeToZones = (user, callback) => {
  if (!user) {
    callback([]);
    return () => {};
  }

  if (user.isDev) {
    return localZones.notify(callback);
  }

  const zonesQuery = query(collection(db, "zones"), orderBy("updatedAt", "desc"));
  return subscribeWithPolling(async () => {
    const snapshot = await getDocs(zonesQuery);
    callback(snapshot.docs.map(mapZoneDoc));
  });
};

export const saveZone = async (user, zone) => {
  const payload = {
    name: zone.name,
    assignee: zone.assignee || "Unassigned",
    purpose: zone.purpose,
    notes: zone.notes || "",
    points: zone.points,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.email || "unknown",
  };

  if (user?.isDev || !user) {
    const id = zone.id || `zone-${Date.now()}`;
    return localZones.upsert(id, payload);
  }

  if (zone.id) {
    await updateDoc(doc(db, "zones", zone.id), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
    return { id: zone.id, ...payload };
  }

  const created = await addDoc(collection(db, "zones"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: user?.uid || null,
  });

  return { id: created.id, ...payload };
};

export const deleteZoneRecord = async (user, zoneId) => {
  if (user?.isDev || !user) {
    localZones.remove(zoneId);
    return;
  }

  await deleteDoc(doc(db, "zones", zoneId));
};
