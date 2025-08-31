-- Remove the per-card unknown words selection feature
DROP INDEX IF EXISTS idx_ankiu_card_words_card;
DROP TABLE IF EXISTS anki_card_unknown_words;

