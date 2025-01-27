CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp,
	`refresh_token_expires_at` timestamp,
	`scope` text,
	`password` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parseable_file` (
	`id` varchar(36) NOT NULL,
	`bucket_name` varchar(255) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_path` text NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`content_type` varchar(256) NOT NULL,
	`size` int NOT NULL,
	`status` enum('pending','processing','failed') NOT NULL DEFAULT 'pending',
	`error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`parsing_task_id` varchar(36) NOT NULL,
	CONSTRAINT `parseable_file_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parsing_task` (
	`id` varchar(36) NOT NULL,
	`task_name` varchar(128) NOT NULL,
	`task_status` enum('created','extracting','converting','extracting_info','aggregating','completed','failed') NOT NULL DEFAULT 'created',
	`total_files` int NOT NULL DEFAULT 0,
	`processed_files` int NOT NULL DEFAULT 0,
	`invalid_files` int NOT NULL DEFAULT 0,
	`json_file_path` varchar(255),
	`sheet_file_path` varchar(255),
	`error_message` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `parsing_task_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL,
	`image` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parseable_file` ADD CONSTRAINT `parseable_file_parsing_task_id_parsing_task_id_fk` FOREIGN KEY (`parsing_task_id`) REFERENCES `parsing_task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parsing_task` ADD CONSTRAINT `parsing_task_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;