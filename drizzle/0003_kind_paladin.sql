CREATE TABLE `trustedshop_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` text NOT NULL,
	`clientSecret` text NOT NULL,
	`channelId` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trustedshop_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trustedshop_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reviewId` int NOT NULL,
	`trustedshopResponseId` varchar(255),
	`responseText` text NOT NULL,
	`ts_status` enum('draft','published','failed') NOT NULL DEFAULT 'draft',
	`errorMessage` text,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trustedshop_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trustedshop_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trustedshopReviewId` varchar(255) NOT NULL,
	`authorName` varchar(255) NOT NULL,
	`rating` int NOT NULL,
	`reviewText` text NOT NULL,
	`reviewDate` timestamp NOT NULL,
	`hasResponse` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trustedshop_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_trustedshop_review_unique` UNIQUE(`userId`,`trustedshopReviewId`)
);
