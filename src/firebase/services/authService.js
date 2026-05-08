import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../config";
import { ensureUserProfile } from "./userProfileService";

export const PENDING_SIGNUP_KEY = "nakhla_pending_signup";
export const PENDING_OTP_KEY = "nakhla_pending_otp";
const SMTP_CONFIG_ERROR = "smtp_user, smtp_pass, and smtp_from must be configured in cloud functions.";

function cleanMessage(message = "") {
  return String(message).replace(/^functions\/[a-z-]+:\s*/i, "").trim();
}

function isMissingSmtpConfiguration(error) {
  const code = String(error?.code || "");
  const rawMessage = cleanMessage(error?.message || "").toLowerCase();
  return code.includes("failed-precondition") && rawMessage.includes(SMTP_CONFIG_ERROR);
}

function mapFunctionError(error, fallbackMessage) {
  const code = String(error?.code || "");
  const rawMessage = cleanMessage(error?.message || "");

  if (isMissingSmtpConfiguration(error)) {
    return "OTP email is not configured yet. Signed in with password only for now.";
  }

  if (code.includes("resource-exhausted")) {
    return rawMessage || "Please wait before requesting another OTP.";
  }

  if (code.includes("deadline-exceeded")) {
    return rawMessage || "This OTP expired. Request a new code and try again.";
  }

  if (code.includes("permission-denied")) {
    return rawMessage || "Invalid OTP or unauthorized access.";
  }

  if (code.includes("not-found")) {
    return rawMessage || "No active OTP was found for this email.";
  }

  if (code.includes("invalid-argument")) {
    return rawMessage || fallbackMessage;
  }

  return rawMessage || fallbackMessage;
}

export async function signUpWithPassword(form) {
  const email = String(form?.email || "").trim().toLowerCase();
  const password = String(form?.password || "");
  const displayName = String(form?.name || "").trim();
  const pendingSignup = {
    role: String(form?.role || "").trim().toLowerCase(),
    name: displayName,
    phone: String(form?.phone || "").trim(),
    organization: String(form?.organization || "").trim(),
    region: String(form?.region || "").trim(),
  };

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  try {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pendingSignup));

    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }

    await ensureUserProfile(credential.user, pendingSignup.role, pendingSignup);

    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
    return credential.user;
  } catch (error) {
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);

    if (error?.code?.startsWith?.("auth/")) {
      if (error.code === "auth/email-already-in-use") {
        throw new Error("This email already has an account.");
      }

      if (error.code === "auth/weak-password") {
        throw new Error("Use at least 6 characters for your password.");
      }

      throw new Error("Failed to create account.");
    }

    throw new Error(mapFunctionError(error, "Failed to create account."));
  }
}

export async function beginTwoStepSignIn(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required.");
  }

  try {
    sessionStorage.setItem(PENDING_OTP_KEY, normalizedEmail);
    await signInWithEmailAndPassword(auth, normalizedEmail, password);

    const sendOtp = httpsCallable(functions, "sendOtp");
    try {
      await sendOtp({ email: normalizedEmail });
    } catch (error) {
      if (isMissingSmtpConfiguration(error)) {
        sessionStorage.removeItem(PENDING_OTP_KEY);
        return {
          success: true,
          requiresOtp: false,
          message: mapFunctionError(error, "Signed in successfully."),
        };
      }

      throw error;
    }

    return { success: true, requiresOtp: true };
  } catch (error) {
    sessionStorage.removeItem(PENDING_OTP_KEY);

    if (error?.code?.startsWith?.("auth/")) {
      throw new Error("Invalid email or password.");
    }

    throw new Error(mapFunctionError(error, "Failed to start sign-in."));
  }
}

export async function completeTwoStepSignIn(email, otp) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedOtp = String(otp || "").trim();

  if (!normalizedEmail || !normalizedOtp) {
    throw new Error("Email and OTP are required.");
  }

  try {
    const verifyOtp = httpsCallable(functions, "verifyOtp");
    const result = await verifyOtp({
      email: normalizedEmail,
      otp: normalizedOtp,
    });

    sessionStorage.removeItem(PENDING_OTP_KEY);
    return result.data;
  } catch (error) {
    throw new Error(mapFunctionError(error, "Failed to verify OTP."));
  }
}

export async function cancelTwoStepSignIn() {
  sessionStorage.removeItem(PENDING_OTP_KEY);

  if (auth.currentUser) {
    await signOut(auth);
  }
}

export async function resetPassword(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
    return { success: true };
  } catch (error) {
    if (error?.code?.startsWith?.("auth/")) {
      throw new Error("Failed to send password reset email.");
    }

    throw error;
  }
}
