// Simplified for Node service - widget hierarchy determination
export function getWidgetHierarchy(type: string, _id: string): number {
  // Section > Zone > Widget hierarchy
  if (type === "SECTION_WIDGET") return 2;
  if (type === "ZONE_WIDGET") return 1;
  return 0;
}
