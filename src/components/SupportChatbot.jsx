import { useEffect, useMemo, useRef, useState } from "react";
import { requestSupportChatReply } from "../firebase/services/supportChatService";
import "./SupportChatbot.css";

function getRoleName(context) {
  return String(context.role || "user").toLowerCase();
}

function buildWelcomeMessage(context) {
  const role = getRoleName(context);

  if (role === "farmer") {
    return "I am your NakhlaSense helper. I can explain pages, crop results, and where to find your farm information in simple words.";
  }

  if (role === "operator") {
    return "I am your NakhlaSense helper. I can guide you through uploads, image checks, alerts, and daily tasks step by step.";
  }

  if (role === "admin") {
    return "I am your NakhlaSense helper. I can support you with users, permissions, alerts, reports, uploads, and image analysis.";
  }

  return "I am your NakhlaSense helper. Ask me about this page, system steps, field meanings, or access.";
}

function buildQuickActions(context) {
  const role = getRoleName(context);

  if (role === "farmer") {
    return [
      "What does this page do?",
      "What do Healthy, Warning, and Abnormal mean?",
      "Where can I see my farm data?",
      "What does DroneGPSValid mean?",
    ];
  }

  if (role === "operator") {
    return [
      "How do I upload a file?",
      "How do I check an image?",
      "Why was my file rejected?",
      "What does DroneGPSValid mean?",
    ];
  }

  if (role === "admin") {
    return [
      "What can each user role do?",
      "How do I upload a file?",
      "How do I review alerts?",
      "What does DroneGPSValid mean?",
    ];
  }

  return [
    "What does this page do?",
    "How do I upload a file?",
    "What does DroneGPSValid mean?",
  ];
}

function buildInputPlaceholder(context) {
  const role = getRoleName(context);

  if (role === "farmer") {
    return "Ask about crop results, page meaning, or your farm data";
  }

  if (role === "operator") {
    return "Ask about uploads, image checks, alerts, or sensor names";
  }

  if (role === "admin") {
    return "Ask about users, permissions, reports, alerts, uploads, or analysis";
  }

  return "Ask about this page, system steps, or field meanings";
}

function SupportChatbot({ user, context }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      role: "assistant",
      text: buildWelcomeMessage(context),
      source: "knowledge-base",
    },
  ]);
  const transcriptRef = useRef(null);
  const quickActions = useMemo(() => buildQuickActions(context), [context]);
  const inputPlaceholder = useMemo(() => buildInputPlaceholder(context), [context]);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: buildWelcomeMessage(context),
        source: "knowledge-base",
      },
    ]);
  }, [context]);

  useEffect(() => {
    const element = transcriptRef.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (nextMessage) => {
    const question = String(nextMessage || input).trim();

    if (!question || isSending) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: question,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const reply = await requestSupportChatReply(user, {
        message: question,
        context,
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: reply.answer,
          source: reply.source,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text: error.message || "I could not answer that right now.",
          source: "fallback",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`support-chatbot ${isOpen ? "open" : ""}`}>
      {isOpen && (
        <section className="support-chatbot-window" aria-label="NakhlaSense support assistant">
          <header className="support-chatbot-header">
            <div>
              <strong>NakhlaSense Assistant</strong>
              <p>Ask anything about your farm, palm health, sensor data, or general support.</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close support chat">
              X
            </button>
          </header>

          <div className="support-chatbot-quick-actions">
            {quickActions.map((action) => (
              <button key={action} type="button" onClick={() => sendMessage(action)}>
                {action}
              </button>
            ))}
          </div>

          <div className="support-chatbot-transcript" ref={transcriptRef}>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`support-chatbot-message ${message.role === "user" ? "user" : "assistant"}`}
              >
                <p>{message.text}</p>
                {message.role === "assistant" && message.source ? (
                  <span className="support-chatbot-source">
                    {message.source === "ai-chat"
                      ? "AI assistant"
                      : message.source === "knowledge-base"
                      ? "System support"
                      : message.source === "hybrid-ai"
                      ? "Hybrid support"
                      : "Fallback support"}
                  </span>
                ) : null}
              </article>
            ))}

            {isSending && (
              <article className="support-chatbot-message assistant pending">
                <p>Checking the best help for your role and this page...</p>
              </article>
            )}
          </div>

          <form
            className="support-chatbot-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={inputPlaceholder}
            />
            <button type="submit" disabled={isSending || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="support-chatbot-launcher"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label="Open support chat"
      >
        <svg viewBox="0 0 64 64" aria-hidden="true" className="support-chatbot-launcher-icon">
          <path
            d="M22 10h20a10 10 0 0 1 10 10v17a10 10 0 0 1-10 10H26l-10 8 2-8h-2A10 10 0 0 1 6 37V20a10 10 0 0 1 10-10h6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M32 10V6"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx="24" cy="28" r="3.75" fill="currentColor" />
          <circle cx="40" cy="28" r="3.75" fill="currentColor" />
          <path
            d="M24 39c2.6 2.6 5.4 3.9 8 3.9s5.4-1.3 8-3.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export default SupportChatbot;
