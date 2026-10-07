import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const analyses = sqliteTable('analyses', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  createdAt: integer('created_at').notNull(),
  jd: text('jd').notNull(),
  profile: text('profile').notNull(),
  result: text('result').notNull(),
}, t => [index('idx_analyses_owner_created').on(t.ownerId, t.createdAt)]);
