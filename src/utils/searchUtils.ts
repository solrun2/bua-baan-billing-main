// ฟังก์ชันสำหรับค้นหาข้อมูลใน array ตาม searchText และ key ที่กำหนด
export function searchData<T>(
  data: T[],
  searchText: string,
  keys: (keyof T)[]
): T[] {
  if (!searchText) return data;
  const lower = searchText.toLowerCase();
  return data.filter((item) =>
    keys.some((key) =>
      (item[key]?.toString().toLowerCase() ?? "").includes(lower)
    )
  );
}
