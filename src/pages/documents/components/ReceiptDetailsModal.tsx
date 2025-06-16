import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
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
    shippingCost?: number;
    shippingProvider?: string;
    internalDiscount?: number;
    externalDiscount?: number;
    cod?: number;
    discountPoint?: number;
    earnedPoint?: number;
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

  const totalProductPrice =
    receipt.items?.reduce((sum, item) => sum + item.price, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="sr-only">
            รายละเอียดใบเสร็จรับเงิน
          </DialogTitle>
          <DialogDescription className="sr-only">
            ข้อมูลรายละเอียดใบเสร็จรับเงิน
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div
            className="space-y-6 py-4"
            aria-describedby="receipt-description"
          >
            <div id="receipt-description" className="sr-only">
              รายละเอียดใบเสร็จรับเงิน
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-gray-800">
                ใบเสร็จรับเงิน
              </h3>
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

            {/* Order Summary */}
            <div className="border-t border-b border-gray-200 py-4 my-4">
              <h4 className="font-medium text-gray-800 mb-3">รายการสั่งซื้อ</h4>
              <div className="space-y-3">
                {receipt.items?.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p className="text-gray-800">{item.title}</p>
                      <p className="text-sm text-gray-500">
                        {item.qty} × ฿{item.price / item.qty}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800">
                        ฿{item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Total Price */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between font-medium">
                    <p>รวมสินค้า</p>
                    <p>฿{totalProductPrice.toLocaleString()}</p>
                  </div>
                </div>

                {/* Discounts */}
                {(receipt.internalDiscount > 0 ||
                  receipt.externalDiscount > 0 ||
                  receipt.discountPoint > 0) && (
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    {receipt.internalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <p>ส่วนลดพิเศษ</p>
                        <p>-฿{receipt.internalDiscount.toLocaleString()}</p>
                      </div>
                    )}
                    {receipt.externalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <p>โปรโมชั่น ซื้อครบ 2500 บาท ลด 50 บาท</p>
                        <p>-฿{receipt.externalDiscount.toLocaleString()}</p>
                      </div>
                    )}
                    {receipt.discountPoint > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <p>แลกแต้มสะสม {receipt.discountPoint * 10} แต้ม</p>
                        <p>-฿{receipt.discountPoint}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Shipping Information */}
                {(receipt.shippingCost > 0 ||
                  receipt.cod > 0 ||
                  receipt.shippingProvider) && (
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    {receipt.shippingCost > 0 && (
                      <div className="flex justify-between">
                        <p className="text-gray-600">ค่าจัดส่ง</p>
                        <p className="text-gray-800">
                          ฿{receipt.shippingCost.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {receipt.shippingProvider && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <p>ผู้ให้บริการจัดส่ง:</p>
                        <p>{receipt.shippingProvider}</p>
                      </div>
                    )}
                    {receipt.cod == 1 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <p>ค่าธรรมเนียม COD 5%</p>
                        <p>฿{Math.round(totalProductPrice * 0.05)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Points Information */}
                <div className="pt-2 border-t border-gray-100 space-y-1 text-sm text-gray-600">
                  {receipt.earnedPoint > 0 && (
                    <div className="flex justify-between text-green-600">
                      <p>ได้รับแต้มสะสม</p>
                      <p>+{receipt.earnedPoint} แต้ม</p>
                    </div>
                  )}
                </div>

                {/* Total Amount */}
                <div className="flex justify-between pt-2 border-t border-gray-200 font-medium text-gray-800">
                  <p>รวมทั้งสิ้น</p>
                  <p>{receipt.amount}</p>
                </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDetailsModal;
