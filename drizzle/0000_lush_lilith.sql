CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`jd` text NOT NULL,
	`profile` text NOT NULL,
	`result` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analyses_owner_created` ON `analyses` (`owner_id`,`created_at`);