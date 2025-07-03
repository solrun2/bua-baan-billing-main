import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Plus } from "lucide-react";
import { formatCurrency } from "../../lib/utils";

const TaxInvoice = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบกำกับภาษี</h1>
            <p className="text-gray-400">จัดการใบกำกับภาษีทั้งหมด</p>
          </div>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          สร้างใบกำกับภาษีใหม่
        </Button>
      </div>

      <Card className="border border-border/40">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">ยังไม่มีใบกำกับภาษี</h3>
            <p>เริ่มสร้างใบกำกับภาษีแรกของคุณ</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default TaxInvoice;
