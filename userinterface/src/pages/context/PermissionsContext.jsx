import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from "react";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const DEFAULT_PERMISSIONS = {
    ListWorkLog: false,
    monitoring: false,
    add_monitor: false,
    property_management: false,
    financials: false,
    can_view_users: false,
    can_manage_users: false,
    can_manage_permissions: false,
};

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
    const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
    const [loading, setLoading] = useState(true);

    // ✅ Track whether we've ever fetched, so refresh() can skip the
    //    initial mount duplication.
    const fetchedOnceRef = useRef(false);

    // ✅ useCallback prevents consumers re-rendering on every provider render
    const fetchPermissions = useCallback(async (opts = {}) => {
        const { showLoading = true } = opts;

        if (showLoading) setLoading(true);

        try {
            const token = localStorage.getItem("access_token");

            if (!token) {
                // No token → reset to defaults, stop loading
                setPermissions(DEFAULT_PERMISSIONS);
                return;
            }

            const res = await fetch(`${BASE}/api/permissions/me/`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                // 401 / 403 / 500 → keep defaults, don't crash the app
                console.error(
                    "Permissions fetch failed with status",
                    res.status
                );
                return;
            }

            const data = await res.json();

            // ✅ Merge with defaults so any missing key stays `false`
            setPermissions({ ...DEFAULT_PERMISSIONS, ...data });
        } catch (err) {
            console.error("Failed to load permissions:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch on mount
    useEffect(() => {
        if (fetchedOnceRef.current) return;
        fetchedOnceRef.current = true;
        fetchPermissions();
    }, [fetchPermissions]);

    // ✅ Stable refresh() — used by Login.jsx after a successful login.
    //    Silent mode (no loading flip) because Sidebar is already mounted
    //    and we don't want the skeleton flash.
    const refresh = useCallback(
        () => fetchPermissions({ showLoading: false }),
        [fetchPermissions]
    );

    return (
        <PermissionsContext.Provider
            value={{ permissions, loading, refresh }}
        >
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const ctx = useContext(PermissionsContext);
    if (!ctx) {
        throw new Error(
            "usePermissions must be used inside PermissionsProvider"
        );
    }
    return ctx;
}