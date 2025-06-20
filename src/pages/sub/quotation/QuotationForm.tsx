import { format } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "@/types/product";
import { QuotationItem, QuotationSummary } from "@/types/quotation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calendar, Download, FileText, Plus, Save, Search, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ProductAutocomplete from "../autocomplete/ProductAutocomplete";
import { 
  calculateDocumentSummary, 
  handleCalculatedFieldUpdate, 
  updateItemWithCalculations 
} from "@/calculate/documentCalculations";
import { toast } from "sonner";

interface QuotationFormProps {
  onCancel: () => void;
}

interface CustomerData {
  name: string;
  taxId: string;
  phone: string;
  address: string;
}

interface NewProductData {
  title: string;
  description: string;
  price: number;
}

const QuotationForm = ({ onCancel }: QuotationFormProps) => {
  const navigate = useNavigate();
  
  // Document Info State
  const [quotationNumber] = useState(
    `QT-${new Date().getFullYear()}-${String(
      Math.floor(1000 + Math.random() * 9000)
    )}`
  );
  
  const [reference, setReference] = useState("");
  const [quotationDate, setQuotationDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return format(date, "yyyy-MM-dd");
  });

  // Customer State
  const [customer, setCustomer] = useState<CustomerData>({
    name: "",
    taxId: "",
    phone: "",
    address: "",
  });

  // Create a default empty item
  const createDefaultItem = (): QuotationItem => {
    return {
      id: `item-${Date.now()}`,
      productTitle: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'thb',
      tax: 7,
      amountBeforeTax: 0,
      withholdingTax: 0,
      amount: 0,
      isEditing: true,
    };
  };

  // Items and Summary State
  const [items, setItems] = useState<QuotationItem[]>(() => [createDefaultItem()]);
  const [summary, setSummary] = useState<QuotationSummary>({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  });
  
  const [notes, setNotes] = useState("");

  // New Product Dialog State
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProductData>({
    title: "",
    description: "",
    price: 0,
  });

  // Calculate summary when items change
  useEffect(() => {
    const newSummary = calculateDocumentSummary(items);
    setSummary(newSummary);
  }, [items]);

  // Handle navigation to product creation
  const handleAddNewProduct = useCallback(() => {
    // Store current form data in session storage
    const formData = {
      customer,
      items,
      summary,
      notes,
      quotationNumber,
      quotationDate,
      validUntil,
      reference,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    
    sessionStorage.setItem('draftQuotation', JSON.stringify(formData));
    
    // Navigate to product creation page with return URL
    navigate('/products/new', {
      state: { returnTo: '/quotation/new' }
    });
  }, [
    customer,
    items,
    summary,
    notes,
    quotationNumber,
    quotationDate,
    validUntil,
    reference,
    navigate
  ]);

  // Handle adding a new product from the dialog
  const handleAddNewProductDialog = () => {
    // Create a new product item with the entered details
    const newProductItem: QuotationItem = {
      id: `new-${Date.now()}`,
      productId: undefined,
      productTitle: newProduct.title,
      description: newProduct.description,
      quantity: 1,
      unitPrice: newProduct.price,
      discount: 0,
      discountType: 'thb',
      tax: 7,
      amountBeforeTax: newProduct.price,
      withholdingTax: 0,
      amount: newProduct.price * 1.07, // Price + 7% VAT
      isEditing: true,
    };

    // Add the new product to the items list
    setItems(prevItems => [...prevItems, newProductItem]);
    
    // Reset the form and close the dialog
    setNewProduct({ title: "", description: "", price: 0 });
    setIsNewProductDialogOpen(false);
  };

  // Handle input changes
  const handleCustomerChange = (field: string, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReference(e.target.value);
  };

  const addNewItem = () => {
    const newItem = createDefaultItem();
    setItems(prevItems => [...prevItems, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleInputChange = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          // Use the utility function to handle field updates and calculations
          return handleCalculatedFieldUpdate(item, field, value);
        }
        return item;
      })
    );
  };

  const handleProductSelect = (product: Product | null, itemId: string) => {
    if (!product) return;
    
    setItems(prevItems =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const updatedItem = {
            ...item,
            productTitle: product.title || "",
            description: product.properties_desc && product.property_info
              ? `${product.properties_desc} : ${product.property_info}`
              : product.properties_desc || product.property_info || "",
            unitPrice: product.price || 0,
          };
          
          // Use the utility function to update with calculations
          return updateItemWithCalculations(updatedItem);
        }
        return item;
      })
    );
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare the quotation data
    const quotationData = {
      quotationNumber,
      reference,
      quotationDate,
      validUntil,
      customer,
      items: items.map(item => ({
        ...item,
        // Ensure all calculated fields are included
        ...calculateDocumentSummary([item])
      })),
      summary: calculateDocumentSummary(items),
      notes,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
    };

    console.log('Submitting quotation:', quotationData);
    // TODO: Add API call to save the quotation
    
    // Show success message
    toast.success('บันทึกใบเสนอราคาสำเร็จ');
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
            <p className="text-sm text-muted-foreground">
              เลขที่: {quotationNumber}
            </p>
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

      {/* New Product Dialog */}
      <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>เพิ่มสินค้าใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลสินค้าใหม่เพื่อเพิ่มลงในรายการ
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productName">ชื่อสินค้า</Label>
              <Input
                id="productName"
                value={newProduct.title}
                onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                placeholder="ระบุชื่อสินค้า"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDesc">รายละเอียด</Label>
              <Input
                id="productDesc"
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                placeholder="รายละเอียดสินค้า (ไม่บังคับ)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productPrice">ราคา (บาท)</Label>
              <Input
                id="productPrice"
                type="number"
                value={newProduct.price || ''}
                onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
                className="text-right"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsNewProductDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleAddNewProductDialog}
              disabled={!newProduct.title || newProduct.price <= 0}
            >
              เพิ่มสินค้า
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <form id="quotation-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Document Info */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลเอกสาร</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference">อ้างอิง</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={handleReferenceChange}
                  placeholder="ระบุอ้างอิง"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>รหัสเอกสาร</Label>
                <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                  {quotationNumber}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <CardTitle className="text-base">ข้อมูลลูกค้า</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="space-y-1 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">วันที่ออกใบเสนอราคา</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={quotationDate}
                      onChange={(e) => setQuotationDate(e.target.value)}
                      className="pl-8 pr-6 h-8 w-full text-xs appearance-none"
                    />
                    <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">วันที่ใช้ได้ถึง</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="pl-8 pr-6 h-8 w-full text-xs appearance-none"
                    />
                    <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">ชื่อลูกค้า</Label>
                <div className="relative">
                  <Input
                    id="customerName"
                    value={customer.name}
                    onChange={(e) =>
                      handleCustomerChange("name", e.target.value)
                    }
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
                  onChange={(e) =>
                    handleCustomerChange("taxId", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleCustomerChange("phone", e.target.value)
                  }
                  placeholder="เบอร์โทรศัพท์"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">ที่อยู่</Label>
                <Input
                  id="address"
                  value={customer.address}
                  onChange={(e) =>
                    handleCustomerChange("address", e.target.value)
                  }
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
                    <tr key={item.id} className="border-b border-border/40">
                      <td className="p-2 text-muted-foreground">{index + 1}</td>
                      <td className="p-2">
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <ProductAutocomplete
                                value={item.productTitle ? { title: item.productTitle } as Partial<Product> : undefined}
                                onChange={(product) => handleProductSelect(product, item.id)}
                                onAddNew={handleAddNewProduct}
                                placeholder="เลือกสินค้าหรือบริการ"
                                className="w-full"
                              />
                            </div>
                          </div>
                          <Textarea
                            value={item.description}
                            onChange={(e) =>
                              handleInputChange(
                                item.id,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                            className="min-h-[80px] border-border/50 text-sm"
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleInputChange(
                              item.id,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          className="w-24 text-center border-border/50 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          readOnly
                          className="w-32 text-right border-0 bg-transparent text-sm font-medium"
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={item.discount}
                            onChange={(e) =>
                              handleInputChange(
                                item.id,
                                "discount",
                                Number(e.target.value)
                              )
                            }
                            className="w-20 text-right border-border/50 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-12 p-0 text-xs font-normal"
                            onClick={() =>
                              handleInputChange(
                                item.id,
                                "discountType",
                                item.discountType === "percent"
                                  ? "thb"
                                  : "percent"
                              )
                            }
                          >
                            {item.discountType === "percent" ? "%" : "THB"}
                          </Button>
                        </div>
                      </td>
                      <td className="p-2">
                        <Select
                          value={item.tax?.toString() || "0"}
                          onValueChange={(value) =>
                            handleInputChange(item.id, "tax", Number(value))
                          }
                        >
                          <SelectTrigger className="h-8 w-24 text-right">
                            <SelectValue
                              placeholder="ภาษี"
                              className="text-right"
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="7">7%</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-right text-sm font-medium">
                        {item.amountBeforeTax?.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.withholdingTax || 0}
                          onChange={(e) =>
                            handleInputChange(
                              item.id,
                              "withholdingTax",
                              Number(e.target.value)
                            )
                          }
                          className="w-24 text-right border-border/50 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                      <td className="p-2 text-right text-sm font-medium">
                        {item.amount?.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
                onClick={addNewItem}
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
                        <span className="font-medium text-primary">
                          คลิกเพื่ออัปโหลด
                        </span>{" "}
                        หรือลากไฟล์มาวางที่นี่
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
                    สามารถแนบเอกสารเพิ่มเติมได้ เช่น เอกสารอ้างอิง,
                    ใบเสนอราคาอื่นๆ
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
                      <span>
                        {summary.subtotal.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>ส่วนลดรวม</span>
                      <span>
                        -
                        {summary.discount.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </span>
                    </div>
                    <div className="border-t border-border pt-1"></div>
                    <div className="flex justify-between">
                      <span>มูลค่าที่คำนวณภาษี 7%</span>
                      <span>
                        {(summary.subtotal - summary.discount).toLocaleString(
                          "th-TH",
                          { minimumFractionDigits: 2 }
                        )}{" "}
                        บาท
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>ภาษีมูลค่าเพิ่ม 7%</span>
                      <span>
                        {summary.tax.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </span>
                    </div>
                  </div>
                  <div className="border-t-2 border-border pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>จำนวนเงินทั้งสิ้น</span>
                      <span>
                        {summary.total.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </span>
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
