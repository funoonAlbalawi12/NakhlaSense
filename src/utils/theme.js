const STORAGE_KEY = "nakhlasense-theme";
const DARK_THEME = "dark";
const LIGHT_THEME = "light";

export const getStoredTheme = () => {
  if (typeof window === "undefined") {
    return LIGHT_THEME;
  }

  return window.localStorage.getItem(STORAGE_KEY) || LIGHT_THEME;
};

export const applyTheme = (theme) => {
  if (typeof document === "undefined") {
    return;
  }

  const safeTheme = theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
  document.body.dataset.theme = safeTheme;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, safeTheme);
  }
};

export const setTheme = (theme) => {
  applyTheme(theme);
  return theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
};

export const toggleTheme = (currentTheme) => {
  const nextTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
  return setTheme(nextTheme);
};

export const initializeTheme = () => {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
};
