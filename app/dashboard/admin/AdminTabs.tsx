"use client";

import { useState, useEffect } from "react";
import type {
  Location,
  Department,
  User,
  CoreValue,
  Group,
} from "@/db/schema";
import LocationsTab from "./tabs/LocationsTab";
import DepartmentsTab from "./tabs/DepartmentsTab";
import CoreValuesTab from "./tabs/CoreValuesTab";
import UsersTab from "./tabs/UsersTab";
import GroupsTab from "./tabs/GroupsTab";

const TABS = [
  { id: "locations", label: "Locations" },
  { id: "departments", label: "Departments" },
  { id: "groups", label: "Groups" },
  { id: "core-values", label: "Core Values" },
  { id: "users", label: "Users" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface AdminTabsProps {
  locations: Location[];
  departments: Department[];
  users: User[];
  coreValues: CoreValue[];
  hrLocationsMapped: { hrUserId: string; locationId: string }[];
  gmLocationsMapped: { gmUserId: string; locationId: string }[];
  groups: Group[];
  groupManagersGroupsMapped: { groupManagerId: string; groupId: string }[];
  defaultTab?: string;
}

export default function AdminTabs({
  locations,
  departments,
  users,
  coreValues,
  hrLocationsMapped,
  gmLocationsMapped,
  groups,
  groupManagersGroupsMapped,
  defaultTab,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (defaultTab && TABS.some((t) => t.id === defaultTab)) {
      return defaultTab as TabId;
    }
    return "locations";
  });

  useEffect(() => {
    if (defaultTab && TABS.some((t) => t.id === defaultTab)) {
      setActiveTab(defaultTab as TabId);
    }
  }, [defaultTab]);

  return (
    <div>
      <div className="tab-strip">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-strip__item${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "locations" && (
        <LocationsTab locations={locations} />
      )}
      {activeTab === "departments" && (
        <DepartmentsTab
          departments={departments}
          locations={locations}
          groups={groups}
        />
      )}
      {activeTab === "groups" && (
        <GroupsTab
          groups={groups}
          departments={departments}
          users={users}
          groupManagersGroupsMapped={groupManagersGroupsMapped}
        />
      )}
      {activeTab === "core-values" && (
        <CoreValuesTab coreValues={coreValues} />
      )}
      {activeTab === "users" && (
        <UsersTab
          users={users}
          locations={locations}
          departments={departments}
          groups={groups}
          hrLocationsMapped={hrLocationsMapped}
          gmLocationsMapped={gmLocationsMapped}
          groupManagersGroupsMapped={groupManagersGroupsMapped}
        />
      )}
    </div>
  );
}
