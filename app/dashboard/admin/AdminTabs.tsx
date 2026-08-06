"use client";

import { useState } from "react";
import type {
  Location,
  Department,
  User,
  CoreValue,
} from "@/db/schema";
import LocationsTab from "./tabs/LocationsTab";
import DepartmentsTab from "./tabs/DepartmentsTab";
import CoreValuesTab from "./tabs/CoreValuesTab";
import UsersTab from "./tabs/UsersTab";

const TABS = [
  { id: "locations", label: "Locations" },
  { id: "departments", label: "Departments" },
  { id: "core-values", label: "Core Values" },
  { id: "users", label: "Users" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface AdminTabsProps {
  locations: Location[];
  departments: Department[];
  users: User[];
  coreValues: CoreValue[];
  hrLocationsMapped: { hrUserId: number; locationId: number }[];
}

export default function AdminTabs({
  locations,
  departments,
  users,
  coreValues,
  hrLocationsMapped,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("locations");

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
        <DepartmentsTab departments={departments} locations={locations} />
      )}
      {activeTab === "core-values" && (
        <CoreValuesTab coreValues={coreValues} />
      )}
      {activeTab === "users" && (
        <UsersTab
          users={users}
          locations={locations}
          departments={departments}
          hrLocationsMapped={hrLocationsMapped}
        />
      )}
    </div>
  );
}
