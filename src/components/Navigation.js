import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, FileBarChart2, Gauge, Grid2x2, LogOut, Map, RadioTower, Settings as SettingsIcon, Sprout, Sun, User, Users, Waves } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { PERMISSIONS, ROLES } from "../auth/permissions";
import { getStoredTheme, toggleTheme } from "../utils/theme";
import "./Navigation.css";

function Navigation({ navPreset = "default" }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getStoredTheme);
  const menuRef = useRef(null);
  const sideMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { language, isRTL } = useLanguage();
  const isAuthenticated = Boolean(user);
  const isLanding = location.pathname === "/";

  const copy = {
    en: {
      dashboard: "Dashboard",
      stations: "Stations",
      stationsManagement: "Stations Management",
      alerts: "Alerts",
      zones: "Zones",
      cropHealth: "Crop Health",
      reports: "Reports",
      users: "Users",
      weather: "Weather",
      profile: "Profile",
      email: "Email",
      access: "Access",
      status: "Status",
      signedIn: "Signed in",
      profileOverview: "Profile Overview",
      userSettings: "User Settings",
      logout: "Logout",
      platform: "Platform",
      contact: "Contact",
      home: "Home",
      login: "Login",
      account: "account",
      language: "Language",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      noEmail: "No email",
      workspace: "Workspace",
      sideMenu: "Side Menu",
      quickPages: "Quick Pages",
      tools: "Tools",
      appearance: "Appearance",
      darkMode: "Dark mode",
      lightMode: "Light mode",
      settings: "Settings",
      openSideMenu: "Open side menu",
      closeSideMenu: "Close side menu",
      openPage: "Open page",
    },
    ar: {
      dashboard: "لوحة التحكم",
      stations: "المحطات",
      stationsManagement: "إدارة المحطات",
      alerts: "التنبيهات",
      zones: "المناطق",
      cropHealth: "صحة المحصول",
      cropGuide: "دليل المحصول",
      reports: "التقارير",
      users: "المستخدمون",
      weather: "الطقس",
      profile: "الملف الشخصي",
      email: "البريد الإلكتروني",
      access: "الصلاحية",
      status: "الحالة",
      signedIn: "تم تسجيل الدخول",
      profileOverview: "نظرة عامة",
      userSettings: "إعدادات المستخدمين",
      logout: "تسجيل الخروج",
      platform: "المنصة",
      contact: "تواصل",
      home: "الرئيسية",
      login: "تسجيل الدخول",
      account: "حساب",
      language: "اللغة",
      openMenu: "فتح القائمة",
      closeMenu: "إغلاق القائمة",
      noEmail: "لا يوجد بريد",
      workspace: "مساحة العمل",
      sideMenu: "القائمة الجانبية",
      quickPages: "صفحات سريعة",
      tools: "أدوات",
      appearance: "المظهر",
      darkMode: "الوضع الداكن",
      lightMode: "الوضع الفاتح",
      settings: "الإعدادات",
      openSideMenu: "فتح القائمة الجانبية",
      closeSideMenu: "إغلاق القائمة الجانبية",
      openPage: "فتح الصفحة",
    },
  }[language];
  const missionsLabel = language === "ar" ? "المهام" : "Missions";
  const weatherNavLabel =
    user?.role === ROLES.OPERATOR
      ? language === "ar"
        ? "سلامة قبل الرحلة"
        : "Pre-Flight Safety"
      : user?.role === ROLES.FARMER
      ? language === "ar"
        ? "ظروف الحقل"
        : "Field Conditions"
      : copy.weather;

  const navLinks = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }

    const items = [];

    if (hasPermission(PERMISSIONS.VIEW_DASHBOARD)) {
      items.push({ to: "/dashboard", label: copy.dashboard, priority: 1 });
    }

    if (hasPermission(PERMISSIONS.MANAGE_STATIONS)) {
      items.push({
        to: "/stations-management",
        label: copy.stations,
        menuLabel: copy.stationsManagement,
        priority: 2,
      });
    } else if (hasPermission(PERMISSIONS.VIEW_STATIONS)) {
      items.push({ to: "/stations", label: copy.stations, priority: 2 });
    }

    if (hasPermission(PERMISSIONS.VIEW_ALERTS)) {
      items.push({ to: "/alerts", label: copy.alerts, priority: 3 });
    }

    if (hasPermission(PERMISSIONS.VIEW_DASHBOARD) && user?.role !== ROLES.FARMER) {
      items.push({ to: "/missions", label: missionsLabel, priority: 4 });
    }

    if (hasPermission(PERMISSIONS.MANAGE_ZONES)) {
      items.push({ to: "/zones", label: copy.zones, priority: 8 });
    }

    if (hasPermission(PERMISSIONS.VIEW_CROP_HEALTH) && user?.role !== ROLES.OPERATOR) {
      items.push({ to: "/crop-health", label: copy.cropHealth, priority: 5 });
    }

    if (hasPermission(PERMISSIONS.VIEW_REPORTS)) {
      items.push({ to: "/reports", label: copy.reports, priority: 7 });
    }

    if (hasPermission(PERMISSIONS.MANAGE_USERS)) {
      items.push({ to: "/users", label: copy.users, priority: 9 });
    }

    if (navPreset === "operator-core") {
      return items.filter((item) =>
        ["/dashboard", "/stations", "/stations-management", "/alerts", "/missions"].includes(item.to)
      );
    }

    return items;
  }, [copy, hasPermission, isAuthenticated, missionsLabel, navPreset, user?.role]);

  const primaryNavLinks = useMemo(
    () => navLinks.filter((item) => (item.priority || 99) <= 6),
    [navLinks]
  );

  const overflowNavLinks = useMemo(
    () => navLinks.filter((item) => (item.priority || 99) > 6),
    [navLinks]
  );

  const sideMenuGroups = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }

    const tools = [];

    if (hasPermission(PERMISSIONS.VIEW_WEATHER)) {
      tools.push({ to: "/weather", label: weatherNavLabel });
    }

    tools.push({ to: "/settings", label: copy.settings });

    return [
      {
        title: copy.quickPages,
        items: [...primaryNavLinks, ...overflowNavLinks].map((item) => ({
          ...item,
          label: item.menuLabel || item.label,
        })),
      },
      { title: copy.tools, items: tools },
    ];
  }, [
    copy.quickPages,
    copy.settings,
    copy.tools,
    hasPermission,
    isAuthenticated,
    overflowNavLinks,
    primaryNavLinks,
    weatherNavLabel,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }

      if (sideMenuOpen && !sideMenuRef.current?.contains(event.target)) {
        setSideMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sideMenuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileMenuOpen(false);
    setSideMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMenuOpen(false);
    setMobileMenuOpen(false);
    setSideMenuOpen(false);
    logout();
    navigate("/");
  };

  const handleThemeToggle = () => {
    setTheme((currentTheme) => toggleTheme(currentTheme));
  };

  const brandTarget = isAuthenticated ? "/dashboard" : "/";
  const userDisplayName =
    String(user?.name || "").trim() ||
    String(user?.email || "User").split("@")[0] ||
    "User";
  const userInitial = String(user?.email || "U").trim().charAt(0).toUpperCase();
  const roleLabel = String(user?.role || "user").toUpperCase();
  const navIcons = {
    "/dashboard": Grid2x2,
    "/stations": RadioTower,
    "/stations-management": RadioTower,
    "/alerts": Bell,
    "/missions": Gauge,
    "/zones": Map,
    "/crop-health": Sprout,
    "/reports": FileBarChart2,
    "/users": Users,
    "/weather": Sun,
    "/settings": Waves,
  };

  return (
    <>
      <nav
        className={`navbar-pro ${isAuthenticated ? "navbar-authenticated" : ""} ${isRTL ? "navbar-rtl" : ""} ${
          isLanding && !isAuthenticated ? "navbar-landing" : ""
        } ${scrolled ? "navbar-solid" : ""}`}
      >
        <div className="navbar-container">
          <Link to={brandTarget} className="navbar-brand">
            <img src="/nakhlasense-logo.png" alt="NakhlaSense logo" className="navbar-brand-logo" />
            <span className="navbar-brand-text">
              Nakhla<span className="brand-accent">Sense</span>
            </span>
          </Link>

          <button
            type="button"
            className={`navbar-mobile-toggle ${mobileMenuOpen ? "open" : ""}`}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? copy.closeMenu : copy.openMenu}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {isAuthenticated ? (
            <>
              <div className="navbar-links">
                {primaryNavLinks.map((item) => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
                    {navIcons[item.to] ? (
                      <span className="navbar-link-icon" aria-hidden="true">
                        {(() => {
                          const Icon = navIcons[item.to];
                          return <Icon size={17} strokeWidth={2.2} />;
                        })()}
                      </span>
                    ) : null}
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="navbar-auth">
                <button
                  type="button"
                  className={`navbar-theme-chip ${theme === "dark" ? "dark" : ""}`}
                  onClick={handleThemeToggle}
                >
                  {theme === "dark" ? copy.darkMode : copy.lightMode}
                </button>
                <div className="user-menu" ref={menuRef}>
                  <button
                    type="button"
                    className={`user-menu-trigger ${menuOpen ? "open" : ""}`}
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    <span className="user-avatar">{userInitial}</span>
                    <span className="user-menu-copy">
                      <strong>{userDisplayName}</strong>
                      <small>{roleLabel}</small>
                    </span>
                    <span className="user-menu-caret" aria-hidden="true">
                      {menuOpen ? "▴" : "▾"}
                    </span>
                  </button>

                  {menuOpen && (
                    <div className="user-menu-panel">
                      <div className="user-menu-panel-head">
                        <span className="user-avatar profile">{userInitial}</span>
                        <div className="user-menu-panel-identity">
                          <strong>{userDisplayName}</strong>
                          <small>{roleLabel}</small>
                          <p>{user?.email || copy.noEmail}</p>
                          <div className="user-menu-status">
                            <span className="user-menu-status-dot" aria-hidden="true" />
                            <span>{copy.signedIn}</span>
                          </div>
                        </div>
                      </div>

                      <div className="user-menu-actions">
                        <button
                          type="button"
                          className="user-menu-action"
                          onClick={() => {
                            setMenuOpen(false);
                            navigate("/dashboard");
                          }}
                        >
                          <span className="user-menu-action-icon" aria-hidden="true">
                            <User size={24} strokeWidth={2.2} />
                          </span>
                          <span className="user-menu-action-copy">
                            <strong>{copy.profileOverview}</strong>
                            <small>View and manage your profile</small>
                          </span>
                          <span className="user-menu-action-arrow" aria-hidden="true">
                            <ChevronRight size={20} strokeWidth={2.2} />
                          </span>
                        </button>
                        <button
                          type="button"
                          className="user-menu-action"
                          onClick={() => {
                            setMenuOpen(false);
                            navigate("/settings");
                          }}
                        >
                          <span className="user-menu-action-icon" aria-hidden="true">
                            <SettingsIcon size={24} strokeWidth={2.2} />
                          </span>
                          <span className="user-menu-action-copy">
                            <strong>{copy.settings}</strong>
                            <small>Workspace and preferences</small>
                          </span>
                          <span className="user-menu-action-arrow" aria-hidden="true">
                            <ChevronRight size={20} strokeWidth={2.2} />
                          </span>
                        </button>
                        {hasPermission(PERMISSIONS.MANAGE_USERS) && (
                          <button
                            type="button"
                            className="user-menu-action"
                            onClick={() => {
                              setMenuOpen(false);
                              navigate("/users");
                            }}
                          >
                            <span className="user-menu-action-icon" aria-hidden="true">
                              <Users size={24} strokeWidth={2.2} />
                            </span>
                            <span className="user-menu-action-copy">
                              <strong>{copy.userSettings}</strong>
                              <small>Manage team access</small>
                            </span>
                            <span className="user-menu-action-arrow" aria-hidden="true">
                              <ChevronRight size={20} strokeWidth={2.2} />
                            </span>
                          </button>
                        )}
                        <button type="button" onClick={handleLogout} className="logout-btn">
                          <span className="user-menu-action-icon danger" aria-hidden="true">
                            <LogOut size={24} strokeWidth={2.2} />
                          </span>
                          <span className="user-menu-action-copy">
                            <strong>{copy.logout}</strong>
                            <small>Sign out from your account</small>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="navbar-links">
                {isLanding ? (
                  <>
                    <a href="#platform">{copy.platform}</a>
                    <a href="#contact">{copy.contact}</a>
                  </>
                ) : (
                  <Link to="/">{copy.home}</Link>
                )}
              </div>

              <div className="navbar-auth">
                <Link to="/login" className="navbar-btn">
                  {copy.login}
                </Link>
              </div>
            </>
          )}
        </div>

        <div className={`navbar-mobile-panel ${mobileMenuOpen ? "open" : ""}`}>
          <div className="navbar-mobile-inner">
            {isAuthenticated ? (
              <>
                <div className="navbar-mobile-links">
                  {[...primaryNavLinks, ...overflowNavLinks].map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => (isActive ? "active" : "")}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {navIcons[item.to] ? (
                        <span className="navbar-link-icon" aria-hidden="true">
                          {(() => {
                            const Icon = navIcons[item.to];
                            return <Icon size={17} strokeWidth={2.2} />;
                          })()}
                        </span>
                      ) : null}
                      {item.menuLabel || item.label}
                    </NavLink>
                  ))}
                </div>

                <div className="navbar-mobile-actions">
                  <button
                    type="button"
                    className={`navbar-theme-chip ${theme === "dark" ? "dark" : ""}`}
                    onClick={handleThemeToggle}
                  >
                    {theme === "dark" ? copy.darkMode : copy.lightMode}
                  </button>
                  <button
                    type="button"
                    className="user-menu-action"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/settings");
                    }}
                  >
                    {copy.settings}
                  </button>
                  <button
                    type="button"
                    className="user-menu-action"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/dashboard");
                    }}
                  >
                    {copy.profileOverview}
                  </button>
                  {hasPermission(PERMISSIONS.MANAGE_USERS) && (
                    <button
                      type="button"
                      className="user-menu-action"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/users");
                      }}
                    >
                      {copy.userSettings}
                    </button>
                  )}
                  <button type="button" onClick={handleLogout} className="logout-btn">
                    {copy.logout}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="navbar-mobile-links">
                  {isLanding ? (
                    <>
                      <a href="#platform" onClick={() => setMobileMenuOpen(false)}>
                        {copy.platform}
                      </a>
                      <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
                        {copy.contact}
                      </a>
                    </>
                  ) : (
                    <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                      {copy.home}
                    </Link>
                  )}
                </div>

                <div className="navbar-mobile-actions">
                  <Link to="/login" className="navbar-btn" onClick={() => setMobileMenuOpen(false)}>
                    {copy.login}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {isAuthenticated ? (
        <div className={`side-menu-shell ${sideMenuOpen ? "open" : ""}`}>
          <button
            type="button"
            className="side-menu-backdrop"
            aria-label={copy.closeSideMenu}
            onClick={() => setSideMenuOpen(false)}
          />
          <aside className="side-menu-panel" ref={sideMenuRef}>
            <div className="side-menu-head">
              <div>
                <small>{copy.workspace}</small>
                <strong>{copy.sideMenu}</strong>
              </div>
              <button
                type="button"
                className="side-menu-close"
                aria-label={copy.closeSideMenu}
                onClick={() => setSideMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="side-menu-user">
              <span className="user-avatar">{userInitial}</span>
              <div>
                <strong>{userDisplayName}</strong>
                <span>{roleLabel}</span>
              </div>
            </div>

            <div className="side-menu-section">
              <small>{copy.appearance}</small>
              <button
                type="button"
                className={`side-menu-theme-toggle ${theme === "dark" ? "dark" : ""}`}
                onClick={handleThemeToggle}
              >
                {theme === "dark" ? copy.darkMode : copy.lightMode}
              </button>
            </div>

            {sideMenuGroups.map((group) => (
              <div key={group.title} className="side-menu-section">
                <small>{group.title}</small>
                <div className="side-menu-links">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `side-menu-link ${isActive ? "active" : ""}`}
                      onClick={() => setSideMenuOpen(false)}
                    >
                      {navIcons[item.to] ? (
                        <span className="side-menu-link-icon" aria-hidden="true">
                          {(() => {
                            const Icon = navIcons[item.to];
                            return <Icon size={18} strokeWidth={2.2} />;
                          })()}
                        </span>
                      ) : null}
                      <strong>{item.label}</strong>
                      <span>{copy.openPage}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default Navigation;
