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

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** The clinical templates currently supported by the backend. */
export function availableSpecialties(): string[] {
  return ['Cardiology', 'Surgery'];
}

export function randomSetup(): CaseSetup {
  return {
    difficulty: pick(DIFFICULTIES),
    specialty: pick([...availableSpecialties(), 'any']),
    gender: pick<GenderChoice>(['M', 'F', 'any']),
    ageBand: pick(AGE_BANDS),
  };
}
