import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("member_role", ["federation", "coach", "athlete"]);

/** `cleared` keeps the row so the next sheet sync can blank the cell. */
export const markStatusEnum = pgEnum("mark_status", [
  "absent",
  "present",
  "lesson",
  "other",
  "cleared",
]);

export const markSourceEnum = pgEnum("mark_source", ["import", "app"]);

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name"),
});

/** A squad maps to one worksheet of the shared file (e.g. "CADRE FEDERAL"). */
export const squads = pgTable("squads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const athletes = pgTable(
  "athletes",
  {
    id: serial("id").primaryKey(),
    squadId: integer("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    clubId: integer("club_id").references(() => clubs.id, { onDelete: "set null" }),
    familyName: text("family_name").notNull(),
    givenName: text("given_name").notNull().default(""),
    coachLabel: text("coach_label"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    uniqueIndex("athletes_squad_name_uq").on(t.squadId, t.familyName, t.givenName),
    index("athletes_club_idx").on(t.clubId),
  ],
);

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    athleteId: integer("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    status: markStatusEnum("status").notNull(),
    /** Free text for `other` marks (competition venue, "*", ...). */
    note: text("note"),
    source: markSourceEnum("source").notNull().default("app"),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Last time this mark was written to the shared sheet. */
    syncedAt: timestamp("synced_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("attendance_athlete_day_uq").on(t.athleteId, t.day),
    index("attendance_day_idx").on(t.day),
    index("attendance_pending_sync_idx")
      .on(t.updatedAt)
      .where(sql`${t.source} = 'app'`),
  ],
);

/**
 * Authorisation is keyed by e-mail: an administrator grants a role to an
 * address, and whoever signs in with that (verified) address gets it.
 */
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: roleEnum("role").notNull(),
  clubId: integer("club_id").references(() => clubs.id, { onDelete: "set null" }),
  athleteId: integer("athlete_id").references(() => athletes.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ok: boolean("ok"),
  cellsWritten: integer("cells_written").notNull().default(0),
  message: text("message"),
});

export type Club = typeof clubs.$inferSelect;
export type Squad = typeof squads.$inferSelect;
export type Athlete = typeof athletes.$inferSelect;
export type AttendanceRow = typeof attendance.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type MarkStatus = (typeof markStatusEnum.enumValues)[number];
