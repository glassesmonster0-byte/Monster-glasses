CREATE TABLE `generated_content` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt` text NOT NULL,
	`output_path` text,
	`status` text NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	`approved_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `price_research_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`provider` text NOT NULL,
	`found_prices` text DEFAULT '[]' NOT NULL,
	`median_price` real,
	`markup_percent` real NOT NULL,
	`suggested_price` real,
	`approved_price` real,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source_url` text,
	`description` text,
	`source_image_paths` text DEFAULT '[]' NOT NULL,
	`category` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shopify_syncs` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`shopify_product_id` text,
	`action` text NOT NULL,
	`changes_summary` text,
	`success` integer NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `social_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`content_id` text,
	`platform` text NOT NULL,
	`post_type` text NOT NULL,
	`caption` text,
	`scheduled_for` integer,
	`status` text NOT NULL,
	`platform_post_id` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`posted_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_id`) REFERENCES `generated_content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflow_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
