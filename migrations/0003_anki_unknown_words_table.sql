-- Create table to store unknown words per Anki card with selection state
CREATE TABLE IF NOT EXISTS anki_card_unknown_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  word TEXT NOT NULL,
  selected INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(card_id, word),
  FOREIGN KEY(card_id) REFERENCES anki_cards(id) ON DELETE CASCADE
);

-- Backfill from existing anki_cards.unknown_words JSON if present
INSERT OR IGNORE INTO anki_card_unknown_words (card_id, word, selected)
SELECT c.id AS card_id,
       json_each.value AS word,
       1 AS selected
FROM anki_cards c,
     json_each(c.unknown_words)
WHERE c.unknown_words IS NOT NULL
  AND TRIM(c.unknown_words) <> ''
  AND json_valid(c.unknown_words);

-- Optional index to speed up lookups
CREATE INDEX IF NOT EXISTS idx_ankiu_card_words_card ON anki_card_unknown_words(card_id);

