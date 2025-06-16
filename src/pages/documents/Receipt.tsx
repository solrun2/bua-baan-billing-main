import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Search, Filter } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ReceiptDetailsModal from "./components/ReceiptDetailsModal";
import { getToken } from "@/pages/services/auth";
import { useNavigate } from "react-router-dom";
import CreateReceipt from "./components/CreateReceipt";

interface Receipt {
  id: string;
  client: string;
  created_at: string;
  order_date: string;
  amount: string;
  status: "รอชำระเงิน" | "ชำระเงินแล้ว" | "ยกเลิก" | "คืนเงิน" | "รอตรวจสอบ";
  imageUrl?: string;
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
}

const ITEMS_PER_PAGE = 7;

const Receipt = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const paginatedReceipts = useMemo(() => {
    const sortedReceipts = [...allReceipts].sort((a, b) => {
      const numA = parseInt(a.id, 10) || 0;
      const numB = parseInt(b.id, 10) || 0;
      return numB - numA;
    });

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedReceipts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allReceipts, currentPage]);

  const filteredReceipts = useMemo(() => {
    const filtered = searchTerm.trim()
      ? allReceipts.filter(
          (receipt) =>
            receipt.id.includes(searchTerm.trim()) ||
            receipt.client.includes(searchTerm.trim())
        )
      : [...allReceipts];

    return filtered.sort((a, b) => {
      const numA = parseInt(a.id, 10) || 0;
      const numB = parseInt(b.id, 10) || 0;
      return numB - numA;
    });
  }, [allReceipts, searchTerm]);

  useEffect(() => {
    setTotalPages(Math.ceil(allReceipts.length / ITEMS_PER_PAGE));
    setCurrentPage(1);
  }, [allReceipts]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = filteredReceipts.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
    setReceipts(paginated);
    setTotalPages(Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE));
  }, [filteredReceipts, currentPage]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = await getToken();
        console.log("Using token:", token);

        const orderNumbers = Array.from({ length: 50 }, (_, i) =>
          (2506000000 + i).toString()
        );

        const ordersData = await Promise.all(
          orderNumbers.map(async (orderNumber) => {
            try {
              const response = await fetch(
                `https://openapi.ketshoptest.com/order/get/${orderNumber}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (!response.ok) {
                console.warn(
                  `Order ${orderNumber} not found or error:`,
                  response.status
                );
                return null;
              }

              const orderData = await response.json();
              if (!orderData || !orderData.ordercode) {
                console.warn(`Order ${orderNumber} has no data`);
                return null;
              }

              return orderData;
            } catch (error) {
              console.error(`Error fetching order ${orderNumber}:`, error);
              return null;
            }
          })
        );

        const validReceipts = ordersData
          .filter((order) => order)
          .map((orderData) => ({
            id: orderData.ordercode,
            client: orderData.name || "ไม่ระบุชื่อลูกค้า",
            created_at: orderData.order_date
              ? new Date(orderData.order_date).toLocaleDateString("th-TH")
              : "ไม่ระบุวันที่",
            order_date: orderData.created_at
              ? new Date(orderData.created_at).toLocaleDateString("th-TH")
              : "ไม่ระบุ",
            amount:
              `฿${orderData.totals?.toLocaleString("th-TH", {
                minimumFractionDigits: 2,
              })}` || "฿0",
            status: mapOrderStatus(orderData.status?.toString() || "1"),
            imageUrl: orderData.details?.[0]?.feature_img || "",
            items:
              orderData.details?.map((item: any) => ({
                title: item.title,
                qty: item.qty,
                price: item.price,
                total: item.qty * item.price,
              })) || [],
            address: [
              orderData.address1,
              orderData.address2,
              orderData.subdistrict,
              orderData.district,
              orderData.province,
              orderData.zipcode,
            ]
              .filter(Boolean)
              .join(" "),
            tel: orderData.tel || "",
            paymentMethod: orderData.payment_name || "ไม่ระบุ",
            shippingCost: orderData.delicharge ?? 0,
            shippingProvider:
              orderData.delivery_name || orderData.delivery_type || "ไม่ระบุ",
            internalDiscount: orderData.internal_discount || 0,
            externalDiscount: orderData.external_discount || 0,
            promotionName: orderData.channel_name || "",
            cod: orderData.cod || 0,
            discountPoint: orderData.discount_point || 0,
            earnedPoint: orderData.point || 0,
          }));

        setAllReceipts(validReceipts);
        setReceipts(paginatedReceipts);

        if (validReceipts.length === 0) {
          setError("ไม่พบข้อมูลใบเสร็จที่ระบุ");
        } else {
          console.log(
            `Found ${validReceipts.length} valid orders out of ${orderNumbers.length} checked`
          );
        }
      } catch (error) {
        console.error("Error in fetchOrders:", error);
        setError(
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const mapOrderStatus = (status: string | number): Receipt["status"] => {
    const statusMap: Record<string | number, Receipt["status"]> = {
      // Numeric status codes
      1: "รอชำระเงิน",
      2: "ชำระเงินแล้ว",
      3: "ยกเลิก",
      4: "คืนเงิน",
      5: "รอตรวจสอบ",
      // String status codes
      pending: "รอชำระเงิน",
      paid: "ชำระเงินแล้ว",
      cancelled: "ยกเลิก",
      refunded: "คืนเงิน",
      review: "รอตรวจสอบ",
    };
    return statusMap[status] || "รอชำระเงิน";
  };

  const handleOpen = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setOpen(true);
  };

  const handleCreateReceipt = async () => {
    alert("Create Receipt functionality is not yet implemented.");
  };

  const handleEditReceipt = (receipt: Receipt) => {
    alert(`Edit Receipt ${receipt.id} functionality is not yet implemented.`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!e.target.value.trim()) {
      setCurrentPage(1);
      setIsSearching(false);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);

      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        endPage = 4;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }

      if (startPage > 2) {
        pageNumbers.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 1) {
        pageNumbers.push("...");
      }
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              ใบเสร็จรับเงิน
            </h1>
            <p className="text-gray-400">จัดการใบเสร็จรับเงินทั้งหมด</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() =>
              navigate(
                "/documents/components/CreateReceipt"
              )
            }
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            สร้างใบเสร็จใหม่
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ค้นหาด้วยรหัสออเดอร์หรือชื่อลูกค้า..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setIsSearching(false);
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          กรองข้อมูล
        </Button>
      </div>

      {/* Receipt Table */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : receipts.length > 0 ? (
        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>รายการใบเสร็จรับเงิน</CardTitle>
            {isSearching && (
              <div className="text-sm text-muted-foreground">
                พบ {filteredReceipts.length} รายการที่ตรงกับ "{searchTerm}"
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      เลขที่
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      ลูกค้า
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      วันที่
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      จำนวนเงิน
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      สถานะ
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt, index) => (
                    <tr
                      key={index}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {receipt.id}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {receipt.client}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {receipt.created_at}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {receipt.amount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                          {receipt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpen(receipt)}
                            className="flex items-center"
                          >
                            ดู
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center"
                            onClick={() => handleEditReceipt(receipt)}
                          >
                            แก้ไข
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">ก่อนหน้า</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      <button
                        key={index}
                        className={`h-8 w-8 rounded-md text-sm flex items-center justify-center ${
                          page === currentPage
                            ? "bg-primary text-primary-foreground font-medium"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() =>
                          typeof page === "number" && handlePageChange(page)
                        }
                        disabled={page === "..."}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">ถัดไป</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  หน้า {currentPage} จาก {totalPages}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/40">
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                ยังไม่มีใบเสร็จรับเงิน
              </h3>
              <p>เริ่มสร้างใบเสร็จรับเงินแรกของคุณ</p>
            </div>
          </CardContent>
        </Card>
      )}

      <ReceiptDetailsModal
        open={open}
        setOpen={setOpen}
        receipt={selectedReceipt}
      />
    </div>
  );
};

export default Receipt;
