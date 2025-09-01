-- Mark anki cards as exported so they no longer appear after export
ALTER TABLE anki_cards ADD COLUMN exported_at TIMESTAMP NULL;

-- Optional index to speed up filtering by export status
CREATE INDEX IF NOT EXISTS idx_anki_cards_exported_at ON anki_cards(exported_at);

