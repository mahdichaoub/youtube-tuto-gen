import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uuid,
  integer,
  date,
  jsonb,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// IMPORTANT! ID fields should ALWAYS use UUID types, EXCEPT the BetterAuth tables.


export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_account_idx").on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// ─── LearnAgent Core Tables ────────────────────────────────────────────────────

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: text("video_id").notNull(),
    videoUrl: text("video_url").notNull(),
    title: text("title"),
    topicCategory: text("topic_category"),
    estimatedDifficulty: text("estimated_difficulty"),
    projectContext: text("project_context").notNull(),
    // Customization fields (added in Phase 4 upgrade)
    depth: text("depth").notNull().default("deep"),           // quick | deep | expert
    focus: text("focus"),                                      // optional free-text focus instruction
    referenceUrl: text("reference_url"),                       // optional reference URL
    referenceUrlType: text("reference_url_type"),              // style_guide | extra_reading | project_context
    // Internal status values — NEVER display verbatim in UI
    // lifecycle: fetching → analyzing → researching → teaching → planning → complete | failed
    status: text("status").notNull().default("fetching"),
    isShared: boolean("is_shared").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("reports_user_id_idx").on(table.userId),
    index("reports_created_at_idx").on(table.createdAt),
  ]
);

export const reportSections = pgTable(
  "report_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    // sectionType values: concept | highlights | models | examples | actions | insights | research
    sectionType: text("section_type").notNull(),
    contentJson: jsonb("content_json").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("report_sections_report_id_idx").on(table.reportId),
  ]
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // scope values: today | week | month
    scope: text("scope").notNull(),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_user_id_idx").on(table.userId),
    index("tasks_report_id_idx").on(table.reportId),
    index("tasks_completed_at_idx").on(table.completedAt),
  ]
);

export const streaks = pgTable("streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  detailLevel: integer("detail_level").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// ─── LearnAgent Model Selection Tables ────────────────────────────────────────

export const userModelConfig = pgTable("user_model_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  primaryProvider: text("primary_provider").notNull(),
  primaryModel: text("primary_model").notNull(),
  fallbackProvider: text("fallback_provider"),
  fallbackModel: text("fallback_model"),
  dailyCostLimitUsd: numeric("daily_cost_limit_usd", {
    precision: 8,
    scale: 4,
  })
    .notNull()
    .default("5.0000"),
  timeoutMs: integer("timeout_ms").notNull().default(30000),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userApiKeys = pgTable(
  "user_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    // AES-256-GCM encrypted API key — never store plaintext
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_api_keys_user_provider_idx").on(
      table.userId,
      table.provider
    ),
  ]
);

export const reportCostLog = pgTable(
  "report_cost_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    estimatedUsd: numeric("estimated_usd", { precision: 8, scale: 6 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cost_log_user_id_idx").on(table.userId),
    index("cost_log_report_id_idx").on(table.reportId),
  ]
);
