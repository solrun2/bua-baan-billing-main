import React, { useState, useEffect } from "react";
import DocumentFilter from "../../components/DocumentFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileX, Plus, Search, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { sortData } from "@/utils/sortUtils";
import { searchData } from "@/utils/searchUtils";

const CreditNote = () => {
  const [filters, setFilters] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  // state สำหรับการเรียงลำดับ
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    // TODO: โหลดข้อมูลใบลดหนี้จาก API
    setTimeout(() => {
      setDocuments([]); // mock ว่าง
      setIsLoading(false);
    }, 800);
  }, []);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    // TODO: filter ข้อมูลจริง
  };

  const handleCreateNew = () => {
    // TODO: ไปหน้าสร้างใบลดหนี้ใหม่
  };

  // ฟังก์ชันเปลี่ยนคอลัมน์และทิศทางการเรียง
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // กรองข้อมูลด้วย search ก่อน filter/sort
  const searchedDocuments = searchData(documents, searchText, [
    "number",
    "customer",
  ]);
  // เพิ่ม key สำหรับ sort (mock)
  const documentsWithSortKeys = searchedDocuments.map((doc) => ({
    ...doc,
    number: doc.number ?? "",
    customer: doc.customer ?? "",
    date: doc.date ?? "",
    dateValue: doc.date ? new Date(doc.date).getTime() : 0,
    totalAmount: Number(doc.totalAmount ?? 0),
    status: doc.status ?? "",
  }));

  // เรียงลำดับข้อมูล
  const sortedDocuments = sortData(
    documentsWithSortKeys,
    sortColumn as keyof (typeof documentsWithSortKeys)[0],
    sortDirection
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <FileX className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบลดหนี้</h1>
            <p className="text-gray-400">จัดการใบลดหนี้ทั้งหมด</p>
          </div>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreateNew}>
          <Plus className="w-4 h-4" />
          สร้างใบลดหนี้ใหม่
        </Button>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาใบลดหนี้..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
        <DocumentFilter
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />
      </div>
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รายการใบลดหนี้</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>เกิดข้อผิดพลาด: {error}</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileX className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">ยังไม่มีใบลดหนี้</h3>
              <p>เริ่มสร้างใบลดหนี้แรกของคุณ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th
                      className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={() => handleSort("number")}
                    >
                      เลขที่{" "}
                      {sortColumn === "number" ? (
                        sortDirection === "asc" ? (
                          <b>▲</b>
                        ) : (
                          <b>▼</b>
                        )
                      ) : (
                        <span style={{ color: "#bbb" }}>⇅</span>
                      )}
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={() => handleSort("customer")}
                    >
                      ลูกค้า{" "}
                      {sortColumn === "customer" ? (
                        sortDirection === "asc" ? (
                          <b>▲</b>
                        ) : (
                          <b>▼</b>
                        )
                      ) : (
                        <span style={{ color: "#bbb" }}>⇅</span>
                      )}
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={() => handleSort("dateValue")}
                    >
                      วันที่{" "}
                      {sortColumn === "dateValue" ? (
                        sortDirection === "asc" ? (
                          <b>▲</b>
                        ) : (
                          <b>▼</b>
                        )
                      ) : (
                        <span style={{ color: "#bbb" }}>⇅</span>
                      )}
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={() => handleSort("totalAmount")}
                    >
                      จำนวนเงิน{" "}
                      {sortColumn === "totalAmount" ? (
                        sortDirection === "asc" ? (
                          <b>▲</b>
                        ) : (
                          <b>▼</b>
                        )
                      ) : (
                        <span style={{ color: "#bbb" }}>⇅</span>
                      )}
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={() => handleSort("status")}
                    >
                      สถานะ{" "}
                      {sortColumn === "status" ? (
                        sortDirection === "asc" ? (
                          <b>▲</b>
                        ) : (
                          <b>▼</b>
                        )
                      ) : (
                        <span style={{ color: "#bbb" }}>⇅</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDocuments.map((doc, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {doc.number}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {doc.customer}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {doc.date}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {doc.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">{doc.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default CreditNote;
