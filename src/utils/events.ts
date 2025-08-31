import { EventEmitter } from 'events';

// Simple in-memory event bus for server-only signals.
// Not suitable for multi-process deployments but fine for local/dev.
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const keyFor = (cardId: number) => `anki_card_updated:${cardId}`;

export function emitCardUpdated(cardId: number) {
  emitter.emit(keyFor(cardId), { id: cardId, ts: Date.now() });
}

export function waitForCardUpdated(cardId: number, timeoutMs = 60000): Promise<void> {
  return new Promise((resolve) => {
    const event = keyFor(cardId);
    const onHit = () => {
      clearTimeout(tid);
      emitter.off(event, onHit);
      resolve();
    };
    const tid = setTimeout(() => {
      emitter.off(event, onHit);
      resolve();
    }, timeoutMs);
    emitter.once(event, onHit);
  });
}

