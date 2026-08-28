import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  hankoUserId: text("hanko_user_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: text("user_id").notNull().references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  provider: text("provider").notNull().default("google"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const locations = pgTable("locations", {
  id: text("id").primaryKey(), // We can use custom ID or uuid
  userId: text("user_id").notNull().references(() => user.id),
  googleLocationId: text("google_location_id").notNull(), // from Google API
  name: text("name").notNull(),
  autoReplyPositive: boolean("auto_reply_positive").notNull().default(true),
  autoReplyNegative: boolean("auto_reply_negative").notNull().default(false),
  tone: text("tone").notNull().default("professional"),
  language: text("language").notNull().default("original"),
  sheetId: text("sheet_id"), // Configured Google Sheet for logging
  sheetRange: text("sheet_range").default("Reviews!A:D"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(), // local UUID
  locationId: text("location_id").notNull().references(() => locations.id),
  googleReviewId: text("google_review_id").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  comment: text("comment").notNull().default(""),
  rating: integer("rating").notNull().default(5),
  sentiment: text("sentiment").notNull().default("other"), // 'negative', 'other'
  aiDraftResponse: text("ai_draft_response"),
  finalResponse: text("final_response"),
  status: text("status").notNull().default("pending"), // 'pending' (human review needed), 'approved', 'posted', 'ignored'
  syncedToSheets: boolean("synced_to_sheets").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
