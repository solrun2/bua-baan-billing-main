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
    result = convertNumberToThaiText(baht);
    result += "บาท";
  }

  // แปลงส่วนสตางค์
  if (satang > 0) {
    if (baht > 0) result += " ";
    result += convertNumberToThaiText(satang);
    result += "สตางค์";
  } else {
    result += "ถ้วน";
  }

  return result;
}

// ฟังก์ชันช่วยแปลงตัวเลขเป็นข้อความไทย
function convertNumberToThaiText(num: number): string {
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

  if (num === 0) return "";

  const numStr = num.toString();
  const length = numStr.length;
  let result = "";

  // จัดการกับตัวเลขที่มีมากกว่า 6 หลัก (ล้านขึ้นไป)
  if (length > 6) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;

    if (millions > 0) {
      result += convertNumberToThaiText(millions) + "ล้าน";
    }

    if (remainder > 0) {
      result += convertNumberToThaiText(remainder);
    }

    return result;
  }

  // จัดการกับตัวเลข 6 หลักหรือน้อยกว่า
  for (let i = 0; i < length; i++) {
    const digit = parseInt(numStr[i]);
    const position = length - i - 1;

    if (digit > 0) {
      // กรณีพิเศษสำหรับหลักสิบ
      if (position === 1) {
        if (digit === 1) {
          result += "สิบ";
        } else if (digit === 2) {
          result += "ยี่สิบ";
        } else {
          result += numbers[digit] + "สิบ";
        }
      }
      // กรณีพิเศษสำหรับหลักหน่วย
      else if (position === 0) {
        if (digit === 1 && length > 1) {
          result += "เอ็ด";
        } else {
          result += numbers[digit];
        }
      }
      // กรณีทั่วไป
      else {
        result += numbers[digit] + units[position];
      }
    }
  }

  return result;
}
