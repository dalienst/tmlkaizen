import {
  pgTable,
  pgEnum,
  serial,
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
]);

export const projectStatusEnum = pgEnum("project_status", [
  "PROPOSED",
  "IN_PROGRESS",
  "COMPLETED",
]);

// ─── Locations ────────────────────────────────────────────────────────────────

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Departments ──────────────────────────────────────────────────────────────

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  locationId: integer("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Users (management accounts) ─────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  staffId: varchar("staff_id", { length: 100 }),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  /** GM: tied to one location */
  locationId: integer("location_id").references(() => locations.id, {
    onDelete: "set null",
  }),
  /** DEPT_MANAGER: tied to one department */
  departmentId: integer("department_id").references(() => departments.id, {
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
    hrUserId: integer("hr_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.hrUserId, t.locationId] })]
);

// ─── GM ↔ Locations (many-to-many) ───────────────────────────────────────────

export const gmLocations = pgTable(
  "gm_locations",
  {
    gmUserId: integer("gm_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.gmUserId, t.locationId] })]
);

// ─── Core Values ──────────────────────────────────────────────────────────────

export const coreValues = pgTable("core_values", {
  id: serial("id").primaryKey(),
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
    id: serial("id").primaryKey(),
    staffId: varchar("staff_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    departmentId: integer("department_id")
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
  id: serial("id").primaryKey(),
  /** Format: KZN-YYYY-NNNN — generated at insert time */
  referenceNumber: varchar("reference_number", { length: 20 }).notNull(),
  coreValueIds: integer("core_value_ids").array().notNull().default([]),
  currentSituation: text("current_situation").notNull(),
  improvementIdea: text("improvement_idea").notNull(),
  expectedBenefit: text("expected_benefit").notNull(),
  imageUrls: text("image_urls").array().notNull().default([]),
  status: projectStatusEnum("status").notNull().default("PROPOSED"),
  staffId: integer("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "restrict" }),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  staff: many(staff),
  managerUsers: many(users),
  kaizenProjects: many(kaizenProjects),
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

// ─── Password Reset Tokens ────────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
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
