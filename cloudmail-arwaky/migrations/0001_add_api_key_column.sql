-- Migration number: 0001 	 2026-04-26T05:00:18.167Z

-- Migration: add_api_key_column
ALTER TABLE accounts ADD COLUMN api_key TEXT;
