import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

// ฟังก์ชันแปลงตัวเลขเป็นตัวอักษรไทย
export function numberToThaiText(amount: number): string {
  const units = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  const numbers = [
    "",
    "หนึ่ง",
    "สอง",
    "สาม",
    "สี่",
    "ห้า",
    "หก",
    "เจ็ด",
    "แปด",
    "เก้า",
  ];

  if (amount === 0) return "ศูนย์บาทถ้วน";

  // แยกส่วนบาทและสตางค์
  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);

  let result = "";

  // แปลงส่วนบาท
  if (baht > 0) {
    const bahtStr = baht.toString();
    const bahtLength = bahtStr.length;

    for (let i = 0; i < bahtLength; i++) {
      const digit = parseInt(bahtStr[i]);
      const position = bahtLength - i - 1;

      if (digit > 0) {
        if (position === 1 && digit === 1 && i === 0) {
          result += "สิบ";
        } else if (position === 1 && digit === 1) {
        } else if (position === 1 && digit === 2) {
          result += "ยี่";
        } else if (position === 0 && digit === 1 && bahtLength > 1) {
          result += "เอ็ด";
        } else {
          result += numbers[digit];
        }

        if (position > 0) {
          result += units[position];
        }
      }
    }
    result += "บาท";
  }

  // แปลงส่วนสตางค์
  if (satang > 0) {
    if (baht > 0) result += " ";

    const satangStr = satang.toString().padStart(2, "0");
    const satangLength = satangStr.length;

    for (let i = 0; i < satangLength; i++) {
      const digit = parseInt(satangStr[i]);
      const position = satangLength - i - 1;

      if (digit > 0) {
        if (position === 1 && digit === 1 && i === 0) {
          result += "สิบ";
        } else if (position === 1 && digit === 1) {
        } else if (position === 1 && digit === 2) {
          result += "ยี่";
        } else if (position === 0 && digit === 1 && satangLength > 1) {
          result += "เอ็ด";
        } else {
          result += numbers[digit];
        }

        if (position > 0) {
          result += units[position];
        }
      }
    }
    result += "สตางค์";
  } else {
    result += "ถ้วน";
  }

  return result;
}
