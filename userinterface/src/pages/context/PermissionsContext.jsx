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
    
    ads: false, 
    leads: false, 

    // ✅ ADDED: Default false for new CRM Lead fields
    view_all_lead: false,
    view_my_lead: false,
    create_new_lead: false,
    update_lead: false,
    update_lead_stage: false,
    update_lead_responsible: false,
    delete_lead: false,

    // CRM Listing
    view_all_listing: false,
    view_my_listing: false,
    create_new_listing: false,
    update_listing: false,
    delete_listing: false,
    confirm_listing: false,
    
    // CRM Listing Owners
    view_all_listing_owners: false,
    view_my_listing_owners: false,
    create_new_listing_owners: false,
    update_listing_owners: false,
    delete_listing_owners: false,
};

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
    const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
    const [loading, setLoading] = useState(true);

    const fetchedOnceRef = useRef(false);

    const fetchPermissions = useCallback(async (opts = {}) => {
        const { showLoading = true } = opts;

        if (showLoading) setLoading(true);

        try {
            const token = localStorage.getItem("access_token");

            if (!token) {
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
                console.error(
                    "Permissions fetch failed with status",
                    res.status
                );
                return;
            }

            const data = await res.json();

            // ✅ UPDATED: The spread operator (...data) will now automatically 
            // pick up the new Lead fields from the backend response and merge 
            // them over the defaults.
            setPermissions({ ...DEFAULT_PERMISSIONS, ...data });
        } catch (err) {
            console.error("Failed to load permissions:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (fetchedOnceRef.current) return;
        fetchedOnceRef.current = true;
        fetchPermissions();
    }, [fetchPermissions]);

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