-- Migration to add privacy settings columns to user_settings table
-- This migration adds privacy-related columns to the existing user_settings table

-- Add privacy settings columns to user_settings table
ALTER TABLE user_settings ADD COLUMN online_status_visible BOOLEAN DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN allow_friend_requests BOOLEAN DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN allow_group_invites BOOLEAN DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN allow_direct_messages BOOLEAN DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN searchable_by_username BOOLEAN DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN searchable_by_nickname BOOLEAN DEFAULT 1;

-- Note: SQLite doesn't support adding multiple columns in a single ALTER TABLE statement
-- So we need to run each ADD COLUMN statement separately
