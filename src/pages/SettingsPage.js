import { useEffect, useState } from "react";
import {
  Bell,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Edit3,
  FileText,
  Globe2,
  HelpCircle,
  Link2,
  Lock,
  LogOut,
  Moon,
  RefreshCcw,
  Save,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Users,
} from "lucide-react";
import Navigation from "../components/Navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getStoredTheme, setTheme as applySelectedTheme } from "../utils/theme";
import {
  getUserProfile,
  updateUserProfileSettings,
} from "../firebase/services/userProfileService";
import "./SettingsPage.css";

const TIMEZONE_OPTIONS = ["(UTC+03:00) Riyadh", "(UTC+00:00) UTC"];
const UNIT_OPTIONS = ["Metric (C, km, ha)", "Imperial (F, mi, ac)"];
const STATION_VIEW_OPTIONS = ["All Stations", "My Stations"];
const DATE_RANGE_OPTIONS = ["Last 7 Days", "Last 30 Days", "Today"];
const MAP_LAYER_OPTIONS = ["Satellite", "Map"];

const getDefaultPreferences = (language, theme) => ({
  theme: theme || getStoredTheme(),
  language: language === "ar" ? "ar" : "en",
  timezone: TIMEZONE_OPTIONS[0],
  units: UNIT_OPTIONS[0],
  defaultStationView: STATION_VIEW_OPTIONS[0],
  defaultDateRange: DATE_RANGE_OPTIONS[0],
  defaultMapLayer: MAP_LAYER_OPTIONS[0],
  autoRefresh: true,
});

const getNextOption = (options, current) => {
  const currentIndex = options.indexOf(current);
  return options[(currentIndex + 1 + options.length) % options.length];
};

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { user, logout, updateCurrentUser } = useAuth();
  const [theme, setTheme] = useState(getStoredTheme);
  const [preferences, setPreferences] = useState(() =>
    getDefaultPreferences(language, getStoredTheme())
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [preferencesNotice, setPreferencesNotice] = useState("");
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
  });

  const userDisplayName =
    String(user?.name || "").trim() ||
    String(user?.email || "User").split("@")[0] ||
    "User";
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const userEmail = user?.email || "No email";

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      const currentLanguage =
        typeof window !== "undefined" && window.localStorage.getItem("nakhla_language") === "ar"
          ? "ar"
          : "en";
      const fallbackPreferences = getDefaultPreferences(currentLanguage, getStoredTheme());

      if (!user?.uid) {
        if (!isActive) {
          return;
        }

        setProfileForm({
          fullName: userDisplayName,
          email: userEmail,
        });
        setPreferences(fallbackPreferences);
        return;
      }

      try {
        const profile = await getUserProfile(user);
        if (!isActive) {
          return;
        }

        const savedPreferences = profile?.preferences || {};
        const nextTheme = savedPreferences.theme || fallbackPreferences.theme;
        const nextLanguage = savedPreferences.language || fallbackPreferences.language;

        setProfileForm({
          fullName: String(profile?.name || userDisplayName).trim() || userDisplayName,
          email: profile?.email || userEmail,
        });
        setPreferences({
          ...getDefaultPreferences(nextLanguage, nextTheme),
          ...savedPreferences,
          theme: nextTheme,
          language: nextLanguage,
        });
        setTheme(nextTheme);
        applySelectedTheme(nextTheme);

        if (nextLanguage !== currentLanguage) {
          setLanguage(nextLanguage);
        }
      } catch (error) {
        console.error("Unable to load settings profile", error);
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [setLanguage, user, userDisplayName, userEmail]);

  const handleProfileChange = (field, value) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updatePreference = (field, value) => {
    setPreferences((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const savePreferences = async (nextPreferences, successMessage) => {
    setIsSavingPreferences(true);
    setPreferencesNotice("");

    try {
      if (user?.uid) {
        await updateUserProfileSettings(user, {
          preferences: nextPreferences,
        });
      }

      setPreferences(nextPreferences);
      setPreferencesNotice(successMessage);
    } catch (error) {
      console.error("Unable to save settings preferences", error);
      setPreferencesNotice("We couldn't save your preferences right now.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleProfileCancel = () => {
    setProfileForm({
      fullName: userDisplayName,
      email: userEmail,
    });
    setProfileNotice("");
    setIsEditingProfile(false);
  };

  const handleProfileSave = async () => {
    const nextName = String(profileForm.fullName || "").trim();

    if (!nextName) {
      setProfileNotice("Full name cannot be empty.");
      return;
    }

    setIsSavingProfile(true);
    setProfileNotice("");

    try {
      const savedProfile = user?.uid
        ? await updateUserProfileSettings(user, { name: nextName })
        : { name: nextName };

      updateCurrentUser({
        name: savedProfile?.name || nextName,
      });
      setProfileForm((current) => ({
        ...current,
        fullName: savedProfile?.name || nextName,
      }));
      setProfileNotice("Profile updated successfully.");
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Unable to update profile", error);
      setProfileNotice("We couldn't save your profile right now.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleThemeChange = (nextTheme) => {
    if (nextTheme === theme) {
      return;
    }

    setTheme(nextTheme);
    applySelectedTheme(nextTheme);
    updatePreference("theme", nextTheme);
  };

  const handleLanguageChange = () => {
    const nextLanguage = language === "ar" ? "en" : "ar";
    setLanguage(nextLanguage);
    updatePreference("language", nextLanguage);
  };

  const handleResetDefaults = async () => {
    const defaultPreferences = getDefaultPreferences("en", "light");
    setLanguage(defaultPreferences.language);
    setTheme(defaultPreferences.theme);
    applySelectedTheme(defaultPreferences.theme);
    await savePreferences(defaultPreferences, "Preferences reset to defaults.");
  };

  return (
    <main className="settings-workspace-page">
      <Navigation navPreset="operator-core" />

      <div className="settings-page container-fluid">
        <section className="settings-workspace-shell">
          <div className="settings-workspace-container">
            <div className="settings-workspace-hero">
              <div>
                <div className="settings-workspace-title">
                  <Settings />
                  <h1>Settings</h1>
                </div>
                <p>Adjust how the workspace works for you and your team.</p>
              </div>

              <button
                type="button"
                className="settings-reset-button"
                onClick={handleResetDefaults}
                disabled={isSavingPreferences}
              >
                <RefreshCcw />
                Reset to Defaults
              </button>
            </div>

            <div className="settings-workspace-grid">
              <aside className="settings-sidebar-panel">
                <p className="settings-sidebar-label">Account</p>
                <div className="settings-sidebar-list">
                  <SidebarButton icon={<User />} label="Profile Overview" active />
                  <SidebarButton icon={<Settings />} label="Settings" />
                  <SidebarButton icon={<ShieldCheck />} label="Security" />
                  <SidebarButton icon={<Bell />} label="Notifications" />
                  <SidebarButton icon={<Link2 />} label="API & Integrations" />
                  <SidebarButton icon={<Users />} label="Team Management" />
                  <SidebarButton icon={<Clock />} label="Activity Log" />
                </div>

                <div className="settings-sidebar-divider" />

                <p className="settings-sidebar-label">Support</p>
                <div className="settings-sidebar-list">
                  <SidebarButton icon={<HelpCircle />} label="Help Center" />
                  <SidebarButton icon={<Bell />} label="Contact Support" />
                  <button type="button" className="settings-sidebar-logout" onClick={logout}>
                    <LogOut />
                    Logout
                  </button>
                </div>
              </aside>

              <section className="settings-main-column">
                <SettingsCard
                  icon={<Sun />}
                  title="Appearance"
                  subtitle="Choose your preferred theme and display options."
                  right={<ThemeToggle theme={theme} onSelect={handleThemeChange} />}
                />
                <SettingsCard
                  icon={<Globe2 />}
                  title="Language & Region"
                  subtitle="Select your language and regional preferences."
                  right={
                    <SelectButton
                      label={language === "ar" ? "Arabic" : "English"}
                      onClick={handleLanguageChange}
                    />
                  }
                />
                <SettingsCard
                  icon={<Clock />}
                  title="Date & Time"
                  subtitle="Configure timezone and date/time format."
                  right={
                    <SelectButton
                      label={preferences.timezone}
                      onClick={() =>
                        updatePreference(
                          "timezone",
                          getNextOption(TIMEZONE_OPTIONS, preferences.timezone)
                        )
                      }
                    />
                  }
                />
                <SettingsCard
                  icon={<Database />}
                  title="Units & Measurements"
                  subtitle="Set units for weather, distance, and area."
                  right={
                    <SelectButton
                      label={preferences.units}
                      onClick={() =>
                        updatePreference("units", getNextOption(UNIT_OPTIONS, preferences.units))
                      }
                    />
                  }
                />
                <SettingsCard
                  icon={<FileText />}
                  title="Data Preferences"
                  subtitle="Manage default filters and data display settings."
                  arrow
                />
                <SettingsCard
                  icon={<Bell />}
                  title="Alerts & Escalation"
                  subtitle="Configure alert rules and escalation preferences."
                  arrow
                />
                <SettingsCard
                  icon={<ShieldCheck />}
                  title="System Preferences"
                  subtitle="Manage system behavior and advanced options."
                  arrow
                />
              </section>

              <aside className="settings-profile-panel">
                <div className="settings-profile-head">
                  <h2>Profile Overview</h2>
                  {!isEditingProfile ? (
                    <button
                      type="button"
                      className="settings-profile-edit"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <Edit3 />
                      Edit Profile
                    </button>
                  ) : null}
                </div>

                <div className="settings-profile-avatar-wrap">
                  <div className="settings-profile-avatar">
                    {userInitial}
                    <button type="button" className="settings-avatar-camera">
                      <Camera />
                    </button>
                  </div>
                  <p>{userDisplayName}</p>
                  <span>OPERATOR</span>
                </div>

                <div className="settings-profile-fields">
                  <ProfileRow
                    label="Full Name"
                    value={profileForm.fullName}
                    editable={isEditingProfile}
                    onChange={(value) => handleProfileChange("fullName", value)}
                  />
                  <ProfileRow label="Email" value={profileForm.email} />
                  <ProfileRow label="Role" value="Operator" />
                  <ProfileRow label="Access Level" value="Operator" />
                  <ProfileRow label="Status" value="Signed in" success />
                  <ProfileRow label="Member Since" value="Apr 15, 2026" />
                  <ProfileRow label="Last Login" value="Apr 20, 2026 · 5:30 PM" />
                </div>

                <div className="settings-profile-actions">
                  {profileNotice ? <p className="settings-inline-notice">{profileNotice}</p> : null}
                  {!isEditingProfile ? (
                    <button
                      type="button"
                      className="settings-profile-primary"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <Edit3 />
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="settings-profile-primary"
                        onClick={handleProfileSave}
                        disabled={isSavingProfile}
                      >
                        <Save />
                        {isSavingProfile ? "Saving..." : "Save Profile"}
                      </button>
                      <button
                        type="button"
                        className="settings-profile-secondary"
                        onClick={handleProfileCancel}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button type="button" className="settings-profile-secondary">
                    <Lock />
                    Change Password
                  </button>
                </div>
              </aside>
            </div>

            <section className="settings-quick-panel">
              <div className="settings-quick-head">
                <div>
                  <h2>Quick Preferences</h2>
                  <p>Quickly update your most common preferences.</p>
                </div>
                <button
                  type="button"
                  className="settings-save-button"
                  onClick={() => savePreferences(preferences, "Preferences saved successfully.")}
                  disabled={isSavingPreferences}
                >
                  <Save />
                  {isSavingPreferences ? "Saving..." : "Save Preferences"}
                </button>
              </div>
              {preferencesNotice ? (
                <p className="settings-inline-notice settings-inline-notice-wide">
                  {preferencesNotice}
                </p>
              ) : null}

              <div className="settings-quick-grid">
                <PreferenceSelect
                  label="Default Station View"
                  value={preferences.defaultStationView}
                  onClick={() =>
                    updatePreference(
                      "defaultStationView",
                      getNextOption(STATION_VIEW_OPTIONS, preferences.defaultStationView)
                    )
                  }
                />
                <PreferenceSelect
                  label="Default Date Range"
                  value={preferences.defaultDateRange}
                  onClick={() =>
                    updatePreference(
                      "defaultDateRange",
                      getNextOption(DATE_RANGE_OPTIONS, preferences.defaultDateRange)
                    )
                  }
                />
                <PreferenceSelect
                  label="Default Map Layer"
                  value={preferences.defaultMapLayer}
                  onClick={() =>
                    updatePreference(
                      "defaultMapLayer",
                      getNextOption(MAP_LAYER_OPTIONS, preferences.defaultMapLayer)
                    )
                  }
                />
                <div className="settings-toggle-card">
                  <p>Auto Refresh Data</p>
                  <button
                    type="button"
                    className={`settings-switch ${preferences.autoRefresh ? "active" : ""}`}
                    onClick={() => updatePreference("autoRefresh", !preferences.autoRefresh)}
                    aria-pressed={preferences.autoRefresh}
                  >
                    <span />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarButton({ icon, label, active = false }) {
  return (
    <button type="button" className={`settings-sidebar-button ${active ? "active" : ""}`}>
      {icon}
      {label}
    </button>
  );
}

function SettingsCard({ icon, title, subtitle, right, arrow = false }) {
  return (
    <article className="settings-card">
      <div className="settings-card-copy">
        <div className="settings-card-icon">{icon}</div>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {right}
      {arrow ? <ChevronRight className="settings-card-arrow" /> : null}
    </article>
  );
}

function ThemeToggle({ theme, onSelect }) {
  return (
    <div className="settings-theme-toggle">
      <button
        type="button"
        className={theme === "light" ? "active" : ""}
        onClick={() => onSelect("light")}
      >
        <Sun />
      </button>
      <button
        type="button"
        className={theme === "dark" ? "active" : ""}
        onClick={() => onSelect("dark")}
      >
        <Moon />
      </button>
    </div>
  );
}

function SelectButton({ label, onClick }) {
  return (
    <button type="button" className="settings-select-button" onClick={onClick}>
      {label}
      <ChevronDown />
    </button>
  );
}

function ProfileRow({ label, value, success = false, editable = false, onChange }) {
  return (
    <div className="settings-profile-row">
      <span>{label}</span>
      {editable ? (
        <input
          type="text"
          className="settings-profile-input"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
        />
      ) : (
        <strong className={success ? "is-success" : ""}>{value}</strong>
      )}
    </div>
  );
}

function PreferenceSelect({ label, value, onClick }) {
  return (
    <div className="settings-pref-card">
      <p>{label}</p>
      <button type="button" className="settings-select-button wide" onClick={onClick}>
        {value}
        <ChevronDown />
      </button>
    </div>
  );
}
