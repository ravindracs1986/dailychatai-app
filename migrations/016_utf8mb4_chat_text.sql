-- Chat text must store emoji and other 4-byte characters from model replies.
-- Only the text columns change. ID columns stay as-is so foreign keys still match.
ALTER TABLE messages
  MODIFY content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE conversations
  MODIFY title VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'New Chat';
