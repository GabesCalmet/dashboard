"use client";

import { useEffect } from "react";

// Registers the service worker (see public/sw.js) once the page is
// interactive. Silently no-ops in browsers without support — nothing here
// is required for the app to work normally.
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
