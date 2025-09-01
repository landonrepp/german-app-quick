"use server";

import { getAnkiCards, markAnkiCardsExported, updateAnkiBack, updateAnkiFront } from '@/utils/miningDao';

export async function getAnkiCardsAction() {
  return await getAnkiCards();
}

export async function updateAnkiFrontAction(id: number, front: string) {
  await updateAnkiFront(id, front);
  return { ok: true } as const;
}

export async function updateAnkiBackAction(id: number, back: string) {
  await updateAnkiBack(id, back);
  return { ok: true } as const;
}

export async function markAnkiCardsExportedAction(ids: number[]) {
  await markAnkiCardsExported(ids);
  return { ok: true } as const;
}
