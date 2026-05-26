export const getLocalized = (
  obj: Record<string, unknown> | null | undefined,
  fieldName: string,
  lang: string,
): string => {
  if (!obj) return "-";
  const cleanLang = (lang || "uz").split("-")[0];
  const localizedValue = obj[`${fieldName}_${cleanLang}`] ?? obj[`${fieldName}_${lang}`];
  if (localizedValue != null && localizedValue !== "") return String(localizedValue);
  const baseValue = obj[fieldName];
  if (baseValue != null && baseValue !== "") return String(baseValue);
  return "-";
};
