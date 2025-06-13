import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface ReceiptDetailsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  receipt: {
    id: string;
    client: string;
    created_at: string;
    order_date: string;
    amount: string;
    status: "รอชำระเงิน" | "ชำระเงินแล้ว" | "ยกเลิก" | "คืนเงิน" | "รอตรวจสอบ";
    items?: Array<{
      title: string;
      qty: number;
      price: number;
      total: number;
    }>;
    address?: string;
    tel?: string;
    paymentMethod?: string;
  } | null;
}

const formatDate = (dateString: string) => {
  if (!dateString) return "ไม่ระบุวันที่";

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      const isoDate = new Date(dateString + "T00:00:00");
      if (!isNaN(isoDate.getTime())) {
        return format(isoDate, "dd/MM/yyyy");
      }
      return "ไม่ระบุวันที่";
    }

    return format(date, "dd/MM/yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "ไม่ระบุวันที่";
  }
};

const ReceiptDetailsModal = ({
  open,
  setOpen,
  receipt,
}: ReceiptDetailsModalProps) => {
  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">
            รายละเอียดใบเสร็จรับเงิน
          </DialogTitle>
          <DialogDescription className="sr-only">
            ข้อมูลรายละเอียดใบเสร็จรับเงิน
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4" aria-describedby="receipt-description">
          <div id="receipt-description" className="sr-only">
            รายละเอียดใบเสร็จรับเงิน
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="h-10 w-10 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">ใบเสร็จรับเงิน</h3>
            <div className="text-sm text-gray-500 space-y-1">
              <p>
                เลขที่:{" "}
                <span className="text-gray-700 font-medium">
                  {receipt.id || "ไม่ระบุ"}
                </span>
              </p>
              <p>
                วันที่พิมพ์:{" "}
                <span className="text-gray-700">
                  {receipt.created_at || "ไม่ระบุ"}
                </span>
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4"></div>

          {/* Customer Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">ข้อมูลลูกค้า</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">ชื่อลูกค้า</p>
                <p className="font-medium">{receipt.client || "ไม่ระบุ"}</p>
              </div>
              {receipt.tel && (
                <div>
                  <p className="text-gray-500">เบอร์ติดต่อ</p>
                  <p className="font-medium">{receipt.tel}</p>
                </div>
              )}
              {receipt.paymentMethod && (
                <div className="col-span-2">
                  <p className="text-gray-500">ช่องทางการชำระเงิน</p>
                  <p className="font-medium">{receipt.paymentMethod}</p>
                </div>
              )}
              {receipt.address && (
                <div className="col-span-2">
                  <p className="text-gray-500">ที่อยู่</p>
                  <p className="font-medium">{receipt.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 grid grid-cols-12 gap-2 text-sm font-medium text-gray-500 border-b">
              <div className="col-span-6">รายการ</div>
              <div className="col-span-2 text-center">จำนวน</div>
              <div className="col-span-2 text-right">ราคาต่อหน่วย</div>
              <div className="col-span-2 text-right">รวม</div>
            </div>
            <div className="divide-y">
              {receipt.items?.map((item, index) => (
                <div
                  key={index}
                  className="p-3 grid grid-cols-12 gap-2 text-sm"
                >
                  <div className="col-span-6 font-medium">
                    {item.title || "ไม่ระบุชื่อสินค้า"}
                  </div>
                  <div className="col-span-2 text-center">{item.qty || 0}</div>
                  <div className="col-span-2 text-right">
                    {(item.price || 0).toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="col-span-2 text-right font-medium">
                    {((item.qty || 0) * (item.price || 0)).toLocaleString(
                      "th-TH",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">ยอดรวม</span>
              <span className="font-medium">{receipt.amount || "฿0.00"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">สถานะ</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  receipt.status === "รอชำระเงิน"
                    ? "bg-blue-100 text-blue-700"
                    : receipt.status === "ชำระเงินแล้ว"
                    ? "bg-green-100 text-green-700"
                    : receipt.status === "ยกเลิก"
                    ? "bg-red-100 text-red-700"
                    : receipt.status === "คืนเงิน"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {receipt.status || "ไม่ระบุ"}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDetailsModal;
