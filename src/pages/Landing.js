import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import Navigation from "../components/Navigation";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import "./Landing.css";

const featureIcons = [
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18v18H3z" />
      <path d="M7 15h.01" />
      <path d="M12 12h.01" />
      <path d="M17 9h.01" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18" />
      <path d="M12 3v18" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 12-4-4v3h-3v2h3v3z" />
      <path d="M4 11a8 8 0 0 1 14.9-4" />
      <path d="M2 12a10 10 0 0 0 18.1 5.8" />
    </svg>
  ),
];

const workflowIcons = [
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l9-6 9 6-9 6-9-6Z" />
      <path d="M9 16v3" />
      <path d="M15 14v5" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12" />
      <path d="M8 3v8" />
      <path d="M16 3v8" />
      <rect x="5" y="12" width="14" height="8" rx="2" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M7 8h10" />
      <path d="M7 12h6" />
    </svg>
  ),
];

function SaudiOperationsMap({ language }) {
  const copy =
    language === "ar"
      ? {
          title: "خريطة الإنتاج",
          hub: "السعودية",
          hubMeta: "مركز عمليات NakhlaSense",
          qassim: "القصيم",
          qassimMeta: "قيادة إنتاج النخيل",
          alAhsa: "الأحساء",
          alAhsaMeta: "وصول تصديري",
          riyadh: "الرياض",
          riyadhMeta: "المتابعة والعمليات",
          madinah: "المدينة",
          madinahMeta: "منطقة إنتاج رئيسية",
          hubLegend: "المركز الرئيسي",
          stations: "محطات وحقول",
          alerts: "تنبيهات مبكرة",
          global: "وصول عالمي",
        }
      : {
          title: "Production map",
          hub: "Saudi Arabia",
          hubMeta: "NakhlaSense operations hub",
          qassim: "Al-Qassim",
          qassimMeta: "Palm production lead",
          alAhsa: "Al-Ahsa",
          alAhsaMeta: "Export reach",
          riyadh: "Riyadh",
          riyadhMeta: "Monitoring and operations",
          madinah: "Madinah",
          madinahMeta: "Major producing region",
          hubLegend: "Saudi hub",
          stations: "Stations and fields",
          alerts: "Early alerts",
          global: "Global reach",
        };

  return (
    <div className="saudi-ops-map" aria-hidden="true">
      <div className="saudi-region-board-head">
        <strong>{copy.title}</strong>
      </div>

      <div className="saudi-ops-map-canvas">
        <svg viewBox="0 0 760 430" role="img" aria-label={copy.title}>
          <defs>
            <linearGradient id="saudiFill" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#eff4e9" />
              <stop offset="100%" stopColor="#d6e4cc" />
            </linearGradient>
            <linearGradient id="routeStroke" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#caa03a" />
              <stop offset="100%" stopColor="#2f7a49" />
            </linearGradient>
            <filter id="mapGlow">
              <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#173a24" floodOpacity="0.14" />
            </filter>
          </defs>

          <rect x="0" y="0" width="760" height="430" rx="28" fill="#f7f3ea" />

          <g className="saudi-map-shape" filter="url(#mapGlow)">
            <path
              d="M246 80l44-9 38 7 36 24 40 41 42 5 8 18 17 0 26 37 8 37-16 27 9 30-16 45-55 20-53 6-34 9-21 24-8 29-15 12-20-4-10-16-17 4-11-18-18-18-17-34-20-24-6-21-23-24-19-44-23-34 7-35 30 3 11-21 22-5 4-15 24-18-12-22z"
              fill="url(#saudiFill)"
              stroke="#3f7a51"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M333 120l14 30m76 4l18 32m-103 72l-24 22m105-14l27 32m-70 42l35 26"
              stroke="rgba(63,122,81,0.18)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          <g className="saudi-map-routes" fill="none" stroke="url(#routeStroke)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M396 212C360 183 332 165 305 150" />
            <path d="M396 212C432 195 470 190 503 197" />
            <path d="M396 212C372 234 355 257 343 283" />
            <path d="M396 212C355 214 313 213 271 205" strokeDasharray="6 8" opacity="0.76" />
          </g>

          <g className="saudi-map-node saudi-map-node-hub" filter="url(#mapGlow)">
            <circle cx="396" cy="212" r="12" fill="#143823" />
            <circle cx="396" cy="212" r="24" fill="rgba(20,56,35,0.12)" />
            <g transform="translate(430 178)">
              <rect width="152" height="52" rx="14" fill="#143823" />
              <text x="14" y="21" fill="#ffffff" fontSize="13" fontWeight="700">{copy.hub}</text>
              <text x="14" y="37" fill="#d9e6dc" fontSize="11">{copy.hubMeta}</text>
            </g>
          </g>

          <g className="saudi-map-node">
            <circle cx="305" cy="150" r="8" fill="#2f7a49" />
            <g transform="translate(244 96)">
              <rect width="126" height="48" rx="13" fill="#1f4f30" />
              <text x="12" y="20" fill="#ffffff" fontSize="12" fontWeight="700">{copy.qassim}</text>
              <text x="12" y="35" fill="#d9e6dc" fontSize="10.5">{copy.qassimMeta}</text>
            </g>
          </g>

          <g className="saudi-map-node">
            <circle cx="503" cy="197" r="8" fill="#d6aa23" />
            <g transform="translate(516 168)">
              <rect width="112" height="46" rx="13" fill="#235535" />
              <text x="12" y="19" fill="#ffffff" fontSize="12" fontWeight="700">{copy.alAhsa}</text>
              <text x="12" y="34" fill="#d9e6dc" fontSize="10.5">{copy.alAhsaMeta}</text>
            </g>
          </g>

          <g className="saudi-map-node">
            <circle cx="396" cy="212" r="8" fill="#2f7a49" />
            <g transform="translate(275 236)">
              <rect width="126" height="46" rx="13" fill="#235535" />
              <text x="12" y="19" fill="#ffffff" fontSize="12" fontWeight="700">{copy.riyadh}</text>
              <text x="12" y="34" fill="#d9e6dc" fontSize="10.5">{copy.riyadhMeta}</text>
            </g>
          </g>

          <g className="saudi-map-node">
            <circle cx="271" cy="205" r="8" fill="#d6aa23" />
            <g transform="translate(138 177)">
              <rect width="114" height="46" rx="13" fill="#235535" />
              <text x="12" y="19" fill="#ffffff" fontSize="12" fontWeight="700">{copy.madinah}</text>
              <text x="12" y="34" fill="#d9e6dc" fontSize="10.5">{copy.madinahMeta}</text>
            </g>
          </g>

          <g className="saudi-map-dot"><circle cx="305" cy="150" r="5" fill="#4668d8" /></g>
          <g className="saudi-map-dot"><circle cx="503" cy="197" r="5" fill="#4db85b" /></g>
          <g className="saudi-map-dot"><circle cx="396" cy="212" r="5" fill="#e45a72" /></g>
          <g className="saudi-map-dot"><circle cx="271" cy="205" r="5" fill="#364f99" /></g>
          <g className="saudi-map-dot"><circle cx="343" cy="283" r="5" fill="#4db85b" /></g>

          <g transform="translate(40 345)">
            <rect width="680" height="52" rx="20" fill="rgba(255,255,255,0.74)" stroke="rgba(173,149,103,0.2)" />
            <g transform="translate(22 17)">
              <circle cx="8" cy="8" r="8" fill="#143823" />
              <text x="24" y="12" fill="#143823" fontSize="12" fontWeight="700">{copy.hubLegend}</text>
            </g>
            <g transform="translate(188 17)">
              <circle cx="8" cy="8" r="8" fill="#2f7a49" />
              <text x="24" y="12" fill="#143823" fontSize="12" fontWeight="700">{copy.stations}</text>
            </g>
            <g transform="translate(402 17)">
              <circle cx="8" cy="8" r="8" fill="#d6aa23" />
              <text x="24" y="12" fill="#143823" fontSize="12" fontWeight="700">{copy.alerts}</text>
            </g>
            <g transform="translate(555 17)">
              <circle cx="8" cy="8" r="8" fill="#4668d8" />
              <text x="24" y="12" fill="#143823" fontSize="12" fontWeight="700">{copy.global}</text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, subtitle }) {
  return (
    <div className="landing-section-intro landing-section-intro-left">
      <div className="landing-section-eyebrow landing-section-eyebrow-left">{eyebrow}</div>
      <h2 className="section-title section-title-left">{title}</h2>
      <p className="section-subtitle section-subtitle-left">{subtitle}</p>
    </div>
  );
}

const copyByLanguage = {
  en: {
    mapEyebrow: "Saudi Production Map",
    mapTitle: "Production map across Saudi regions",
    mapSubtitle: "A clearer view of where major production and monitoring activity meet.",
    mapTitleMini: "Production map",
    mapFacts: [
      { title: "Al-Qassim", text: "Production leader in Saudi palm cultivation." },
      { title: "Al-Ahsa", text: "Strong export reach across international markets." },
      { title: "Madinah", text: "One of the major producing palm regions." },
      { title: "Riyadh", text: "Operational hub for monitoring and coordination." },
    ],
    platformEyebrow: "Platform Capabilities",
    platformTitle: "Three core tools for daily farm decisions",
    platformSubtitle: "A tighter operating view focused on what teams use most.",
    features: [
      {
        title: "Plant Count Analysis",
        text: "Spot weak coverage and uneven growth across each zone.",
      },
      {
        title: "Disease and Pest Identification",
        text: "Detect visible crop stress before it spreads further.",
      },
      {
        title: "Soil Condition Assessment",
        text: "Compare dryness and field stress for better irrigation timing.",
      },
    ],
    workflowEyebrow: "How It Works",
    workflowTitle: "A simple operating flow from field input to response",
    workflowSubtitle: "Four clear steps keep the platform easy to understand.",
    workflow: [
      "Drone captures data",
      "Sensors collect readings",
      "AI analyzes images",
      "Dashboard displays results",
    ],
    contactEyebrow: "Ready to Start",
    contactTitle: "Bring your monitoring workflow into one place.",
    contactText: "Sign in to review live data, manage stations, and coordinate the next response.",
    contactAction: "Open Dashboard",
  },
  ar: {
    mapEyebrow: "خريطة الإنتاج في السعودية",
    mapTitle: "خريطة الإنتاج عبر المناطق السعودية",
    mapSubtitle: "عرض أوضح للمناطق التي يتركز فيها الإنتاج والمتابعة التشغيلية.",
    mapTitleMini: "خريطة الإنتاج",
    mapFacts: [
      { title: "القصيم", text: "المنطقة الأبرز في إنتاج نخيل المملكة." },
      { title: "الأحساء", text: "منطقة ذات وصول تصديري قوي." },
      { title: "المدينة", text: "من أهم المناطق المنتجة للنخيل." },
      { title: "الرياض", text: "مركز للمتابعة وتنسيق العمليات." },
    ],
    platformEyebrow: "قدرات المنصة",
    platformTitle: "ثلاث أدوات أساسية للقرار الزراعي اليومي",
    platformSubtitle: "واجهة تشغيلية أكثر تركيزًا على ما يحتاجه الفريق يوميًا.",
    features: [
      {
        title: "تحليل كثافة النباتات",
        text: "اكتشف ضعف التغطية وتفاوت النمو داخل كل منطقة.",
      },
      {
        title: "اكتشاف الأمراض والآفات",
        text: "اكتشف علامات الإجهاد البصري قبل انتشارها.",
      },
      {
        title: "تقييم حالة التربة",
        text: "قارن الجفاف وإجهاد الحقل لدعم توقيت الري.",
      },
    ],
    workflowEyebrow: "كيف تعمل المنصة",
    workflowTitle: "مسار تشغيلي بسيط من جمع البيانات إلى الاستجابة",
    workflowSubtitle: "أربع خطوات واضحة تجعل المنصة أسهل في الفهم.",
    workflow: [
      "الدرون يجمع البيانات",
      "الحساسات تقرأ المؤشرات",
      "الذكاء الاصطناعي يحلل الصور",
      "لوحة التحكم تعرض النتائج",
    ],
    contactEyebrow: "جاهز للبدء",
    contactTitle: "اجمع سير عمل المراقبة في مكان واحد.",
    contactText: "سجل الدخول لمراجعة البيانات المباشرة وإدارة المحطات وتنسيق الاستجابة التالية.",
    contactAction: "فتح لوحة التحكم",
  },
};

function Landing() {
  const { language } = useLanguage();
  const copy = { ...copyByLanguage.en, ...(copyByLanguage[language] || {}) };

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll(".interactive-reveal"));
    if (!revealItems.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navigation />
      <Hero />

      <section className="section saudi-palm-section interactive-reveal">
        <div className="container">
          <SectionIntro eyebrow={copy.mapEyebrow} title={copy.mapTitle} subtitle={copy.mapSubtitle} />

          <article className="saudi-palm-map-only interactive-card interactive-reveal">
            <div className="saudi-palm-map-layout">
              <div className="saudi-palm-map-main">
                <div className="saudi-palm-map-title">{copy.mapTitleMini}</div>
                <div className="saudi-palm-map-shell interactive-map-frame">
                  <SaudiOperationsMap language={language} />
                </div>
              </div>

              <aside className="saudi-palm-map-facts">
                {copy.mapFacts.map((item) => (
                  <article key={item.title} className="saudi-palm-map-fact interactive-reveal">
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </article>
                ))}
              </aside>
            </div>
          </article>
        </div>
      </section>

      <section id="platform" className="platform-section interactive-reveal">
        <div className="container">
          <SectionIntro eyebrow={copy.platformEyebrow} title={copy.platformTitle} subtitle={copy.platformSubtitle} />

          <div className="row g-4">
            {copy.features.map((item, index) => (
              <div key={item.title} className="col-12 col-md-6 col-xl-4">
                <article className="feature-card interactive-card interactive-reveal">
                  <div className="feature-card-body">
                    <div className="feature-icon" aria-hidden="true">
                      {featureIcons[index]}
                    </div>
                    <div className="feature-title">{item.title}</div>
                    <p className="feature-text">{item.text}</p>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section landing-process-section interactive-reveal">
        <div className="container">
          <SectionIntro eyebrow={copy.workflowEyebrow} title={copy.workflowTitle} subtitle={copy.workflowSubtitle} />

          <div className="row g-4">
            {copy.workflow.map((item, index) => (
              <div key={item} className="col-12 col-md-6 col-xl-3">
                <article className="workflow-card how-it-works-card interactive-card interactive-reveal">
                  <div className="workflow-card-top">
                    <span className="workflow-step">0{index + 1}</span>
                  </div>
                  <span className="workflow-icon" aria-hidden="true">
                    {workflowIcons[index]}
                  </span>
                  <h3 className="workflow-title">{item}</h3>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="contact-band interactive-reveal">
        <div className="container">
          <div className="contact-shell interactive-card interactive-reveal">
            <div className="row align-items-center g-4">
              <div className="col-12 col-lg-8">
                <div className="contact-eyebrow">{copy.contactEyebrow}</div>
                <h2 className="contact-title">{copy.contactTitle}</h2>
                <p className="contact-text">{copy.contactText}</p>
              </div>
              <div className="col-12 col-lg-4 text-lg-end">
                <Link to="/login" className="contact-btn">
                  {copy.contactAction}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default Landing;
