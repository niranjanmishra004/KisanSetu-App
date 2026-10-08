import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Navbar, Footer, LocationModal } from "./chrome.jsx";
import { getSavedLocation, warmMarketApi } from "../lib/api.js";
import { useLang } from "../lib/i18n.jsx";

export default function Layout() {
  const { t } = useLang();
  const [location, setLocation] = useState(() => getSavedLocation());
  const [locOpen, setLocOpen] = useState(false);
  const [online, setOnline] = useState(true);

  // Wake the free-tier backend on first paint so it is (hopefully) warm by
  // the time the user opens Market. Fire-and-forget, never blocks render.
  useEffect(() => {
    warmMarketApi();
  }, []);

  // Connectivity: native Network plugin on Android, browser events on web.
  // While offline the pages keep working from saved prices (see the banner).
  useEffect(() => {
    let cleanup = null;
    let cancelled = false;
    async function setup() {
      if (Capacitor.isNativePlatform()) {
        try {
          const { Network } = await import("@capacitor/network");
          if (cancelled) return;
          const status = await Network.getStatus();
          if (!cancelled) setOnline(!!status.connected);
          const handle = await Network.addListener("networkStatusChange", (s) => {
            setOnline(!!s.connected);
          });
          cleanup = () => {
            handle.remove().catch(() => {});
          };
          return;
        } catch {
          /* fall through to browser events */
        }
      }
      if (cancelled) return;
      setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
      const goOn = () => setOnline(true);
      const goOff = () => setOnline(false);
      window.addEventListener("online", goOn);
      window.addEventListener("offline", goOff);
      cleanup = () => {
        window.removeEventListener("online", goOn);
        window.removeEventListener("offline", goOff);
      };
    }
    setup();
    return () => {
      cancelled = true;
      try {
        if (cleanup) cleanup();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        {t("skip")}
      </a>
      {!online && (
        <div className="offline-banner" role="status">
          {t("live.offline")}
        </div>
      )}
      <div id="site-navbar">
        <Navbar location={location} onOpenLocation={() => setLocOpen(true)} />
      </div>
      <Outlet context={{ location, setLocation, openLocation: () => setLocOpen(true) }} />
      <div id="site-footer">
        <Footer />
      </div>
      <LocationModal open={locOpen} onClose={() => setLocOpen(false)} onSaved={setLocation} />
    </>
  );
}
