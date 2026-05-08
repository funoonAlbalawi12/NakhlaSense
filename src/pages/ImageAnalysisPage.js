import { useEffect, useRef, useState } from "react";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { PERMISSIONS } from "../auth/permissions";
import "./ImageAnalysisPage.css";
import palmGroveImage from "../assets/ksa-palms.jpg";
import {
  diagnoseCropImage,
  readImageFileAsDataUrl,
  scanCropImageQuestions,
} from "../firebase/services/aiAnalysisService";
import { createAnalysisRecord } from "../firebase/services/analysesService";
import { createAlertRecord } from "../firebase/services/alertsService";
import { recordActivity } from "../firebase/services/activityLogService";
import { getActiveMission, getSelectedStation } from "../utils/missionContext";

const SEV = {
  low: { label: "Low danger", color: "#27500A", bg: "#eaf3de", bar: "#3B6D11" },
  medium: { label: "Medium danger", color: "#633806", bg: "#faeeda", bar: "#EF9F27" },
  high: { label: "High danger", color: "#791F1F", bg: "#fcebeb", bar: "#E24B4A" },
};

const SPR = {
  low: { label: "Low spread risk", pct: 20 },
  medium: { label: "Medium spread risk", pct: 55 },
  high: { label: "High spread risk", pct: 88 },
};

const C = {
  dark: "#1e5631",
  mid: "#3B6D11",
  light: "#eaf3de",
  text: "#1a1a1a",
  muted: "#666",
  border: "#e0e0d8",
  surface: "#f5f5f0",
  white: "#ffffff",
};

const FLOW_CARD_WIDTH = "min(100%, 760px)";

function getFlowStep(screen) {
  if (screen === "upload") {
    return "upload";
  }

  if (screen === "scanning" || screen === "diagnosing") {
    return "scanning";
  }

  if (screen === "questions") {
    return "questions";
  }

  if (screen === "result") {
    return "treatment";
  }

  return "upload";
}

const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const GalleryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const CheckIcon = ({ size = 12, color = "#3B6D11" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon = ({ color = "#cc3300" }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const WarnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b07800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const LeafIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 21c7 0 14-7 14-14-7 0-14 7-14 14z" />
    <path d="M9 15c1.2-1.3 3.3-3.4 6-5" />
  </svg>
);

const Topbar = ({ title, onBack, logo }) => (
  <div
    style={{
      background: C.dark,
      padding: "14px 18px 12px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      borderBottom: "none",
      borderTop: "none",
    }}
  >
    {onBack ? (
      <button
        type="button"
        onClick={onBack}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.16)",
          border: "none",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <BackIcon />
      </button>
    ) : null}
    {logo ? (
      <span style={{ color: "#ffffff", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>NakhlaSense</span>
    ) : (
      <span style={{ color: "#ffffff", fontSize: 15, fontWeight: 800, flex: 1 }}>{title}</span>
    )}
    {logo ? (
      <>
        <div style={{ flex: 1 }} />
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e5631", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>KH</div>
      </>
    ) : null}
  </div>
);

const Section = ({ title, children }) => (
  <div
    style={{
      background: "linear-gradient(180deg, #ffffff 0%, #f8fbf7 100%)",
      borderRadius: 18,
      border: `1px solid ${C.border}`,
      overflow: "hidden",
    }}
  >
    <div style={{ padding: "11px 16px 9px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#7c6220", letterSpacing: "0.07em" }}>{title}</div>
    </div>
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
  </div>
);

function FlowOverview() {
  return (
    <div className="crop-health-flow-overview">
      <div className="crop-health-flow-title">
        <LeafIcon size={24} color="#9bd65f" />
        <span>Check Your Palm</span>
        <LeafIcon size={24} color="#9bd65f" />
      </div>
      <p className="crop-health-flow-subtitle">
        Upload a clear palm photo and receive a diagnosis with the next recommended action.
      </p>
    </div>
  );
}

function CameraCaptureModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [isStarting, setIsStarting] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setIsStarting(false);
      } catch (error) {
        setCameraError("Camera access was blocked or is not available on this device.");
        setIsStarting(false);
      }
    };

    startCamera();

    return () => {
      active = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || isCapturing) {
      return;
    }

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    if (!width || !height) {
      setCameraError("The camera preview is not ready yet. Please wait a moment and try again.");
      return;
    }

    setIsCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("This browser cannot capture a photo from the camera.");
      setIsCapturing(false);
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setCameraError("The photo could not be captured. Please try again.");
          setIsCapturing(false);
          return;
        }

        const file = new File([blob], `palm-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        await onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Close camera"
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            onClose();
          }
        }}
        style={{ position: "absolute", inset: 0, background: "rgba(8, 20, 10, 0.72)" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          borderRadius: 24,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
          borderTop: "4px solid #f0b548",
          background: "radial-gradient(circle at top right, rgba(245, 196, 81, 0.12), transparent 34%), linear-gradient(180deg, #fffdfa 0%, #f7faf6 100%)",
          boxShadow: "0 24px 48px rgba(15, 32, 20, 0.18)",
        }}
      >
        <Topbar title="Take a photo" onBack={onClose} />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 14, color: "#42564c", lineHeight: 1.6, fontWeight: 600 }}>
            Hold the camera close to the sick leaf or trunk and keep the palm centered in the frame.
          </div>

          <div
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbf7 100%)",
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              overflow: "hidden",
              minHeight: 320,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {cameraError ? (
              <div style={{ padding: 24, textAlign: "center", color: "#31453a", lineHeight: 1.7, fontWeight: 600 }}>{cameraError}</div>
            ) : (
              <video ref={videoRef} playsInline muted autoPlay style={{ width: "100%", height: "100%", minHeight: 320, objectFit: "cover" }} />
            )}
          </div>

          {isStarting && !cameraError ? (
            <div style={{ fontSize: 13, color: "#5b6d63", textAlign: "center", fontWeight: 700 }}>Opening camera...</div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.88)",
                color: "#64786d",
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: "14px 16px",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCapture}
              disabled={Boolean(cameraError) || isStarting || isCapturing}
              style={{
                background: "#1e5631",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "14px 16px",
                fontSize: 14,
                fontWeight: 800,
                cursor: Boolean(cameraError) || isStarting || isCapturing ? "not-allowed" : "pointer",
                opacity: Boolean(cameraError) || isStarting || isCapturing ? 0.55 : 1,
              }}
            >
              {isCapturing ? "Capturing..." : "Capture photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadScreen({ canAnalyze, error, imageName, onFile, onOpenCamera }) {
  const camRef = useRef(null);
  const galRef = useRef(null);
  const canUseLiveCamera = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  return (
    <section className="crop-health-hero" style={{ backgroundImage: `url(${palmGroveImage})` }}>
      <div className="crop-health-hero-overlay" />
      <div className="crop-health-hero-gradient" />
      <div className="crop-health-hero-content">
        <FlowOverview />

        {!canAnalyze ? (
          <div className="crop-health-hero-alert">
            Your account cannot run palm image analysis right now.
          </div>
        ) : null}

        {error ? <div className="crop-health-hero-alert">{error}</div> : null}

        <div className="crop-health-upload-card">
          {imageName ? <div className="crop-health-selected-photo">Selected photo: {imageName}</div> : null}

          <div className="crop-health-camera-badge">
            <CameraIcon />
          </div>

          <h2>Take a photo now</h2>
          <p>{canUseLiveCamera ? "Open camera and capture in the app" : "Point at the sick leaf or trunk"}</p>

          <button
            type="button"
            disabled={!canAnalyze}
            className="crop-health-primary-action"
            onClick={() => {
              if (canUseLiveCamera) {
                onOpenCamera();
                return;
              }

              camRef.current?.click();
            }}
          >
            <CameraIcon />
            Open Camera
            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])}
            />
          </button>

          <div className="crop-health-or-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            disabled={!canAnalyze}
            className="crop-health-secondary-action"
            onClick={() => galRef.current?.click()}
          >
            <span className="crop-health-secondary-icon">
              <GalleryIcon />
            </span>
            <span className="crop-health-secondary-copy">
              <strong>Choose from gallery</strong>
              <small>Use an existing photo</small>
            </span>
            <input
              ref={galRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])}
            />
          </button>

          <div className="crop-health-upload-recs">
            <div className="crop-health-upload-recs-title">For better results</div>
            <div className="crop-health-upload-recs-list">
              {[
                "Use natural daylight and avoid flash",
                "Get close to the sick leaf or trunk",
                "Show both healthy and sick parts",
              ].map((tip) => (
                <div key={tip} className="crop-health-upload-rec-item">
                  <span className="crop-health-upload-rec-dot" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function LoadingScreen({ imageUrl, step }) {
  const messages = {
    scanning: ["Looking at your photo...", "Identifying what might be wrong..."],
    diagnosing: ["Putting it all together...", "Using your answers for a precise result..."],
  };
  const [line1, line2] = messages[step] || messages.scanning;

  return (
    <>
      <Topbar title={step === "scanning" ? "Checking your photo..." : "Getting your diagnosis..."} />
      <div
        className="crop-health-stage-screen crop-health-stage-screen--loading"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          width: "100%",
          maxWidth: "none",
          background:
            "radial-gradient(circle at top right, rgba(245, 196, 81, 0.12), transparent 34%), linear-gradient(180deg, #fffdfa 0%, #f7faf6 100%)",
        }}
      >
        <div style={{ width: FLOW_CARD_WIDTH, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div className="crop-health-stage-badge">
            <LeafIcon size={14} color="#3B6D11" />
            Crop Health Diagnosis
          </div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{
                width: 340,
                height: 340,
                objectFit: "cover",
                borderRadius: 24,
                marginBottom: 14,
                border: `1px solid ${C.border}`,
                boxShadow: "0 20px 38px rgba(20,40,10,0.14)",
              }}
            />
          ) : null}
          <div
            style={{
              width: 44,
              height: 44,
              border: "3px solid #e8f0e0",
              borderTopColor: "#1e5631",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div style={{ textAlign: "center" }}>
            <div className="crop-health-stage-title">{line1}</div>
            <div className="crop-health-stage-text">{line2}</div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function QuestionScreen({ imageUrl, scanResult, onSubmit, onBack }) {
  const { questions = [], initialObservation = "", suspectedDiseases = [] } = scanResult || {};
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const total = questions.length;
  const question = questions[current];

  if (!question) {
    return null;
  }

  const handleNext = () => {
    if (current < total - 1) {
      setCurrent((value) => value + 1);
      return;
    }

    onSubmit(answers);
  };

  return (
    <>
      <Topbar title="A few quick questions" onBack={onBack} />
      <div
        className="crop-health-stage-screen crop-health-question-screen"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "26px 24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          background:
            "radial-gradient(circle at top right, rgba(245, 196, 81, 0.12), transparent 34%), linear-gradient(180deg, #fffdfa 0%, #f7faf6 100%)",
        }}
      >
        <div style={{ width: FLOW_CARD_WIDTH, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="crop-health-stage-badge">
            <LeafIcon size={14} color="#3B6D11" />
            Crop Health Diagnosis
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#5b6d63", fontWeight: 700 }}>Question {current + 1} of {total}</span>
              <span style={{ fontSize: 13, color: "#5b6d63", fontWeight: 700 }}>{Math.round(((current + 1) / total) * 100)}%</span>
            </div>
            <div style={{ height: 4, background: "rgba(219, 229, 219, 0.9)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${((current + 1) / total) * 100}%`, background: "#1e5631", borderRadius: 2, transition: "width 0.4s ease" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <img src={imageUrl} alt="Your palm" style={{ width: 112, height: 112, objectFit: "cover", borderRadius: 16, flexShrink: 0, border: `1px solid ${C.border}`, boxShadow: "0 12px 24px rgba(20,40,10,0.1)" }} />
            <div style={{ flex: 1, background: "linear-gradient(180deg, #f6fbe9 0%, #edf6df 100%)", borderRadius: 18, padding: "18px 20px", border: "1px solid #cfe0b6" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#567423", letterSpacing: "0.06em", marginBottom: 8 }}>WHAT I SEE IN YOUR PHOTO</div>
              <div style={{ fontSize: 18, color: "#27500A", lineHeight: 1.8 }}>{initialObservation}</div>
            </div>
          </div>

          {suspectedDiseases.length ? (
            <div>
              <div style={{ fontSize: 11, color: "#5b6d63", marginBottom: 6, fontWeight: 700 }}>Checking for:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {suspectedDiseases.map((disease) => (
                  <span key={disease} style={{ fontSize: 13, background: "#fff3cd", color: "#633806", padding: "6px 12px", borderRadius: 20, border: "1px solid #f0d080", fontWeight: 600 }}>{disease}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ background: C.white, borderRadius: 14, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: `0.5px solid ${C.border}` }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1.45 }}>{question.question}</div>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {question.choices.map((choice) => {
                const selected = answers[question.id] === choice.id;

                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: choice.id }))}
                    style={{ width: "100%", border: `${selected ? "2px" : "0.5px"} solid ${selected ? C.mid : C.border}`, background: selected ? C.light : C.white, borderRadius: 12, padding: "17px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, border: `2px solid ${selected ? C.mid : "#ccc"}`, background: selected ? C.mid : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selected ? <CheckIcon size={10} color="#fff" /> : null}
                    </div>
                    <span style={{ fontSize: 18, color: C.text, fontWeight: selected ? 600 : 500, lineHeight: 1.45 }}>{choice.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {questions.map((item, index) => (
              <div
                key={item.id}
                onClick={() => setCurrent(index)}
                style={{ width: index === current ? 20 : 8, height: 8, borderRadius: 4, background: answers[item.id] ? C.mid : index === current ? C.mid : "#ddd", transition: "all 0.2s", cursor: "pointer" }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!answers[question.id]}
            style={{ background: answers[question.id] ? C.dark : "#ccc", color: "#fff", border: "none", borderRadius: 14, padding: "16px", width: "100%", fontSize: 18, fontWeight: 700, cursor: answers[question.id] ? "pointer" : "not-allowed", transition: "background 0.2s" }}
          >
            {current < total - 1 ? "Next question ->" : "Get my diagnosis ->"}
          </button>

          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => onSubmit(answers)}
              style={{ background: "none", border: "none", fontSize: 15, color: "#8b8b8b", cursor: "pointer", textDecoration: "underline" }}
            >
              Skip questions and use the photo
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ResultScreen({ result, imageUrl, onReset }) {
  const severity = SEV[result?.severity] || SEV.medium;
  const spread = SPR[result?.spreadRisk] || SPR.medium;

  return (
    <>
      <Topbar title="Your diagnosis" onBack={onReset} />
      <div
        className="crop-health-stage-screen"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background:
            "radial-gradient(circle at top right, rgba(245, 196, 81, 0.12), transparent 34%), linear-gradient(180deg, #fffdfa 0%, #f7faf6 100%)",
        }}
      >
        <div style={{ width: FLOW_CARD_WIDTH, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="crop-health-stage-badge">
            <LeafIcon size={14} color="#3B6D11" />
            Crop Health Diagnosis
          </div>
          <div style={{ width: "100%", height: 148, borderRadius: 14, overflow: "hidden", background: "#2a4a1a", position: "relative", flexShrink: 0, border: `1px solid ${C.border}`, boxShadow: "0 12px 24px rgba(20,40,10,0.1)" }}>
            {imageUrl ? <img src={imageUrl} alt="Your palm" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            <span style={{ position: "absolute", bottom: 8, left: 10, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>Your photo</span>
          </div>

          {result.isHealthy ? (
            <div style={{ borderRadius: 16, padding: 16, background: "linear-gradient(180deg, #f8fbf7 0%, #f1f8ef 100%)", border: "1px solid rgba(207, 224, 210, 0.95)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#edf4e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckIcon size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#223024" }}>Your palm looks healthy</div>
                  <div style={{ fontSize: 12, color: "#5b6d63", marginTop: 2, fontWeight: 700 }}>No disease detected</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: "#42564c", lineHeight: 1.65, fontWeight: 600 }}>{result.plainExplanation}</div>
            </div>
          ) : (
            <div style={{ borderRadius: 16, padding: 16, background: "#fff1f0", border: "1px solid #ffb3ac" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#ffe0dc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertIcon />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#223024" }}>Your palm is sick</div>
                  <div style={{ fontSize: 12, color: "#cc3300", marginTop: 2, fontWeight: 700 }}>{result.diseaseName}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: "#42564c", lineHeight: 1.65, fontWeight: 600 }}>{result.plainExplanation}</div>
            </div>
          )}

          {result.symptoms?.length ? (
            <Section title="WHAT YOU CAN SEE ON YOUR PALM">
              {result.symptoms.map((symptom, index) => (
                <div key={`${symptom.text}-${index}`} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: index % 2 === 0 ? "#cc3300" : "#f0a000", marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{symptom.text}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{symptom.detail}</div>
                  </div>
                </div>
              ))}
            </Section>
          ) : null}

          {!result.isHealthy ? (
            <Section title="HOW SERIOUS IS IT">
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: severity.bg, borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fff3cd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><WarnIcon /></div>
                <div style={{ fontSize: 13, color: severity.color, lineHeight: 1.5 }}>
                  <strong>{severity.label}</strong> - {result.severity === "high" ? "Act today. The tree could die without treatment." : result.severity === "medium" ? "The tree will get weaker every month without treatment." : "Not urgent but treat soon."}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#5b6d63", marginBottom: 5, fontWeight: 700 }}>Spread risk to nearby palms</div>
                <div style={{ height: 7, background: "rgba(219, 229, 219, 0.9)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${spread.pct}%`, background: severity.bar, borderRadius: 3, transition: "width 0.6s ease" }} />
                </div>
                <div style={{ fontSize: 12, color: "#5b6d63", marginTop: 4, fontWeight: 700 }}>{spread.label}</div>
              </div>
            </Section>
          ) : null}

          {result.steps?.length ? (
            <Section title="WHAT TO DO - IN ORDER">
              {result.steps.map((step, index) => (
                <div key={`${step.when}-${step.action}-${index}`}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.dark, color: "#fff", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{index + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#567423", letterSpacing: "0.05em", marginBottom: 2 }}>{String(step.when || "").toUpperCase()}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#223024" }}>{step.action}</div>
                      <div style={{ fontSize: 13, color: "#5b6d63", marginTop: 3, lineHeight: 1.55, fontWeight: 600 }}>{step.detail}</div>
                    </div>
                  </div>
                  {index < result.steps.length - 1 ? <div style={{ height: "0.5px", background: C.border, margin: "12px 0 0 38px" }} /> : null}
                </div>
              ))}
            </Section>
          ) : null}

          {result.prevention?.length ? (
            <Section title="STOP IT SPREADING TO OTHER PALMS">
              {result.prevention.map((item, index) => (
                <div key={`${item}-${index}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: index < result.prevention.length - 1 ? 10 : 0, marginBottom: index < result.prevention.length - 1 ? 10 : 0, borderBottom: index < result.prevention.length - 1 ? `0.5px solid ${C.border}` : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.light, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckIcon /></div>
                  <div style={{ fontSize: 14, color: "#31453a", lineHeight: 1.5, fontWeight: 600 }}>{item}</div>
                </div>
              ))}
            </Section>
          ) : null}

          <button type="button" style={{ background: "#1e5631", color: "#fff", border: "none", borderRadius: 14, padding: "14px 16px", width: "100%", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 16px 30px rgba(30, 86, 49, 0.22)" }}>
            <PhoneIcon /> Call an agricultural expert
          </button>
          <button type="button" onClick={onReset} style={{ background: "rgba(255, 255, 255, 0.88)", color: "#64786d", border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", width: "100%", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
            Check another palm
          </button>
        </div>
      </div>
    </>
  );
}

export default function ImageAnalysisPage() {
  const { user, hasPermission } = useAuth();
  const selectedStation = getSelectedStation();
  const activeMission = getActiveMission();
  const canAnalyze = hasPermission(PERMISSIONS.USE_AI_ANALYSIS);
  const [screen, setScreen] = useState("upload");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const isUpload = screen === "upload";

  const reset = () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    setCameraOpen(false);
    setScreen("upload");
    setImageFile(null);
    setImageUrl(null);
    setImageDataUrl("");
    setScanResult(null);
    setResult(null);
    setError("");
  };

  const handleFile = async (file) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      return;
    }

    if (!canAnalyze) {
      setError("Your account cannot run palm image analysis right now.");
      return;
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    setError("");
    setResult(null);
    setScanResult(null);
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setScreen("scanning");

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setImageDataUrl(dataUrl);

      const scan = await scanCropImageQuestions(user, {
        file,
        imageDataUrl: dataUrl,
        zoneName: selectedStation?.name || "",
      });

      if (scan.cannotRead) {
        setResult({
          isHealthy: false,
          diseaseName: "Cannot read photo",
          plainExplanation: scan.reason || "The photo is too blurry. Please retake it closer in natural daylight.",
          severity: "low",
          spreadRisk: "low",
          symptoms: [],
          steps: [
            {
              when: "Today",
              action: "Retake the photo",
              detail: "Get closer to the sick leaf. Use daylight. Hold the phone still.",
            },
          ],
          prevention: [],
        });
        setScreen("result");
        return;
      }

      if (!scan.questions.length) {
        const diagnosis = await diagnoseCropImage(user, {
          file,
          imageDataUrl: dataUrl,
          zoneName: selectedStation?.name || "",
          questions: [],
          answers: {},
        });
        setResult(diagnosis.farmerReport || null);
        setScreen("result");
        return;
      }

      setScanResult(scan);
      setScreen("questions");
    } catch (nextError) {
      setError(nextError.message || "Could not analyse the photo. Please try again.");
      setScreen("error");
    }
  };

  const handleAnswers = async (answers) => {
    setScreen("diagnosing");

    try {
      const diagnosis = await diagnoseCropImage(user, {
        file: imageFile,
        imageDataUrl,
        zoneName: selectedStation?.name || "",
        questions: scanResult?.questions || [],
        answers,
      });

      const farmerResult = diagnosis.farmerReport || {
        isHealthy: diagnosis.status === "Healthy",
        diseaseName: diagnosis.detectedCondition || "Palm diagnosis",
        plainExplanation: diagnosis.explanation || diagnosis.summary || "",
        severity: String(diagnosis.severity || "Medium").toLowerCase(),
        spreadRisk: "medium",
        symptoms: [],
        steps: [],
        prevention: [],
      };

      setResult(farmerResult);
      setScreen("result");

      await createAnalysisRecord(user, {
        fileName: imageFile?.name || "palm-image.jpg",
        zoneId: selectedStation?.stationId || selectedStation?.id || "",
        zoneName: selectedStation?.name || "Unassigned",
        stationId: selectedStation?.stationId || selectedStation?.id || "",
        stationName: selectedStation?.name || "Unassigned",
        missionId: activeMission?.missionId || "",
        imageUrl: imageUrl || "",
        status: diagnosis.status,
        severity: diagnosis.severity,
        confidence: diagnosis.confidence,
        detectedCondition: diagnosis.detectedCondition || diagnosis.status,
        notes: diagnosis.summary,
        explanation: diagnosis.explanation || "",
        nextStep: diagnosis.nextStep || "",
        selectedSymptoms: [],
        createdAt: new Date().toISOString(),
      });

      if (diagnosis.analysisAccepted && (diagnosis.needsAlert || diagnosis.status !== "Healthy")) {
        await createAlertRecord(user, {
          zone: selectedStation?.name || "Unassigned",
          stationId: selectedStation?.stationId || selectedStation?.id || "",
          stationName: selectedStation?.name || "Unassigned",
          missionId: activeMission?.missionId || "",
          severity: diagnosis.severity === "High" ? "Critical" : "Warning",
          parameter: diagnosis.detectedCondition || diagnosis.status,
          value: diagnosis.confidence,
          cause: diagnosis.visibleContent || diagnosis.summary || "",
          threshold: 70,
          status: "New",
          recommendations: diagnosis.recommendedActions || [],
          nextStep: diagnosis.nextStep || "",
          time: new Date().toISOString(),
        });
      }

      await recordActivity(user, {
        type: "analysis_created",
        entity: "analysis",
        message: `Palm detector analyzed ${imageFile?.name || "an uploaded palm image"}`,
      });
    } catch (nextError) {
      setError(nextError.message || "Could not complete diagnosis. Please try again.");
      setScreen("error");
    }
  };

  return (
    <>
      <Navigation />
      <div className="dashboard-page container-fluid crop-health-flow-page" style={{ background: "#082713" }}>
        <div className="crop-health-full-bleed py-0">
          {isUpload ? (
            <UploadScreen
              canAnalyze={canAnalyze}
              error={error}
              imageName={imageFile?.name || ""}
              onFile={handleFile}
              onOpenCamera={() => setCameraOpen(true)}
            />
          ) : (
            <section className="crop-health-stage" style={{ backgroundImage: `url(${palmGroveImage})` }}>
              <div className="crop-health-hero-overlay" />
              <div className="crop-health-hero-gradient" />
              <div className="crop-health-stage-inner">
                <div className="crop-health-stage-flow-wrap">
                  <FlowOverview currentStep={getFlowStep(screen)} />
                </div>
                <div className="crop-health-stage-shell" style={{ minHeight: "calc(100vh - 180px)", background: C.white, display: "flex", flexDirection: "column", borderRadius: 24, overflow: "hidden", boxShadow: "0 18px 42px rgba(4,18,7,0.28)" }}>
                  {screen === "scanning" ? <LoadingScreen imageUrl={imageUrl} step="scanning" /> : null}
                  {screen === "questions" ? <QuestionScreen imageUrl={imageUrl} scanResult={scanResult} onSubmit={handleAnswers} onBack={reset} /> : null}
                  {screen === "diagnosing" ? <LoadingScreen imageUrl={imageUrl} step="diagnosing" /> : null}
                  {screen === "result" && result ? <ResultScreen result={result} imageUrl={imageUrl} onReset={reset} /> : null}
                  {screen === "error" ? (
                    <>
                      <Topbar title="Something went wrong" onBack={reset} />
                      <div className="crop-health-stage-screen crop-health-stage-screen--loading" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
                        <div className="crop-health-stage-badge">
                          <LeafIcon size={14} color="#3B6D11" />
                          Crop Health Diagnosis
                        </div>
                        <div style={{ background: "#fff1f0", border: "1px solid #ffb3ac", borderRadius: 14, padding: 20, textAlign: "center", width: "100%" }}>
                          <AlertIcon />
                          <div style={{ fontSize: 14, color: "#cc3300", lineHeight: 1.6, marginTop: 10 }}>{error}</div>
                        </div>
                        <button type="button" onClick={reset} style={{ background: "#1a3a0a", color: "#fff", border: "none", borderRadius: 14, padding: "14px", width: "100%", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                          Try again
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
      {cameraOpen ? <CameraCaptureModal onClose={() => setCameraOpen(false)} onCapture={handleFile} /> : null}
      <Footer />
    </>
  );
}
