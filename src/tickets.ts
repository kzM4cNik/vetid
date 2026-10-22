import type { Verdict } from './ml/types';

export type Ticket = {
  code: string;
  room: string;
  verdict: 'cat' | 'dog' | 'other';
};

const seq = { cat: 0, dog: 0, other: 0 };

const PREFIX: Record<Ticket['verdict'], string> = { cat: 'К', dog: 'С', other: 'Ж' };
const ROOM: Record<Ticket['verdict'], string> = {
  cat: 'Кабинет 1',
  dog: 'Кабинет 2',
  other: 'Кабинет 3',
};

export function issueTicket(verdict: Verdict): Ticket | null {
  if (verdict !== 'cat' && verdict !== 'dog' && verdict !== 'other') return null;
  seq[verdict] += 1;
  const n = String(seq[verdict]).padStart(2, '0');
  return { code: `${PREFIX[verdict]}-${n}`, room: ROOM[verdict], verdict };
}
