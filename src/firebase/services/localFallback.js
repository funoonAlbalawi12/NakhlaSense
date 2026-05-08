const parseLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeLocal = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const createLocalCollectionStore = (key, defaultItems = []) => {
  const readAll = () => parseLocal(key, defaultItems);

  const notify = (callback) => {
    callback(readAll());
    return () => {};
  };

  const upsert = (id, record) => {
    const current = readAll();
    const next = current.some((item) => item.id === id)
      ? current.map((item) => (item.id === id ? { ...item, ...record } : item))
      : [{ ...record, id }, ...current];
    writeLocal(key, next);
    return next.find((item) => item.id === id);
  };

  const remove = (id) => {
    const next = readAll().filter((item) => item.id !== id);
    writeLocal(key, next);
  };

  return {
    readAll,
    notify,
    upsert,
    remove,
  };
};
