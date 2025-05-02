CREATE TABLE `extraction_config` (
	`id` varchar(36) NOT NULL,
	`name` varchar(128) NOT NULL,
	`config` json NOT NULL,
	`prompt` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extraction_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `extraction_config` ADD CONSTRAINT `extraction_config_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;