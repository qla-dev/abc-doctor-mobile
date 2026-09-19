import { PATIENT_CASES_DATA } from '@/data/patientCasesData';
import type { PatientCase } from '@/types';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GenderChoice = 'M' | 'F' | 'any';
export type AgeBand = '18-34' | '35-54' | '55-74' | '75+';

export type CaseSetup = {
  difficulty: Difficulty;
  specialty: string | 'any';
  gender: GenderChoice;
  ageBand: AgeBand;
};

export const AGE_BANDS: AgeBand[] = ['18-34', '35-54', '55-74', '75+'];
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Regional names, so a generated patient reads like someone who walked into this clinic. */
const NAMES: Record<'M' | 'F', string[]> = {
  M: ['Emir Hadžić', 'Marko Petrović', 'Adnan Kovač', 'Stefan Ilić', 'Haris Delić', 'Tomislav Barić'],
  F: ['Amina Softić', 'Jelena Marić', 'Lejla Begić', 'Ivana Novak', 'Sara Mujić', 'Dragana Vuković'],
};

const BAND_RANGE: Record<AgeBand, [number, number]> = {
  '18-34': [18, 34], '35-54': [35, 54], '55-74': [55, 74], '75+': [75, 92],
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** The specialties we can actually stage a consultation for, taken from the seeded cases. */
export function availableSpecialties(): string[] {
  return Array.from(new Set(PATIENT_CASES_DATA.map(caseItem => inferSpecialty(caseItem))));
}

function inferSpecialty(caseItem: PatientCase): string {
  const diagnosis = caseItem.correctDiagnosis.toLowerCase();
  if (diagnosis.includes('myocardial') || diagnosis.includes('cardi')) return 'Cardiology';
  if (diagnosis.includes('appendic') || diagnosis.includes('surg')) return 'Surgery';
  return 'Internal Medicine';
}

export function randomSetup(): CaseSetup {
  return {
    difficulty: pick(DIFFICULTIES),
    specialty: pick([...availableSpecialties(), 'any']),
    gender: pick<GenderChoice>(['M', 'F', 'any']),
    ageBand: pick(AGE_BANDS),
  };
}

export type GeneratedCase = {
  /** The clinical template the consultation is graded against. */
  source: PatientCase;
  name: string;
  age: number;
  gender: 'M' | 'F';
  specialty: string;
  difficulty: Difficulty;
  /** True when no seeded case matched the chosen specialty, so we substituted another one. */
  substituted: boolean;
};

/**
 * Build a consultation from the setup. The patient's identity comes from the chooser, the
 * clinical content from the closest seeded case — so the persona varies every run while the
 * findings stay internally consistent. Once the backend generates cases this whole function is
 * replaced by a request; the shape it returns is deliberately the same.
 */
export function generateCase(setup: CaseSetup): GeneratedCase {
  const matching = setup.specialty === 'any'
    ? PATIENT_CASES_DATA
    : PATIENT_CASES_DATA.filter(caseItem => inferSpecialty(caseItem) === setup.specialty);

  const substituted = matching.length === 0;
  const source = pick(substituted ? PATIENT_CASES_DATA : matching);

  const gender: 'M' | 'F' = setup.gender === 'any' ? pick(['M', 'F']) : setup.gender;
  const [low, high] = BAND_RANGE[setup.ageBand];

  return {
    source,
    name: pick(NAMES[gender]),
    age: low + Math.floor(Math.random() * (high - low + 1)),
    gender,
    specialty: inferSpecialty(source),
    difficulty: setup.difficulty,
    substituted,
  };
}

/**
 * Answer a free-text question from the case's history clues by scoring word overlap. Short words
 * are ignored, so "do you have any chest pain" matches on "chest"/"pain" rather than on "you".
 */
export function answerQuestion(source: PatientCase, question: string): { answer: string; clueId: string } | null {
  const asked = question.toLowerCase().match(/[a-zà-ž]+/gi)?.filter(word => word.length > 3) ?? [];
  if (asked.length === 0) return null;

  let best: { score: number; clue: PatientCase['historyClues'][number] } | null = null;
  for (const clue of source.historyClues) {
    const haystack = clue.questionText.toLowerCase();
    const score = asked.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { score, clue };
  }

  return best ? { answer: best.clue.patientAnswer, clueId: best.clue.id } : null;
}
