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
  DocumentPayload,
  DocumentItemPayload,
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
import { documentService } from "@/pages/services/documentService";
import { bankAccountService, BankAccount } from "@/services/bankAccountService";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export interface DocumentFormProps {
  onCancel: () => void;
  onSave: (data: DocumentPayload) => Promise<void>;
  initialData: DocumentData;
  documentType: "quotation" | "invoice" | "receipt" | "tax_invoice";
  isLoading: boolean;
  editMode?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
}

// เพิ่ม related_document_id ใน type DocumentData (workaround)
type DocumentDataWithRelated = DocumentData & { related_document_id?: number };

// ฟังก์ชันแปลง priceType ระหว่าง ENUM frontend/backend กับ ENUM ของ BaseItem
function mapPriceTypeToBaseItem(
  pt: "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT"
): "exclusive" | "inclusive" | "none" {
  if (pt === "INCLUDE_VAT") return "inclusive";
  if (pt === "NO_VAT") return "none";
  return "exclusive";
}

// ฟังก์ชันแปลงกลับ priceType จาก BaseItem เป็น DocumentItem
function mapPriceTypeToDocumentItem(
  pt: "exclusive" | "inclusive" | "none"
): "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT" {
  if (pt === "inclusive") return "INCLUDE_VAT";
  if (pt === "none") return "NO_VAT";
  return "EXCLUDE_VAT";
}

// Helper สำหรับคำนวณ Net (มูลค่าก่อนภาษี) ของแต่ละแถว
function getNetUnitPrice(item: DocumentItem, priceType: string) {
  const taxRate = (item.tax ?? 7) / 100;
  if (priceType === "INCLUDE_VAT") {
    return (item.unitPrice ?? 0) / (1 + taxRate);
  }
  return item.unitPrice ?? 0;
}

// เพิ่มฟังก์ชัน mapPriceTypeToEnum
function mapPriceTypeToEnum(
  pt: string
): "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT" {
  if (pt === "INCLUDE_VAT" || pt === "inclusive") return "INCLUDE_VAT";
  if (pt === "NO_VAT" || pt === "none") return "NO_VAT";
  return "EXCLUDE_VAT";
}

export const DocumentForm: FC<DocumentFormProps> = ({
  onCancel,
  onSave,
  initialData,
  documentType,
  isLoading,
  editMode = false,
  pageTitle,
  pageSubtitle,
}: DocumentFormProps) => {
  console.log("[DocumentForm] เริ่มต้นฟอร์ม:", {
    documentType,
    editMode,
    hasInitialData: !!initialData,
    itemsCount: initialData?.items?.length || 0,
  });

  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore local state for create customer dialog
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);

  // ใช้ ENUM เดียวกับ backend
  type PriceTypeEnum = "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT";
  const [priceType, setPriceType] = useState<PriceTypeEnum>(
    (initialData.priceType as PriceTypeEnum) || "EXCLUDE_VAT"
  );

  // 1. เพิ่มตัวเลือก ENUM สำหรับ Withholding Tax Option
  const WITHHOLDING_TAX_OPTIONS = [
    "ไม่ระบุ",
    "ไม่มี",
    "1%",
    "1.5%",
    "2%",
    "3%",
    "5%",
    "10%",
    "15%",
    "กำหนดเอง",
  ] as const;

  const [receiptMode, setReceiptMode] = useState<"basic" | "advanced">("basic");

  // State สำหรับ settings ของเลขรันเอกสาร
  const [docSettings, setDocSettings] = useState<any[]>([]);
  const [loadingDocSettings, setLoadingDocSettings] = useState(true);

  // ดึงข้อมูล settings ของเลขรันเอกสาร
  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingDocSettings(true);
      try {
        const res = await fetch("/api/document-number-settings");
        const data = await res.json();
        setDocSettings(data);
      } catch (e) {
        setDocSettings([]);
      } finally {
        setLoadingDocSettings(false);
      }
    };
    fetchSettings();
  }, []);

  // ฟังก์ชันสร้างเลข preview
  function previewDocumentNumber(pattern: string, currentNumber: number) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const yy = String(yyyy).slice(-2);
    const MM = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    let docNumber = pattern;
    docNumber = docNumber.replace(/YYYY/g, String(yyyy));
    docNumber = docNumber.replace(/YY/g, yy);
    docNumber = docNumber.replace(/MM/g, MM);
    docNumber = docNumber.replace(/DD/g, dd);
    docNumber = docNumber.replace(/X+/g, (m) =>
      String(currentNumber + 1).padStart(m.length, "0")
    );
    return docNumber;
  }

  // หา setting ของเอกสารปัจจุบัน
  const currentDocSetting = docSettings.find(
    (d) => d.document_type === documentType
  );

  function createDefaultItem(): DocumentItem {
    return {
      id: `item-${Date.now()}`,
      productTitle: "",
      description: "",
      unit: "",
      quantity: 1,
      unitPrice: 0,
      priceType: priceType || "EXCLUDE_VAT",
      discount: 0,
      discountType: "thb",
      tax: 7,
      amountBeforeTax: 0,
      amount: 0,
      isEditing: true,
      withholding_tax_option: "ไม่ระบุ",
      withholdingTax: -1,
    };
  }

  // 1. สร้าง state ฟอร์มแบบ pre-fill ทุก field จาก initialData (editMode)
  const [form, setForm] = useState(() => {
    const items = (initialData.items || []).map((item) => {
      let withholdingTax: number | "custom" = 0;
      if (item.withholding_tax_option === "กำหนดเอง") {
        withholdingTax = "custom";
      } else if (
        typeof item.withholding_tax_option === "string" &&
        item.withholding_tax_option.endsWith("%")
      ) {
        withholdingTax = parseFloat(item.withholding_tax_option);
      } else if (
        item.withholding_tax_option === "ไม่มี" ||
        item.withholding_tax_option === "ไม่ระบุ"
      ) {
        withholdingTax = 0;
      } else if (typeof item.withholdingTax === "number") {
        withholdingTax = item.withholdingTax;
      }
      // normalize discountType
      let normalizedDiscountType: "thb" | "percentage" = "thb";
      if (item.discountType === "percentage") {
        normalizedDiscountType = "percentage";
      }
      return {
        ...item,
        originalUnitPrice: item.unitPrice ?? 0, // map จาก backend
        unitPrice: item.unitPrice ?? 0, // fallback
        discountType: normalizedDiscountType,
        withholding_tax_option: item.withholding_tax_option ?? "ไม่ระบุ",
        withholdingTax,
        withholdingTaxAmount: item.withholdingTaxAmount ?? 0,
        customWithholdingTaxAmount: item.customWithholdingTaxAmount ?? 0,
        priceType: item.priceType || initialData.priceType || "EXCLUDE_VAT",
      } as DocumentItem;
    });

    console.log("[DocumentForm] สร้าง state ฟอร์ม:", {
      itemsCount: items.length,
      documentNumber: initialData.documentNumber,
    });

    // เพิ่ม log debug
    // console.log("[DEBUG] initialData.price_type:", initialData.price_type);

    return {
      ...initialData,
      priceType: initialData.priceType || "EXCLUDE_VAT",
      items,
    };
  });

  // เพิ่ม netTotalAmount ใน state summary
  const [summary, setSummary] = useState<
    DocumentSummary & { netTotalAmount?: number }
  >({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    withholdingTax: 0,
    netTotalAmount: 0,
  });

  // Optimize: Memoize summary calculation
  const calculatedSummary = useMemo(() => {
    if (form.items.length === 0) {
      return {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        withholdingTax: 0,
        netAfterDiscount: 0,
      };
    }
    // mapping priceType ให้ถูกต้อง
    const mappedItems = form.items.map((item) => {
      let mappedPriceType: "inclusive" | "exclusive" | "none" = "exclusive";
      let mappedTax = item.tax;
      if (form.priceType === "INCLUDE_VAT") {
        mappedPriceType = "inclusive";
      } else if (form.priceType === "NO_VAT") {
        mappedPriceType = "none";
        mappedTax = 0;
      } else {
        mappedPriceType = "exclusive";
      }
      return {
        ...item,
        unitPrice: item.unitPrice, // ราคาตั้งต้นเสมอ
        originalUnitPrice: item.unitPrice,
        priceType: mappedPriceType,
        tax: mappedTax,
      };
    });
    // ส่ง argument ที่สองเป็น mappedItems[0]?.priceType เสมอ
    return calculateDocumentSummary(mappedItems, mappedItems[0]?.priceType);
  }, [form.items, form.priceType]);

  // Update summary when calculatedSummary changes
  useEffect(() => {
    setSummary(calculatedSummary);
  }, [calculatedSummary]);

  // คำนวณ previewNumber หลังจากการประกาศ form
  const previewNumber = useMemo(() => {
    const result = editMode
      ? form.documentNumber
      : currentDocSetting
        ? previewDocumentNumber(
            currentDocSetting.pattern,
            Number(currentDocSetting.current_number)
          )
        : "";

    console.log("[DEBUG] previewNumber calculation:", {
      editMode,
      formDocumentNumber: form.documentNumber,
      currentDocSetting: currentDocSetting
        ? {
            pattern: currentDocSetting.pattern,
            current_number: currentDocSetting.current_number,
          }
        : null,
      previewNumber: result,
    });

    return result;
  }, [editMode, form.documentNumber, currentDocSetting]);

  // handle เปลี่ยนค่าในฟอร์ม
  const handleFormChange = useCallback(
    (field: string, value: any) => {
      console.log("[DocumentForm] เปลี่ยนค่า:", field, value);
      if (field === "documentNumber") {
        console.log(
          "[DEBUG] handleFormChange - เปลี่ยน documentNumber จาก:",
          form.documentNumber,
          "เป็น:",
          value
        );
      }
      setForm(
        (prev) =>
          ({
            ...prev,
            [field]: value,
            summary: prev.summary ?? summary,
          }) as typeof form
      );
    },
    [summary, form.documentNumber]
  );

  // handle เปลี่ยนค่าใน customer
  const handleCustomerChange = (
    field: keyof typeof form.customer,
    value: string
  ) => {
    let processedValue = value;
    if (field === "tax_id") {
      processedValue = value.replace(/[^\d]/g, "").slice(0, 13);
    }
    setForm((prev) => ({
      ...prev,
      customer: { ...prev.customer, [field]: processedValue },
      summary: prev.summary ?? summary,
    }));
  };

  // handle เปลี่ยนค่าใน items
  const handleItemChange = (
    id: string,
    field: keyof DocumentItem,
    value: any
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          let updatedItemState = { ...item, [field]: value };
          // ถ้าเปลี่ยน withholding_tax_option ให้ sync กับ withholdingTax (สำหรับคำนวณเท่านั้น)
          if (field === "withholding_tax_option") {
            updatedItemState.withholding_tax_option = value;
            // sync withholdingTax (number/custom) สำหรับ logic เดิม (ใช้สำหรับคำนวณเท่านั้น)
            if (value === "ไม่ระบุ") updatedItemState.withholdingTax = 0;
            else if (value === "ไม่มี") updatedItemState.withholdingTax = 0;
            else if (value === "กำหนดเอง")
              updatedItemState.withholdingTax = "custom";
            else if (typeof value === "string" && value.endsWith("%"))
              updatedItemState.withholdingTax = parseFloat(value);
            else updatedItemState.withholdingTax = Number(value) || 0;
          }
          if (
            field === "quantity" ||
            field === "unitPrice" ||
            field === "discount" ||
            field === "tax" ||
            field === "customWithholdingTaxAmount"
          ) {
            updatedItemState[field] = Number(value) || 0;
          }
          if (field === "withholdingTax" && value !== "custom") {
            delete updatedItemState.customWithholdingTaxAmount;
          } else if (field === "withholdingTax" && value === "custom") {
            updatedItemState.customWithholdingTaxAmount =
              item.customWithholdingTaxAmount ?? 0;
          }
          // แปลง priceType ก่อนส่งเข้า updateItemWithCalculations
          const calculated = updateItemWithCalculations({
            ...updatedItemState,
            priceType: mapPriceTypeToBaseItem(updatedItemState.priceType),
          });
          // กำหนด priceType กลับเป็น ENUM DocumentItem
          return {
            ...calculated,
            priceType: mapPriceTypeToDocumentItem(calculated.priceType) as
              | "EXCLUDE_VAT"
              | "INCLUDE_VAT"
              | "NO_VAT",
          };
        }
        return item;
      }),
    }));
  };

  // handle เพิ่ม/ลบ item
  const addNewItem = () => {
    const newItem = createDefaultItem();
    // แปลง priceType ก่อนส่งเข้า updateItemWithCalculations
    const calculatedItem = updateItemWithCalculations({
      ...newItem,
      priceType: mapPriceTypeToBaseItem(newItem.priceType),
    });
    const fixedItem = {
      ...calculatedItem,
      priceType: mapPriceTypeToDocumentItem(calculatedItem.priceType) as
        | "EXCLUDE_VAT"
        | "INCLUDE_VAT"
        | "NO_VAT",
    };
    setForm((prev) => {
      const newItems = [...prev.items, fixedItem];
      console.log("[addNewItem] form.items:", newItems);
      return {
        ...prev,
        items: newItems,
      };
    });
  };
  const removeItem = (id: string) => {
    setForm(
      (prev) =>
        ({
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
        }) as typeof form
    );
  };

  // handle เลือกลูกค้า
  const handleCustomerSelect = (selectedCustomer: Customer) => {
    setForm((prev) => ({
      ...prev,
      customer: {
        id:
          typeof selectedCustomer.id === "string"
            ? parseInt(selectedCustomer.id, 10)
            : selectedCustomer.id,
        name: selectedCustomer.name,
        tax_id: selectedCustomer.tax_id,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address,
        email: selectedCustomer.email,
      },
    }));
  };
  const handleCustomerCreated = (newCustomer: Customer) => {
    handleCustomerSelect(newCustomer);
  };

  // handle เลือกสินค้า
  const handleProductSelect = (product: Product | null, itemId: string) => {
    if (product) {
      setForm((prev) => {
        const newItems = prev.items.map((item) => {
          if (item.id === itemId) {
            // normalize discountType ให้ถูกต้อง
            let normalizedDiscountType: "thb" | "percentage" = "thb";
            if (item.discountType === "percentage") {
              normalizedDiscountType = "percentage";
            }
            // เตรียมข้อมูล item (spread ...item ก่อน แล้ว override)
            const mergedItem: DocumentItem = {
              ...item,
              id: item.id ?? `item-${Date.now()}`,
              productId: product.id
                ? product.id.toString()
                : (item.productId ?? ""),
              productTitle: product.title ?? item.productTitle ?? "",
              description: product.description ?? item.description ?? "",
              unitPrice:
                typeof product.price === "number"
                  ? product.price
                  : (item.unitPrice ?? 0), // แก้ให้ใช้ราคาสินค้าใหม่
              unit: product.unit ?? item.unit ?? "",
              tax:
                typeof product.vat_rate === "number"
                  ? product.vat_rate
                  : (item.tax ?? 7),
              discount: item.discount ?? 0,
              discountType: normalizedDiscountType,
              withholding_tax_option: item.withholding_tax_option ?? "ไม่ระบุ",
              customWithholdingTaxAmount: item.customWithholdingTaxAmount ?? 0,
              isEditing: false,
            };
            // ลบ field ที่เกี่ยวกับผลลัพธ์การคำนวณ
            delete (mergedItem as any).amount;
            delete (mergedItem as any).amountBeforeTax;
            delete (mergedItem as any).taxAmount;
            delete (mergedItem as any).withholdingTaxAmount;
            // Logic sync withholdingTax ตาม withholding_tax_option
            if (mergedItem.withholding_tax_option === "กำหนดเอง") {
              mergedItem.withholdingTax = "custom";
            } else if (
              typeof mergedItem.withholding_tax_option === "string" &&
              mergedItem.withholding_tax_option.endsWith("%")
            ) {
              mergedItem.withholdingTax = parseFloat(
                mergedItem.withholding_tax_option
              );
            } else if (
              mergedItem.withholding_tax_option === "ไม่มี" ||
              mergedItem.withholding_tax_option === "ไม่ระบุ"
            ) {
              mergedItem.withholdingTax = 0;
            } else if (typeof mergedItem.withholdingTax !== "number") {
              mergedItem.withholdingTax =
                Number(mergedItem.withholdingTax) || 0;
            }
            // แปลง priceType ก่อนส่งเข้า updateItemWithCalculations
            const calculated = updateItemWithCalculations({
              ...mergedItem,
              discountType: normalizedDiscountType, // ให้ type ตรง
              priceType: mapPriceTypeToBaseItem(mergedItem.priceType),
            });
            return {
              ...mergedItem,
              ...calculated,
              priceType: mapPriceTypeToDocumentItem(calculated.priceType) as
                | "EXCLUDE_VAT"
                | "INCLUDE_VAT"
                | "NO_VAT",
            };
          }
          return item;
        });
        return {
          ...prev,
          items: newItems,
        };
      });
    }
  };

  // handle แนบไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };
  const handleRemoveAttachment = (fileName: string) => {
    setAttachments((prev) => prev.filter((file) => file.name !== fileName));
  };

  // 3. สรุปรายการคำนวณสดจาก form.items
  useEffect(() => {
    // แปลง priceType ของแต่ละ item ก่อนส่งเข้า calculateDocumentSummary
    const mappedItems = form.items.map((item) => ({
      ...item,
      priceType: mapPriceTypeToBaseItem(item.priceType),
    }));
    const newSummary = calculateDocumentSummary(mappedItems);
    newSummary.netTotalAmount = newSummary.total - newSummary.withholdingTax;
    setSummary(newSummary);
  }, [form.items]);

  // เพิ่ม useEffect สำหรับดึงเลขเอกสารใหม่จาก backend (เฉพาะกรณีสร้างใหม่)
  useEffect(() => {
    if (!editMode && !form.documentNumber) {
      const fetchNextNumber = async () => {
        try {
          const res = await fetch(
            `/api/document-number-settings/${documentType}/next-number`
          );
          if (!res.ok) throw new Error("ไม่สามารถดึงเลขเอกสารใหม่ได้");
          const data = await res.json();
          handleFormChange("documentNumber", data.documentNumber);
        } catch (error) {
          // fallback เดิม
          const prefix =
            documentType === "quotation"
              ? "QT"
              : documentType === "invoice"
                ? "IV"
                : documentType === "receipt"
                  ? "RC"
                  : "TAX";
          const fallbackNumber = `${prefix}-${new Date().getFullYear()}-00001`;
          handleFormChange("documentNumber", fallbackNumber);
        }
      };
      fetchNextNumber();
    } else {
      console.log(
        "[DEBUG] ไม่ fetch เลขเอกสารใหม่ - editMode:",
        editMode,
        "มีเลขเอกสารแล้ว:",
        !!form.documentNumber
      );
    }
    // eslint-disable-next-line
  }, [documentType, editMode]);

  // Sync document number with localStorage changes (เฉพาะเอกสารใหม่)
  useEffect(() => {
    if (!initialData.id && !editMode) {
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
          if (newNumber && newNumber !== form.documentNumber) {
            handleFormChange("documentNumber", newNumber);
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
  }, [documentType, initialData.id, editMode]);

  // Sync form state with initialData when initialData changes (for edit mode)
  useEffect(() => {
    async function fillEditData() {
      if (editMode && initialData.customer?.id) {
        // ใช้ข้อมูลลูกค้าที่มีอยู่แล้ว ไม่ต้องโหลดใหม่
        const customer = initialData.customer;

        // ใช้ข้อมูลสินค้าในเอกสาร ไม่ fetch product เพิ่ม
        const items = (initialData.items || []).map((item) => {
          // normalize discountType ให้ถูกต้อง
          let normalizedDiscountType: "thb" | "percentage" = "thb";
          if (item.discountType === "percentage") {
            normalizedDiscountType = "percentage";
          }
          // เตรียมข้อมูล item
          const mergedItem = {
            ...item,
            id: item.id ?? `item-${Date.now()}`,
            discountType: normalizedDiscountType,
            isEditing: false,
            unitPrice: item.unitPrice ?? 0,
          };
          // ลบ field ที่เกี่ยวกับผลลัพธ์การคำนวณ
          delete mergedItem.amount;
          delete mergedItem.amountBeforeTax;
          delete mergedItem.taxAmount;
          delete mergedItem.withholdingTaxAmount;
          // Logic sync withholdingTax ตาม withholding_tax_option
          if (mergedItem.withholding_tax_option === "กำหนดเอง") {
            mergedItem.withholdingTax = "custom";
          } else if (
            typeof mergedItem.withholding_tax_option === "string" &&
            mergedItem.withholding_tax_option.endsWith("%")
          ) {
            mergedItem.withholdingTax = parseFloat(
              mergedItem.withholding_tax_option
            );
          } else if (
            mergedItem.withholding_tax_option === "ไม่มี" ||
            mergedItem.withholding_tax_option === "ไม่ระบุ"
          ) {
            mergedItem.withholdingTax = 0;
          } else if (typeof mergedItem.withholdingTax !== "number") {
            mergedItem.withholdingTax = Number(mergedItem.withholdingTax) || 0;
          }
          // แปลง priceType ก่อนส่งเข้า updateItemWithCalculations
          const calculated = updateItemWithCalculations({
            ...mergedItem,
            priceType: mapPriceTypeToBaseItem(mergedItem.priceType),
          });
          return {
            ...calculated,
            priceType: mapPriceTypeToDocumentItem(calculated.priceType) as
              | "EXCLUDE_VAT"
              | "INCLUDE_VAT"
              | "NO_VAT",
          };
        });
        setForm((prev) => {
          const newForm = {
            ...prev,
            documentNumber: initialData.documentNumber || "",
            documentDate: initialData.documentDate || "",
            dueDate: initialData.dueDate || "",
            validUntil: initialData.validUntil || "",
            reference: initialData.reference || "",
            notes: initialData.notes || "",
            status: initialData.status || "draft",
            customer: {
              id:
                typeof customer.id === "string"
                  ? parseInt(customer.id, 10)
                  : customer.id,
              name: customer.name,
              tax_id: customer.tax_id,
              phone: customer.phone,
              address: customer.address,
              email: customer.email,
            },
            items,
          };
          return newForm;
        });
        // คำนวณ summary ใหม่ทันทีหลัง normalize items
        // แปลง priceType ของแต่ละ item ก่อนส่งเข้า calculateDocumentSummary
        const mappedItems = items.map((item) => ({
          ...item,
          priceType: mapPriceTypeToBaseItem(item.priceType),
        }));
        const newSummary2 = calculateDocumentSummary(mappedItems);
        newSummary2.netTotalAmount =
          newSummary2.total - newSummary2.withholdingTax;
        setSummary(newSummary2);

        // โหลดข้อมูล receipt details สำหรับการแก้ไข
        if (documentType === "receipt" && initialData.receipt_details) {
          const receiptDetails = initialData.receipt_details;

          // --- โหลด payment channels ---
          let paymentChannelsData = receiptDetails.payment_channels;
          if (typeof paymentChannelsData === "string") {
            try {
              paymentChannelsData = JSON.parse(paymentChannelsData);
            } catch (e) {
              paymentChannelsData = [];
            }
          }
          if (Array.isArray(paymentChannelsData)) {
            const channels = paymentChannelsData.map((ch: any) => ({
              enabled: true,
              method: ch.channel || "",
              amount: ch.amount || 0,
              note: ch.note || "",
              bankAccountId: ch.bankAccountId || null,
            }));
            setPaymentChannels(channels);
          }

          // --- โหลด fees ---
          let feesData = receiptDetails.fees;
          if (typeof feesData === "string") {
            try {
              feesData = JSON.parse(feesData);
            } catch (e) {
              feesData = [];
            }
          }
          if (Array.isArray(feesData)) {
            const feeList = feesData.map((f: any) => ({
              enabled: true,
              type: f.type || "",
              account: f.account || "",
              amount: f.amount || 0,
              note: f.note || "",
            }));
            setFees(feeList);
          }

          // --- โหลด offset docs ---
          let offsetDocsData = receiptDetails.offset_docs;
          if (typeof offsetDocsData === "string") {
            try {
              offsetDocsData = JSON.parse(offsetDocsData);
            } catch (e) {
              offsetDocsData = [];
            }
          }
          if (Array.isArray(offsetDocsData)) {
            const offsetList = offsetDocsData.map((d: any) => ({
              enabled: true,
              docType: d.doc_type || "",
              docNumber: d.doc_no || "",
              amount: d.amount || 0,
              note: d.note || "",
            }));
            setOffsetDocs(offsetList);
          }
        }
      }
    }
    fillEditData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, initialData, documentType]);

  // เพิ่ม useEffect สำหรับกรณี editMode และมี related_document_id
  useEffect(() => {
    if (
      editMode &&
      (initialData as DocumentDataWithRelated)?.related_document_id
    ) {
      fetch(
        `http://localhost:3001/api/documents/${(initialData as DocumentDataWithRelated).related_document_id}`
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.document_number) {
            setForm((prev) => ({
              ...prev,
              reference: data.document_number,
            }));
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, (initialData as DocumentDataWithRelated)?.related_document_id]);

  // ฟังก์ชันคำนวณ discount เป็นจำนวนเงินจริง
  function getDiscountAmount(item: DocumentItem) {
    if (item.discountType === "percentage") {
      return item.unitPrice * item.quantity * (item.discount / 100);
    }
    return item.discount * item.quantity;
  }

  // เพิ่มฟังก์ชันตรวจสอบส่วนลดและหัก ณ ที่จ่าย
  function getMaxDiscount(item) {
    return item.unitPrice * item.quantity;
  }
  function getMaxWithholding(item) {
    // กรณีหัก ณ ที่จ่ายแบบกำหนดเอง
    return item.unitPrice * item.quantity - getDiscountAmount(item);
  }

  // เพิ่มฟังก์ชันเช็คว่าสามารถหัก ณ ที่จ่ายได้หรือไม่
  function canWithholding(item) {
    return getMaxWithholding(item) > 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return; // Prevent double submission

    // ตรวจสอบส่วนลด/หัก ณ ที่จ่ายเกิน limit
    for (const item of form.items) {
      // ส่วนลด
      if (item.discountType === "percentage" && item.discount > 100) {
        toast.error(
          "ส่วนลดต้องไม่เกิน 100% ในสินค้า: " + (item.productTitle || "")
        );
        setIsSaving(false);
        return;
      }
      if (item.discountType === "thb" && item.discount > getMaxDiscount(item)) {
        toast.error(
          "ส่วนลดต้องไม่เกินราคารวมสินค้า: " + (item.productTitle || "")
        );
        setIsSaving(false);
        return;
      }
      // หัก ณ ที่จ่ายแบบกำหนดเอง
      if (
        item.withholding_tax_option === "กำหนดเอง" &&
        item.customWithholdingTaxAmount > getMaxWithholding(item)
      ) {
        toast.error(
          "หัก ณ ที่จ่ายต้องไม่เกินยอดหลังหักส่วนลด: " +
            (item.productTitle || "")
        );
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(true);

    if (!form.customer || !form.customer.id) {
      toast.error("กรุณาเลือกลูกค้า", {
        description: "คุณต้องเลือกลูกค้าก่อนทำการบันทึกเอกสาร",
      });
      setIsSaving(false);
      return;
    }

    if (form.items.length === 0) {
      toast.error("ไม่มีรายการสินค้า", {
        description: "คุณต้องเพิ่มสินค้าอย่างน้อย 1 รายการ",
      });
      setIsSaving(false);
      return;
    }

    // ตรวจสอบยอดรับชำระไม่ให้เกินยอดที่ต้องชำระ (เฉพาะใบเสร็จ)
    if (documentType === "receipt") {
      const totalPaymentAmount = paymentChannels
        .filter((c) => c.enabled)
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const totalOffsetAmount = offsetDocs
        .filter((d) => d.enabled)
        .reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const totalReceiptAmount = totalPaymentAmount + totalOffsetAmount;

      if (totalReceiptAmount > netTotal) {
        toast.error("ยอดรับชำระเกินยอดที่ต้องชำระ", {
          description: `ยอดรับชำระรวม: ${totalReceiptAmount.toLocaleString("th-TH")} บาท, ยอดที่ต้องชำระ: ${netTotal.toLocaleString("th-TH")} บาท`,
        });
        setIsSaving(false);
        return;
      }
    }

    // --- เช็ค reference หรือ related_document_id ก่อนสร้าง ---
    try {
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการตรวจสอบเอกสารซ้ำ");
      setIsSaving(false);
      return;
    }

    // map items ให้ field ตรงกับ schema database
    const itemsToSave: DocumentItemPayload[] = form.items.map((item) => ({
      product_id: item.productId ?? null,
      product_name: item.productTitle ?? "",
      unit: item.unit ?? "",
      quantity: item.quantity ?? 1,
      unit_price: item.unitPrice ?? 0,
      amount: item.amount ?? 0,
      description: item.description ?? "",
      withholding_tax_amount: item.withholdingTaxAmount ?? 0,
      amount_before_tax: item.amountBeforeTax ?? 0,
      discount: item.discount ?? 0,
      discount_type: item.discountType ?? "thb",
      tax: form.priceType === "NO_VAT" ? 0 : Number(item.tax ?? 0),
      tax_amount: item.taxAmount ?? 0,
      withholding_tax_option: item.withholding_tax_option || "ไม่ระบุ",
    }));

    const dataToSave: DocumentPayload = {
      id: initialData.id,
      documentType: documentType,
      documentNumber: form.documentNumber,
      documentDate: form.documentDate,
      dueDate: documentType === "invoice" ? form.dueDate : undefined, // ฝั่ง backend ต้องรองรับ dueDate (camelCase)
      validUntil: documentType === "quotation" ? form.validUntil : undefined,
      reference: form.reference,
      customer: {
        id:
          typeof form.customer.id === "string"
            ? parseInt(form.customer.id, 10)
            : form.customer.id,
        name: form.customer.name,
        tax_id: form.customer.tax_id,
        phone: form.customer.phone,
        address: form.customer.address,
        email: form.customer.email,
      },
      items: itemsToSave,
      summary: calculatedSummary, // ใช้ค่าจาก useMemo ที่คำนวณสดเสมอ
      notes: form.notes,
      priceType: mapPriceTypeToEnum(form.priceType),
      status: form.status,
      attachments: attachments,
      // เพิ่มข้อมูลสำหรับ receipt
      ...(documentType === "receipt" && {
        payment_date: form.documentDate, // ใช้วันที่เอกสารเป็นวันชำระเงิน
        payment_method:
          paymentChannels
            .filter((c) => c.enabled && c.method)
            .map((c) => c.method)
            .join(", ") || "เงินสด",
        payment_reference: "",
        payment_channels: paymentChannels
          .filter((c) => c.enabled)
          .map((c) => ({
            channel: c.method || "เงินสด",
            amount: Number(c.amount) || 0,
            note: c.note || "",
            bankAccountId: c.bankAccountId,
          })),
        fees: fees
          .filter((f) => f.enabled)
          .map((f) => ({
            type: f.type || "ค่าธรรมเนียม",
            amount: Number(f.amount) || 0,
            account: f.account || "",
            note: f.note || "",
          })),
        offset_docs: offsetDocs
          .filter((d) => d.enabled)
          .map((d) => ({
            doc_type: d.docType || "",
            doc_no: d.docNumber || "",
            amount: Number(d.amount) || 0,
            note: d.note || "",
          })),
        net_total_receipt: netTotal,
      }),
    };

    // แปลง DocumentPayload เป็น DocumentData สำหรับบันทึก localStorage
    const itemsForSave: DocumentItem[] = form.items.map((item, idx) => {
      let fixedPriceType: "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT" =
        "EXCLUDE_VAT";
      if (item.priceType === "INCLUDE_VAT") fixedPriceType = "INCLUDE_VAT";
      else if (item.priceType === "NO_VAT") fixedPriceType = "NO_VAT";
      // ถ้าเป็น 'exclusive' หรืออื่นๆ ให้ fallback เป็น EXCLUDE_VAT
      return {
        ...item,
        id: item.id ?? `item-${idx}-${Date.now()}`,
        productTitle: item.productTitle ?? "",
        unitPrice: item.unitPrice ?? 0,
        priceType: fixedPriceType,
        discountType: item.discountType ?? "thb",
        withholding_tax_option: item.withholding_tax_option ?? "ไม่ระบุ",
        withholdingTax: item.withholdingTax ?? 0,
        customWithholdingTaxAmount: item.customWithholdingTaxAmount ?? 0,
        amount: item.amount ?? 0,
        amountBeforeTax: item.amountBeforeTax ?? 0,
        taxAmount: item.taxAmount ?? 0,
        withholdingTaxAmount: item.withholdingTaxAmount ?? 0,
        isEditing: false,
      };
    });
    const dataForLocal: DocumentData = {
      ...dataToSave,
      id: initialData.id,
      items: itemsForSave,
      summary: summary,
    };
    documentService.save(dataForLocal);

    if (documentType === "receipt") {
      console.log("[DEBUG] Receipt Details ที่จะส่งไป backend:");
      console.log("- payment_channels:", dataToSave.payment_channels);
      console.log("- paymentChannels state:", paymentChannels);
      console.log("- fees:", dataToSave.fees);
      console.log("- offset_docs:", dataToSave.offset_docs);
      console.log("- net_total_receipt:", dataToSave.net_total_receipt);
      console.log("[DEBUG] การคำนวณ:");
      console.log("- calculatedSummary.total:", calculatedSummary.total);
      console.log(
        "- calculatedSummary.withholdingTax:",
        calculatedSummary.withholdingTax
      );
      console.log("- netTotal (หัก ณ ที่จ่ายแล้ว):", netTotal);
      console.log("- totalPayment:", totalPayment);
      console.log("- ต้องรับชำระเงินอีก:", netTotal - totalPayment);
    }
    try {
      await onSave(dataToSave);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกเอกสาร");
    } finally {
      setIsSaving(false);
    }
  };

  console.log("form.items", form.items);
  console.log("summary:", summary);
  console.log("initialData.summary.total", initialData.summary?.total);

  // เพิ่ม state สำหรับข้อมูลเพิ่มเติม (เฉพาะใบเสร็จ)
  const [paymentChannels, setPaymentChannels] = useState([
    {
      enabled: true,
      method: "",
      amount: 0,
      note: "",
      bankAccountId: null as number | null,
    },
  ]);
  const [fees, setFees] = useState([
    { enabled: false, type: "", account: "", amount: 0, note: "" },
  ]);
  const [offsetDocs, setOffsetDocs] = useState([
    { enabled: false, docType: "", docNumber: "", amount: 0, note: "" },
  ]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // โหลดข้อมูลบัญชีธนาคาร
  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        const accounts = await bankAccountService.getBankAccounts();
        setBankAccounts(accounts);
      } catch (error) {
        console.error("Failed to load bank accounts:", error);
      }
    };
    loadBankAccounts();
  }, []);

  // ฟังก์ชันเพิ่ม/ลบ/แก้ไขแต่ละกลุ่ม
  const addPaymentChannel = () =>
    setPaymentChannels([
      ...paymentChannels,
      { enabled: true, method: "", amount: 0, note: "", bankAccountId: null },
    ]);
  const removePaymentChannel = (idx: number) =>
    setPaymentChannels(paymentChannels.filter((_, i) => i !== idx));
  const updatePaymentChannel = (idx: number, field: string, value: any) => {
    if (field === "amount") {
      const currentAmount = Number(value) || 0;
      const otherPayments = paymentChannels
        .filter((c, i) => i !== idx && c.enabled)
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const maxAllowed = Math.max(0, netTotal - otherPayments);

      // ถ้ายอดที่ป้อนเกินยอดที่ต้องชำระ ให้จำกัดไว้ที่ยอดสูงสุด
      if (currentAmount > maxAllowed) {
        value = maxAllowed;
      }
    }

    setPaymentChannels(
      paymentChannels.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const addFee = () =>
    setFees([
      ...fees,
      { enabled: false, type: "", account: "", amount: 0, note: "" },
    ]);
  const removeFee = (idx: number) => setFees(fees.filter((_, i) => i !== idx));
  const updateFee = (idx: number, field: string, value: any) =>
    setFees(fees.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  const addOffsetDoc = () =>
    setOffsetDocs([
      ...offsetDocs,
      { enabled: false, docType: "", docNumber: "", amount: 0, note: "" },
    ]);
  const removeOffsetDoc = (idx: number) =>
    setOffsetDocs(offsetDocs.filter((_, i) => i !== idx));
  const updateOffsetDoc = (idx: number, field: string, value: any) => {
    if (field === "amount") {
      const currentAmount = Number(value) || 0;
      const otherPayments = paymentChannels
        .filter((c) => c.enabled)
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const otherOffsets = offsetDocs
        .filter((d, i) => i !== idx && d.enabled)
        .reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const maxAllowed = Math.max(0, netTotal - otherPayments - otherOffsets);

      // ถ้ายอดที่ป้อนเกินยอดที่ต้องชำระ ให้จำกัดไว้ที่ยอดสูงสุด
      if (currentAmount > maxAllowed) {
        value = maxAllowed;
      }
    }

    setOffsetDocs(
      offsetDocs.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  // คำนวณยอดรวม
  const totalPayment = paymentChannels
    .filter((c) => c.enabled)
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalFee = fees
    .filter((f) => f.enabled)
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const totalOffset = offsetDocs
    .filter((d) => d.enabled)
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // คำนวณยอดสุทธิที่รับชำระ (หัก ณ ที่จ่ายแล้ว)
  const netTotal =
    typeof calculatedSummary.total === "number"
      ? calculatedSummary.total - calculatedSummary.withholdingTax
      : 0;

  // log debug form.priceType ทุกครั้งที่ render
  useEffect(() => {
    console.log("[DEBUG] form.priceType:", form.priceType);
  }, [form.priceType]);

  // 1. เปลี่ยนการ setState ของ priceType ให้ sync ทั้ง form.priceType และ trigger การคำนวณใหม่ทันที
  const handlePriceTypeChange = (val: PriceTypeEnum) => {
    setForm((prev) => ({
      ...prev,
      priceType: val,
    }));
  };

  // เพิ่ม useEffect สำหรับรีเซ็ต withholding_tax_option
  useEffect(() => {
    form.items.forEach((item) => {
      if (!canWithholding(item) && item.withholding_tax_option !== "ไม่ระบุ") {
        handleItemChange(item.id, "withholding_tax_option", "ไม่ระบุ");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.items]);

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
                {pageTitle ||
                  (editMode
                    ? documentType === "quotation"
                      ? "แก้ไขใบเสนอราคา"
                      : documentType === "invoice"
                        ? `แก้ไขใบแจ้งหนี้${form.issueTaxInvoice ? " / ใบกำกับภาษี" : ""}`
                        : "แก้ไขใบเสร็จ"
                    : documentType === "quotation"
                      ? "สร้างใบเสนอราคา"
                      : documentType === "invoice"
                        ? `สร้างใบแจ้งหนี้${form.issueTaxInvoice ? " / ใบกำกับภาษี" : ""}`
                        : "สร้างใบเสร็จ")}
              </h1>
              <p className="text-muted-foreground">
                {pageSubtitle ||
                  (editMode
                    ? documentType === "quotation"
                      ? "แก้ไขข้อมูลใบเสนอราคา"
                      : documentType === "invoice"
                        ? `แก้ไขข้อมูลใบแจ้งหนี้${form.issueTaxInvoice ? " / ใบกำกับภาษี" : ""}`
                        : "แก้ไขข้อมูลใบเสร็จ"
                    : documentType === "quotation"
                      ? "กรอกข้อมูลเพื่อสร้างใบเสนอราคาใหม่"
                      : documentType === "invoice"
                        ? `กรอกข้อมูลเพื่อสร้างใบแจ้งหนี้ใหม่${form.issueTaxInvoice ? " / ใบกำกับภาษี" : ""}`
                        : "กรอกข้อมูลเพื่อสร้างใบเสร็จใหม่")}
              </p>
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
                      {documentType === "receipt" && (
                        <>
                          <p className="mt-2 text-xs text-yellow-600">
                            เลขที่ใบเสร็จจะรันต่อจากเลขล่าสุดในระบบ
                            แม้จะมีการลบเอกสารเก่า เลขจะไม่ย้อนกลับ
                          </p>
                        </>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  {(() => {
                    console.log(
                      "[DEBUG] UI render - editMode:",
                      editMode,
                      "previewNumber:",
                      previewNumber,
                      "form.documentNumber:",
                      form.documentNumber
                    );
                    return editMode ? (
                      <Input
                        id="documentNumber"
                        value={previewNumber}
                        readOnly
                        className="font-mono bg-muted"
                        placeholder=""
                      />
                    ) : documentType === "receipt" &&
                      (!previewNumber ||
                        /RE-\d{4}-0001/.test(previewNumber)) ? (
                      <div className="text-muted-foreground italic py-2 px-3 bg-muted rounded border border-dashed border-gray-300">
                        เลขที่ใบเสร็จจะถูกกำหนดหลังบันทึก
                      </div>
                    ) : (
                      <Input
                        id="documentNumber"
                        value={previewNumber}
                        readOnly
                        className="font-mono bg-muted"
                        placeholder=""
                      />
                    );
                  })()}
                </div>
              </div>
            </Label>
          </div>

          <div className="space-y-2">
            <Label>วันที่</Label>
            <Input
              type="date"
              value={form.documentDate}
              onChange={(e) => {
                handleFormChange("documentDate", e.target.value);
              }}
            />
          </div>

          {documentType === "quotation" ? (
            <div className="space-y-2">
              <Label>ยืนราคาถึงวันที่</Label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={(e) => handleFormChange("validUntil", e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>วันที่ครบกำหนดชำระ</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => handleFormChange("dueDate", e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>อ้างอิง</Label>
            <Input
              value={form.reference}
              onChange={(e) => handleFormChange("reference", e.target.value)}
              placeholder="อ้างอิง (ไม่บังคับ)"
            />
          </div>
          {editMode && (
            <div className="space-y-2">
              <Label>สถานะเอกสาร</Label>
              <Select
                value={form.status || ""}
                onValueChange={(value) => handleFormChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะเอกสาร" />
                </SelectTrigger>
                <SelectContent>
                  {documentType === "quotation" ? (
                    <>
                      <SelectItem value="รอตอบรับ">รอตอบรับ</SelectItem>
                      <SelectItem value="ตอบรับแล้ว">ตอบรับแล้ว</SelectItem>
                      <SelectItem value="พ้นกำหนด">พ้นกำหนด</SelectItem>
                      <SelectItem value="ยกเลิก">ยกเลิก</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="รอชำระ">รอชำระ</SelectItem>
                      <SelectItem value="ชำระแล้ว">ชำระแล้ว</SelectItem>
                      <SelectItem value="พ้นกำหนด">พ้นกำหนด</SelectItem>
                      <SelectItem value="ยกเลิก">ยกเลิก</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
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
                  value={
                    form.customer
                      ? { ...form.customer, id: String(form.customer.id) }
                      : undefined
                  }
                  onCustomerSelect={handleCustomerSelect}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateCustomerOpen(true)}
              >
                สร้างใหม่
              </Button>
              <CreateCustomerDialog
                open={isCreateCustomerOpen}
                onOpenChange={setIsCreateCustomerOpen}
                onCustomerCreated={handleCustomerCreated}
              />
            </div>
            {form.customer && form.customer.id && (
              <div className="mt-4 space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="customer-address">ที่อยู่</Label>
                  <Textarea
                    id="customer-address"
                    value={form.customer.address || ""}
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
                      value={form.customer.tax_id || ""}
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
                      value={form.customer.phone || ""}
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
                    value={form.customer.email || ""}
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
                <Label htmlFor="priceType">รูปแบบราคา</Label>
                <Select
                  value={form.priceType || "EXCLUDE_VAT"}
                  onValueChange={handlePriceTypeChange}
                >
                  <SelectTrigger className="w-full border-yellow-400 focus:ring-yellow-400 bg-blue-100">
                    <SelectValue>
                      {form.priceType === "INCLUDE_VAT"
                        ? "รวมภาษี"
                        : form.priceType === "NO_VAT"
                          ? "ไม่มีภาษี"
                          : "ไม่รวมภาษี"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-blue-100">
                    <SelectItem value="EXCLUDE_VAT">ไม่รวมภาษี</SelectItem>
                    <SelectItem value="INCLUDE_VAT">รวมภาษี</SelectItem>
                    <SelectItem value="NO_VAT">ไม่มีภาษี</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* สวิตช์ออกใบกำกับภาษี */}
              {(documentType === "invoice" || documentType === "receipt") && (
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
                      checked={form.issueTaxInvoice}
                      onCheckedChange={(value) =>
                        handleFormChange("issueTaxInvoice", value)
                      }
                    />
                    <Label htmlFor="tax-invoice" className="text-blue-600">
                      ใบกำกับภาษี
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {form.items.map((item) => (
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
                            priceType: form.priceType,
                            discount: 0,
                            discountType: "thb",
                            tax: 7,
                            withholdingTax: -1,
                            description: "",
                            unit: "",
                            amountBeforeTax: 0,
                            amount: 0,
                            isEditing: true,
                            withholding_tax_option: "ไม่ระบุ",
                          };
                          handleItemChange(newId, "isNew", true);
                          handleItemChange(newId, "productTitle", "");
                          handleItemChange(newId, "quantity", 1);
                          handleItemChange(newId, "unitPrice", 0);
                          handleItemChange(newId, "priceType", form.priceType);
                          handleItemChange(newId, "discount", 0);
                          handleItemChange(newId, "discountType", "thb");
                          handleItemChange(newId, "tax", 7);
                          handleItemChange(newId, "withholdingTax", -1);
                          handleItemChange(newId, "description", "");
                          handleItemChange(newId, "unit", "");
                          handleItemChange(newId, "amountBeforeTax", 0);
                          handleItemChange(newId, "amount", 0);
                          handleItemChange(newId, "isEditing", true);
                          handleItemChange(newId, "isNew", true);
                          handleItemChange(
                            newId,
                            "withholding_tax_option",
                            "ไม่ระบุ"
                          );
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>จำนวน</Label>
                      <Input
                        type="number"
                        value={
                          typeof item.quantity === "number" ? item.quantity : 0
                        }
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "quantity",
                            Number(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ราคาต่อหน่วย</Label>
                      <Input
                        type="number"
                        value={item.unitPrice?.toFixed(2) ?? "0.00"}
                        readOnly
                        placeholder="0.00"
                        className="bg-yellow-100 font-bold text-yellow-700 text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ส่วนลดต่อหน่วย</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={
                            typeof item.discount === "number"
                              ? item.discount
                              : 0
                          }
                          min={0}
                          max={
                            item.discountType === "percentage"
                              ? 100
                              : getMaxDiscount(item)
                          }
                          onChange={(e) => {
                            let val = Number(e.target.value) || 0;
                            if (item.discountType === "percentage") {
                              if (val > 100) val = 100;
                              if (val < 0) val = 0;
                            } else {
                              if (val > getMaxDiscount(item))
                                val = getMaxDiscount(item);
                              if (val < 0) val = 0;
                            }
                            handleItemChange(item.id, "discount", val);
                          }}
                        />
                        {item.discountType === "thb" &&
                          item.discount > getMaxDiscount(item) && (
                            <div className="text-xs text-red-500">
                              ส่วนลดต้องไม่เกินราคารวมสินค้า
                            </div>
                          )}
                        {item.discountType === "percentage" &&
                          item.discount > 100 && (
                            <div className="text-xs text-red-500">
                              ส่วนลดต้องไม่เกิน 100%
                            </div>
                          )}
                        <Select
                          value={item.discountType}
                          onValueChange={(value) =>
                            handleItemChange(item.id, "discountType", value)
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
                        value={String(
                          form.priceType === "NO_VAT" ? 0 : item.tax
                        )}
                        onValueChange={(value) =>
                          handleItemChange(item.id, "tax", parseInt(value))
                        }
                        disabled={form.priceType === "NO_VAT"}
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
                        value={getNetUnitPrice(
                          item,
                          form.priceType
                        ).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        className="font-semibold bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>หัก ณ ที่จ่าย</Label>
                      <Select
                        value={
                          canWithholding(item)
                            ? item.withholding_tax_option || "ไม่ระบุ"
                            : "ไม่ระบุ"
                        }
                        onValueChange={(value) => {
                          if (!canWithholding(item)) return;
                          handleItemChange(
                            item.id,
                            "withholding_tax_option",
                            value as any
                          );
                        }}
                        disabled={!canWithholding(item)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือก" />
                        </SelectTrigger>
                        <SelectContent>
                          {WITHHOLDING_TAX_OPTIONS.map((option) => (
                            <SelectItem
                              key={option}
                              value={option}
                              disabled={
                                !canWithholding(item) && option !== "ไม่ระบุ"
                              }
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!canWithholding(item) &&
                        item.withholding_tax_option !== "ไม่ระบุ" && (
                          <div className="text-xs text-red-500">
                            ยอดหลังหักส่วนลดต้องมากกว่า 0 ถึงจะหัก ณ ที่จ่ายได้
                            ระบบจะรีเซ็ตเป็น 'ไม่ระบุ'
                          </div>
                        )}
                      {item.withholding_tax_option === "กำหนดเอง" &&
                        canWithholding(item) && (
                          <>
                            <Input
                              type="number"
                              placeholder="ระบุจำนวนเงิน"
                              min={0}
                              max={getMaxWithholding(item)}
                              value={item.customWithholdingTaxAmount ?? ""}
                              onChange={(e) => {
                                let val = Number(e.target.value) || 0;
                                if (val > getMaxWithholding(item))
                                  val = getMaxWithholding(item);
                                if (val < 0) val = 0;
                                handleItemChange(
                                  item.id,
                                  "customWithholdingTaxAmount",
                                  val
                                );
                              }}
                              className="mt-2"
                              disabled={!canWithholding(item)}
                            />
                            {item.customWithholdingTaxAmount >
                              getMaxWithholding(item) && (
                              <div className="text-xs text-red-500">
                                หัก ณ ที่จ่ายต้องไม่เกินยอดหลังหักส่วนลด
                              </div>
                            )}
                          </>
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

        {documentType === "receipt" && (
          <Card className="mb-6 border border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex flex-row items-center gap-6">
                <div className="font-bold text-lg text-green-900">
                  รับชำระเงินครั้งที่ 1
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="receiptMode"
                      value="basic"
                      checked={receiptMode === "basic"}
                      onChange={() => setReceiptMode("basic")}
                    />
                    <span
                      className={
                        receiptMode === "basic"
                          ? "text-green-700 font-semibold"
                          : "text-gray-500"
                      }
                    >
                      พื้นฐาน
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="receiptMode"
                      value="advanced"
                      checked={receiptMode === "advanced"}
                      onChange={() => setReceiptMode("advanced")}
                    />
                    <span
                      className={
                        receiptMode === "advanced"
                          ? "text-green-700 font-semibold"
                          : "text-gray-500"
                      }
                    >
                      ขั้นสูง
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <Label className="mr-2">วันที่ชำระ:</Label>
                <Input
                  type="date"
                  value={form.documentDate}
                  onChange={(e) =>
                    handleFormChange("documentDate", e.target.value)
                  }
                  className="border border-green-200 rounded px-2 py-1 bg-white"
                  style={{ minWidth: 140 }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ช่องทางการรับชำระเงิน */}
              {paymentChannels.map((channel, idx) => (
                <div key={idx}>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={channel?.enabled}
                      onChange={(e) =>
                        updatePaymentChannel(idx, "enabled", e.target.checked)
                      }
                    />
                    <span className="font-medium text-blue-900">
                      รับชำระเงินครั้งที่ {idx + 1}
                    </span>
                    {paymentChannels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePaymentChannel(idx)}
                        className="ml-auto text-red-500 hover:text-red-700 text-sm"
                      >
                        ลบ
                      </button>
                    )}
                  </label>
                  {channel?.enabled && (
                    <div className="grid grid-cols-12 gap-4 items-center bg-white p-4 rounded-lg border border-blue-100 mb-4">
                      <div className="col-span-2">
                        <Select
                          value={channel.method}
                          onValueChange={(v) =>
                            updatePaymentChannel(idx, "method", v)
                          }
                        >
                          <SelectTrigger className="bg-white border-blue-100">
                            <SelectValue placeholder="รับชำระโดย" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="เงินสด">💵 เงินสด</SelectItem>
                            <SelectItem value="โอนเงิน">🏦 โอนเงิน</SelectItem>
                            <SelectItem value="บัตรเครดิต">
                              💳 บัตรเครดิต
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={channel.bankAccountId?.toString() || "null"}
                          onValueChange={(v) =>
                            updatePaymentChannel(
                              idx,
                              "bankAccountId",
                              v && v !== "null" ? parseInt(v) : null
                            )
                          }
                        >
                          <SelectTrigger className="bg-white border-blue-100">
                            <SelectValue placeholder="เลือกบัญชีธนาคาร" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">ไม่ระบุ</SelectItem>
                            {bankAccounts.map((account) => (
                              <SelectItem
                                key={account.id}
                                value={account.id.toString()}
                              >
                                {account.bank_name} - {account.account_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          className="bg-white border-blue-100"
                          placeholder={`จำนวนเงินที่รับชำระ`}
                          value={channel.amount}
                          onChange={(e) =>
                            updatePaymentChannel(idx, "amount", e.target.value)
                          }
                          max={netTotal}
                        />
                      </div>
                      <div className="col-span-5">
                        <Input
                          type="text"
                          className="bg-white border-blue-100"
                          placeholder="หมายเหตุ"
                          maxLength={20}
                          value={channel.note}
                          onChange={(e) =>
                            updatePaymentChannel(idx, "note", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addPaymentChannel}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + เพิ่มช่องทางการรับชำระเงิน
              </button>
              {receiptMode === "advanced" && (
                <>
                  <hr className="my-4 border-green-200" />
                  {/* ค่าธรรมเนียม หรือรายการปรับปรุง */}
                  {fees.map((fee, idx) => (
                    <div key={idx}>
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={fee?.enabled}
                          onChange={(e) =>
                            updateFee(idx, "enabled", e.target.checked)
                          }
                        />
                        <span className="font-medium text-green-900">
                          ค่าธรรมเนียม หรือรายการปรับปรุง {idx + 1}
                        </span>
                        {fees.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFee(idx)}
                            className="ml-auto text-red-500 hover:text-red-700 text-sm"
                          >
                            ลบ
                          </button>
                        )}
                      </label>
                      {fee?.enabled && (
                        <div className="grid grid-cols-12 gap-4 items-center bg-white p-4 rounded-lg border border-green-100">
                          <div className="col-span-2">
                            <Select
                              value={fee.type}
                              onValueChange={(v) => updateFee(idx, "type", v)}
                            >
                              <SelectTrigger className="bg-white border-green-100">
                                <SelectValue placeholder="ประเภท" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fee">ปรับปรุง</SelectItem>
                                <SelectItem value="other">อื่นๆ</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Select
                              value={fee.account}
                              onValueChange={(v) =>
                                updateFee(idx, "account", v)
                              }
                            >
                              <SelectTrigger className="bg-white border-green-100">
                                <SelectValue placeholder="บัญชีที่เกี่ยวข้อง" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="530501">
                                  530501 - ค่าธรรมเนียมธนาคาร
                                </SelectItem>
                                <SelectItem value="530502">
                                  530502 - ค่าธรรมเนียมอื่นๆ
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              className="bg-white border-green-100"
                              placeholder="จำนวนเงินปรับปรุง"
                              value={fee.amount}
                              onChange={(e) =>
                                updateFee(idx, "amount", e.target.value)
                              }
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="text"
                              className="bg-white border-green-100"
                              placeholder="หมายเหตุ"
                              maxLength={20}
                              value={fee.note}
                              onChange={(e) =>
                                updateFee(idx, "note", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFee}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    + เพิ่มค่าธรรมเนียม
                  </button>
                  <hr className="my-4 border-green-200" />
                  {/* ตัดชำระกับเอกสาร */}
                  {offsetDocs.map((offset, idx) => (
                    <div key={idx}>
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={offset?.enabled}
                          onChange={(e) =>
                            updateOffsetDoc(idx, "enabled", e.target.checked)
                          }
                        />
                        <span className="font-medium text-purple-900">
                          ตัดชำระกับเอกสาร {idx + 1}
                        </span>
                        {offsetDocs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOffsetDoc(idx)}
                            className="ml-auto text-red-500 hover:text-red-700 text-sm"
                          >
                            ลบ
                          </button>
                        )}
                      </label>
                      {offset?.enabled && (
                        <div className="grid grid-cols-12 gap-4 items-center bg-white p-4 rounded-lg border border-purple-100">
                          <div className="col-span-3">
                            <Select
                              value={offset.docType}
                              onValueChange={(v) =>
                                updateOffsetDoc(idx, "docType", v)
                              }
                            >
                              <SelectTrigger className="bg-white border-purple-100">
                                <SelectValue placeholder="ประเภทเอกสาร" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="invoice">
                                  ใบแจ้งหนี้
                                </SelectItem>
                                <SelectItem value="credit">ใบลดหนี้</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Select
                              value={offset.docNumber}
                              onValueChange={(v) =>
                                updateOffsetDoc(idx, "docNumber", v)
                              }
                            >
                              <SelectTrigger className="bg-white border-purple-100">
                                <SelectValue placeholder="เลขที่เอกสาร" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INV-2025-0001">
                                  INV-2025-0001
                                </SelectItem>
                                <SelectItem value="CR-2025-0001">
                                  CR-2025-0001
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              className="bg-white border-purple-100"
                              placeholder={`จำนวนเงินที่รับชำระ (สูงสุด ${netTotal.toLocaleString("th-TH")} บาท)`}
                              value={offset.amount}
                              onChange={(e) =>
                                updateOffsetDoc(idx, "amount", e.target.value)
                              }
                              max={netTotal}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="text"
                              className="bg-white border-purple-100"
                              placeholder="หมายเหตุ"
                              maxLength={20}
                              value={offset.note}
                              onChange={(e) =>
                                updateOffsetDoc(idx, "note", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOffsetDoc}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    + เพิ่มการตัดชำระ
                  </button>
                </>
              )}
              {/* กล่องสรุปยอดล่างสุด */}
              <div className="flex flex-col items-end bg-white border border-green-200 rounded-xl p-4 text-green-900 shadow-sm mt-6">
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">ตัดชำระ :</span>
                    <span className="font-semibold">
                      {totalOffset.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      บาท
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      รับชำระด้วยช่องทางนี้รวม :
                    </span>
                    <span className="font-semibold">
                      {totalPayment.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      บาท
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-lg">
                      รับชำระรวมทั้งสิ้น
                    </span>
                    <span className="font-bold text-xl bg-green-100 px-3 py-1 rounded">
                      {typeof calculatedSummary.total === "number"
                        ? (
                            calculatedSummary.total -
                            calculatedSummary.withholdingTax
                          ).toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })
                        : "0"}{" "}
                      บาท
                    </span>
                  </div>
                </div>
                <div className="text-green-700 text-xs mt-2 text-center">
                  ต้องรับชำระเงินอีก{" "}
                  <span className="font-semibold">
                    {typeof calculatedSummary.total === "number"
                      ? (netTotal - totalPayment - totalOffset).toLocaleString(
                          "th-TH",
                          {
                            minimumFractionDigits: 2,
                          }
                        )
                      : "0"}
                  </span>{" "}
                  บาท
                </div>
                {totalPayment + totalOffset > netTotal && (
                  <div className="text-red-600 text-xs mt-1 text-center font-semibold">
                    ⚠️ ยอดรับชำระเกินยอดที่ต้องชำระ
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Accordion type="multiple" className="mb-6">
          <AccordionItem value="note-for-customer">
            <AccordionTrigger>หมายเหตุสำหรับลูกค้า</AccordionTrigger>
            <AccordionContent>
              <Label>หมายเหตุ</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="ระบุหมายเหตุ (ถ้ามี)"
                className="h-32"
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="attachments">
            <AccordionTrigger>แนบไฟล์ในเอกสารนี้</AccordionTrigger>
            <AccordionContent>
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
                              const updatedItems = form.items.map((item) => {
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
                                        ? Number(
                                            newProductData.selling_vat_rate
                                          )
                                        : undefined,
                                    isNew: false,
                                  };
                                  const calculated = updateItemWithCalculations(
                                    {
                                      ...newItem,
                                      priceType: mapPriceTypeToBaseItem(
                                        newItem.priceType
                                      ),
                                    }
                                  );
                                  return {
                                    ...calculated,
                                    priceType: mapPriceTypeToDocumentItem(
                                      calculated.priceType
                                    ) as
                                      | "EXCLUDE_VAT"
                                      | "INCLUDE_VAT"
                                      | "NO_VAT",
                                  };
                                }
                                return item;
                              });
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "isNew",
                                false
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "productId",
                                newProductData.id
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "productTitle",
                                newProductData.name
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "unitPrice",
                                newProductData.selling_price
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "unit",
                                newProductData.unit
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "description",
                                newProductData.description
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "tax",
                                newProductData.selling_vat_rate !== null
                                  ? Number(newProductData.selling_vat_rate)
                                  : undefined
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "isNew",
                                false
                              );
                            }}
                            onCancel={() => {
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "isNew",
                                true
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "productId",
                                ""
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "productTitle",
                                ""
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "unitPrice",
                                0
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "unit",
                                ""
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "description",
                                ""
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "tax",
                                7
                              );
                              handleItemChange(
                                form.items[form.items.length - 1].id,
                                "isNew",
                                true
                              );
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
              <span>มูลค่าก่อนภาษี</span>
              <span>
                {typeof calculatedSummary.subtotal === "number"
                  ? calculatedSummary.subtotal.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })
                  : "0"}{" "}
                บาท
              </span>
            </div>
            <div className="flex justify-between text-destructive">
              <span>ส่วนลดรวม</span>
              <span>
                -
                {typeof calculatedSummary.discount === "number"
                  ? calculatedSummary.discount.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })
                  : "0"}{" "}
                บาท
              </span>
            </div>
            <div className="flex justify-between">
              <span>มูลค่าหลังหักส่วนลด</span>
              <span>
                {typeof (calculatedSummary as any).netAfterDiscount === "number"
                  ? (calculatedSummary as any).netAfterDiscount.toLocaleString(
                      "th-TH",
                      { minimumFractionDigits: 2 }
                    )
                  : typeof calculatedSummary.subtotal === "number" &&
                      typeof calculatedSummary.discount === "number"
                    ? (
                        calculatedSummary.subtotal - calculatedSummary.discount
                      ).toLocaleString("th-TH", { minimumFractionDigits: 2 })
                    : "0"}{" "}
                บาท
              </span>
            </div>
            <div className="flex justify-between">
              <span>ภาษีมูลค่าเพิ่ม 7%</span>
              <span>
                {typeof calculatedSummary.tax === "number"
                  ? calculatedSummary.tax.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })
                  : "0"}{" "}
                บาท
              </span>
            </div>
            <div className="flex justify-between">
              <span>รวมเป็นเงิน</span>
              <span>
                {typeof calculatedSummary.total === "number"
                  ? calculatedSummary.total.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })
                  : "0"}{" "}
                บาท
              </span>
            </div>
            <div className="flex justify-between">
              <span>หัก ณ ที่จ่าย</span>
              <span>
                -
                {(() => {
                  // รวมยอดหลังหักส่วนลดของทุก item
                  const canWithhold = form.items.some((item) =>
                    canWithholding(item)
                  );
                  if (!canWithhold) return "0.00";
                  const val =
                    typeof calculatedSummary.withholdingTax === "number" &&
                    calculatedSummary.withholdingTax > 0
                      ? calculatedSummary.withholdingTax
                      : 0;
                  return val.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  });
                })()}{" "}
                บาท
              </span>
            </div>
            <div className="border-t-2 border-primary pt-3 mt-3 flex justify-between font-bold text-lg">
              <span>จำนวนเงินทั้งสิ้น</span>
              <span>
                {(() => {
                  // ถ้ายอดหลังหักส่วนลด <= 0 ให้แสดง 0
                  const total =
                    typeof calculatedSummary.total === "number"
                      ? calculatedSummary.total
                      : 0;
                  const withholdingTax =
                    typeof calculatedSummary.withholdingTax === "number" &&
                    calculatedSummary.withholdingTax > 0
                      ? calculatedSummary.withholdingTax
                      : 0;
                  const net = total - withholdingTax;
                  return (net > 0 ? net : 0).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  });
                })()}{" "}
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
