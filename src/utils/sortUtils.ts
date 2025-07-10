// ฟังก์ชันสำหรับเรียงลำดับข้อมูลใน array ตาม key และทิศทางที่กำหนด
export function sortData<T>(
  data: T[],
  key: keyof T,
  direction: "asc" | "desc" = "asc"
): T[] {
  return [...data].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return direction === "asc" ? -1 : 1;
    if (bValue == null) return direction === "asc" ? 1 : -1;

    if (typeof aValue === "number" && typeof bValue === "number") {
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    }
    if (typeof aValue === "string" && typeof bValue === "string") {
      return direction === "asc"
        ? aValue.localeCompare(bValue, "th")
        : bValue.localeCompare(aValue, "th");
    }
    // fallback สำหรับกรณีอื่น ๆ
    return 0;
  });
}
