import { format } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "@/types/product";
import { DocumentItem, DocumentSummary, DocumentData } from "@/types/document";
import { QuotationItem } from "@/types/quotation";
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
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ProductAutocomplete from "../autocomplete/ProductAutocomplete";
import {
  calculateDocumentSummary,
  handleCalculatedFieldUpdate,
  updateItemWithCalculations,
} from "@/calculate/documentCalculations";
import { toast } from "sonner";
import { ProductForm, ProductFormData } from "./ProductForm";

interface DocumentFormProps {
  onCancel: () => void;
  onSave: (data: DocumentData) => Promise<void>;
  initialData: DocumentData;
  documentType: "quotation" | "invoice";
  isLoading: boolean;
}

interface CustomerData {
  name: string;
  taxId: string;
  phone: string;
  address: string;
}

const DocumentForm = ({
  onCancel,
  onSave,
  initialData,
  documentType,
  isLoading,
}: DocumentFormProps) => {
  const navigate = useNavigate();

  const [reference, setReference] = useState(initialData.reference);
  const [documentDate, setDocumentDate] = useState(initialData.documentDate);
  const [documentNumber, setDocumentNumber] = useState(
    initialData.documentNumber || ""
  );

  const [validUntil, setValidUntil] = useState(initialData.validUntil || "");

  const [customer, setCustomer] = useState<CustomerData>(initialData.customer);

  const createDefaultItem = (): DocumentItem => {
    return {
      id: `item-${Date.now()}`,
      productTitle: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      priceType: "exclusive",
      discount: 0,
      discountType: "thb",
      tax: 7,
      amountBeforeTax: 0,
      withholdingTax: 0,
      amount: 0,
      isEditing: true,
    };
  };

  const [items, setItems] = useState<DocumentItem[]>(
    initialData.items.length > 0 ? initialData.items : [createDefaultItem()]
  );

  const [summary, setSummary] = useState<DocumentSummary>({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  });

  const [notes, setNotes] = useState(initialData.notes);

  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);

  useEffect(() => {
    const newSummary = calculateDocumentSummary(items);
    setSummary(newSummary);
  }, [items]);

  const handleAddNewProduct = useCallback(() => {
    const formData = {
      customer,
      items,
      summary,
      notes,
      documentNumber,
      documentDate,
      validUntil,
      reference,
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    sessionStorage.setItem("draftDocument", JSON.stringify(formData));

    navigate("/products/new", {
      state: { returnTo: `/${documentType}/new` },
    });
  }, [
    customer,
    items,
    summary,
    notes,
    documentNumber,
    documentDate,
    validUntil,
    reference,
    navigate,
    documentType,
  ]);

  const handleCustomerChange = (field: keyof CustomerData, value: string) => {
    let processedValue = value;
    if (field === "taxId") {
      processedValue = value.replace(/[^\d]/g, "").slice(0, 13);
    }
    setCustomer((prev) => ({ ...prev, [field]: processedValue }));
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReference(e.target.value);
  };

  const addNewItem = () => {
    setItems([...items, createDefaultItem()]);
  };

  const removeItem = (id: string) => {
    const updatedItems = items.filter((item) => item.id !== id);
    setItems(updatedItems);
  };

  const handlePriceTypeChange = (value: "exclusive" | "inclusive" | "none") => {
    const updatedItems = items.map((item) => {
      const newItem = { ...item, priceType: value };
      return updateItemWithCalculations(newItem);
    });
    setItems(updatedItems);
  };

  const handleInputChange = (
    id: string,
    field: keyof DocumentItem,
    value: DocumentItem[keyof DocumentItem]
  ) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    const itemToUpdate = updatedItems.find((i) => i.id === id);
    if (itemToUpdate) {
      const calculatedItem = updateItemWithCalculations(itemToUpdate);
      setItems(updatedItems.map((i) => (i.id === id ? calculatedItem : i)));
    }
  };

  const handleProductSelect = (product: Product | null, itemId: string) => {
    if (product) {
      const updatedItems = items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            productTitle: product.title,
            description: product.description || "",
            unitPrice: product.price,
            isEditing: false,
          };
        }
        return item;
      });
      const itemToUpdate = updatedItems.find((i) => i.id === itemId);
      if (itemToUpdate) {
        const calculatedItem = updateItemWithCalculations(itemToUpdate);
        setItems(
          updatedItems.map((i) => (i.id === itemId ? calculatedItem : i))
        );
      }
    }
  };

  const handleProductFormSuccess = (newProductData: ProductFormData) => {
    const newItem: DocumentItem = {
      id: `item-${Date.now()}`,
      productTitle: newProductData.name,
      description: newProductData.description,
      quantity: 1,
      unitPrice: newProductData.selling_price,
      priceType: items[0]?.priceType || "exclusive",
      discount: 0,
      discountType: "thb",
      tax: 7,
      amountBeforeTax: 0,
      withholdingTax: 0,
      amount: 0, // Let updateItemWithCalculations handle this
      isEditing: false,
      productId: newProductData.id,
    };
    const itemWithCalculations = updateItemWithCalculations(newItem);

    const firstEmptyItemIndex = items.findIndex(
      (item) =>
        !item.productTitle && item.quantity === 1 && item.unitPrice === 0
    );

    if (firstEmptyItemIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[firstEmptyItemIndex] = itemWithCalculations;
      setItems(updatedItems);
    } else {
      setItems([...items, itemWithCalculations]);
    }

    setIsNewProductDialogOpen(false);
    toast.success(`เพิ่มสินค้า "${newProductData.name}" ในรายการแล้ว`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const documentData: DocumentData = {
      ...initialData,
      customer,
      items,
      summary,
      notes,
      documentDate,
      validUntil,
      reference,
    };
    await onSave(documentData);
  };

  const pageTitle =
    documentType === "quotation" ? "สร้างใบเสนอราคา" : "สร้างใบแจ้งหนี้";
  const pageSubtitle =
    documentType === "quotation"
      ? "กรอกข้อมูลเพื่อสร้างใบเสนอราคาใหม่"
      : "กรอกข้อมูลเพื่อสร้างใบแจ้งหนี้ใหม่";

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={onCancel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {pageTitle}
              </h1>
              <p className="text-muted-foreground">{pageSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button">
              บันทึกเป็นแบบร่าง
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              บันทึก
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลเอกสาร</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>เลขที่เอกสาร</Label>
                <Input
                  readOnly
                  value={documentNumber}
                  className="font-semibold bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>วันที่</Label>
                <Input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                />
              </div>
              {documentType === "quotation" && (
                <div className="space-y-2">
                  <Label>ยืนราคาถึงวันที่</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>อ้างอิง</Label>
                <Input
                  value={reference}
                  onChange={handleReferenceChange}
                  placeholder="(ไม่บังคับ)"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลลูกค้า</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">ชื่อลูกค้า</Label>
                <Input
                  id="customerName"
                  value={customer.name}
                  onChange={(e) => handleCustomerChange("name", e.target.value)}
                  placeholder="ชื่อ-นามสกุล หรือชื่อบริษัท"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</Label>
                <Input
                  id="taxId"
                  value={customer.taxId}
                  onChange={(e) =>
                    handleCustomerChange("taxId", e.target.value)
                  }
                  placeholder="กรอกเลข 13 หลัก"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">ที่อยู่</Label>
                <Textarea
                  id="address"
                  value={customer.address}
                  onChange={(e) =>
                    handleCustomerChange("address", e.target.value)
                  }
                  placeholder="-ไม่มี-"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>ข้อมูลราคาและภาษี</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>รูปแบบราคา</Label>
                  <Select
                    value={items[0]?.priceType || "exclusive"}
                    onValueChange={
                      handlePriceTypeChange as (value: string) => void
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกรูปแบบราคา" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">ไม่รวมภาษี</SelectItem>
                    <SelectItem value="inclusive">รวมภาษี</SelectItem>
                    <SelectItem value="none">ไม่มีภาษี</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>รายการ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col space-y-2 p-4 border rounded-lg relative bg-background"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[1fr_100px_140px_180px_100px_140px] gap-4 items-start">
                      <div className="space-y-2">
                        <Label>รายการ</Label>
                        <ProductAutocomplete
                          onChange={(product) =>
                            handleProductSelect(product, item.id)
                          }
                          onAddNew={() => setIsNewProductDialogOpen(true)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>จำนวน</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleInputChange(
                              item.id,
                              "quantity",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ราคาต่อหน่วย</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleInputChange(
                              item.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ส่วนลดต่อหน่วย</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={item.discount}
                            onChange={(e) =>
                              handleInputChange(
                                item.id,
                                "discount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          <Select
                            value={item.discountType}
                            onValueChange={(value) =>
                              handleInputChange(item.id, "discountType", value)
                            }
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="thb">บาท</SelectItem>
                              <SelectItem value="percentage">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>ภาษี</Label>
                        <Select
                          value={String(item.tax)}
                          onValueChange={(value) =>
                            handleInputChange(item.id, "tax", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7%</SelectItem>
                            <SelectItem value="0">0%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>มูลค่าก่อนภาษี</Label>
                        <Input
                          type="text"
                          readOnly
                          value={item.amountBeforeTax.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })}
                          className="font-semibold bg-muted"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addNewItem}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" /> เพิ่มรายการ
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุหมายเหตุ (ถ้ามี)"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>สรุปรายการ</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span>รวมเป็นเงิน</span>
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
              <div className="border-t pt-3 mt-3 flex justify-between">
                <span>ภาษีมูลค่าเพิ่ม 7%</span>
                <span>
                  {summary.tax.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  บาท
                </span>
              </div>
              <div className="border-t-2 border-primary pt-3 mt-3 flex justify-between font-bold text-lg">
                <span>จำนวนเงินทั้งสิ้น</span>
                <span>
                  {summary.total.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  บาท
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      <Dialog
        open={isNewProductDialogOpen}
        onOpenChange={setIsNewProductDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มสินค้า/บริการใหม่</DialogTitle>
            <DialogDescription>
              สร้างสินค้าหรือบริการใหม่เพื่อเพิ่มในเอกสารนี้ได้ทันที
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            onSuccess={handleProductFormSuccess}
            onCancel={() => setIsNewProductDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentForm;
