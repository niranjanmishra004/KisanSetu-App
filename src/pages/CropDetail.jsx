import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getCropById,
  getCropPrice,
  getSavedLocation,
  createAlert,
} from "../lib/api.js";
import { useLang } from "../lib/i18n.jsx";
import { Modal } from "../components/chrome.jsx";

function unitToKg(qty, unit) {
  if (unit === "quintal") return qty * 100;
  if (unit === "tonne") return qty * 1000;
  return qty;
}

export default function CropDetail() {
  const { t, cropName, cropLocal, categoryName, unitName } = useLang();
  const [params] = useSearchParams();
  const cropId = params.get("crop") || "tomato";
  const stateParam = params.get("state") || "";

  const [crop, setCrop] = useState(null);
  const [price, setPrice] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [priceMissing, setPriceMissing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [qty, setQty] = useState(500);
  const [unit, setUnit] = useState("kg");

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertCondition, setAlertCondition] = useState("above");
  const [alertThreshold, setAlertThreshold] = useState("");

  useEffect(() => {
    document.title = "Crop — KisanSetu";
    let cancelled = false;
    async function load() {
      // NOTE: no demo fallback. Unknown crop → "not found".
      // Known crop but no live price (offline / no backend entry) →
      // honest "unavailable" state with retry.
      const c = await getCropById(cropId);
      if (cancelled) return;
      if (!c) {
        setNotFound(true);
        return;
      }
      setNotFound(false);
      setCrop(c);
      const p = await getCropPrice(cropId, stateParam);
      if (cancelled) return;
      if (!p) {
        setPriceMissing(true);
        return;
      }
      setPriceMissing(false);
      setPrice(p);
      document.title = `${c.name} — KisanSetu`;
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [cropId, stateParam, attempt]);

  async function submitAlert(e) {
    e.preventDefault();
    const threshold = Number(alertThreshold);
    if (!threshold) {
      alert(t("crop.needThresh"));
      return;
    }
    const saved = getSavedLocation();
    await createAlert({
      crop: cropId,
      location: saved && saved.locality ? `${saved.locality}, ${saved.district}` : "All India",
      condition: alertCondition,
      threshold,
      unit: alertCondition.includes("percent") ? "%" : price.unit,
    });
    setAlertOpen(false);
    setAlertThreshold("");
    alert(t("crop.created"));
  }

  if (notFound) {
    return (
      <main id="main" className="section-tight">
        <div className="container">
          <h1 id="cropName">{t("crop.notFound")}</h1>
        </div>
      </main>
    );
  }

  if (priceMissing) {
    return (
      <main id="main" className="section-tight">
        <div className="container">
          <h1 id="cropName">{crop ? cropName(crop) : t("crop.notFound")}</h1>
          <p className="muted">{t("crop.noPrice")}</p>
          <p className="muted text-sm">{t("live.unavailable")}</p>
          <button type="button" className="btn btn-outline" onClick={() => setAttempt((a) => a + 1)}>
            {t("live.retry")}
          </button>
        </div>
      </main>
    );
  }

  if (!crop || !price) {
    return (
      <main id="main" className="section-tight">
        <div className="container">
          <h1 id="cropName">{t("c.loading")}</h1>
          <p className="muted" id="cropLocal"></p>
        </div>
      </main>
    );
  }

  const qtyInKg = unitToKg(Number(qty) || 0, unit);
  const total = qtyInKg * price.modal;

  return (
    <main id="main" className="section-tight">
      <div className="container">
        <div className="flex-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 id="cropName" style={{ marginBottom: 2 }}>
              {cropName(crop)}
            </h1>
            <p className="muted" id="cropLocal" style={{ marginBottom: 0 }}>
              {cropLocal(crop)} · {categoryName(crop.category)}
            </p>
          </div>
          <button className="btn btn-accent" onClick={() => setAlertOpen(true)}>
            <i className="bi bi-bell me-1" aria-hidden="true"></i>
            {t("crop.mkAlert")}
          </button>
        </div>

        <div className="grid grid-2 mt-5" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="flex-between">
              <div>
                <div className="muted text-sm">{t("crop.cur")}</div>
                <div
                  className="price"
                  id="currentPrice"
                  style={{ fontSize: "2.4rem", fontWeight: 600, color: "var(--green-900)" }}
                >
                  ₹{price.modal}
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "var(--ink-muted)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {" "}
                    /{unitName(price.unit)}
                  </span>
                </div>
              </div>
              <span className="trend stable" id="trendBadge">
                {price.source}
              </span>
            </div>
            <p className="muted text-sm mt-2 mb-0" id="lastUpdated">
              {price.marketsCount != null ? t("live.markets", { n: price.marketsCount }) : ""}
              {price.arrivalDate ? ` · ${t("live.arrival", { v: price.arrivalDate })}` : ""}
            </p>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "20px 0" }} />

            <h3 style={{ fontSize: "1.05rem" }}>{t("crop.calc")}</h3>
            <div className="row-2">
              <div className="field">
                <label htmlFor="qtyInput">{t("crop.qty")}</label>
                <input
                  id="qtyInput"
                  type="number"
                  value={qty}
                  min="0"
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="unitInput">{t("crop.unit")}</label>
                <select id="unitInput" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="kg">{unitName("kg")}</option>
                  <option value="quintal">{t("crop.qtlOpt")}</option>
                  <option value="tonne">{t("crop.tonneOpt")}</option>
                </select>
              </div>
            </div>
            <div className="card-tight" style={{ background: "var(--green-100)", border: "none" }}>
              <div className="muted text-sm">{t("crop.estVal")}</div>
              <div
                className="price"
                id="calcResult"
                style={{ fontSize: "1.6rem", fontWeight: 600, color: "var(--green-900)" }}
              >
                ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              <div className="muted text-sm" id="calcBreakdown">
                {Number(qty) || 0} {unitName(unit)} × ₹{price.modal}/{unitName("kg")}
              </div>
            </div>

            <div className="grid grid-3 mt-4">
              <div className="stat">
                <div className="label">{t("crop.min")}</div>
                <div className="value" id="statMin">
                  ₹{price.min}
                </div>
              </div>
              <div className="stat">
                <div className="label">{t("crop.avg")}</div>
                <div className="value" id="statAvg">
                  ₹{price.modal}
                </div>
              </div>
              <div className="stat">
                <div className="label">{t("crop.max")}</div>
                <div className="value" id="statMax">
                  ₹{price.max}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: "1.05rem" }}>{t("crop.range")}</h3>
            <div
              className="price"
              id="priceRange"
              style={{ fontSize: "2rem", fontWeight: 600, color: "var(--green-900)" }}
            >
              ₹{price.min}–₹{price.max}/{unitName(price.unit)}
            </div>
            <p className="muted text-sm">{t("crop.rangeNote")}</p>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "20px 0" }} />
            <div className="muted text-sm">
              <div id="marketName">{t("crop.mkt", { v: price.market })}</div>
              {price.marketsCount != null && (
                <div id="marketCount">{t("live.markets", { n: price.marketsCount })}</div>
              )}
              {price.arrivalDate && (
                <div id="marketArrival">{t("live.arrival", { v: price.arrivalDate })}</div>
              )}
              <div id="marketSource">{t("crop.src", { v: price.source })}</div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        id="alertModal"
        open={alertOpen}
        title={t("crop.mkAlertTitle")}
        onClose={() => setAlertOpen(false)}
      >
        <form id="alertForm" onSubmit={submitAlert}>
          <p className="muted text-sm" id="alertCropLabel">
            {t("crop.cropLbl", { v: cropName(crop) })}
          </p>
          <div className="field">
            <label htmlFor="alertCondition">{t("crop.notify")}</label>
            <select
              id="alertCondition"
              value={alertCondition}
              onChange={(e) => setAlertCondition(e.target.value)}
            >
              <option value="above">{t("crop.above")}</option>
              <option value="below">{t("crop.below")}</option>
              <option value="percent_up">{t("crop.pUp")}</option>
              <option value="percent_down">{t("crop.pDown")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="alertThreshold">{t("crop.thresh")}</label>
            <input
              id="alertThreshold"
              type="number"
              placeholder={t("crop.threshPh")}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            {t("crop.createAlert")}
          </button>
        </form>
      </Modal>
    </main>
  );
}
