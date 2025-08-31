-- Deduplicate anki_cards by front, keeping the lowest id per front
WITH ranked AS (
  SELECT id, front,
         ROW_NUMBER() OVER (PARTITION BY front ORDER BY id ASC) AS rn
  FROM anki_cards
)
DELETE FROM anki_cards WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Enforce uniqueness of fronts going forward
CREATE UNIQUE INDEX IF NOT EXISTS idx_anki_cards_front_unique ON anki_cards(front);

