import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getUserRole } from "../hooks/useAuthStatus";
import AccessDenied from "./AccessDenied.jsx";
import "./AuthGate.css";
import { MENTOR_BASE, STUDENT_BASE } from "../pages/MentorDashboard/dashboardRoutes.js";

// Canonical landing pages per role. The default "Dashboard" tab lives at the
// bare base path, so a fresh login lands on /mentor/dashboard (never the
// redundant /mentor/dashboard/dashboard). The base strings are owned by
// dashboardRoutes.js so the tab-path builder and the homes cannot drift apart.
export const STUDENT_HOME = STUDENT_BASE;
export const MENTOR_HOME = MENTOR_BASE;

function AuthGate({ children, allowedRoles }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function initAuth() {
            // Check if Supabase passed tokens via URL hash (e.g., #access_token=...)
            const hash = window.location.hash;
            if (hash && hash.includes("access_token")) {
                // Let Supabase parse and store the session from the hash parameters automatically
                await supabase.auth.getSession();
                // Clean the token hash from the URL bar for security and cleanliness
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // Fetch the active session
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error("Session error:", error.message);
            }

            if (isMounted) {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        }

        initAuth();

        // Listen for future auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="auth-gate__loading" role="status" aria-live="polite">
                <span className="auth-gate__spinner" aria-hidden="true" />
                <p className="auth-gate__loading-text">Loading…</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role guard: student pages reject mentors and vice versa.
    if (allowedRoles && allowedRoles.length > 0) {
        const role = getUserRole(user);
        if (!allowedRoles.includes(role)) {
            return <AccessDenied role={role} allowedRoles={allowedRoles} />;
        }
    }

    return typeof children === "function" ? children(user) : children;
}

export default AuthGate;