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

const localRecommendations = createLocalCollectionStore("nakhla_recommendations", []);

const mapRecommendation = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

export const subscribeToRecommendations = (user, callback) => {
  if (!user) {
    callback([]);
    return () => {};
  }

  if (user.isDev) {
    return localRecommendations.notify(callback);
  }

  const recommendationsQuery = query(
    collection(db, "recommendations"),
    orderBy("condition", "asc")
  );
  return subscribeWithPolling(async () => {
    const snapshot = await getDocs(recommendationsQuery);
    callback(snapshot.docs.map(mapRecommendation));
  });
};

export const saveRecommendation = async (user, recommendation) => {
  const payload = {
    condition: recommendation.condition,
    title: recommendation.title,
    description: recommendation.description,
    priority: recommendation.priority || "Medium",
    updatedAt: new Date().toISOString(),
  };

  if (!user || user.isDev) {
    const id = recommendation.id || `rec-${Date.now()}`;
    return localRecommendations.upsert(id, payload);
  }

  if (recommendation.id) {
    await updateDoc(doc(db, "recommendations", recommendation.id), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
    return { id: recommendation.id, ...payload };
  }

  const created = await addDoc(collection(db, "recommendations"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: created.id, ...payload };
};

export const deleteRecommendation = async (user, recommendationId) => {
  if (!user || user.isDev) {
    localRecommendations.remove(recommendationId);
    return;
  }

  await deleteDoc(doc(db, "recommendations", recommendationId));
};
