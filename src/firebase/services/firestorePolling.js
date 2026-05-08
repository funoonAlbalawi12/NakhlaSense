export const subscribeWithPolling = (load, intervalMs = 12000) => {
  let disposed = false;

  const run = async () => {
    if (disposed) {
      return;
    }

    try {
      await load();
    } catch {
      // Errors are handled inside each service so the UI can decide what to show.
    }
  };

  run();
  const timer = window.setInterval(run, intervalMs);

  return () => {
    disposed = true;
    window.clearInterval(timer);
  };
};
