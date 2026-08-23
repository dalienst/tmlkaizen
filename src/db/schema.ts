import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "SYSTEM_ADMIN",
  "HR",
  "GM",
  "DEPT_MANAGER",
  "GROUP_MANAGER",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "PROPOSED",
  "IN_PROGRESS",
  "COMPLETED",
]);

// ─── Locations ────────────────────────────────────────────────────────────────

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [uniqueIndex("location_code_unique").on(t.code)]);

// ─── Groups (crossed-location) ────────────────────────────────────────────────

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [uniqueIndex("group_code_unique").on(t.code)]);

// ─── Departments ──────────────────────────────────────────────────────────────

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  locationId: varchar("location_id", { length: 255 })
    .notNull()
    .references(() => locations.id, { onDelete: "restrict" }),
  groupId: varchar("group_id", { length: 255 }).references(() => groups.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [uniqueIndex("department_code_unique").on(t.code)]);

// ─── Users (management accounts) ─────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  staffId: varchar("staff_id", { length: 100 }),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  /** GM: tied to one location */
  locationId: varchar("location_id", { length: 255 }).references(() => locations.id, {
    onDelete: "set null",
  }),
  /** DEPT_MANAGER: tied to one department */
  departmentId: varchar("department_id", { length: 255 }).references(() => departments.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── HR ↔ Locations (many-to-many) ───────────────────────────────────────────

export const hrLocations = pgTable(
  "hr_locations",
  {
    hrUserId: varchar("hr_user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locationId: varchar("location_id", { length: 255 })
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.hrUserId, t.locationId] })]
);

// ─── GM ↔ Locations (many-to-many) ───────────────────────────────────────────

export const gmLocations = pgTable(
  "gm_locations",
  {
    gmUserId: varchar("gm_user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locationId: varchar("location_id", { length: 255 })
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.gmUserId, t.locationId] })]
);

// ─── Group Managers ↔ Groups (many-to-many) ───────────────────────────────────

export const groupManagersGroups = pgTable(
  "group_managers_groups",
  {
    groupManagerId: varchar("group_manager_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: varchar("group_id", { length: 255 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.groupManagerId, t.groupId] })]
);

// ─── Department Managers ↔ Departments (many-to-many) ──────────────────────────

export const managersDepartments = pgTable(
  "managers_departments",
  {
    managerUserId: varchar("manager_user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    departmentId: varchar("department_id", { length: 255 })
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.managerUserId, t.departmentId] })]
);

// ─── Core Values ──────────────────────────────────────────────────────────────

export const coreValues = pgTable("core_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Staff (employee roster — validation only) ────────────────────────────────

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffId: varchar("staff_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    departmentId: varchar("department_id", { length: 255 })
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("staff_id_unique").on(t.staffId)]
);

// ─── Kaizen Projects ──────────────────────────────────────────────────────────

export const kaizenProjects = pgTable("kaizen_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Format: KZN-YYYY-NNNN — generated at insert time */
  referenceNumber: varchar("reference_number", { length: 20 }).notNull(),
  coreValueIds: uuid("core_value_ids").array().notNull().default([]),
  currentSituation: text("current_situation").notNull(),
  improvementIdea: text("improvement_idea").notNull(),
  expectedBenefit: text("expected_benefit").notNull(),
  imageUrls: text("image_urls").array().notNull().default([]),
  status: projectStatusEnum("status").notNull().default("PROPOSED"),
  staffId: varchar("staff_id", { length: 255 })
    .notNull()
    .references(() => staff.id, { onDelete: "restrict" }),
  departmentId: varchar("department_id", { length: 255 })
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const locationsRelations = relations(locations, ({ many }) => ({
  departments: many(departments),
  hrLocations: many(hrLocations),
  gmLocations: many(gmLocations),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  location: one(locations, {
    fields: [departments.locationId],
    references: [locations.id],
  }),
  group: one(groups, {
    fields: [departments.groupId],
    references: [groups.id],
  }),
  staff: many(staff),
  managerUsers: many(users),
  kaizenProjects: many(kaizenProjects),
  managersDepartments: many(managersDepartments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  location: one(locations, {
    fields: [users.locationId],
    references: [locations.id],
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  hrLocations: many(hrLocations),
  gmLocations: many(gmLocations),
  groupManagersGroups: many(groupManagersGroups),
  managersDepartments: many(managersDepartments),
}));

export const hrLocationsRelations = relations(hrLocations, ({ one }) => ({
  user: one(users, {
    fields: [hrLocations.hrUserId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [hrLocations.locationId],
    references: [locations.id],
  }),
}));

export const gmLocationsRelations = relations(gmLocations, ({ one }) => ({
  user: one(users, {
    fields: [gmLocations.gmUserId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [gmLocations.locationId],
    references: [locations.id],
  }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  departments: many(departments),
  groupManagersGroups: many(groupManagersGroups),
}));

export const groupManagersGroupsRelations = relations(groupManagersGroups, ({ one }) => ({
  user: one(users, {
    fields: [groupManagersGroups.groupManagerId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [groupManagersGroups.groupId],
    references: [groups.id],
  }),
}));

export const managersDepartmentsRelations = relations(managersDepartments, ({ one }) => ({
  user: one(users, {
    fields: [managersDepartments.managerUserId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [managersDepartments.departmentId],
    references: [departments.id],
  }),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  department: one(departments, {
    fields: [staff.departmentId],
    references: [departments.id],
  }),
  kaizenProjects: many(kaizenProjects),
}));

export const kaizenProjectsRelations = relations(kaizenProjects, ({ one }) => ({
  staff: one(staff, {
    fields: [kaizenProjects.staffId],
    references: [staff.id],
  }),
  department: one(departments, {
    fields: [kaizenProjects.departmentId],
    references: [departments.id],
  }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type CoreValue = typeof coreValues.$inferSelect;
export type NewCoreValue = typeof coreValues.$inferInsert;

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;

export type KaizenProject = typeof kaizenProjects.$inferSelect;
export type NewKaizenProject = typeof kaizenProjects.$inferInsert;

export type GmLocation = typeof gmLocations.$inferSelect;

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type GroupManagersGroup = typeof groupManagersGroups.$inferSelect;

// ─── Password Reset Tokens ────────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
