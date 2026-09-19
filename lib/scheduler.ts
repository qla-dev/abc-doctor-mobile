import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';
import type { FlashcardRating } from '@/types';

// Default FSRS parameters with a 90% target retention: the literature's usual trade-off between
// workload and recall, and the figure Anki ships as its own default.
const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

const RATING_MAP: Record<FlashcardRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export type ReviewState = {
  card: Card;
  dueDate: string;
  intervalDays: number;
};

export function newCard(): ReviewState {
  const card = createEmptyCard();
  return { card, dueDate: card.due.toISOString(), intervalDays: 0 };
}

/**
 * Apply one review. Returns the next state; the four ratings map onto FSRS's own grades, so
 * "Again" genuinely resets the interval rather than nudging it down.
 */
export function review(state: ReviewState, rating: FlashcardRating, now = new Date()): ReviewState {
  const result = scheduler.next(state.card, now, RATING_MAP[rating]);
  return {
    card: result.card,
    dueDate: result.card.due.toISOString(),
    intervalDays: result.card.scheduled_days,
  };
}

/** Human-readable gap until the next review, for the button subtitles. */
export function previewIntervals(state: ReviewState, now = new Date()): Record<FlashcardRating, string> {
  const out = {} as Record<FlashcardRating, string>;
  (Object.keys(RATING_MAP) as FlashcardRating[]).forEach((rating) => {
    const next = scheduler.next(state.card, now, RATING_MAP[rating]).card;
    const days = next.scheduled_days;
    const minutes = Math.round((next.due.getTime() - now.getTime()) / 60000);
    out[rating] = days >= 1 ? `${days}d` : minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${Math.max(1, minutes)}m`;
  });
  return out;
}
