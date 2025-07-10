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
import { getCustomerById } from "@/pages/services/customerService";
import { getProductById } from "@/pages/services/productService";
import { documentService } from "@/pages/services/documentService";
import { Skeleton } from "@/components/ui/skeleton";
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
  documentType: "quotation" | "invoice" | "receipt";
  isLoading: boolean;
  editMode?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
}

// เพิ่ม related_document_id ใน type DocumentData (workaround)
type DocumentDataWithRelated = DocumentData & { related_document_id?: number };

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

  // Move createDefaultItem above form state
  const [priceType, setPriceType] = useState<
    "inclusive" | "exclusive" | "none"
  >(initialData.priceType || "exclusive");

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

  function createDefaultItem(): DocumentItem {
    return {
      id: `item-${Date.now()}`,
      productTitle: "",
      description: "",
      unit: "",
      quantity: 1,
      unitPrice: 0,
      priceType: priceType,
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
      return {
        ...item,
        discountType: item.discountType ?? "thb",
        withholding_tax_option: item.withholding_tax_option ?? "ไม่ระบุ",
        withholdingTax,
        withholdingTaxAmount: item.withholdingTaxAmount ?? 0,
        customWithholdingTaxAmount: item.customWithholdingTaxAmount ?? 0,
      } as DocumentItem;
    });

    console.log("[DocumentForm] สร้าง state ฟอร์ม:", {
      itemsCount: items.length,
      documentNumber: initialData.documentNumber,
    });

    return {
      ...initialData,
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
        netTotalAmount: 0,
      };
    }

    return calculateDocumentSummary(form.items);
  }, [form.items]);

  // Update summary when calculatedSummary changes
  useEffect(() => {
    setSummary(calculatedSummary);
  }, [calculatedSummary]);

  // handle เปลี่ยนค่าในฟอร์ม
  const handleFormChange = useCallback(
    (field: string, value: any) => {
      console.log("[DocumentForm] เปลี่ยนค่า:", field, value);
      setForm(
        (prev) =>
          ({
            ...prev,
            [field]: value,
            summary: prev.summary ?? summary,
          }) as typeof form
      );
    },
    [summary]
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
          return updateItemWithCalculations(updatedItemState);
        }
        return item;
      }),
    }));
  };

  // handle เพิ่ม/ลบ item
  const addNewItem = () => {
    const newItem = createDefaultItem();
    const calculatedItem = updateItemWithCalculations(newItem);
    setForm(
      (prev) =>
        ({
          ...prev,
          items: [...prev.items, calculatedItem],
        }) as typeof form
    );
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
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item) => {
          if (item.id === itemId) {
            // normalize discountType ให้ถูกต้อง
            let normalizedDiscountType: "thb" | "percentage" = "thb";
            if (item.discountType === "percentage") {
              normalizedDiscountType = "percentage";
            }
            // เตรียมข้อมูล item
            const mergedItem = {
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
                  : (item.unitPrice ?? 0),
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
              mergedItem.withholdingTax =
                Number(mergedItem.withholdingTax) || 0;
            }
            // คำนวณใหม่
            return updateItemWithCalculations(mergedItem) as DocumentItem;
          }
          return item;
        }),
      }));
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
    const newSummary = calculateDocumentSummary(form.items);
    newSummary.netTotalAmount = newSummary.total - newSummary.withholdingTax;
    setSummary(newSummary);
  }, [form.items]);

  // Set initial document number when component mounts or document type changes
  useEffect(() => {
    if (!initialData.id && !form.documentNumber) {
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
        handleFormChange("documentNumber", newNumber);
      } catch (error) {
        // Fallback to simple number if error
        const prefix =
          documentType === "quotation"
            ? "QT"
            : documentType === "invoice"
              ? "IV"
              : documentType === "receipt"
                ? "RC"
                : "TAX";
        handleFormChange(
          "documentNumber",
          `${prefix}-${new Date().getFullYear()}-0001`
        );
      }
    }
  }, [documentType, initialData.id, form.documentNumber]);

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
  }, [documentType, initialData.id, form.documentNumber]);

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
          // คำนวณใหม่
          return updateItemWithCalculations(mergedItem) as DocumentItem;
        });
        setForm((prev) => ({
          ...prev,
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
        }));
        // คำนวณ summary ใหม่ทันทีหลัง normalize items
        const newSummary2 = calculateDocumentSummary(items);
        newSummary2.netTotalAmount =
          newSummary2.total - newSummary2.withholdingTax;
        setSummary(newSummary2);
      }
    }
    fillEditData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, initialData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return; // Prevent double submission

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
      tax: item.tax ?? 0,
      tax_amount: item.taxAmount ?? 0,
      withholding_tax_option: item.withholding_tax_option || "ไม่ระบุ",
    }));

    // log เฉพาะ discount_type ของแต่ละ item ก่อนส่ง backend
    console.log(
      "itemsToSave (check discount_type):",
      itemsToSave.map((i) => ({
        discount_type: i.discount_type,
        discount: i.discount,
        product_name: i.product_name,
      }))
    );

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
      summary: summary,
      notes: form.notes,
      priceType: form.priceType,
      status: form.status,
      attachments: attachments,
    };

    // แปลง DocumentPayload เป็น DocumentData สำหรับบันทึก localStorage
    const itemsForSave: DocumentItem[] = form.items.map((item, idx) => ({
      ...item,
      id: item.id ?? `item-${idx}-${Date.now()}`,
      productTitle: item.productTitle ?? "",
      unitPrice: item.unitPrice ?? 0,
      priceType: item.priceType ?? form.priceType ?? "exclusive",
      discountType: item.discountType ?? "thb",
      withholding_tax_option: item.withholding_tax_option ?? "ไม่ระบุ",
      withholdingTax: item.withholdingTax ?? 0,
      customWithholdingTaxAmount: item.customWithholdingTaxAmount ?? 0,
      amount: item.amount ?? 0,
      amountBeforeTax: item.amountBeforeTax ?? 0,
      taxAmount: item.taxAmount ?? 0,
      withholdingTaxAmount: item.withholdingTaxAmount ?? 0,
      isEditing: false,
    }));
    const dataForLocal: DocumentData = {
      ...dataToSave,
      id: initialData.id,
      items: itemsForSave,
      summary: summary,
    };
    documentService.save(dataForLocal);

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
    { enabled: true, method: "", amount: 0, note: "" },
  ]);
  const [fees, setFees] = useState([
    { enabled: true, type: "", account: "", amount: 0, note: "" },
  ]);
  const [offsetDocs, setOffsetDocs] = useState([
    { enabled: true, docType: "", docNumber: "", amount: 0, note: "" },
  ]);

  // ฟังก์ชันเพิ่ม/ลบ/แก้ไขแต่ละกลุ่ม
  const addPaymentChannel = () =>
    setPaymentChannels([
      ...paymentChannels,
      { enabled: true, method: "", amount: 0, note: "" },
    ]);
  const removePaymentChannel = (idx: number) =>
    setPaymentChannels(paymentChannels.filter((_, i) => i !== idx));
  const updatePaymentChannel = (idx: number, field: string, value: any) =>
    setPaymentChannels(
      paymentChannels.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );

  const addFee = () =>
    setFees([
      ...fees,
      { enabled: true, type: "", account: "", amount: 0, note: "" },
    ]);
  const removeFee = (idx: number) => setFees(fees.filter((_, i) => i !== idx));
  const updateFee = (idx: number, field: string, value: any) =>
    setFees(fees.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  const addOffsetDoc = () =>
    setOffsetDocs([
      ...offsetDocs,
      { enabled: true, docType: "", docNumber: "", amount: 0, note: "" },
    ]);
  const removeOffsetDoc = (idx: number) =>
    setOffsetDocs(offsetDocs.filter((_, i) => i !== idx));
  const updateOffsetDoc = (idx: number, field: string, value: any) =>
    setOffsetDocs(
      offsetDocs.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );

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
  const netTotal = totalPayment - totalFee - totalOffset;

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
                  {editMode ? (
                    <Input
                      id="documentNumber"
                      value={form.documentNumber}
                      readOnly
                      className="font-mono bg-muted"
                      placeholder=""
                    />
                  ) : documentType === "receipt" &&
                    (!form.documentNumber ||
                      /RE-\d{4}-0001/.test(form.documentNumber)) ? (
                    <div className="text-muted-foreground italic py-2 px-3 bg-muted rounded border border-dashed border-gray-300">
                      เลขที่ใบเสร็จจะถูกกำหนดหลังบันทึก
                    </div>
                  ) : (
                    <Input
                      id="documentNumber"
                      value={form.documentNumber}
                      readOnly
                      className="font-mono bg-muted"
                      placeholder=""
                    />
                  )}
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
                <Label>รูปแบบราคา</Label>
                <Select
                  value={form.items[0]?.priceType || "exclusive"}
                  onValueChange={(value) =>
                    handleItemChange(
                      form.items[0]?.id || "",
                      "priceType",
                      value
                    )
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
                        value={
                          typeof item.unitPrice === "number"
                            ? item.unitPrice
                            : 0
                        }
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
                          value={
                            typeof item.discount === "number"
                              ? item.discount
                              : 0
                          }
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "discount",
                              Number(e.target.value) || 0
                            )
                          }
                        />
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
                        value={String(item.tax)}
                        onValueChange={(value) =>
                          handleItemChange(item.id, "tax", parseInt(value))
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
                        value={
                          typeof item.amountBeforeTax === "number" &&
                          !isNaN(item.amountBeforeTax)
                            ? item.amountBeforeTax.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                              })
                            : "0.00"
                        }
                        className="font-semibold bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>หัก ณ ที่จ่าย</Label>
                      <Select
                        value={item.withholding_tax_option || "ไม่ระบุ"}
                        onValueChange={(value) =>
                          handleItemChange(
                            item.id,
                            "withholding_tax_option",
                            value as any
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือก" />
                        </SelectTrigger>
                        <SelectContent>
                          {WITHHOLDING_TAX_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.withholding_tax_option === "กำหนดเอง" && (
                        <Input
                          type="number"
                          placeholder="ระบุจำนวนเงิน"
                          value={item.customWithholdingTaxAmount ?? ""}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "customWithholdingTaxAmount",
                              Number(e.target.value) || 0
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

        {documentType === "receipt" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>รับชำระเงิน</CardTitle>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="receiptMode"
                    value="basic"
                    checked={receiptMode === "basic"}
                    onChange={() => setReceiptMode("basic")}
                  />
                  พื้นฐาน
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="receiptMode"
                    value="advanced"
                    checked={receiptMode === "advanced"}
                    onChange={() => setReceiptMode("advanced")}
                  />
                  ขั้นสูง
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ช่องทางการรับชำระเงิน */}
              <div className="border rounded-lg p-4 mb-2 bg-blue-50">
                <div className="font-semibold mb-2">ช่องทางการรับชำระเงิน</div>
                {paymentChannels.map((c, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={c.enabled}
                        onChange={(e) =>
                          updatePaymentChannel(idx, "enabled", e.target.checked)
                        }
                      />
                      <span className="font-medium">
                        ช่องทางการรับชำระเงิน {idx + 1}
                      </span>
                    </div>
                    {c.enabled && (
                      <div className="grid grid-cols-12 gap-2 items-center bg-white/80 p-2 rounded-md border">
                        <div className="col-span-3">
                          <Select
                            value={c.method}
                            onValueChange={(v) =>
                              updatePaymentChannel(idx, "method", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="รับชำระโดย" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">เงินสด</SelectItem>
                              <SelectItem value="transfer">โอนเงิน</SelectItem>
                              <SelectItem value="credit">บัตรเครดิต</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            className="input w-full"
                            placeholder="จำนวนเงินที่รับชำระ"
                            value={c.amount}
                            onChange={(e) =>
                              updatePaymentChannel(
                                idx,
                                "amount",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="col-span-5">
                          <Input
                            type="text"
                            className="input w-full"
                            placeholder="หมายเหตุ"
                            maxLength={20}
                            value={c.note}
                            onChange={(e) =>
                              updatePaymentChannel(idx, "note", e.target.value)
                            }
                          />
                        </div>
                        <div className="col-span-1 flex items-center">
                          {paymentChannels.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removePaymentChannel(idx)}
                            >
                              -
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {paymentChannels.some((c) => c.enabled) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPaymentChannel}
                    className="mt-2"
                  >
                    + เพิ่มช่องทางการรับชำระเงิน
                  </Button>
                )}
              </div>
              {/* เฉพาะขั้นสูง */}
              {receiptMode === "advanced" && (
                <>
                  {/* ค่าธรรมเนียม/ปรับปรุง */}
                  <div className="border rounded-lg p-4 mb-2 bg-blue-50">
                    <div className="font-semibold mb-2">
                      ค่าธรรมเนียม หรือรายการปรับปรุง
                    </div>
                    {fees.map((f, idx) => (
                      <div key={idx} className="mb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={f.enabled}
                            onChange={(e) =>
                              updateFee(idx, "enabled", e.target.checked)
                            }
                          />
                          <span className="font-medium">
                            ค่าธรรมเนียม/ปรับปรุง {idx + 1}
                          </span>
                        </div>
                        {f.enabled && (
                          <div className="grid grid-cols-12 gap-2 items-center bg-white/80 p-2 rounded-md border">
                            <div className="col-span-2">
                              <Select
                                value={f.type}
                                onValueChange={(v) => updateFee(idx, "type", v)}
                              >
                                <SelectTrigger className="w-full">
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
                                value={f.account}
                                onValueChange={(v) =>
                                  updateFee(idx, "account", v)
                                }
                              >
                                <SelectTrigger className="w-full">
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
                                className="w-full"
                                placeholder="จำนวนเงินปรับปรุง"
                                value={f.amount}
                                onChange={(e) =>
                                  updateFee(idx, "amount", e.target.value)
                                }
                              />
                            </div>
                            <div className="col-span-3">
                              <Input
                                type="text"
                                className="w-full"
                                placeholder="หมายเหตุ"
                                maxLength={20}
                                value={f.note}
                                onChange={(e) =>
                                  updateFee(idx, "note", e.target.value)
                                }
                              />
                            </div>
                            <div className="col-span-1 flex items-center">
                              {fees.length > 1 && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeFee(idx)}
                                >
                                  -
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {fees.some((f) => f.enabled) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFee}
                        className="mt-2"
                      >
                        + เพิ่มค่าธรรมเนียม หรือรายการปรับปรุง
                      </Button>
                    )}
                  </div>
                  {/* ตัดชำระกับเอกสาร */}
                  <div className="border rounded-lg p-4 mb-2 bg-blue-50">
                    <div className="font-semibold mb-2">ตัดชำระกับเอกสาร</div>
                    {offsetDocs.map((d, idx) => (
                      <div key={idx} className="mb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={d.enabled}
                            onChange={(e) =>
                              updateOffsetDoc(idx, "enabled", e.target.checked)
                            }
                          />
                          <span className="font-medium">
                            ตัดชำระกับเอกสาร {idx + 1}
                          </span>
                        </div>
                        {d.enabled && (
                          <div className="grid grid-cols-12 gap-2 items-center bg-white/80 p-2 rounded-md border">
                            <div className="col-span-3">
                              <Select
                                value={d.docType}
                                onValueChange={(v) =>
                                  updateOffsetDoc(idx, "docType", v)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="ประเภทเอกสาร" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="invoice">
                                    ใบแจ้งหนี้
                                  </SelectItem>
                                  <SelectItem value="credit">
                                    ใบลดหนี้
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-3">
                              <Select
                                value={d.docNumber}
                                onValueChange={(v) =>
                                  updateOffsetDoc(idx, "docNumber", v)
                                }
                              >
                                <SelectTrigger className="w-full">
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
                                className="w-full"
                                placeholder="จำนวนเงินที่รับชำระ"
                                value={d.amount}
                                onChange={(e) =>
                                  updateOffsetDoc(idx, "amount", e.target.value)
                                }
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="text"
                                className="w-full"
                                placeholder="หมายเหตุ"
                                maxLength={20}
                                value={d.note}
                                onChange={(e) =>
                                  updateOffsetDoc(idx, "note", e.target.value)
                                }
                              />
                            </div>
                            <div className="col-span-1 flex items-center">
                              {offsetDocs.length > 1 && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeOffsetDoc(idx)}
                                >
                                  -
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {offsetDocs.some((d) => d.enabled) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOffsetDoc}
                        className="mt-2"
                      >
                        + ตัดชำระกับเอกสาร
                      </Button>
                    )}
                  </div>
                </>
              )}
              {/* สรุปยอด */}
              <div className="flex flex-col items-end bg-blue-50 rounded-lg p-4">
                <div className="flex flex-col gap-1 w-full max-w-xs">
                  <div className="flex justify-between">
                    <span>ปรับปรุงรวม :</span>
                    <span>
                      {totalFee.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      บาท
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ตัดชำระ :</span>
                    <span>
                      {totalOffset.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      บาท
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>รับชำระรวมทั้งสิ้น</span>
                    <span>
                      {(summary.netTotalAmount ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      บาท
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ต้องรับชำระเงินอีก{" "}
                  {(summary.netTotalAmount ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}{" "}
                  บาท
                </div>
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
                                  return updateItemWithCalculations(newItem);
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
                {typeof summary.subtotal === "number"
                  ? summary.subtotal.toLocaleString("th-TH", {
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
                {typeof summary.discount === "number"
                  ? summary.discount.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })
                  : "0"}{" "}
                บาท
              </span>
            </div>
            <div className="flex justify-between">
              <span>มูลค่าหลังหักส่วนลด</span>
              <span>
                {typeof (summary.subtotal - summary.discount) === "number"
                  ? (summary.subtotal - summary.discount).toLocaleString(
                      "th-TH",
                      { minimumFractionDigits: 2 }
                    )
                  : "0"}{" "}
                บาท
              </span>
            </div>
            <div className="flex justify-between">
              <span>ภาษีมูลค่าเพิ่ม 7%</span>
              <span>
                {typeof summary.tax === "number"
                  ? summary.tax.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })
                  : "0"}{" "}
                บาท
              </span>
            </div>
            <div className="flex justify-between">
              <span>รวมเป็นเงิน</span>
              <span>
                {typeof summary.total === "number"
                  ? summary.total.toLocaleString("th-TH", {
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
                {typeof summary.withholdingTax === "number"
                  ? summary.withholdingTax.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })
                  : "0"}{" "}
                บาท
              </span>
            </div>
            <div className="border-t-2 border-primary pt-3 mt-3 flex justify-between font-bold text-lg">
              <span>จำนวนเงินทั้งสิ้น</span>
              <span>
                {typeof (summary.total - summary.withholdingTax) === "number"
                  ? (summary.total - summary.withholdingTax).toLocaleString(
                      "th-TH",
                      { minimumFractionDigits: 2 }
                    )
                  : "0"}{" "}
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
