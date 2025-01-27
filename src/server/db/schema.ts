import {
  mysqlTable,
  mysqlTableCreator,
  text,
  varchar,
  timestamp,
  boolean,
  int,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

export const createTable = mysqlTableCreator((name) => name);

export const userTable = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const parsingTaskTable = mysqlTable("parsing_task", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  taskName: varchar("task_name", { length: 128 }).notNull(),
  taskStatus: mysqlEnum("task_status", [
    "created",
    "extracting",
    "converting",
    "extracting_info",
    "aggregating",
    "completed",
    "failed",
  ])
    .notNull()
    .default("created"),
  totalFiles: int("total_files").notNull().default(0),
  processedFiles: int("processed_files").notNull().default(0),
  invalidFiles: int("invalid_files").notNull().default(0),
  jsonFilePath: varchar("json_file_path", { length: 255 }),
  sheetFilePath: varchar("sheet_file_path", { length: 255 }),
  errorMessage: text("error_message"),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => userTable.id),
});

export const parsingTaskTableRelations = relations(
  parsingTaskTable,
  ({ many }) => ({
    parceableFiles: many(parseableFileTable, {
      relationName: "parseableFiles",
    }),
  }),
);

export const parseableFileTable = mysqlTable("parseable_file", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  bucketName: varchar("bucket_name", { length: 255 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 256 }).notNull(),
  size: int("size").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "failed"])
    .notNull()
    .default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  parsingTaskId: varchar("parsing_task_id", { length: 36 })
    .notNull()
    .references(() => parsingTaskTable.id),
});

export const parseableFileTableRelations = relations(
  parseableFileTable,
  ({ one }) => ({
    parsingTask: one(parsingTaskTable, {
      fields: [parseableFileTable.parsingTaskId],
      references: [parsingTaskTable.id],
      relationName: "parseableFiles",
    }),
  }),
);

export const sessionTable = mysqlTable("session", {
  id: varchar("id", { length: 36 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => userTable.id),
});

export const accountTable = mysqlTable("account", {
  id: varchar("id", { length: 36 }).primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => userTable.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verificationTable = mysqlTable("verification", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
