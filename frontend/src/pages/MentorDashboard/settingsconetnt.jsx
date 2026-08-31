import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { getSquads, saveSquad } from "../../api/routes/MentorDashboard/main.js";
import "./settingscontent.css";

export default function SettingsContent({ profile }) {
  const [squads, setSquads] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Floating Toast States
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error"); // "success" | "error"
  const [isExiting, setIsExiting] = useState(false);

  // Toast Auto-Dismiss Display Timer
  useEffect(() => {
    if (!toastMessage) return;
    setIsExiting(false);
    const displayTimer = setTimeout(() => setIsExiting(true), 3500);
    return () => clearTimeout(displayTimer);
  }, [toastMessage]);

  // Toast Slide-Out Animation Exit Timer
  useEffect(() => {
    if (!isExiting) return;
    const exitTimer = setTimeout(() => {
      setToastMessage("");
      setIsExiting(false);
    }, 400);
    return () => clearTimeout(exitTimer);
  }, [isExiting]);

  const showToast = (msg, type = "error") => {
    setIsExiting(false);
    setToastType(type);
    setToastMessage(msg);
  };

  // Fetch squad preferences on load with robust array extraction
  useEffect(() => {
    async function fetchSquads() {
      try {
        setLoading(true);
        const response = await getSquads();
        
        // Safely extract array regardless of API payload format
        const rawSquads = Array.isArray(response)
          ? response
          : response?.squads || response?.data || [];

        // Normalize all squad items to String for uniform comparison
        setSquads(rawSquads.map(String));
      } catch (error) {
        console.error("Failed to load squads:", error);
        showToast("Failed to load squad preferences.", "error");
        setSquads([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSquads();
  }, []);

  const handleAddSquad = () => {
    const trimmed = inputVal.trim();
    const safeSquads = Array.isArray(squads) ? squads : [];

    if (trimmed && !safeSquads.includes(trimmed)) {
      setSquads([...safeSquads, trimmed]);
      setInputVal("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddSquad();
    }
  };

  const handleRemoveSquad = (squadToRemove) => {
    const safeSquads = Array.isArray(squads) ? squads : [];
    setSquads(safeSquads.filter((s) => String(s) !== String(squadToRemove)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await saveSquad(squads);
      showToast("Squads updated successfully!", "success");
    } catch (error) {
      console.error("Failed to save squads:", error);
      showToast("Failed to save squads. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const safeSquadsList = Array.isArray(squads) ? squads : [];

  return (
    <div className="settings-container">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div
          className={`error-toast ${
            toastType === "success" ? "success-toast" : ""
          } ${isExiting ? "slide-out" : ""}`}
        >
          <div className="error-icon-box">
            {toastType === "success" ? "✓" : "!"}
          </div>
          <span className="error-message-text">{toastMessage}</span>
        </div>
      )}

      <header className="settings-header">
        <h1>Settings</h1>
        <p>Manage your mentor profile and account preferences.</p>
      </header>

      <div className="settings-card">
        <h3>Profile Preferences</h3>

        {loading ? (
          <div className="settings-loading">
            Loading squad preferences...
          </div>
        ) : (
          <form className="settings-form" onSubmit={handleSubmit}>
            <div className="settings-group">
              <label htmlFor="squad-input">Squad Numbers</label>
              <p className="settings-sublabel">
                Type a squad number and press <strong>Enter</strong> or <strong>Comma</strong> to add.
              </p>

              <div className="squad-input-wrapper">
                <input
                  type="number"
                  id="squad-input"
                  className="settings-input"
                  placeholder="e.g. 142"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  className="squad-add-btn"
                  onClick={handleAddSquad}
                  disabled={!inputVal.trim()}
                >
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </div>

              {safeSquadsList.length > 0 ? (
                <div className="squad-tags-container">
                  {safeSquadsList.map((squad) => (
                    <span key={squad} className="squad-chip">
                      Squad {squad}
                      <button
                        type="button"
                        className="squad-chip-remove"
                        onClick={() => handleRemoveSquad(squad)}
                        title={`Remove Squad ${squad}`}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="no-squads-msg">
                  No squad added yet.
                </div>
              )}
            </div>

            <button type="submit" className="settings-save-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}