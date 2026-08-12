import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  groups,
  departments,
  users,
  groupManagersGroups,
  locations,
} from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import GroupsTab from "../admin/tabs/GroupsTab";
import { formatDate } from "@/lib/constants";
import Link from "next/link";

export const metadata = { title: "Groups Directory | Kaizen Tracker" };

export default async function GroupsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id as string;

  if (role !== "SYSTEM_ADMIN" && role !== "GROUP_MANAGER") {
    redirect("/dashboard");
  }

  // ── Admin management view ──────────────────────────────────────────────────
  if (role === "SYSTEM_ADMIN") {
    const [allGroups, allDepartments, allUsers, allGroupManagersGroupsMapped] =
      await Promise.all([
        db.select().from(groups).orderBy(asc(groups.name)),
        db.select().from(departments).orderBy(asc(departments.name)),
        db.select().from(users).orderBy(asc(users.name)),
        db.select().from(groupManagersGroups),
      ]);

    return (
      <div className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Groups Management</h1>
            <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
              Configure crossed-location department groupings and managers.
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          <GroupsTab
            groups={allGroups}
            departments={allDepartments}
            users={allUsers}
            groupManagersGroupsMapped={allGroupManagersGroupsMapped}
          />
        </div>
      </div>
    );
  }

  // ── Group Manager read-only view ───────────────────────────────────────────
  const mgrGroups = await db
    .select({ groupId: groupManagersGroups.groupId })
    .from(groupManagersGroups)
    .where(eq(groupManagersGroups.groupManagerId, userId));

  const groupIds = mgrGroups.map((g) => g.groupId);

  const [managedGroups, allDepts, allLocations] = await Promise.all([
    groupIds.length > 0
      ? db.select().from(groups).where(inArray(groups.id, groupIds)).orderBy(asc(groups.name))
      : Promise.resolve([]),
    db.select().from(departments),
    db.select().from(locations),
  ]);

  const locMap = Object.fromEntries(allLocations.map((l) => [l.id, l.name]));

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <div>
          <h1 className="font-semibold" style={{ fontSize: "1rem" }}>My Groups</h1>
          <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
            Viewing groups assigned to your profile
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {managedGroups.length === 0 ? (
          <div className="card text-center text-muted" style={{ padding: "3rem" }}>
            No groups are currently assigned to your Group Manager profile.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Group Name</th>
                  <th>Code</th>
                  <th>Assigned Departments</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ width: "8rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {managedGroups.map((grp) => {
                  const grpDepts = allDepts.filter((d) => d.groupId === grp.id);
                  return (
                    <tr key={grp.id}>
                      <td className="font-medium">{grp.name}</td>
                      <td>
                        <code style={{ fontSize: "0.8125rem" }}>{grp.code}</code>
                      </td>
                      <td>
                        {grpDepts.length === 0 ? (
                          <span className="text-muted" style={{ fontSize: "0.8125rem" }}>No departments assigned</span>
                        ) : (
                          <div className="flex gap-1.5 flex-wrap" style={{ maxWidth: "24rem" }}>
                            {grpDepts.map((d) => {
                              const locName = locMap[d.locationId] ?? "";
                              return (
                                <span
                                  key={d.id}
                                  className="badge badge-neutral"
                                  style={{ fontSize: "0.75rem" }}
                                  title={`${d.name} in location ${locName}`}
                                >
                                  {d.name} ({d.code})
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${grp.isActive ? "success" : "neutral"}`}>
                          {grp.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-sub">{formatDate(grp.createdAt)}</td>
                      <td>
                        <Link
                          href={`/dashboard/group-manager?group=${grp.id}`}
                          className="btn btn-ghost btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          View Analytics
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
