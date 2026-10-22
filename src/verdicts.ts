import type { SoundName } from './sound';
import type { Verdict } from './ml/types';
import { colors } from './theme';

export type VerdictInfo = {
  title: string;
  emoji: string;
  color: string;
  allowed: boolean;
  status: string;
  message: string;
  sound: SoundName;
  speech?: string;
  particles: string[];
};

export const VERDICTS: Record<Verdict, VerdictInfo> = {
  cat: {
    title: 'КОШКА',
    emoji: '🐱',
    color: colors.cat,
    allowed: true,
    status: 'ДОСТУП РАЗРЕШЁН',
    message: 'Мур! Пушистый пациент опознан. Проходите в кабинет ветеринара.',
    sound: 'meow',
    particles: ['🐾', '💜', '🐟', '✨', '🧶'],
  },
  dog: {
    title: 'СОБАКА',
    emoji: '🐶',
    color: colors.dog,
    allowed: true,
    status: 'ДОСТУП РАЗРЕШЁН',
    message: 'Гав! Хвостатый пациент опознан. Доктор уже ждёт вас.',
    sound: 'bark',
    particles: ['🐾', '🦴', '🧡', '✨', '🎾'],
  },
  other: {
    title: 'ЖИВОТНОЕ',
    emoji: '🐾',
    color: colors.other,
    allowed: true,
    status: 'ДОСТУП РАЗРЕШЁН',
    message: 'Обнаружен пациент другого вида. Ветеринар примет и его!',
    sound: 'success',
    particles: ['🐾', '🌿', '✨', '💚'],
  },
  human: {
    title: 'ЧЕЛОВЕК',
    emoji: '🧑',
    color: colors.human,
    allowed: false,
    status: 'ДОСТУП ЗАПРЕЩЁН',
    message: 'Клиника принимает только пациентов с лапками и хвостиками.',
    sound: 'denied',
    speech:
      'Добро пожаловать! Вы человек. Наша ветеринарная клиника принимает только кошек и собак. Доступ запрещён. Приходите вместе со своим питомцем.',
    particles: [],
  },
  unknown: {
    title: 'НЕ ОПОЗНАН',
    emoji: '🔍',
    color: colors.unknown,
    allowed: false,
    status: 'ПОВТОРИТЕ СКАН',
    message: 'Не удалось распознать. Поднесите объект ближе и следите за освещением.',
    sound: 'ready',
    particles: [],
  },
};
