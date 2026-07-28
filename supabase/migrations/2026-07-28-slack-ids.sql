-- Slack member IDs so weekend invites can @mention the invited teammate.
alter table allowed_members add column if not exists slack_id text;
