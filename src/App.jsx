import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { LanguageProvider } from "./lib/i18n.jsx";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Market from "./pages/Market.jsx";
import CropDetail from "./pages/CropDetail.jsx";
import Alerts from "./pages/Alerts.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  // Single codebase, two targets (easy + secure — no secrets involved):
  // - Web (Vercel): BrowserRouter with server rewrites (unchanged).
  // - Android (Capacitor WebView): HashRouter, because there is no server
  //   on-device to rewrite /market -> index.html. Hash routes (#/market)
  //   resolve locally from the bundled index.html.
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;
  return (
    <Router>
      <LanguageProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="market" element={<Market />} />
            <Route path="crop" element={<CropDetail />} />
            <Route path="alerts" element={<Alerts />} />
            {/* Removed sections — keep old bookmarks working by sending them home. */}
            <Route path="farmers" element={<Navigate to="/market" replace />} />
            <Route path="dashboard-farmer" element={<Navigate to="/" replace />} />
            {/* Auth removed — the app is fully open, no login required.
                Keep old bookmarks working by sending them to home. */}
            <Route path="login" element={<Navigate to="/" replace />} />
            <Route path="register" element={<Navigate to="/" replace />} />
            <Route path="profile" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </LanguageProvider>
    </Router>
  );
}
