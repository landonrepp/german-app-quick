import { getDatabase } from "@/utils/db";
import { waitForCardUpdated } from "@/utils/events";

type Props = { id: number };

export default async function AnkiBackCell({ id }: Props) {
  const db = await getDatabase();

  const getBack = () => db.prepare(`SELECT back FROM anki_cards WHERE id = ?`).get(id) as { back: string | null } | undefined;

  // If already translated, return immediately
  const cur = getBack();
  const backNow = cur?.back ?? "";
  if (backNow && backNow.trim().length > 0) {
    return backNow;
  }

  // Otherwise wait for a server-side signal that this card was updated
  await waitForCardUpdated(id, 10 * 60 * 60 * 1000);

  // Re-read and return whatever we have after the signal/timeout
  const after = getBack();
  const backAfter = after?.back ?? "";
  return backAfter;
}

