import {
  onSnapshot,
  collection,
  orderBy,
  query,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config";
import { createLocalCollectionStore } from "./localFallback";

const defaultUsers = [
  {
    id: "u1",
    uid: "u1",
    email: "admin@nakhla.dev",
    role: "admin",
    active: true,
  },
  {
    id: "u2",
    uid: "u2",
    email: "operator@nakhla.dev",
    role: "operator",
    active: true,
  },
  {
    id: "u3",
    uid: "u3",
    email: "farmer@nakhla.dev",
    role: "farmer",
    active: true,
  },
];

const localUsers = createLocalCollectionStore("nakhla_users", defaultUsers);

const normalizeUser = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

export const subscribeToUsers = (user, callback) => {
  if (!user || user.isDev) {
    return localUsers.notify(callback);
  }

  const usersQuery = query(collection(db, "users"), orderBy("email", "asc"));
  return onSnapshot(usersQuery, (snapshot) => {
    callback(snapshot.docs.map(normalizeUser));
  });
};

export const updateUserRecord = async (user, userId, changes) => {
  if (!user || user.isDev) {
    const current = localUsers.readAll().find((item) => item.id === userId) || { id: userId };
    return localUsers.upsert(userId, { ...current, ...changes });
  }

  await updateDoc(doc(db, "users", userId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
};
