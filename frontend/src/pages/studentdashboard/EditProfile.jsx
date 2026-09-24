import getCroppedImg from "../../utils/cropImage";
import ImageCropper from "../../components/ImageCropper";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  FolderKanban,
  Trophy,
  Settings,
  LogOut,
  Home,
  Mail,
  Link2,
  Globe,
  Code2,
  Upload,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Save,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Clock,
  Sparkles
} from "lucide-react";

import { supabase } from "../../lib/supabase.js";
import kalviumLogo from "../../assets/kalvium-logo.svg";
import "./EditProfile.css";
import "./achievements.css";

import DashboardTab from "./DashboardTab.jsx";
import { getProfile, updateProfile } from "../../api/routes/StudentDashboard/profile.js";
import Projects from "./Projects.jsx";
import AchievementsTab from "./AchievementsTab.jsx";
import { studentLabelToSlug, studentSlugToLabel, studentTabPath } from "../MentorDashboard/dashboardRoutes.js";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Profile", icon: User },
  { label: "Projects", icon: FolderKanban },
  { label: "Achievements", icon: Trophy },
  { label: "Settings", icon: Settings },
];

const isValidUrl = (url) => {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
};

const isValidEmail = (email) => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export default function ProfileTab({
  profileData,
  isLoading: initialLoading = false,
  onProfileChange
}) {
  const { tab } = useParams();
  const navigate = useNavigate();
  // URL is the source of truth: back/forward + deep links always render the
  // right tab with zero local-state sync effects.
  const activeNav = studentSlugToLabel(tab);
  const setActiveNav = (label) => {
    navigate(studentTabPath(studentLabelToSlug(label)));
  };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profile, setProfile] = useState(profileData || {});
  const [image, setImage] = useState(null);
  const [cropImage, setCropImage] = useState("");
  const [showCropper, setShowCropper] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [preview, setPreview] = useState("");

  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");
  const [isExiting, setIsExiting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const getProp = (snakeKey, camelKey, fallback = "") => {
    const val = profile?.[snakeKey] ?? profile?.[camelKey];
    return val !== null && val !== undefined && val !== "" ? val : fallback;
  };

  useEffect(() => {
    if (!toastMessage) return;
    setIsExiting(false);
    const displayTimer = setTimeout(() => setIsExiting(true), 10000);
    return () => clearTimeout(displayTimer);
  }, [toastMessage]);

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

  useEffect(() => {
    let isMounted = true;

    async function loadAuthAndProfile() {
      setIsLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error("Supabase Auth error:", authError.message);
        }

        const authEmail = user?.email || "";
        const authName =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          user?.user_metadata?.display_name ||
          (authEmail ? authEmail.split("@")[0] : "Student");
        const authUserId = user?.id || "N/A";

        let apiData = {};
        if (profileData && Object.keys(profileData).length > 0) {
          apiData = profileData;
        } else {
          try {
            const res = await getProfile();
            if (res) apiData = res.data || res;
          } catch (apiErr) {
            console.warn("Backend profile fetch error:", apiErr.message);
          }
        }

        const mergedProfile = {
          ...apiData,
          auth_id: authUserId,
          display_id: authUserId,
          name: authName,
          kalvium_email: authEmail,
          kalviumEmail: authEmail,
          squad_id: apiData?.squad_id ?? apiData?.squadId ?? "",
          squadId: apiData?.squad_id ?? apiData?.squadId ?? "",
        };

        if (isMounted) {
          setProfile(mergedProfile);
          if (onProfileChange) onProfileChange(mergedProfile);
        }
      } catch (err) {
        console.error("Error initializing user profile:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAuthAndProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      navigate("/login");
    }
  };

  const handleProfileChange = (key, value) => {
    const updatedProfile = {
      ...profile,
      [key]: value,
    };

    if (key === "squad_id") updatedProfile.squadId = value;
    if (key === "squadId") updatedProfile.squad_id = value;
    if (key === "personal_email") updatedProfile.personalEmail = value;
    if (key === "personalEmail") updatedProfile.personal_email = value;
    if (key === "resume_url") updatedProfile.resumeUrl = value;
    if (key === "resumeUrl") updatedProfile.resume_url = value;

    setProfile(updatedProfile);

    if (onProfileChange) {
      onProfileChange(updatedProfile);
    }
  };

  const uploadProfileImage = async () => {
    if (!image) {
      return profile.avatar_url || "";
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("User not logged in");
    }

    const extension = image.name.split(".").pop();
    const fileName = `${user.id}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(fileName, image, {
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("profile-images")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const personalEmail = profile?.personal_email || profile?.personalEmail;
    if (personalEmail && !isValidEmail(personalEmail)) {
      showToast("Please enter a valid personal email address (e.g., name@example.com).", "error");
      return;
    }

    const urlFields = [
      { key: "resume_url", label: "Resume URL" },
      { key: "github", label: "GitHub Profile" },
      { key: "linkedin", label: "LinkedIn Profile" },
      { key: "leetcode", label: "LeetCode Profile" },
      { key: "codechef", label: "CodeChef Profile" }
    ];

    for (const field of urlFields) {
      const val = profile?.[field.key];
      if (val && !isValidUrl(val)) {
        showToast(`Please enter a valid URL (e.g., https://...) for ${field.label}.`, "error");
        return;
      }
    }

    setIsSaving(true);

    try {
      const {
        id,
        auth_id,
        display_id,
        kalviumEmail,
        squadId,
        personalEmail,
        resumeUrl,
        ...restPayload
      } = profile;

      const rawSquad = profile?.squad_id ?? profile?.squadId;
      const parsedSquad = rawSquad !== "" && rawSquad !== null && rawSquad !== undefined ? parseInt(rawSquad, 10) : null;
      const kalviumEmailValue = profile?.kalvium_email || profile?.kalviumEmail || null;
      const nameValue = profile?.name || null;


      const avatarUrl = await uploadProfileImage();
      // Construct payload explicitly including name and kalvium_email
      const updatePayload = {
        ...restPayload,

        name: nameValue,
        kalvium_email: kalviumEmailValue,

        avatar_url: avatarUrl,

        squad_id: Number.isNaN(parsedSquad) ? null : parsedSquad,

        personal_email:
          profile?.personal_email ||
          profile?.personalEmail ||
          null,

        resume_url:
          profile?.resume_url ||
          profile?.resumeUrl ||
          null,
      };

      const response = await updateProfile(updatePayload);

      if (response) {
        const updatedData = response.data || response;
        showToast("Profile saved successfully!", "success");
        if (avatarUrl) {
          updatedData.avatar_url = avatarUrl;
          setPreview(avatarUrl);
        }

        // Merge API response while guaranteeing name/email aren't wiped by response nulls
        const mergedUpdatedProfile = {
          ...profile,
          ...(typeof updatedData === "object" ? updatedData : updatePayload),
          name: nameValue,
          kalvium_email: kalviumEmailValue,
          kalviumEmail: kalviumEmailValue,
          auth_id: profile.auth_id || profile.display_id,
          display_id: profile.auth_id || profile.display_id,
          squad_id: profile.squad_id ?? profile.squadId,
          squadId: profile.squad_id ?? profile.squadId,
        };

        setProfile(mergedUpdatedProfile);

        if (onProfileChange) {
          onProfileChange(mergedUpdatedProfile);
        }
      } else {
        showToast("Failed to update profile. Please try again.", "error");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      showToast(error?.message || "Failed to update profile. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const formatUUID = (id) => {
    if (!id || id === "N/A") return "N/A";
    const strId = String(id);
    if (strId.length <= 12) return strId;
    return `${strId.slice(0, 8)}...${strId.slice(-4)}`;
  };

  const handleCopyId = async (rawId) => {
    if (!rawId || rawId === "N/A") return;
    if (!navigator?.clipboard?.writeText) {
      showToast("Clipboard is not available in this browser.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(String(rawId));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (error) {
      console.error("Failed to copy ID:", error);
      showToast("Unable to copy ID. Please copy it manually.", "error");
    }
  };

  const currentUserId = getProp("auth_id", "display_id") || getProp("id", "id", "N/A");

  return (
    <>
      <title>Kalvium Portfolio | Student Dashboard</title>

      {showCropper && (
        <div className="crop-modal">
          <ImageCropper
            image={cropImage}
            crop={crop}
            zoom={zoom}
            setCrop={setCrop}
            setZoom={setZoom}
            onCropComplete={(area, areaPixels) =>
              setCroppedAreaPixels(areaPixels)
            }
          />

          <button
            onClick={async () => {
              const blob = await getCroppedImg(
                cropImage,
                croppedAreaPixels
              );

              const file = new File([blob], "avatar.jpg", {
                type: "image/jpeg",
              });

              setImage(file);
              setPreview(URL.createObjectURL(file));
              setShowCropper(false);
            }}
          >
            Adjust & Save
          </button>
        </div>
      )}

      <div className="pm-layout">
        {toastMessage && (
          <div className={`error-toast ${toastType === "success" ? "success-toast" : ""} ${isExiting ? "slide-out" : ""}`}>
            <div className="error-icon-box">
              {toastType === "success" ? "✓" : "!"}
            </div>
            <span>{toastMessage}</span>
          </div>
        )}

        <aside className={`pm-sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
          <div className="pm-brand-header">
            {!isCollapsed && (
              <div className="pm-brand">
                <div className="pm-brand-mark">
                  <img src={kalviumLogo} alt="Kalvium Logo" className="pm-logo-img" />
                </div>
                <div className="pm-brand-text">
                  <span className="pm-brand-title">KALVIUM</span>
                  <span className="pm-brand-sub">PROFILE MANAGER</span>
                </div>
              </div>
            )}
            <button
              type="button"
              className="pm-collapse-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar"
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <nav className="pm-nav">
            {NAV_ITEMS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className={`pm-nav-item ${activeNav === label ? "is-active" : ""}`}
                onClick={() => setActiveNav(label)}
                title={isCollapsed ? label : ""}
              >
                <Icon size={18} strokeWidth={2} />
                {!isCollapsed && <span>{label}</span>}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="pm-logout"
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </aside>

        <main className="pm-main">
          <header className="pm-topbar">
            <div className="pm-welcome">
              <span className="pm-wave">👋</span>
              <div>
                <span className="pm-welcome-sub">Welcome back,</span>
                <strong className="pm-welcome-name">
                  {isLoading ? (
                    <span className="skeleton skeleton-text width-100"></span>
                  ) : (
                    getProp("name", "name", "Student")
                  )}
                </strong>
              </div>
            </div>
            <div className="pm-topbar-actions">
              <a href="/" className="pm-home-btn">
                <Home size={16} />
                <span>Back to Home</span>
              </a>
            </div>
          </header>

          <div className="pm-page-head">
            <div>
              <h1>
                {activeNav === "Dashboard"
                  ? "Dashboard Overview"
                  : activeNav === "Profile"
                    ? "Student Profile"
                    : activeNav === "Settings" 
                      ? "Account Settings"
                    : null}
              </h1>
            </div>
          </div>

          <div className="pm-content-grid">
            {activeNav === "Dashboard" && (
              <div className="pm-tab-full">
                <DashboardTab
                  profile={profile}
                  bio={getProp("bio", "bio")}
                  isLoading={isLoading}
                />
              </div>
            )}

            {activeNav === "Profile" && (
              <>
                <section className="pm-profile-card">
                  {isLoading ? (
                    <div className="pm-card-skeleton-wrap">
                      <div className="skeleton skeleton-avatar"></div>
                      <div className="skeleton skeleton-text width-60 mt-12"></div>
                      <div className="skeleton skeleton-text width-40 mt-8"></div>
                    </div>
                  ) : (
                    <>
                      <div className="pm-profile-photo-container">

                        <div className="pm-profile-photo">
                          <img
                            src={preview || profile.avatar_url || "/default-avatar.png"}
                            alt="Profile"
                            className="pm-profile-img"
                          />

                          <button
                            type="button"
                            className="pm-photo-edit"
                            onClick={() => document.getElementById("profile-upload").click()}
                          >
                            <Upload size={12} />
                          </button>
                        </div>

                        <input
                          id="profile-upload"
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files[0];

                            if (!file) return;

                            setCropImage(URL.createObjectURL(file));
                            setShowCropper(true);
                          }}
                        />

                      </div>

                      <h2 className="pm-profile-name">
                        {getProp("name", "name", "Student Name")}
                      </h2>
                      <span className="pm-profile-role">
                        {getProp("title", "title", "Student")}
                      </span>

                      <div className="pm-profile-meta">
                        <div className="pm-meta-row">
                          <Mail size={14} />
                          <span>
                            {getProp("kalvium_email", "kalviumEmail") || "No Kalvium Email"}
                          </span>
                        </div>
                        <div className="pm-meta-row">
                          <User size={14} />
                          <span>
                            Squad {getProp("squad_id", "squadId") || "No Squad Assigned"}
                          </span>
                        </div>

                        <div className="pm-meta-row">
                          <ShieldCheck size={14} />
                          <span className="pm-id-badge">
                            ID: <code className="pm-code-tag">
                              {formatUUID(currentUserId)}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyId(currentUserId)}
                              title={copiedId ? "Copied!" : "Copy Full ID"}
                              className={`pm-copy-btn ${copiedId ? "is-copied" : ""}`}
                            >
                              {copiedId ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </section>

                <form className="pm-form" onSubmit={handleSubmit}>
                  <FormSection title="Personal Information" icon={User}>
                    {isLoading ? (
                      <FormSkeleton count={4} />
                    ) : (
                      <div className="pm-grid-2">
                        <Field
                          label="Full Name"
                          value={getProp("name", "name")}
                          disabled
                        />
                        <Field
                          label="Kalvium Email"
                          value={getProp("kalvium_email", "kalviumEmail")}
                          placeholder="e.g. student@kalvium.community"
                          disabled
                        />
                        <Field
                          label="Personal Email"
                          type="email"
                          value={getProp("personal_email", "personalEmail")}
                          onChange={(e) => handleProfileChange("personal_email", e.target.value)}
                          placeholder="e.g. student@gmail.com"
                          leftIcon={<Mail size={14} />}
                        />
                        <Field
                          label="Squad ID"
                          value={getProp("squad_id", "squadId")}
                          onChange={(e) => handleProfileChange("squad_id", e.target.value.replace(/\D/g, ""))}
                          placeholder="e.g. 42"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    )}
                  </FormSection>

                  <FormSection title="Professional Details" icon={FolderKanban}>
                    {isLoading ? (
                      <FormSkeleton count={2} />
                    ) : (
                      <div className="pm-grid-2">
                        <Field
                          label="Title / Role"
                          value={getProp("title", "title")}
                          onChange={(e) => handleProfileChange("title", e.target.value)}
                          placeholder="e.g. Full Stack Developer / Student"
                        />

                        <div className="pm-field">
                          <div className="pm-field-label-wrap">
                            <label>Resume URL</label>
                            {getProp("resume_url", "resumeUrl") && isValidUrl(getProp("resume_url", "resumeUrl")) && (
                              <a
                                href={getProp("resume_url", "resumeUrl")}
                                target="_blank"
                                rel="noreferrer"
                                className="pm-link-preview"
                              >
                                View <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                          <div className="pm-input-wrap">
                            <span className="pm-input-icon"><FileText size={14} /></span>
                            <input
                              type="url"
                              value={getProp("resume_url", "resumeUrl")}
                              onChange={(e) => handleProfileChange("resume_url", e.target.value)}
                              placeholder="https://drive.google.com/..."
                              pattern="https?://.*"
                              className="has-icon"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </FormSection>

                  <FormSection title="Social & Portfolio Links" icon={Link2}>
                    {isLoading ? (
                      <FormSkeleton count={3} />
                    ) : (
                      <div className="pm-grid-3">
                        <Field
                          label="GitHub Profile"
                          type="url"
                          pattern="https?://.*"
                          value={getProp("github", "github")}
                          onChange={(e) => handleProfileChange("github", e.target.value)}
                          placeholder="https://github.com/..."
                          leftIcon={<Code2 size={14} />}
                        />

                        <Field
                          label="LinkedIn Profile"
                          type="url"
                          pattern="https?://.*"
                          value={getProp("linkedin", "linkedin")}
                          onChange={(e) => handleProfileChange("linkedin", e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          leftIcon={<Globe size={14} />}
                        />

                        <Field
                          label="LeetCode Profile"
                          type="url"
                          pattern="https?://.*"
                          value={getProp("leetcode", "leetcode")}
                          onChange={(e) => handleProfileChange("leetcode", e.target.value)}
                          placeholder="https://leetcode.com/..."
                          leftIcon={<Link2 size={14} />}
                        />

                        <Field
                          label="CodeChef Profile"
                          type="url"
                          pattern="https?://.*"
                          value={getProp("codechef", "codechef")}
                          onChange={(e) => handleProfileChange("codechef", e.target.value)}
                          placeholder="https://www.codechef.com/users/..."
                          leftIcon={<Code2 size={14} />}
                        />
                      </div>
                    )}
                  </FormSection>

                  <FormSection title="About / Bio" icon={FileText}>
                    {isLoading ? (
                      <div className="skeleton skeleton-block height-100"></div>
                    ) : (
                      <div className="pm-field">
                        <textarea
                          className="pm-textarea"
                          value={getProp("bio", "bio")}
                          onChange={(e) => handleProfileChange("bio", e.target.value)}
                          rows={4}
                          placeholder="Write a short bio about yourself..."
                        />
                      </div>
                    )}
                  </FormSection>

                  <div className="pm-form-actions">
                    <button
                      type="submit"
                      className="pm-btn-primary"
                      disabled={isSaving || isLoading}
                    >
                      <Save size={16} />
                      {isSaving ? "Saving Changes..." : "Save Profile"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {activeNav === "Projects" && (
              <div className="pm-tab-full">
                <Projects></Projects>
              </div>
            )}

            {activeNav === "Achievements" && (
              <div className="pm-tab-full">
                <AchievementsTab />
              </div>
            )}

            {activeNav === "Settings" && (
              <div className="pm-tab-full">
                <SettingsTab email={getProp("kalvium_email", "kalviumEmail")} />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  leftIcon,
  placeholder = "",
  type = "text",
  inputMode,
  pattern,
  helperText = ""
}) {
  return (
    <div className="pm-field">
      <div className="pm-field-label-wrap">
        <label>{label}</label>
        {disabled && <Lock size={12} className="pm-lock-icon" title="Read only" />}
      </div>
      <div className={`pm-input-wrap ${disabled ? "is-disabled" : ""}`}>
        {leftIcon && <span className="pm-input-icon">{leftIcon}</span>}
        <input
          type={type}
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          readOnly={disabled}
          placeholder={placeholder}
          inputMode={inputMode}
          pattern={pattern}
          className={leftIcon ? "has-icon" : ""}
        />
      </div>
      {helperText && <span className="pm-field-help">{helperText}</span>}
    </div>
  );
}

function FormSection({ title, icon: Icon, children }) {
  return (
    <div className="pm-section">
      <div className="pm-section-title">
        <Icon size={16} />
        <h3>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FormSkeleton({ count }) {
  return (
    <div className={`pm-grid-${count > 2 ? count : 2}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pm-field">
          <div className="skeleton skeleton-text width-40"></div>
          <div className="skeleton skeleton-input"></div>
        </div>
      ))}
    </div>
  );
}

function ComingSoonBadge() {
  return (
    <span className="pm-coming-soon-badge">
      <Clock size={13} /> Coming Soon
    </span>
  );
}

function ProjectsTab() {
  return (
    <div className="pm-placeholder-card">
      <div className="pm-placeholder-icon-wrap icon-blue">
        <FolderKanban size={28} />
      </div>
      <div className="pm-placeholder-title-row">
        <h2>Projects Showcase</h2>
        <ComingSoonBadge />
      </div>
      <p className="pm-placeholder-description">
        We are building a dynamic showcase section where you will be able to feature your web apps, GitHub repositories, and live project demos.
      </p>
      <div className="pm-placeholder-footer">
        <Sparkles size={14} /> Feature update planned for upcoming release
      </div>
    </div>
  );
}

function SettingsTab({ email }) {
  return (
    <div className="pm-placeholder-card">
      <div className="pm-placeholder-icon-wrap icon-slate">
        <Settings size={28} />
      </div>
      <div className="pm-placeholder-title-row">
        <h2>Account Settings</h2>
        <ComingSoonBadge />
      </div>
      <p className="pm-placeholder-description">
        We still don't know what to add here. But we will add something
      </p>
      {email && (
        <p className="pm-linked-email">
          Account linked email: <strong>{email}</strong>
        </p>
      )}
    </div>
  );
}