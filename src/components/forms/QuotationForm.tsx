import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Building, Download, Save } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  taxId: string;
  phone: string;
}

const mockCustomers: Customer[] = [
  { id: "1", name: "บริษัท ABC จำกัด", address: "123 ถนนสุขุมวิท แขวงคลองเตย กรุงเทพฯ 10110", taxId: "0105558000123", phone: "02-123-4567" },
  { id: "2", name: "บริษัท XYZ จำกัด", address: "456 ถนนพหลโยธิน เขตจตุจักร กรุงเทพฯ 10900", taxId: "0105559000456", phone: "02-987-6543" },
  { id: "3", name: "บริษัท DEF จำกัด", address: "789 ถนนเพชรบุรี เขตราชเทวี กรุงเทพฯ 10400", taxId: "0105557000789", phone: "02-555-1234" },
];

export function QuotationForm({ onCancel }: { onCancel: () => void }) {
  const [quotationNumber] = useState(`QT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [expireDate, setExpireDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [items, setItems] = useState<QuotationItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [includeVat, setIncludeVat] = useState(true);
  const [notes, setNotes] = useState("");

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = includeVat ? subtotal * 0.07 : 0;
  const grandTotal = subtotal + vatAmount;

  const handleSave = () => {
    console.log("บันทึกใบเสนอราคา:", {
      quotationNumber,
      issueDate,
      expireDate,
      customer: selectedCustomer,
      items,
      includeVat,
      subtotal,
      vatAmount,
      grandTotal,
      notes
    });
    alert("บันทึกใบเสนอราคาเรียบร้อยแล้ว");
  };

  const handleExportPDF = () => {
    console.log("ส่งออก PDF");
    alert("กำลังสร้างไฟล์ PDF...");
  };

  const handleVatChange = (checked: boolean | "indeterminate") => {
    if (typeof checked === "boolean") {
      setIncludeVat(checked);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">บริษัท เคท โซลูชั่น จำกัด</h1>
              <p className="text-sm text-muted-foreground">123 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400</p>
              <p className="text-sm text-muted-foreground">เลขประจำตัวผู้เสียภาษี: 0105560001234</p>
            </div>
          </div>
          <CardTitle className="text-xl">ใบเสนอราคา</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Document Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="quotationNumber">หมายเลขใบเสนอราคา</Label>
                <Input id="quotationNumber" value={quotationNumber} readOnly className="bg-muted" />
              </div>
              <div>
                <Label>วันที่ออกเอกสาร</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(issueDate, "dd MMMM yyyy", { locale: th })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={issueDate} onSelect={(date) => date && setIssueDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>วันที่หมดอายุ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(expireDate, "dd MMMM yyyy", { locale: th })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={expireDate} onSelect={(date) => date && setExpireDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-4">
              <div>
                <Label>เลือกลูกค้า</Label>
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedCustomer ? selectedCustomer.name : "เลือกลูกค้า..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="ค้นหาลูกค้า..." />
                      <CommandList>
                        <CommandEmpty>ไม่พบลูกค้า</CommandEmpty>
                        <CommandGroup>
                          {mockCustomers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                setSelectedCustomer(customer);
                                setCustomerSearchOpen(false);
                              }}
                            >
                              {customer.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {selectedCustomer && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">ข้อมูลลูกค้า</h4>
                  <p className="text-sm">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.address}</p>
                  <p className="text-sm text-muted-foreground">เลขภาษี: {selectedCustomer.taxId}</p>
                  <p className="text-sm text-muted-foreground">โทร: {selectedCustomer.phone}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการสินค้า/บริการ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                <div className="col-span-5">
                  <Label>รายละเอียดสินค้า/บริการ</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="รายละเอียดสินค้า/บริการ"
                  />
                </div>
                <div className="col-span-2">
                  <Label>จำนวน</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-2">
                  <Label>ราคาต่อหน่วย</Label>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-2">
                  <Label>ราคารวม</Label>
                  <Input value={item.total.toLocaleString('th-TH')} readOnly className="bg-muted" />
                </div>
                <div className="col-span-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button onClick={addItem} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มรายการ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="vat" checked={includeVat} onCheckedChange={handleVatChange} />
              <Label htmlFor="vat">รวมภาษีมูลค่าเพิ่ม 7%</Label>
            </div>
            
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>ราคารวม:</span>
                <span>฿{subtotal.toLocaleString('th-TH')}</span>
              </div>
              {includeVat && (
                <div className="flex justify-between">
                  <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                  <span>฿{vatAmount.toLocaleString('th-TH')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>ราคารวมสุทธิ:</span>
                <span>฿{grandTotal.toLocaleString('th-TH')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes and Signature */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <Label htmlFor="notes">เงื่อนไขและหมายเหตุ</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เงื่อนไขการชำระเงิน หรือหมายเหตุเพิ่มเติม..."
              rows={4}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Label>ผู้เสนอราคา</Label>
              <div className="border-2 border-dashed border-muted-foreground/20 h-32 rounded-lg flex items-center justify-center text-muted-foreground">
                ลายเซ็น
              </div>
              <p className="text-center mt-2">(...................................)</p>
              <p className="text-center text-sm text-muted-foreground">วันที่ ..........................</p>
            </div>
            <div>
              <Label>ผู้รับใบเสนอราคา</Label>
              <div className="border-2 border-dashed border-muted-foreground/20 h-32 rounded-lg flex items-center justify-center text-muted-foreground">
                ลายเซ็น
              </div>
              <p className="text-center mt-2">(...................................)</p>
              <p className="text-center text-sm text-muted-foreground">วันที่ ..........................</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          ยกเลิก
        </Button>
        <div className="space-x-4">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            ส่งออก PDF
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}
