import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { OrgWithRole } from "@repomind/shared-types";
import { useAuth } from "./AuthContext";

interface OrgContextType {
  organizations: OrgWithRole[];
  activeOrg: OrgWithRole | null;
  loading: boolean;
  setActiveOrg: (org: OrgWithRole) => void;
  createOrg: (name: string, slug?: string) => Promise<OrgWithRole | null>;
  refreshOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<OrgWithRole[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrgWithRole | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrgs = useCallback(async () => {
    if (!isAuthenticated) {
      setOrganizations([]);
      setActiveOrg(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orgs", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const orgs: OrgWithRole[] = data.organizations || [];
        setOrganizations(orgs);
        if (orgs.length > 0 && !activeOrg) {
          setActiveOrg(orgs[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeOrg]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const createOrg = async (name: string, slug?: string): Promise<OrgWithRole | null> => {
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, slug }),
      });

      if (res.ok) {
        const data = await res.json();
        const newOrg: OrgWithRole = data.organization;
        setOrganizations((prev) => [...prev, newOrg]);
        setActiveOrg(newOrg);
        return newOrg;
      }
    } catch (err) {
      console.error("Failed to create organization:", err);
    }
    return null;
  };

  return (
    <OrgContext.Provider
      value={{
        organizations,
        activeOrg,
        loading,
        setActiveOrg,
        createOrg,
        refreshOrgs: fetchOrgs,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
};

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}
