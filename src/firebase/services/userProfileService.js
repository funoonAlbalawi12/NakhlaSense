import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config";
import { ROLES } from "../../auth/permissions";
import { auth } from "../config";

export const ensureUserProfile = async (
  firebaseUser,
  fallbackRole = ROLES.OPERATOR,
  metadata = {}
) => {
  if (!firebaseUser?.uid) {
    return null;
  }

  const userRef = doc(db, "users", firebaseUser.uid);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    const profile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || metadata.name || "",
      phone: metadata.phone || "",
      organization: metadata.organization || "",
      region: metadata.region || "",
      role: fallbackRole,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, profile);
    return profile;
  }

  const data = existing.data();
  const profile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || data.email || "",
    name: firebaseUser.displayName || data.name || metadata.name || "",
    phone: data.phone || metadata.phone || "",
    organization: data.organization || metadata.organization || "",
    region: data.region || metadata.region || "",
    role: data.role || fallbackRole || ROLES.OPERATOR,
    active: data.active ?? true,
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, profile, { merge: true });
  return { ...data, ...profile };
};

export const getUserProfile = async (user) => {
  if (!user?.uid) {
    return null;
  }

  const snapshot = await getDoc(doc(db, "users", user.uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const updateUserProfileSettings = async (user, changes = {}) => {
  if (!user?.uid) {
    throw new Error("No active user was found.");
  }

  const currentAuthUser = auth.currentUser;
  const nextName = String(changes.name || "").trim();
  const mergedProfile = {
    ...changes,
    updatedAt: serverTimestamp(),
  };

  if (currentAuthUser && currentAuthUser.uid === user.uid && nextName) {
    await updateProfile(currentAuthUser, { displayName: nextName });
  }

  await setDoc(doc(db, "users", user.uid), mergedProfile, { merge: true });
  return getUserProfile(user);
};
