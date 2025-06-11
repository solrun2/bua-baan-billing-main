import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Search, Filter } from "lucide-react";
const Receipt = () => {
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบเสร็จรับเงิน</h1>
            <p className="text-gray-400">จัดการใบเสร็จรับเงินทั้งหมด</p>
          </div>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          สร้างใบเสร็จใหม่
        </Button>
      </div>
      
      <Card className="border border-border/40">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">ยังไม่มีใบเสร็จรับเงิน</h3>
            <p>เริ่มสร้างใบเสร็จรับเงินแรกของคุณ</p>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Receipt;