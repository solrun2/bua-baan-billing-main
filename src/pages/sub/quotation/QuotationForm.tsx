import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, InputWithSuffix } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft, Calendar, Search, FileText, Download, Save, Upload } from "lucide-react";
import { format } from "date-fns";

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  amountBeforeTax: number;
  withholdingTax: number;
  amount: number;
}

interface QuotationFormProps {
  onCancel: () => void;
}

const QuotationForm = ({ onCancel }: QuotationFormProps) => {
  // State
  const [quotationNumber] = useState(`QT-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`);
  const [quotationDate, setQuotationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return format(date, 'yyyy-MM-dd');
  });
  
  const [customer, setCustomer] = useState({
    name: '',
    taxId: '',
    phone: '',
    address: ''
  });

  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      amountBeforeTax: 0,
      withholdingTax: 0,
      amount: 0
    }
  ]);

  const [summary, setSummary] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0
  });

  const [notes, setNotes] = useState('');

  // Calculate summary when items change
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.discount / 100), 0);
    const tax = (subtotal - discount) * 0.07; // 7% VAT
    
    setSummary({
      subtotal,
      discount,
      tax,
      total: subtotal - discount + tax
    });
  }, [items]);

  // Handle input changes
  const handleCustomerChange = (field: string, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (id: string, field: string, value: string | number) => {
    setItems(prev => 
      prev.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Recalculate amount
          if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
            const quantity = field === 'quantity' ? Number(value) : item.quantity;
            const unitPrice = field === 'unitPrice' ? Number(value) : item.unitPrice;
            const discount = field === 'discount' ? Number(value) : item.discount;
            updatedItem.amount = quantity * unitPrice * (1 - discount / 100);
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleAddItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      amountBeforeTax: 0,
      withholdingTax: 0,
      amount: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log({
      quotationNumber,
      quotationDate,
      validUntil,
      customer,
      items,
      summary,
      notes
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">สร้างใบเสนอราคาใหม่</h1>
            <p className="text-sm text-muted-foreground">เลขที่: {quotationNumber}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            ดูตัวอย่าง
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            พิมพ์
          </Button>
          <Button variant="outline" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button type="submit" form="quotation-form" className="gap-2">
            <Save className="h-4 w-4" />
            บันทึก
          </Button>
        </div>
      </div>

      <form id="quotation-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Document Info */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลเอกสาร</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quotationDate">วันที่ออกใบเสนอราคา</Label>
              <div className="relative">
                <Input 
                  id="quotationDate" 
                  type="date" 
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">วันที่ใช้ได้ถึง</Label>
              <div className="relative">
                <Input 
                  id="validUntil" 
                  type="date" 
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>สถานะ</Label>
              <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                ร่าง
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลลูกค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">ชื่อลูกค้า</Label>
                <div className="relative">
                  <Input
                    id="customerName"
                    value={customer.name}
                    onChange={(e) => handleCustomerChange('name', e.target.value)}
                    placeholder="ค้นหาลูกค้า"
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</Label>
                <Input
                  id="taxId"
                  value={customer.taxId}
                  onChange={(e) => handleCustomerChange('taxId', e.target.value)}
                  placeholder="เลขประจำตัวผู้เสียภาษี"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="phone"
                  value={customer.phone}
                  onChange={(e) => handleCustomerChange('phone', e.target.value)}
                  placeholder="เบอร์โทรศัพท์"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">ที่อยู่</Label>
                <Input
                  id="address"
                  value={customer.address}
                  onChange={(e) => handleCustomerChange('address', e.target.value)}
                  placeholder="ที่อยู่"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price and Tax Options */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>ข้อมูลราคาและภาษี</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md">
              <Label>รูปแบบภาษี</Label>
              <Select defaultValue="include">
                <SelectTrigger>
                  <SelectValue placeholder="เลือกรูปแบบภาษี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="include">รวมภาษี</SelectItem>
                  <SelectItem value="exclude">แยกภาษี</SelectItem>
                  <SelectItem value="none">ไม่มี</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>รายการสินค้าและบริการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm bg-gray-50">
                    <th className="p-2 w-8">#</th>
                    <th className="p-2 min-w-[300px] text-left">รายละเอียด</th>
                    <th className="p-2 w-24 text-center">จำนวน</th>
                    <th className="p-2 w-32 text-right">ราคา/หน่วย</th>
                    <th className="p-2 w-32 text-right">ส่วนลด/หน่วย</th>
                    <th className="p-2 w-32 text-right">ภาษี (7%)</th>
                    <th className="p-2 w-32 text-right">มูลค่าก่อนภาษี</th>
                    <th className="p-2 w-32 text-right">หัก ณ ที่จ่าย</th>
                    <th className="p-2 w-32 text-right">จำนวนเงิน</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-b border-border/40 hover:bg-muted/10">
                      <td className="p-2 text-muted-foreground">{index + 1}</td>
                      <td className="p-2">
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          placeholder="รายละเอียดสินค้าหรือบริการ"
                          className="border-border/50 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          className="text-center border-border/50 text-sm"
                        />
                      </td>

                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                          className="text-right border-border/50 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => handleItemChange(item.id, 'discount', Number(e.target.value))}
                          className="text-right border-border/50 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.tax || 0}
                          readOnly
                          className="text-right border-0 bg-transparent text-sm font-medium"
                        />
                      </td>
                      <td className="p-2 text-right text-sm font-medium">
                        {item.amountBeforeTax?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.withholdingTax || 0}
                          onChange={(e) => handleItemChange(item.id, 'withholdingTax', Number(e.target.value))}
                          className="text-right border-border/50 text-sm"
                        />
                      </td>
                      <td className="p-2 text-right text-sm font-medium">
                        {item.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มรายการ
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>หมายเหตุ</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                  className="min-h-[100px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>การแนบเอกสาร</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">คลิกเพื่ออัปโหลด</span> หรือลากไฟล์มาวางที่นี่
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ไฟล์ที่รองรับ: PDF, JPG, PNG (สูงสุด 10MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      id="document-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    สามารถแนบเอกสารเพิ่มเติมได้ เช่น เอกสารอ้างอิง, ใบเสนอราคาอื่นๆ
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>สรุปรายการ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">รวมเป็นเงิน</span>
                      <span>{summary.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>ส่วนลดรวม</span>
                      <span>-{summary.discount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div className="border-t border-border pt-1"></div>
                    <div className="flex justify-between">
                      <span>มูลค่าที่คำนวณภาษี 7%</span>
                      <span>{(summary.subtotal - summary.discount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ภาษีมูลค่าเพิ่ม 7%</span>
                      <span>{summary.tax.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                  </div>
                  <div className="border-t-2 border-border pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>จำนวนเงินทั้งสิ้น</span>
                      <span>{summary.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
        <div className="flex justify-end mt-6 space-x-4">
          <Button variant="outline" type="button" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button type="submit">บันทึก</Button>
        </div>
      </form>
    </div>
  );
};

export default QuotationForm;