
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Edit } from "lucide-react";

const CompanyInfo = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Building className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ข้อมูลบริษัท</h1>
            <p className="text-muted-foreground">จัดการข้อมูลบริษัทและรายละเอียดติดต่อ</p>
          </div>
        </div>
        <Button className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          แก้ไขข้อมูล
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>ข้อมูลทั่วไป</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ชื่อบริษัท</label>
              <p className="text-foreground font-medium">บริษัท ตัวอย่าง จำกัด</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ชื่อบริษัท (ภาษาอังกฤษ)</label>
              <p className="text-foreground">Example Company Limited</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">เลขประจำตัวผู้เสียภาษี</label>
              <p className="text-foreground font-mono">0-1234-56789-01-2</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ประเภทธุรกิจ</label>
              <p className="text-foreground">ธุรกิจซอฟต์แวร์และเทคโนโลยี</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>ข้อมูลติดต่อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ที่อยู่</label>
              <p className="text-foreground">123/45 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">เบอร์โทรศัพท์</label>
              <p className="text-foreground">02-123-4567</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">อีเมล</label>
              <p className="text-foreground">contact@example.com</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">เว็บไซต์</label>
              <p className="text-foreground">www.example.com</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>ข้อมูลธนาคาร</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ชื่อธนาคาร</label>
              <p className="text-foreground">ธนาคารกสิกรไทย</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">สาขา</label>
              <p className="text-foreground">สาขารัชดาภิเษก</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">เลขที่บัญชี</label>
              <p className="text-foreground font-mono">123-4-56789-0</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ชื่อบัญชี</label>
              <p className="text-foreground">บริษัท ตัวอย่าง จำกัด</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>ลายเซ็นดิจิทัล</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground">
              ลายเซ็นกรรมการผู้จัดการ
            </div>
            <Button variant="outline" className="w-full">
              อัปโหลดลายเซ็น
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyInfo;
