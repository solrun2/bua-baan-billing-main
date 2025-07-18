import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
const DocumentNumbering = () => {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editPattern, setEditPattern] = useState("");
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูลจาก backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/document-number-settings");
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const data = await res.json();
        setDocumentTypes(data);
        console.log("[DocumentNumbering] Fetched documentTypes:", data);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleOpenEdit = (index: number) => {
    setEditIndex(index);
    setEditPattern(documentTypes[index].pattern || "");
    setCurrentRunning(
      documentTypes[index].current_number
        ? Number(documentTypes[index].current_number)
        : 1
    );
  };
  const handleCloseEdit = () => {
    setEditIndex(null);
    setEditPattern("");
  };
  const handleSaveEdit = async () => {
    if (editIndex !== null) {
      const doc = documentTypes[editIndex];
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/document-number-settings/${doc.document_type}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pattern: editPattern,
              current_number: currentRunning,
            }),
          }
        );
        if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
        // reload ข้อมูลใหม่
        const newRes = await fetch("/api/document-number-settings");
        const newData = await newRes.json();
        setDocumentTypes(newData);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
        setEditIndex(null);
        setEditPattern("");
        setCurrentRunning(1);
      }
    }
  };

  function generateDocumentNumber(
    pattern: string,
    runningNumber: number,
    date: Date
  ) {
    const yyyy = date.getFullYear();
    const yy = String(yyyy).slice(-2);
    const MM = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    let result = pattern;
    // แทนที่ short code วัน เดือน ปี
    result = result.replace(/YYYY/g, String(yyyy));
    result = result.replace(/YY/g, yy);
    result = result.replace(/MM/g, MM);
    result = result.replace(/DD/g, dd);
    // แทนที่เลขรัน X ติดกันกี่ตัวก็ได้
    result = result.replace(/X+/g, (match) => {
      return String(runningNumber).padStart(match.length, "0");
    });
    return result;
  }

  const [editRunning, setEditRunning] = useState(1); // mock เลขรันตัวอย่าง
  const [currentRunning, setCurrentRunning] = useState(1); // เลขรันปัจจุบันที่ผู้ใช้กำหนด
  const today = new Date();
  const exampleNumber = generateDocumentNumber(
    editPattern,
    currentRunning + 1,
    today
  );

  console.log("[DocumentNumbering] documentTypes state:", documentTypes);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
          <FileText className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            ตั้งค่าเลขรันเอกสาร
          </h1>
          <p className="text-gray-400">
            จัดการรูปแบบและเลขรันของเอกสารแต่ละประเภท
          </p>
        </div>
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รูปแบบเลขรันเอกสาร</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    ประเภทเอกสาร
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    รหัสนำหน้า
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    เลขรันปัจจุบัน
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    รูปแบบ
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    การดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {documentTypes.map((doc, index) => (
                  <tr
                    key={index}
                    className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-foreground">
                      {doc.document_type}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-primary">
                      {doc.prefix}
                    </td>
                    <td className="py-3 px-4 font-mono text-foreground">
                      {doc.current_number}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {doc.pattern}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => handleOpenEdit(index)}
                      >
                        <Settings className="w-3 h-3" />
                        ตั้งค่า
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>หมายเหตุ</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• YYYY = ปี ค.ศ. (เช่น 2024)</p>
          <p>• XXX = เลขรันเอกสาร 3 หลัก (เช่น 001, 002, 003)</p>
          <p>• ตัวอย่าง: QT-2024-001, INV-2024-156</p>
        </CardContent>
      </Card>
      {editIndex !== null && (
        <Dialog open={true} onOpenChange={handleCloseEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ตั้งค่ารูปแบบเลขรันเอกสาร</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div>รูปแบบเลขรัน (Format):</div>
              <input
                className="border rounded px-2 py-1 w-full"
                value={editPattern}
                onChange={(e) => setEditPattern(e.target.value)}
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs">เลขรันปัจจุบัน:</span>
                <input
                  type="number"
                  min={1}
                  className="border rounded px-2 py-1 w-full"
                  value={currentRunning}
                  onChange={(e) => setCurrentRunning(Number(e.target.value))}
                />
                <div className="text-xs text-muted-foreground mb-2">
                  เลขรันปัจจุบัน (Current Running Number):
                  ใส่เลขล่าสุดที่ใช้อยู่ เช่น 1234 เอกสารถัดไปจะเป็น 1235
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs">ตัวอย่างเลขรันถัดไป:</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {exampleNumber}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                ตัวอย่าง: QT-YYYY-XXX
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseEdit}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveEdit}>บันทึก</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
export default DocumentNumbering;
