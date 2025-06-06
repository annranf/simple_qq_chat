-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- #####################################################################
-- ##                            USERS                                ##
-- #####################################################################
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- For future full authentication
    nickname TEXT,
    avatar_url TEXT,
    bio TEXT, -- User's short biography or status message
    status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline', 'away', 'busy', 'invisible')), -- User's presence status
    last_seen_at DATETIME, -- Timestamp of the last activity or when they went offline
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update 'updated_at' timestamp on user update
CREATE TRIGGER IF NOT EXISTS users_updated_at_trigger
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);


-- #####################################################################
-- ##                         FRIENDSHIPS                             ##
-- #####################################################################
CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- user1_id is always the smaller ID, user2_id is the larger ID. Enforced by application.
    user1_id INTEGER NOT NULL,
    user2_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'blocked')),
    -- 'requested_by_id' indicates who initiated the friendship request or blocking action.
    -- If 'blocked', 'requested_by_id' is the user who blocked the other.
    action_user_id INTEGER NOT NULL, -- The user who performed the last action (sent request, accepted, blocked)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (action_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user1_id, user2_id) -- Ensures a unique friendship pair
    -- CHECK (user1_id < user2_id) -- SQLite does not robustly support this for inserts. App must ensure.
);

-- Trigger to update 'updated_at' timestamp on friendship update
CREATE TRIGGER IF NOT EXISTS friendships_updated_at_trigger
AFTER UPDATE ON friendships
FOR EACH ROW
BEGIN
    UPDATE friendships SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Indexes for friendships table
CREATE INDEX IF NOT EXISTS idx_friendships_user1_id_status ON friendships(user1_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_user2_id_status ON friendships(user2_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_action_user_id ON friendships(action_user_id);


-- #####################################################################
-- ##                         MEDIA ATTACHMENTS                       ##
-- #####################################################################
CREATE TABLE IF NOT EXISTS media_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uploader_id INTEGER, -- Can be NULL if uploaded by a system process or if uploader is deleted
    file_name TEXT NOT NULL, -- Original file name
    file_path TEXT UNIQUE NOT NULL, -- Path on the server's file system
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    checksum TEXT UNIQUE, -- e.g., SHA256 hash of the file content for deduplication
    metadata TEXT, -- JSON string for additional info (e.g., image dimensions, video duration)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for media_attachments table
CREATE INDEX IF NOT EXISTS idx_media_attachments_uploader_id ON media_attachments(uploader_id);
CREATE INDEX IF NOT EXISTS idx_media_attachments_mime_type ON media_attachments(mime_type);


-- #####################################################################
-- ##                            GROUPS                               ##
-- #####################################################################
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    owner_id INTEGER, -- Group creator/owner
    group_type TEXT NOT NULL DEFAULT 'private' CHECK(group_type IN ('private', 'public_readonly', 'public_joinable')), -- Type of group
    invite_link_token TEXT UNIQUE, -- For joinable groups via link
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME, -- For soft deletion of groups
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL -- If owner is deleted, group might become ownerless or app logic handles ownership transfer
);

-- Trigger to update 'updated_at' timestamp on group update
CREATE TRIGGER IF NOT EXISTS groups_updated_at_trigger
AFTER UPDATE ON groups
FOR EACH ROW WHEN NEW.deleted_at IS OLD.deleted_at OR NEW.deleted_at IS NULL AND OLD.deleted_at IS NULL -- Avoid trigger on soft delete/undelete if only deleted_at changes
BEGIN
    UPDATE groups SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Indexes for groups table
CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_group_type ON groups(group_type);
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups(deleted_at);


-- #####################################################################
-- ##                         GROUP MEMBERS                           ##
-- #####################################################################
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'admin', 'owner')),
    nickname_in_group TEXT, -- User's specific nickname within this group
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    invited_by INTEGER, -- User who invited this member (NULL for group creators)
    -- 'status' could be 'active', 'invited', 'left', 'kicked', 'banned'
    -- For simplicity now, we assume if a user is in this table, they are active or invited.
    -- Leaving/kicking would mean deleting the row, or adding a 'status' field.
    -- Let's add a status field for more granularity.
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'pending_approval', 'left', 'kicked', 'banned')),
    muted_until DATETIME, -- If the user is muted in this group until a certain time
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (group_id, user_id) -- A user can only be in a group once
);

-- Trigger to update 'updated_at' timestamp on group_member update
CREATE TRIGGER IF NOT EXISTS group_members_updated_at_trigger
AFTER UPDATE ON group_members
FOR EACH ROW
BEGIN
    UPDATE group_members SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Indexes for group_members table
CREATE INDEX IF NOT EXISTS idx_group_members_user_id_group_id ON group_members(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(status);


-- #####################################################################
-- ##                           MESSAGES                              ##
-- #####################################################################
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER, -- Can be NULL for system messages
    -- For direct messages: receiver_type = 'user', receiver_id = other_user_id
    -- For group messages: receiver_type = 'group', receiver_id = group_id
    receiver_type TEXT NOT NULL CHECK(receiver_type IN ('user', 'group')),
    receiver_id INTEGER NOT NULL,
    -- 'text', 'image', 'video', 'audio', 'file', 'sticker', 'location', 'contact', 'system_notification', 'poll'
    content_type TEXT NOT NULL DEFAULT 'text',
    -- For text: the actual text.
    -- For media (image, video, audio, file): ID from media_attachments table.
    -- For sticker: sticker_id (from a potential stickers table).
    -- For system_notification: JSON detailing the event.
    content TEXT NOT NULL,
    metadata TEXT, -- JSON string for additional info (e.g., file name for files, custom attributes, poll options)
    reply_to_message_id INTEGER, -- ID of the message this one is replying to
    client_message_id TEXT UNIQUE, -- Optional: client-generated ID for idempotency / offline first support
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- For message edits
    deleted_at DATETIME, -- For soft deletion (message recall)
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL, -- If sender is deleted, message remains from "Unknown User"
    -- No direct FK for receiver_id to users or groups tables here, as receiver_type determines the target table.
    -- This needs to be handled at the application level or via more complex checks if SQLite supported them well.
    FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL -- If replied message is deleted, link is removed
);

-- Trigger to update 'updated_at' timestamp on message update (e.g., edit)
-- Avoids trigger on soft delete/undelete or if only deleted_at changes
CREATE TRIGGER IF NOT EXISTS messages_updated_at_trigger
AFTER UPDATE OF content, metadata ON messages -- Only trigger if content or metadata changes
FOR EACH ROW
WHEN NEW.deleted_at IS OLD.deleted_at OR (NEW.deleted_at IS NULL AND OLD.deleted_at IS NULL)
BEGIN
    UPDATE messages SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_type_receiver_id_created_at ON messages(receiver_type, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_content_type ON messages(content_type);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_message_id ON messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC); -- General history fetching
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);


-- #####################################################################
-- ##                     MESSAGE READ RECEIPTS                       ##
-- #####################################################################
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL, -- The user who read the message
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (message_id, user_id) -- A user can only have one read receipt per message
);

-- Indexes for message_read_receipts table
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id_message_id ON message_read_receipts(user_id, message_id);


-- #####################################################################
-- ##                      USER SETTINGS (Optional)                   ##
-- #####################################################################
-- User-specific settings including notification preferences, theme, and privacy settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    notifications_enabled BOOLEAN DEFAULT 1,
    theme TEXT DEFAULT 'light',
    -- Privacy settings
    online_status_visible BOOLEAN DEFAULT 1,        -- Whether online status is visible to others
    allow_friend_requests BOOLEAN DEFAULT 1,        -- Whether to accept friend requests
    allow_group_invites BOOLEAN DEFAULT 1,          -- Whether to accept group invitations
    allow_direct_messages BOOLEAN DEFAULT 1,        -- Whether to accept direct messages from non-friends
    searchable_by_username BOOLEAN DEFAULT 1,       -- Whether profile is searchable by username
    searchable_by_nickname BOOLEAN DEFAULT 1,       -- Whether profile is searchable by nickname
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS user_settings_updated_at_trigger
AFTER UPDATE ON user_settings
FOR EACH ROW
BEGIN
    UPDATE user_settings SET updated_at = CURRENT_TIMESTAMP WHERE user_id = OLD.user_id;
END;


-- STICKER PACKS: A collection of stickers
CREATE TABLE IF NOT EXISTS sticker_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  thumbnail_media_id INTEGER,
  uploader_id INTEGER, -- User who uploaded this pack (NULL for system packs)
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (thumbnail_media_id) REFERENCES media_attachments(id) ON DELETE SET NULL,
  -- Allow same pack name for different users, but unique for system packs
  UNIQUE (name, uploader_id)
);

CREATE TABLE IF NOT EXISTS stickers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id INTEGER NOT NULL,         
  media_id INTEGER NOT NULL UNIQUE,  
  emoji_keywords TEXT,            
  description TEXT,                
  sort_order INTEGER DEFAULT 0, 
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pack_id) REFERENCES sticker_packs(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media_attachments(id) ON DELETE CASCADE
);


-- You can add more tables like 'reactions' (message reactions), 'polls', 'user_sessions' etc. as features grow.