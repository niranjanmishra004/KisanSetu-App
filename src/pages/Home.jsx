import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { getAllPricesProgressive, getCachedPrices, dedupePriceRows, getLocations, detectLocation, saveLocation } from "../lib/api.js";
import { LanguageSelect } from "../components/chrome.jsx";
import { useLang } from "../lib/i18n.jsx";

function readSavedLocationRaw() {
  try {
    return JSON.parse(localStorage.getItem("kisansetu_location") || "null");
  } catch {
    return null;
  }
}

function topTrending(rows) {
  // Most-reported crops first — marketsCount is a real backend signal.
  // (The API exposes no trend data, so nothing here is estimated.)
  return [...(rows || [])]
    .filter((r) => r && r.crop && r.price)
    .sort((a, b) => (b.price.marketsCount || 0) - (a.price.marketsCount || 0))
    .slice(0, 6);
}

export default function Home() {
  const { t, cropName, cropLocal, unitName } = useLang();
  const { openLocation } = useOutletContext();
  const navigate = useNavigate();
  const [hero, setHero] = useState("");
  // Seed from last visit's cache (genuinely observed live prices),
  // then stream fresh live rows in below.
  const [trending, setTrending] = useState(() => topTrending(getCachedPrices("")));
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Mobile-only dropdown for trending crops (desktop always shows the strip)
  const [trendOpen, setTrendOpen] = useState(false);
  // Optional state filter for the hero search — empty means "All India".
  const [stateSel, setStateSel] = useState("");
  const [states, setStates] = useState([]);
  // locBox: { kind: 'detecting' } | { kind: 'saved', loc } | { kind: 'denied' } | { kind: 'unavailable' }
  const [locBox, setLocBox] = useState({ kind: "detecting" });

  useEffect(() => {
    getLocations().then((l) => {
      setStates(Object.keys(l));
      const saved = readSavedLocationRaw();
      setStateSel((saved && saved.state) || "");
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    // Stream live rows in per crop (first paint fast). No demo fallback:
    // an empty result keeps last-known real prices if any, else shows an
    // honest message with a retry button.
    getAllPricesProgressive("", {
      onBatch: (batch) => {
        if (!cancelled && batch.length) {
          setTrending((prev) => topTrending(dedupePriceRows([...prev, ...batch])));
        }
      },
    }).then((rows) => {
      if (cancelled) return;
      setLoaded(true);
      if (rows && rows.length) {
        setTrending(topTrending(rows));
      }
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    const saved = readSavedLocationRaw();
    if (saved) {
      setLocBox({ kind: "saved", loc: saved });
      return;
    }
    if (!navigator.geolocation) {
      setLocBox({ kind: "unavailable" });
      return;
    }
    setLocBox({ kind: "detecting" });
    navigator.geolocation.getCurrentPosition(
      async () => {
        try {
          const loc = await detectLocation();
          saveLocation(loc);
          setLocBox({ kind: "saved", loc });
        } catch (err) {
          if (err && err.code === "LOOKUP" && err.coords) {
            const { latitude, longitude } = err.coords;
            const loc = {
              locality: t("loc.me"),
              district: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
              state: "",
            };
            saveLocation(loc);
            setLocBox({ kind: "saved", loc });
          } else {
            setLocBox({ kind: "denied" });
          }
        }
      },
      () => setLocBox({ kind: "denied" }),
      { timeout: 6000 }
    );
  }, []);

  function submitSearch(e) {
    e.preventDefault();
    const v = hero.trim();
    if (!v) return;
    // Always carry the state choice, including "All India" (= empty), so the
    // market page uses exactly what the user picked instead of the saved location.
    navigate(`/market?q=${encodeURIComponent(v)}&state=${encodeURIComponent(stateSel)}`);
  }

  return (
    <main id="main">
      <section className="hero">
        <div className="container">
          <div className="hero-meta-row">
            <span className="eyebrow-loc" id="locStatusBox">
            {locBox.kind === "saved" ? (
              <>
                <i className="bi bi-geo-alt" aria-hidden="true"></i>{" "}
                <span className="eyebrow-text">
                  {t("home.showingFor", {
                    loc: `${locBox.loc.locality}, ${locBox.loc.district}`,
                  })}
                </span>{" "}
                &nbsp;·&nbsp;{" "}
                <a
                  href="#"
                  id="locChangeLink"
                  onClick={(e) => {
                    e.preventDefault();
                    openLocation();
                  }}
                >
                  {t("home.change")}
                </a>
              </>
            ) : locBox.kind === "denied" ? (
              <>
                <i className="bi bi-geo-alt" aria-hidden="true"></i>{" "}
                <span className="eyebrow-text">{t("home.denied")}</span>{" "}
                <a
                  href="#"
                  id="locManualLink"
                  onClick={(e) => {
                    e.preventDefault();
                    openLocation();
                  }}
                >
                  {t("home.manual")}
                </a>
              </>
            ) : locBox.kind === "unavailable" ? (
              <>
                <i className="bi bi-geo-alt" aria-hidden="true"></i>{" "}
                <span className="eyebrow-text">{t("home.unavailable")}</span>{" "}
                <a
                  href="#"
                  id="locManualLink"
                  onClick={(e) => {
                    e.preventDefault();
                    openLocation();
                  }}
                >
                  {t("home.manual")}
                </a>
              </>
            ) : (
              <>
                <i className="bi bi-geo-alt" aria-hidden="true"></i> {t("home.detecting")}
              </>
            )}
            </span>
            <span className="hero-lang">
              <LanguageSelect short />
            </span>
          </div>
          <h1>
            {t("home.t1")}
            <br />
            {t("home.t2")}
          </h1>
          <p className="sub">{t("home.sub")}</p>
          <form className="search-hero" onSubmit={submitSearch}>
            <input
              id="heroSearch"
              type="search"
              placeholder={t("home.searchPh")}
              aria-label={t("home.searchPh")}
              value={hero}
              onChange={(e) => setHero(e.target.value)}
            />
            <select
              id="heroState"
              aria-label={t("home.stateLbl")}
              value={stateSel}
              onChange={(e) => setStateSel(e.target.value)}
            >
              <option value="">{t("home.allIndia")}</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary sh-btn">
              <i className="bi bi-search" aria-hidden="true"></i>
              <span>{t("home.search")}</span>
            </button>
          </form>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="grid grid-3 quick-cards">
            <Link className="card card-tight quick-card" to="/market">
              <div className="qc-icon">
                <i className="bi bi-bar-chart-line" aria-hidden="true"></i>
              </div>
              <h3>{t("home.c1t")}</h3>
              <p className="muted text-sm mb-0">{t("home.c1d")}</p>
            </Link>
            <Link className="card card-tight quick-card" to="/market">
              <div className="qc-icon">
                <i className="bi bi-graph-up-arrow" aria-hidden="true"></i>
              </div>
              <h3>{t("home.c4t")}</h3>
              <p className="muted text-sm mb-0">{t("home.c4d")}</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="flex-between mt-2 mb-0 trending-head" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>{t("home.trending")}</h2>
            <Link className="trending-viewall" to="/market">{t("home.viewAll")}</Link>
            <button
              type="button"
              className="trending-toggle"
              aria-expanded={trendOpen}
              aria-controls="trendingCrops"
              onClick={() => setTrendOpen((o) => !o)}
            >
              <span>{t("home.viewAll").replace("→", "").trim()}</span>
              <i className="bi bi-chevron-down" aria-hidden="true"></i>
            </button>
          </div>
          <div className={`tag-strip${trendOpen ? " open" : ""}`} id="trendingCrops">
            {trending.map(({ crop, price }) => (
              <Link key={crop.id} className="crop-card" to={`/crop?crop=${crop.id}`}>
                <div className="name">{cropName(crop)}</div>
                <div className="local">{cropLocal(crop)}</div>
                <div className="price-line">
                  <span className="price">₹{price.modal}</span>
                  <span className="unit">/{unitName(price.unit)}</span>
                </div>
                <span className="trend stable">{price.source}</span>
              </Link>
            ))}
          </div>
          {loaded && trending.length === 0 && (
            <div className="empty">
              <div className="icon">
                <i className="bi bi-cloud-slash" aria-hidden="true"></i>
              </div>
              <p>{t("live.unavailable")}</p>
              <button type="button" className="btn btn-outline" onClick={() => setAttempt((a) => a + 1)}>
                {t("live.retry")}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <h2>{t("home.how")}</h2>
          <div className="steps mt-4">
            <div className="step">
              <div className="n">1</div>
              <h3 style={{ fontSize: "1.1rem" }}>{t("home.s1t")}</h3>
              <p className="muted">{t("home.s1d")}</p>
            </div>
            <div className="step">
              <div className="n">2</div>
              <h3 style={{ fontSize: "1.1rem" }}>{t("home.s2t")}</h3>
              <p className="muted">{t("home.s2d")}</p>
            </div>
            <div className="step">
              <div className="n">3</div>
              <h3 style={{ fontSize: "1.1rem" }}>{t("home.s3t")}</h3>
              <p className="muted">{t("home.s3d")}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
