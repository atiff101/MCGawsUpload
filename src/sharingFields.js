export const SHAREABLE_FIELDS = [
  { key: "activityLevel", label: "Activity level (tonnes)" },
  { key: "directEmissions", label: "Direct specific embedded emissions" },
  { key: "indirectEmissions", label: "Indirect specific embedded emissions" },
  { key: "documents", label: "Supporting documents" },
];

export function fieldLabel(key) {
  return SHAREABLE_FIELDS.find((f) => f.key === key)?.label || key;
}
