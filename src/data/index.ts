import type { Experiment, ExpId } from '../types';
import { EXP1 } from './experiment1';
import { EXP2 } from './experiment2';
import { EXP3 } from './experiment3';

export const EXPERIMENTS: Record<ExpId, Experiment> = { exp1: EXP1, exp2: EXP2, exp3: EXP3 };

export const EXP_LIST: Experiment[] = [EXP1, EXP2, EXP3];

export const DEFAULT_EXP: ExpId = 'exp1';
