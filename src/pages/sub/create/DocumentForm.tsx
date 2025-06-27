import { format } from "date-fns";
import { useState, useEffect, useCallback, useRef, FC, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { generateDocumentNumber } from "@/utils/documentUtils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Product } from "@/types/product";
import { Customer } from "@/types/customer";
import { CustomerAutocomplete } from "@/pages/sub/autocomplete/CustomerAutocomplete";
import { apiService } from "@/pages/services/apiService";
import CreateCustomerDialog from "./CreateCustomerDialog";
import {
  DocumentItem,
  DocumentSummary,
  DocumentData,
  CustomerData,
} from "@/types/document";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Save,
  Trash2,
  Loader2,
  Paperclip,
  X,
  Info,
} from "lucide-react";
import ProductAutocomplete from "../autocomplete/ProductAutocomplete";
import {
  calculateDocumentSummary,
  updateItemWithCalculations,
} from "@/calculate/documentCalculations";
import { ProductForm } from "./ProductForm";

export interface DocumentFormProps {
  onCancel: () => void;
  onSave: (data: DocumentData) => Promise<void>;
  initialData: DocumentData;
  documentType: "quotation" | "invoice";
  isLoading: boolean;
}

export const DocumentForm: FC<DocumentFormProps> = ({
  onCancel,
  onSave,
  initialData,
  documentType,
  isLoading,
}: DocumentFormProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);

  const [reference, setReference] = useState(initialData.reference);
  // Track documents and document number state
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [documentNumber, setDocumentNumber] = useState<string>(
    initialData.documentNumber || ""
  );

  // Set initial document number when component mounts or document type changes
  useEffect(() => {
    if (!initialData.id && !documentNumber) {
      try {
        // Get existing documents from localStorage
        const storedDocs = JSON.parse(
          localStorage.getItem("documents") || "[]"
        );
        const existingNumbers = storedDocs
          .filter((doc: DocumentData) => doc.documentType === documentType)
          .map((doc: DocumentData) => doc.documentNumber);

        // Generate new document number using the utility function
        const newNumber = generateDocumentNumber(documentType, existingNumbers);
        setDocumentNumber(newNumber);
      } catch (error) {
        console.error("Error generating document number:", error);
        // Fallback to simple number if error
        const prefix =
          documentType === "quotation"
            ? "QT"
            : documentType === "invoice"
              ? "IV"
              : documentType === "receipt"
                ? "RC"
                : "TAX";
        setDocumentNumber(`${prefix}-${new Date().getFullYear()}-0001`);
      }
    }
  }, [documentType, initialData.id, documentNumber]);

  // Sync document number with localStorage changes
  useEffect(() => {
    if (!initialData.id) {
      // Only for new documents
      const handleStorageChange = () => {
        try {
          const storedDocs = JSON.parse(
            localStorage.getItem("documents") || "[]"
          );
          const existingNumbers = storedDocs
            .filter((doc: DocumentData) => doc.documentType === documentType)
            .map((doc: DocumentData) => doc.documentNumber);

          const newNumber = generateDocumentNumber(
            documentType,
            existingNumbers
          );
          if (newNumber && newNumber !== documentNumber) {
            setDocumentNumber(newNumber);
          }
        } catch (error) {
          console.error("Error handling storage change:", error);
        }
      };

      // Initial check
      handleStorageChange();

      // Listen for storage changes
      window.addEventListener("storage", handleStorageChange);

      // Cleanup
      return () => {
        window.removeEventListener("storage", handleStorageChange);
      };
    }
  }, [documentType, initialData.id, documentNumber]);

  const [documentDate, setDocumentDate] = useState(
    initialData.documentDate || new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(initialData.dueDate || "");
  const [validUntil, setValidUntil] = useState(initialData.validUntil || "");

  const [isTaxInvoice, setIsTaxInvoice] = useState(false);

  const [customer, setCustomer] = useState<CustomerData>(initialData.customer);
  const [isCreateCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [customerRefreshKey, setCustomerRefreshKey] = useState(0);

  const [issueTaxInvoice, setIssueTaxInvoice] = useState(
    initialData.issueTaxInvoice ?? true
  );
  const [priceType, setPriceType] = useState<
    "inclusive" | "exclusive" | "none"
  >(initialData.priceType || "exclusive");
  const [tags, setTags] = useState<string[]>(initialData.tags || []);

  const createDefaultItem = (): DocumentItem => {
    return {
      id: `item-${Date.now()}`,
      productTitle: "",
      description: "",
      unit: "",
      quantity: 1,
      unitPrice: 0,
      priceType: "exclusive",
      discount: 0,
      discountType: "thb",
      tax: 7,
      amountBeforeTax: 0,
      withholdingTax: -1,
      amount: 0,
      isEditing: true,
    };
  };

  const [items, setItems] = useState<DocumentItem[]>(() =>
    initialData.items.length > 0 ? initialData.items : [createDefaultItem()]
  );

  const [summary, setSummary] = useState<DocumentSummary>({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    withholdingTax: 0,
  });

  const [notes, setNotes] = useState(initialData.notes);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newSummary = calculateDocumentSummary(items);
    setSummary(newSummary);
  }, [items]);

  const handleCustomerSelect = (selectedCustomer: Customer) => {
    setCustomer({
      id: selectedCustomer.id,
      name: selectedCustomer.name,
      tax_id: selectedCustomer.tax_id,
      phone: selectedCustomer.phone,
      address: selectedCustomer.address,
      email: selectedCustomer.email,
    });
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    handleCustomerSelect(newCustomer);
    setCreateCustomerOpen(false); // Close the dialog
    setCustomerRefreshKey((prevKey) => prevKey + 1); // Trigger refresh
  };

  const handleCustomerChange = (field: keyof CustomerData, value: string) => {
    let processedValue = value;
    if (field === "tax_id") {
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
    setPriceType(value);
    const updatedItems = items.map((item) => {
      const newItem = {
        ...item,
        priceType: value,
      };
      return updateItemWithCalculations(newItem);
    });
    setItems(updatedItems);
  };

  const handleInputChange = (
    id: string,
    field: keyof DocumentItem,
    value: any
  ) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        const updatedItemState = { ...item, [field]: value };

        if (field === "withholdingTax" && value !== "custom") {
          delete updatedItemState.customWithholdingTaxAmount;
        } else if (field === "withholdingTax" && value === "custom") {
          updatedItemState.customWithholdingTaxAmount =
            item.customWithholdingTaxAmount ?? 0;
        }

        return updateItemWithCalculations(updatedItemState);
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handleProductSelect = (product: Product | null, itemId: string) => {
    if (product) {
      const updatedItems = items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            product_id: String(product.id),
            productTitle: product.name,
            description: product.description || "",
            unitPrice: product.price || 0,
            quantity: 1, // Set default quantity to 1
            unit: product.unit || "ชิ้น",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return; // Prevent double submission

    setIsSaving(true);

    if (!customer || !customer.id) {
      toast.error("กรุณาเลือกลูกค้า", {
        description: "คุณต้องเลือกลูกค้าก่อนทำการบันทึกเอกสาร",
      });
      return;
    }

    if (items.length === 0) {
      toast.error("ไม่มีรายการสินค้า", {
        description: "คุณต้องเพิ่มสินค้าอย่างน้อย 1 รายการ",
      });
      return;
    }

    const dataToSave: DocumentData = {
      id: initialData.id,
      documentType: documentType,
      documentNumber: documentNumber,
      documentDate: documentDate,
      dueDate: documentType === "invoice" ? dueDate : undefined,
      validUntil: documentType === "quotation" ? validUntil : undefined,
      reference: reference,
      customer: customer,
      items: items,
      summary: summary,
      notes: notes,
      priceType: priceType,
      status:
        initialData.status ||
        (documentType === "invoice" ? "รอชำระ" : "รอตอบรับ"),
      attachments: attachments,
    };
    try {
      await onSave(dataToSave);
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกเอกสาร");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveAttachment = (fileName: string) => {
    setAttachments((prev) => prev.filter((file) => file.name !== fileName));
  };

  const pageTitle =
    documentType === "quotation"
      ? "สร้างใบเสนอราคา"
      : `สร้างใบแจ้งหนี้${isTaxInvoice ? " / ใบกำกับภาษี" : ""}`;
  const pageSubtitle =
    documentType === "quotation"
      ? "กรอกข้อมูลเพื่อสร้างใบเสนอราคาใหม่"
      : `กรอกข้อมูลเพื่อสร้างใบแจ้งหนี้ใหม่${
          isTaxInvoice ? " / ใบกำกับภาษี" : ""
        }`;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
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
            <Button type="submit" disabled={isLoading || isSaving}>
              {isLoading || isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              บันทึก
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="documentNumber">เลขที่เอกสาร</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>เลขที่เอกสารจะถูกสร้างโดยอัตโนมัติ</p>
                      <p>ประเภทเอกสาร: {documentType}</p>
                      <p>
                        สถานะ:{" "}
                        {initialData.id ? "แก้ไขเอกสาร" : "สร้างเอกสารใหม่"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <Input
                    id="documentNumber"
                    value={documentNumber}
                    readOnly
                    className="font-mono bg-muted"
                    placeholder=""
                  />
                </div>
              </div>
            </Label>
          </div>

          <div className="space-y-2">
            <Label>วันที่</Label>
            <Input
              type="date"
              value={documentDate}
              onChange={(e) => {
                setDocumentDate(e.target.value);
              }}
            />
          </div>

          {documentType === "quotation" ? (
            <div className="space-y-2">
              <Label>ยืนราคาถึงวันที่</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>วันที่ครบกำหนดชำระ</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>อ้างอิง</Label>
            <Input
              value={reference}
              onChange={handleReferenceChange}
              placeholder="อ้างอิง (ไม่บังคับ)"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลลูกค้า</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="flex-grow">
                <Label>ค้นหาลูกค้า</Label>
                <CustomerAutocomplete
                  value={customer}
                  onCustomerSelect={handleCustomerSelect}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateCustomerOpen(true)}
              >
                สร้างใหม่
              </Button>
              <CreateCustomerDialog
                open={isCreateCustomerOpen}
                onOpenChange={setCreateCustomerOpen}
                onCustomerCreated={handleCustomerCreated}
              />
            </div>
            {customer && customer.id && (
              <div className="mt-4 space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="customer-address">ที่อยู่</Label>
                  <Textarea
                    id="customer-address"
                    value={customer.address || ""}
                    onChange={(e) =>
                      handleCustomerChange("address", e.target.value)
                    }
                    placeholder="ที่อยู่สำหรับออกใบกำกับภาษี"
                    className="h-24"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-tax-id">
                      เลขประจำตัวผู้เสียภาษี
                    </Label>
                    <Input
                      id="customer-tax-id"
                      value={customer.tax_id || ""}
                      onChange={(e) =>
                        handleCustomerChange("tax_id", e.target.value)
                      }
                      placeholder="เลข 13 หลัก"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone">โทรศัพท์</Label>
                    <Input
                      id="customer-phone"
                      value={customer.phone || ""}
                      onChange={(e) =>
                        handleCustomerChange("phone", e.target.value)
                      }
                      placeholder="เบอร์โทรศัพท์"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">อีเมล</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={customer.email || ""}
                    onChange={(e) =>
                      handleCustomerChange("email", e.target.value)
                    }
                    placeholder="อีเมลสำหรับส่งเอกสาร"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลราคาและภาษี</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* รูปแบบราคา */}
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

              {/* สวิตช์ออกใบกำกับภาษี */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  การออกใบกำกับภาษี
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-gray-400" />
                      </TooltipTrigger>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="tax-invoice"
                    checked={isTaxInvoice} // ต้องกำหนด state ไว้ด้านนอก เช่น useState
                    onCheckedChange={setIsTaxInvoice}
                  />
                  <Label htmlFor="tax-invoice" className="text-blue-600">
                    ใบกำกับภาษี
                  </Label>
                </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[1fr_100px_140px_180px_100px_140px_140px] gap-4 items-start">
                    <div className="space-y-2">
                      <Label>สินค้าหรือบริการ</Label>
                      <ProductAutocomplete
                        value={
                          item.productId && item.productTitle
                            ? {
                                id: parseInt(item.productId, 10),
                                title: item.productTitle,
                                description: item.description,
                                property_info: item.description, // ใช้ description เป็น property_info
                              }
                            : null
                        }
                        onChange={(product) =>
                          handleProductSelect(product, item.id)
                        }
                        onAddNew={() => {
                          const newId = `new-${Date.now()}`;
                          const newItem: DocumentItem = {
                            id: newId,
                            isNew: true,
                            productTitle: "",
                            quantity: 1,
                            unitPrice: 0,
                            priceType: priceType,
                            discount: 0,
                            discountType: "thb",
                            tax: 7,
                            withholdingTax: -1,
                            description: "",
                            unit: "",
                            amountBeforeTax: 0,
                            amount: 0,
                            isEditing: true,
                          };
                          setItems([...items, newItem]);
                          setIsProductFormOpen(true);
                        }}
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
                        readOnly
                        placeholder="0.00"
                        className="bg-gray-100 dark:bg-gray-800"
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
                    <div className="space-y-2">
                      <Label>หัก ณ ที่จ่าย</Label>
                      <Select
                        value={String(item.withholdingTax)}
                        onValueChange={(value) => {
                          const whtValue =
                            value === "custom" ? "custom" : parseFloat(value);
                          handleInputChange(
                            item.id,
                            "withholdingTax",
                            whtValue
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือก" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">ไม่ระบุ</SelectItem>
                          <SelectItem value="0">ไม่มี</SelectItem>
                          <SelectItem value="1">1%</SelectItem>
                          <SelectItem value="1.5">1.5%</SelectItem>
                          <SelectItem value="2">2%</SelectItem>
                          <SelectItem value="3">3%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="15">15%</SelectItem>
                          <SelectItem value="custom">กำหนดเอง</SelectItem>
                        </SelectContent>
                      </Select>
                      {item.withholdingTax === "custom" && (
                        <Input
                          type="number"
                          placeholder="ระบุจำนวนเงิน"
                          value={item.customWithholdingTaxAmount || ""}
                          onChange={(e) =>
                            handleInputChange(
                              item.id,
                              "customWithholdingTaxAmount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="mt-2"
                        />
                      )}
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

        {documentType === "invoice" && (
          <Card>
            <CardHeader>
              <CardTitle>เงินมัดจำ</CardTitle>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline">
                <Plus className="w-4 h-4 mr-2" /> เลือกเงินมัดจำ
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>หมายเหตุ</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุหมายเหตุ (ถ้ามี)"
              className="h-32"
            />
          </div>
          <div className="space-y-2">
            <Label>แนบไฟล์</Label>
            <div className="border rounded-lg p-4 h-32 flex flex-col">
              <div className="flex-grow overflow-y-auto">
                {attachments.length === 0 ? (
                  <div className="mt-8">
                    <Dialog
                      open={isProductFormOpen}
                      onOpenChange={setIsProductFormOpen}
                    >
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <ProductForm
                          onSuccess={(newProductData) => {
                            const updatedItems = items.map((item) => {
                              if (item.isNew) {
                                const newItem = {
                                  ...item,
                                  productId: newProductData.id,
                                  productTitle: newProductData.name,
                                  unitPrice: newProductData.selling_price,
                                  unit: newProductData.unit,
                                  description: newProductData.description,
                                  tax:
                                    newProductData.selling_vat_rate !== null
                                      ? Number(newProductData.selling_vat_rate)
                                      : undefined,
                                  isNew: false,
                                };
                                return updateItemWithCalculations(newItem);
                              }
                              return item;
                            });
                            setItems(updatedItems);
                            setIsProductFormOpen(false);
                          }}
                          onCancel={() => {
                            setItems(items.filter((item) => !item.isNew));
                            setIsProductFormOpen(false);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {attachments.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between text-sm bg-muted p-2 rounded-md"
                      >
                        <span className="truncate max-w-[200px]">
                          {file.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveAttachment(file.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                เพิ่มไฟล์แนบ
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>แท็ก</Label>
          <Input placeholder="กรุณาเลือกแท็กที่ต้องการ" />
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
              <span>มูลค่าก่อนภาษี</span>
              <span>
                {(summary.subtotal - summary.discount).toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                })}{" "}
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
            <div className="border-t pt-3 mt-3 flex justify-between items-center">
              <Label>หัก ณ ที่จ่าย</Label>
              <span>
                -
                {summary.withholdingTax?.toLocaleString("th-TH", {
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
      </form>
    </>
  );
};

export default DocumentForm;
