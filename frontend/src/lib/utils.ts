export const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export const formatPercent = (value: number) => `${Math.round(value)}%`;
