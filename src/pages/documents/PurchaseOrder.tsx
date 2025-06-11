import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus } from "lucide-react";
const PurchaseOrder = () => {
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบสั่งซื้อ</h1>
            <p className="text-gray-400">จัดการใบสั่งซื้อทั้งหมด</p>
          </div>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          สร้างใบสั่งซื้อใหม่
        </Button>
      </div>
      
      <Card className="border border-border/40">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">ยังไม่มีใบสั่งซื้อ</h3>
            <p>เริ่มสร้างใบสั่งซื้อแรกของคุณ</p>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default PurchaseOrder;