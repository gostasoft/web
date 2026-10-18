CREATE TABLE `cms_admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`credential_version` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cms_admin_sessions_expires_idx` ON `cms_admin_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `cms_login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cms_login_attempts_expires_idx` ON `cms_login_attempts` (`expires_at`);