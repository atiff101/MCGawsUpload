import { useState } from "react";
import "./App.css";
import { useAuth } from "react-oidc-context";
import {
  ETS_COUNTRIES,
  CATEGORIES,
  ROUTES,
  CN_CODES,
  format,
} from "./cbamData";
import CountrySelect from "./CountrySelect";
import { activityLevelCheck } from "./activityLevelCheck";
import {
  createInstallation,
  updateInstallation,
  uploadDocument,
  getDownloadUrl,
} from "./Api";

const BLANK = {
  legalName: "",
  country: "",
  taxId: "",
  contactName: "",
  contactEmail: "",

  installationName: "",
  streetAddress: "",
  city: "",
  postalCode: "",
  unLocode: "",
  commissioningYear: "",
  cbamRegistryId: "",

  category: "",
  route: "",
  cnCode: "",
  reportingPeriodStart: "",
  reportingPeriodEnd: "",
  activityLevel: "",
  consumesPrecursors: "",

  usingDefaultValues: "",
  directEmissions: "",
  indirectEmissions: "",

  listedInCatalogue: false,

  documents: [],
};

// Starting state: BLANK for a new one, or the saved record overlaid on BLANK
// for an edit. Values come back typed (number/boolean) so convert them to the
// strings the form fields expect.
function initialData(existing) {
  if (!existing) return { ...BLANK };
  const merged = { ...BLANK };
  for (const k of Object.keys(BLANK)) {
    const v = existing[k];
    if (v === undefined || v === null) continue;
    if (k === "documents") {
      merged[k] = Array.isArray(v) ? v : [];
    } else if (k === "consumesPrecursors" || k === "usingDefaultValues") {
      merged[k] = v === true ? "yes" : v === false ? "no" : String(v);
    } else if (k === "listedInCatalogue") {
      merged[k] = v === true || v === "true";
    } else {
      merged[k] = String(v);
    }
  }
  return merged;
}

function StepOrganisation({ data, updateField }) {
  return (
    <div>
      <h2>Step 1: Organisation</h2>
      <p>Tell us about your company.</p>
      <div className="field">
        <label htmlFor="legalName">Company name *</label> <br />
        <input
          id="legalName"
          type="text"
          value={data.legalName}
          onChange={(e) => updateField("legalName", e.target.value)}
          className="field-control"
        />
      </div>

      <div className="field">
        <label id="country-label" htmlFor="country">
          Country *
        </label>
        <br />
        <CountrySelect
          id="country"
          labelId="country-label"
          value={data.country}
          onChange={(code) => updateField("country", code)}
        />

        {ETS_COUNTRIES.includes(data.country) && (
          <p className="warning-text">
            ⚠️ This country is exempt from CBAM. You don't need to register.
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="taxId">Tax ID *</label>
        <br />
        <input
          id="taxId"
          type="text"
          value={data.taxId}
          onChange={(e) => updateField("taxId", e.target.value)}
          className="field-control"
        />
      </div>

      <div className="field">
        <label htmlFor="contactName">Contact name *</label>
        <br />
        <input
          id="contactName"
          type="text"
          value={data.contactName}
          onChange={(e) => updateField("contactName", e.target.value)}
          className="field-control"
        />
      </div>

      <div className="field">
        <label htmlFor="contactEmail">Contact email *</label>
        <br />
        <input
          id="contactEmail"
          type="email"
          value={data.contactEmail}
          onChange={(e) => updateField("contactEmail", e.target.value)}
          className="field-control"
        />
      </div>
    </div>
  );
}

function StepInstallation({ data, updateField }) {
  return (
    <div>
      <h2>Step 2: Installation</h2>
      <p>Tell us about your factory.</p>
      <div className="field">
        <label htmlFor="installationName">Installation name *</label>
        <br />
        <input
          id="installationName"
          type="text"
          value={data.installationName}
          onChange={(e) => updateField("installationName", e.target.value)}
          placeholder="e.g. Iskenderun BOF plant"
          className="field-control"
        />
      </div>

      <div className="field">
        <label htmlFor="streetAddress">Street address *</label>
        <br />
        <input
          id="streetAddress"
          type="text"
          value={data.streetAddress}
          onChange={(e) => updateField("streetAddress", e.target.value)}
          placeholder="e.g. Sariseki Mahallesi, Iskenderun OSB"
          className="field-control"
        />
      </div>

      <div className="field">
        <label htmlFor="city">City *</label>
        <br />
        <input
          id="city"
          type="text"
          value={data.city}
          onChange={(e) => updateField("city", e.target.value)}
          className="field-control"
        />
      </div>

      <div className="field">
        <label htmlFor="postalCode">Postal code</label>
        <br />
        <input
          id="postalCode"
          type="text"
          value={data.postalCode}
          onChange={(e) => updateField("postalCode", e.target.value)}
          className="field-control"
        />
      </div>

      <div className="field">
        <label htmlFor="unLocode">UN/LOCODE or coordinates (optional)</label>
        <br />
        <input
          id="unLocode"
          type="text"
          value={data.unLocode}
          onChange={(e) => updateField("unLocode", e.target.value)}
          placeholder="e.g. TRISK or 36.6206,36.1925"
          className="field-control"
        />
      </div>

      <div className="field">
        <label htmlFor="commissioningYear">Commissioning year (optional)</label>
        <br />
        <input
          id="commissioningYear"
          type="number"
          value={data.commissioningYear}
          onChange={(e) => updateField("commissioningYear", e.target.value)}
          placeholder="e.g. 2005"
          className="field-control"
        />
      </div>

      <div className="field">
        <label htmlFor="cbamRegistryId">
          EU CBAM Registry installation ID (if assigned)
        </label>
        <br />
        <input
          id="cbamRegistryId"
          type="text"
          value={data.cbamRegistryId}
          onChange={(e) => updateField("cbamRegistryId", e.target.value)}
          placeholder="Leave blank if not yet registered"
          className="field-control"
        />
      </div>
    </div>
  );
}

function StepProduction({ data, updateField, onUpload, onRemove, onView }) {
  const activityWarning = activityLevelCheck(
    data.activityLevel,
    data.reportingPeriodStart,
    data.reportingPeriodEnd,
  );

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      console.error(err);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <h2>Step 3: Production process</h2>
      <p>Tell us what this factory produces.</p>

      <div className="field">
        <label htmlFor="category">Category *</label>
        <br />
        <select
          id="category"
          value={data.category}
          onChange={(e) => {
            updateField("category", e.target.value);
            updateField("route", "");
          }}
          className="field-control"
        >
          <option value="">Select a category...</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {format(c)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="route">Production route *</label>
        <br />
        <select
          id="route"
          value={data.route}
          onChange={(e) => updateField("route", e.target.value)}
          disabled={data.category === ""}
          className="field-control"
        >
          <option value="">
            {data.category === ""
              ? "Pick a category first"
              : "Select a route..."}
          </option>
          {data.category !== "" &&
            ROUTES[data.category].map((r) => (
              <option key={r} value={r}>
                {format(r)}
              </option>
            ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="cnCode">CN code *</label>
        <br />
        <select
          id="cnCode"
          value={data.cnCode}
          onChange={(e) => updateField("cnCode", e.target.value)}
          disabled={data.category === ""}
          className="field-control"
        >
          <option value="">
            {data.category === ""
              ? "Pick a category first"
              : "Select a CN code..."}
          </option>
          {data.category !== "" &&
            CN_CODES[data.category].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="reportingPeriodStart">Reporting period start *</label>
        <br />
        <input
          id="reportingPeriodStart"
          type="date"
          value={data.reportingPeriodStart}
          onChange={(e) => updateField("reportingPeriodStart", e.target.value)}
          className="field-control"
        />
      </div>

      <div className="field">
        <label htmlFor="reportingPeriodEnd">Reporting period end *</label>
        <br />
        <input
          id="reportingPeriodEnd"
          type="date"
          value={data.reportingPeriodEnd}
          onChange={(e) => updateField("reportingPeriodEnd", e.target.value)}
          className="field-control"
        />
      </div>
      <div className="field">
        <label htmlFor="activityLevel">
          Activity level - total tonnes produced *
        </label>
        <br />
        <input
          id="activityLevel"
          type="number"
          value={data.activityLevel}
          onChange={(e) => updateField("activityLevel", e.target.value)}
          placeholder="e.g. 500000"
          className="field-control"
        />
        {activityWarning && <p className="warning-text">{activityWarning}</p>}
      </div>

      <div className="field">
        <label htmlFor="usingDefaultValues">Emissions data source *</label>
        <br />
        <select
          id="usingDefaultValues"
          value={data.usingDefaultValues}
          onChange={(e) => updateField("usingDefaultValues", e.target.value)}
          className="field-control"
        >
          <option value="">Select...</option>
          <option value="yes">Use EU default values</option>
          <option value="no">Enter our own measured values</option>
        </select>
        {data.usingDefaultValues === "yes" && (
          <p className="warning-text">
            Using EU default values. Importers will see cost based on defaults —
            usually higher than verified actuals. Switch to measured values to
            show your real figures.
          </p>
        )}
      </div>

      {data.usingDefaultValues === "no" && (
        <>
          <div className="field">
            <label htmlFor="directEmissions">
              Direct specific embedded emissions (tCO₂e per tonne) *
            </label>
            <br />
            <input
              id="directEmissions"
              type="number"
              value={data.directEmissions}
              onChange={(e) => updateField("directEmissions", e.target.value)}
              placeholder="e.g. 1.8"
              className="field-control"
            />
          </div>

          <div className="field">
            <label htmlFor="indirectEmissions">
              Indirect specific embedded emissions (tCO₂e per tonne) *
            </label>
            <br />
            <input
              id="indirectEmissions"
              type="number"
              value={data.indirectEmissions}
              onChange={(e) => updateField("indirectEmissions", e.target.value)}
              placeholder="e.g. 0.4"
              className="field-control"
            />
            <p className="field-hint">
              Direct = emissions from your own process. Indirect = from
              electricity used. Both in tonnes CO₂e per tonne of product, over
              the reporting period above.
            </p>
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="consumesPrecursors">
          Does this process consume CBAM goods as inputs? *
        </label>
        <br />
        <select
          id="consumesPrecursors"
          value={data.consumesPrecursors}
          onChange={(e) => updateField("consumesPrecursors", e.target.value)}
          className="field-control"
        >
          <option value="">Select...</option>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
        {data.consumesPrecursors === "yes" && (
          <p className="warning-text">
            ⚠️ This installation consumes CBAM goods as inputs (precursors). You
            can still submit, we'll flag the record and follow up for the extra
            precursor data needed for a complete declaration.
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="documents">
          Supporting documents (optional) — e.g. energy bills
        </label>
        <br />
        <input
          id="documents"
          type="file"
          onChange={onFileChange}
          disabled={uploading}
          className="field-control"
        />
        {uploading && <p className="step-indicator">Uploading…</p>}
        {uploadError && <p className="warning-text">{uploadError}</p>}
        {data.documents?.length > 0 && (
          <ul className="doc-list">
            {data.documents.map((d) => (
              <li key={d.key} className="doc-list-item">
                <span className="doc-name">📎 {d.filename}</span>
                <span className="doc-actions">
                  <button
                    type="button"
                    className="doc-link"
                    onClick={() => onView(d.key)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="doc-link doc-remove"
                    onClick={() => onRemove(d.key)}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="consent-field">
        <label htmlFor="listedInCatalogue" className="consent-label">
          <input
            id="listedInCatalogue"
            type="checkbox"
            checked={data.listedInCatalogue}
            onChange={(e) => updateField("listedInCatalogue", e.target.checked)}
          />
          <span>
            List this installation in the supplier catalogue so EU importers can
            discover it.
          </span>
        </label>
        <p className="field-hint">
          Listing shows your company, product, country and CN code (plus
          headline emissions, if provided). Importers still request your
          detailed data, which you approve per importer — nothing is released
          automatically. You can change this at any time.
        </p>
      </div>
    </div>
  );
}

export default function InstallationWizard({
  existing,
  onCancel,
  onSubmitted,
}) {
  const auth = useAuth();
  const isEdit = Boolean(existing);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(() => initialData(existing));

  function updateField(field, value) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleUpload(file) {
    const doc = await uploadDocument(file, auth.user?.id_token);
    setData((prev) => ({
      ...prev,
      documents: [...(prev.documents || []), doc],
    }));
  }

  function removeDocument(key) {
    setData((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((d) => d.key !== key),
    }));
  }

  async function viewDocument(key) {
    const win = window.open("about:blank", "_blank");
    try {
      const url = await getDownloadUrl(key, auth.user?.id_token);
      if (win) win.location.href = url;
    } catch (err) {
      console.error(err);
      if (win) win.close();
      alert("Couldn't open that document. Please try again.");
    }
  }

  function step1Valid() {
    if (data.legalName === "") return false;
    if (data.country === "") return false;
    if (ETS_COUNTRIES.includes(data.country)) return false;
    if (data.taxId === "") return false;
    if (data.contactName === "") return false;
    if (!data.contactEmail.includes("@")) return false;
    if (!data.contactEmail.includes(".")) return false;
    return true;
  }

  function step2Valid() {
    if (data.installationName === "") return false;
    if (data.city === "") return false;
    return true;
  }

  function step3Valid() {
    if (data.category === "") return false;
    if (data.route === "") return false;
    if (data.cnCode === "") return false;
    if (data.reportingPeriodStart === "") return false;
    if (data.reportingPeriodEnd === "") return false;
    if (
      new Date(data.reportingPeriodStart) >= new Date(data.reportingPeriodEnd)
    )
      return false;
    if (data.activityLevel === "") return false;
    if (Number(data.activityLevel) <= 0) return false;
    if (data.usingDefaultValues === "") return false;
    if (data.usingDefaultValues === "no") {
      if (data.directEmissions === "" || Number(data.directEmissions) < 0)
        return false;
      if (data.indirectEmissions === "" || Number(data.indirectEmissions) < 0)
        return false;
    }
    if (data.consumesPrecursors === "") return false;
    // "yes" is allowed through — the record is flagged server-side for follow-up.
    return true;
  }

  let isValid = false;
  if (step === 0) isValid = step1Valid();
  if (step === 1) isValid = step2Valid();
  if (step === 2) isValid = step3Valid();

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateInstallation(
          existing.installationId,
          data,
          auth.user?.id_token,
        );
      } else {
        await createInstallation(data, auth.user?.id_token);
      }
      onSubmitted();
    } catch (err) {
      console.error(err);
      alert("Something went wrong saving the form.");
      setSubmitting(false);
    }
  }

  return (
    <div className="form-wrapper">
      <button type="button" className="dash-back-link" onClick={onCancel}>
        ← Back to dashboard
      </button>

      <h1>{isEdit ? "Edit installation" : "Register an installation"}</h1>
      <p className="step-indicator">Step {step + 1} of 3</p>

      {step === 0 && <StepOrganisation data={data} updateField={updateField} />}

      {step === 1 && <StepInstallation data={data} updateField={updateField} />}

      {step === 2 && (
        <StepProduction
          data={data}
          updateField={updateField}
          onUpload={handleUpload}
          onRemove={removeDocument}
          onView={viewDocument}
        />
      )}

      <div className="nav-buttons">
        <button
          type="button"
          onClick={() => setStep((prev) => prev - 1)}
          disabled={step === 0}
          className="nav-btn"
        >
          Back
        </button>

        {step < 2 && (
          <button
            type="button"
            onClick={() => setStep((prev) => prev + 1)}
            disabled={!isValid}
            className="nav-btn"
          >
            Continue
          </button>
        )}

        {step === 2 && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="nav-btn"
          >
            {submitting
              ? isEdit
                ? "Saving…"
                : "Submitting…"
              : isEdit
                ? "Save changes"
                : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}
