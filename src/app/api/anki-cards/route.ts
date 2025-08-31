import { NextResponse } from 'next/server';
import { getAnkiCards } from '@/utils/miningDao';

export async function GET() {
  try {
    const cards = await getAnkiCards();
    return NextResponse.json({ cards });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to fetch cards' }, { status: 500 });
  }
}

