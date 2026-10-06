export const SOUTH_AFRICAN_SETAS = [
  'AgriSETA',
  'BankSETA',
  'CETA',
  'CHIETA',
  'ETDP SETA',
  'EWSETA',
  'FASSET',
  'FoodBev SETA',
  'FP&M SETA',
  'HWSETA',
  'INSETA',
  'LGSETA',
  'merSETA',
  'MICT SETA',
  'MQA',
  'PSETA',
  'SASSETA',
  'Services SETA',
  'TETA',
  'W&RSETA',
  'QCTO',
] as const;

export type SouthAfricanSeta = (typeof SOUTH_AFRICAN_SETAS)[number];

export const SETA_SELECT_OPTIONS = SOUTH_AFRICAN_SETAS.map((seta) => ({
  value: seta,
  label: seta,
}));

export const NQF_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const NQF_LEVEL_OPTIONS = NQF_LEVELS.map((level) => ({
  value: String(level),
  label: `NQF Level ${level}`,
}));
