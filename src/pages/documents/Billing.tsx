import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search, Loader2 } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import DocumentFilter from "../../components/DocumentFilter";
import { Skeleton } from "@/components/ui/skeleton";

const Billing = () => {
  const [filters, setFilters] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    console.log("[Billing] โหลดหน้า Billing");
    // TODO: เพิ่มการโหลดข้อมูลใบวางบิลจาก API
  }, []);

  const handleFilterChange = (newFilters: any) => {
    console.log("[Billing] เปลี่ยน filter:", newFilters);
    setFilters(newFilters);
    // TODO: เพิ่มการกรองข้อมูลตาม filter
  };

  const handleCreateNew = () => {
    console.log("[Billing] สร้างใบวางบิลใหม่");
    // TODO: เพิ่มการนำทางไปหน้าสร้างใบวางบิล
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาใบวางบิล..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <DocumentFilter
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบวางบิล</h1>
            <p className="text-gray-400">จัดการใบวางบิลทั้งหมด</p>
          </div>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={handleCreateNew}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          สร้างใบวางบิลใหม่
        </Button>
      </div>

      {isLoading ? (
        <Card className="border border-border/40">
          <CardContent className="p-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/40">
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">ยังไม่มีใบวางบิล</h3>
              <p>เริ่มสร้างใบวางบิลแรกของคุณ</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Billing;
