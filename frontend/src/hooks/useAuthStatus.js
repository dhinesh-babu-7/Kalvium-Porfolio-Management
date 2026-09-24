import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Single source of truth for the authenticated user's role.
 * Reads from user_metadata.role first, then app_metadata.role.
 */
export function getUserRole(user) {
    return user?.user_metadata?.role ?? user?.app_metadata?.role ?? null;
}

export function useUserRole() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const syncAuthState = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (isMounted) {
                const nextUser = session?.user ?? null;
                setUser(nextUser);
                setRole(getUserRole(nextUser));
                setLoading(false);
            }
        };

        syncAuthState();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                const nextUser = session?.user ?? null;
                setUser(nextUser);
                setRole(getUserRole(nextUser));
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return { user, role, isAuthenticated: Boolean(user), loading };
}

// Backwards-compatible shim: existing Navbar/Hero/CTA only need the boolean.
export function useAuthStatus() {
    const { isAuthenticated, loading } = useUserRole();
    return { isAuthenticated, loading };
}

