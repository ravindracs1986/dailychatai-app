-- OpenRouter models stay off until an admin allows them.
-- Allowing a model sets is_active and is_public, which shows it to signed-in and guest users.
UPDATE models SET is_active = 0, is_public = 0;

ALTER TABLE models
  MODIFY is_active TINYINT(1) NOT NULL DEFAULT 0,
  MODIFY is_public TINYINT(1) NOT NULL DEFAULT 0;
