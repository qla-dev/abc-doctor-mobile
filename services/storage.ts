import { createMMKV } from 'react-native-mmkv';
import type { FlashcardRating, QuizResultRecord } from '@/types';

/**
 * Synchronous key/value storage. MMKV is used rather than AsyncStorage because these reads
 * happen during render — a card's schedule, a topic's bookmark state — and an async read there
 * means a frame of wrong UI before the right value arrives.
 */
// MMKV 4 dropped the class in favour of a factory; the Nitro module is created once here.
const store = createMMKV({ id: 'abc-doctor' });

/** Keys carry the semantics the web prototype established, with a version suffix. */
const KEYS = {
  progress: 'abc_doctor_progress_v1',
  bookmarks: 'abc_doctor_bookmarks_v1',
  quizHistory: 'abc_doctor_quiz_history_v1',
  notes: 'abc_doctor_notes_v1',
  reviews: 'abc_doctor_reviews_v1',
  streak: 'abc_doctor_streak_v1',
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = store.getString(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // A corrupt value must not brick the screen that reads it; fall back and let the next
    // write replace it.
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    store.set(key, JSON.stringify(value));
  } catch {
    // Storage being full is not worth losing the user's action over.
  }
}

/** Per-topic completion, 0-100. */
export type TopicProgress = Record<string, number>;

export const Progress = {
  all: () => readJson<TopicProgress>(KEYS.progress, {}),
  get: (topicId: string) => Progress.all()[topicId] ?? 0,
  set: (topicId: string, percentage: number) => {
    const current = Progress.all();
    // Progress never goes backwards from re-reading a topic you already finished.
    current[topicId] = Math.max(current[topicId] ?? 0, Math.min(100, Math.round(percentage)));
    writeJson(KEYS.progress, current);
  },
};

export const Bookmarks = {
  all: () => readJson<string[]>(KEYS.bookmarks, []),
  has: (topicId: string) => Bookmarks.all().includes(topicId),
  toggle: (topicId: string) => {
    const current = Bookmarks.all();
    const next = current.includes(topicId)
      ? current.filter(id => id !== topicId)
      : [...current, topicId];
    writeJson(KEYS.bookmarks, next);
    return next.includes(topicId);
  },
};

export const QuizHistory = {
  all: () => readJson<QuizResultRecord[]>(KEYS.quizHistory, []),
  record: (result: QuizResultRecord) => {
    // Newest first, capped: a study history is read from the top and never paged back years.
    writeJson(KEYS.quizHistory, [result, ...QuizHistory.all()].slice(0, 100));
  },
  accuracy: () => {
    const history = QuizHistory.all();
    if (history.length === 0) return null;
    const asked = history.reduce((total, record) => total + record.totalQuestions, 0);
    const right = history.reduce((total, record) => total + record.score, 0);
    return asked === 0 ? null : Math.round((right / asked) * 100);
  },
};

export const Notes = {
  all: () => readJson<Record<string, string>>(KEYS.notes, {}),
  get: (topicId: string) => Notes.all()[topicId] ?? '',
  set: (topicId: string, text: string) => {
    const current = Notes.all();
    if (text.trim()) current[topicId] = text;
    else delete current[topicId];
    writeJson(KEYS.notes, current);
  },
};

/** One card's saved FSRS state, stored as the serialisable parts of the scheduler's card. */
export type StoredReview = {
  cardId: string;
  due: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview?: string;
  lastRating: FlashcardRating;
};

export const Reviews = {
  all: () => readJson<Record<string, StoredReview>>(KEYS.reviews, {}),
  get: (cardId: string) => Reviews.all()[cardId],
  save: (review: StoredReview) => {
    const current = Reviews.all();
    current[review.cardId] = review;
    writeJson(KEYS.reviews, current);
  },
  /** Cards whose due date has passed, plus every card never reviewed. */
  dueCount: (allCardIds: string[], now = new Date()) => {
    const saved = Reviews.all();
    return allCardIds.filter(id => {
      const review = saved[id];
      return !review || new Date(review.due) <= now;
    }).length;
  },
  isDue: (cardId: string, now = new Date()) => {
    const review = Reviews.get(cardId);
    return !review || new Date(review.due) <= now;
  },
};

export const Streak = {
  read: () => readJson<{ days: number; lastStudied: string | null }>(KEYS.streak, { days: 0, lastStudied: null }),
  /** Call once per study action. Consecutive calendar days extend it; a skipped day resets it. */
  touch: (now = new Date()) => {
    const current = Streak.read();
    const today = now.toDateString();
    if (current.lastStudied === today) return current;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const continued = current.lastStudied === yesterday.toDateString();

    const next = { days: continued ? current.days + 1 : 1, lastStudied: today };
    writeJson(KEYS.streak, next);
    return next;
  },
};

/** Wipes everything. Used by the settings screen, and by nothing else. */
export function resetAll() {
  Object.values(KEYS).forEach(key => store.remove(key));
}
