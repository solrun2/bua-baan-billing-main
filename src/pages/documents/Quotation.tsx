import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search, Filter, AlertTriangle, Loader2 } from "lucide-react";
import { apiService } from '@/pages/services/apiService';
import { toast } from 'sonner';

const Quotation = () => {
  const navigate = useNavigate();

  const handleCreateNew = () => {
    navigate('/documents/quotation/new');
  };

  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuotations = async () => {
      try {
        setLoading(true);
        const data = await apiService.getDocuments();
        const quotationsData = data
          .filter(doc => doc.document_type === 'QUOTATION')
          .map(doc => ({
            id: doc.id,
            number: doc.document_number,
            customer: doc.customer_name,
            date: new Date(doc.issue_date).toLocaleDateString('th-TH'),
            validUntil: doc.valid_until ? new Date(doc.valid_until).toLocaleDateString('th-TH') : '-',
            total: new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(doc.total_amount),
            status: doc.status,
          }));
        setQuotations(quotationsData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadQuotations();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'รอตอบรับ': return 'bg-gray-100 text-gray-700';
      case 'ส่งแล้ว': return 'bg-blue-100 text-blue-700';
      case 'ตอบรับแล้ว': return 'bg-green-100 text-green-700';
      case 'ปฏิเสธ': return 'bg-red-100 text-red-700';
      case 'หมดอายุ': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const handleViewClick = (quotation: any) => {
    navigate(`/quotations/edit/${quotation.id}`);
  };

  const handleEditClick = (id: any) => {
    navigate(`/quotations/edit/${id}`);
  };

  const handleDeleteClick = async (id: any) => {
    if (window.confirm("Are you sure you want to delete this quotation?")) {
      try {
        await apiService.deleteDocument(id.toString());
        setQuotations(prevQuotations => prevQuotations.filter(q => q.id !== id));
        toast.success('ลบใบเสนอราคาเรียบร้อยแล้ว');
      } catch (error) {
        console.error("Failed to delete quotation:", error);
        toast.error('เกิดข้อผิดพลาดในการลบใบเสนอราคา');
        setError((error as Error).message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบเสนอราคา</h1>
            <p className="text-gray-400">จัดการใบเสนอราคาทั้งหมด</p>
          </div>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreateNew}>
          <Plus className="w-4 h-4" />
          สร้างใบเสนอราคาใหม่
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ค้นหาใบเสนอราคา..." className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          กรองข้อมูล
        </Button>
      </div>

      {/* Content */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รายการใบเสนอราคา</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>เกิดข้อผิดพลาด: {error}</p>
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">ยังไม่มีใบเสนอราคา</h3>
              <p>เริ่มต้นสร้างใบเสนอราคาใหม่ได้เลย</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">เลขที่</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">ลูกค้า</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">วันที่</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">ยืนราคาถึงวันที่</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">จำนวนเงิน</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">สถานะ</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{quotation.number}</td>
                      <td className="py-3 px-4 text-foreground">{quotation.customer}</td>
                      <td className="py-3 px-4 text-muted-foreground">{quotation.date}</td>
                      <td className="py-3 px-4 text-muted-foreground">{quotation.validUntil}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{quotation.total}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(quotation.status)}`}>
                          {quotation.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewClick(quotation)}
                          >
                            ดู
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(quotation.id)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(quotation.id)}
                          >
                            ลบ
                          </Button>
                        </div>
                      </td>
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

export default Quotation;