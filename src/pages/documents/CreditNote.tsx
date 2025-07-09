import React, { useState } from "react";
import DocumentFilter from "../../components/DocumentFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileX, Plus, Search } from "lucide-react";
const CreditNote = () => {
  const [filters, setFilters] = useState({});
  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาใบลดหนี้..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <DocumentFilter onFilterChange={setFilters} initialFilters={filters} />
      </div>
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
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          สร้างใบลดหนี้ใหม่
        </Button>
      </div>

      <Card className="border border-border/40">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <FileX className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">ยังไม่มีใบลดหนี้</h3>
            <p>เริ่มสร้างใบลดหนี้แรกของคุณ</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default CreditNote;
