import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  useNavigate,
} from "react-router-dom";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";
import EditDocumentPage from "./pages/documents/EditDocument";

// Document pages
import Quotation from "./pages/documents/Quotation";
import Receipt from "./pages/documents/Receipt";
import TaxInvoice from "./pages/documents/TaxInvoice";
import Invoice from "./pages/documents/Invoice";
import CreditNote from "./pages/documents/CreditNote";
import PurchaseOrder from "./pages/documents/PurchaseOrder";
import Billing from "./pages/documents/Billing";

// Form components
import { DocumentForm } from "./pages/sub/create/DocumentForm";
import QuotationForm from "./pages/sub/quotation/QuotationForm";
import ReceiptForm from "./pages/sub/receipt/ReceiptForm";

// Finance pages
import BankAccounts from "./pages/finance/BankAccounts";
import Cashflow from "./pages/finance/Cashflow";

// Settings pages
import ChartOfAccounts from "./pages/settings/ChartOfAccounts";
import DocumentNumbering from "./pages/settings/DocumentNumbering";
import CompanyInfo from "./pages/settings/CompanyInfo";
import { ProductForm } from "./pages/sub/create/ProductForm";
import InvoiceForm from "./pages/sub/invoice/InvoiceForm";
import { documentService } from "./pages/services/documentService";
import { DocumentData } from "./types/document";
import { apiService } from "./pages/services/apiService";
import { generateDocumentNumber } from "./utils/documentUtils";

const queryClient = new QueryClient();

const App = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const docs = documentService.getAll();
    setDocuments(docs);
    setIsLoading(false);
  }, []);

  const handleSaveInvoice = async (data: DocumentData) => {
    try {
      // The invoice is already saved by InvoiceForm's service.
      // This function handles post-save actions like creating receipts and updating app state.
      const savedInvoice = data;

      // Sync with localStorage to be safe and update the main app state
      documentService.save(savedInvoice);

      // If the invoice is marked as paid, create a receipt
      if (savedInvoice.status === "ชำระแล้ว") {
        // Generate a new receipt number
        const receiptNumber = await apiService
          .getDocumentNumbers("receipt")
          .then((numbers) => generateDocumentNumber("receipt", numbers));

        const receiptData: DocumentData = {
          ...savedInvoice,
          id: `receipt_${Date.now()}`,
          documentType: "receipt",
          documentNumber: receiptNumber,
          status: "ร่าง",
          reference: savedInvoice.documentNumber,
        };

        // Convert DocumentData to DocumentPayload for API
        const receiptPayload = {
          ...receiptData,
          items: receiptData.items.map((item) => ({
            product_id: item.productId || null,
            product_name: item.productTitle || item.description || "-", // fallback
            unit: item.unit || "",
            quantity: item.quantity || 1,
            unit_price: item.unitPrice || item.amount || 0, // fallback
            amount: item.amount || 0,
            description: item.description || "",
            withholding_tax_amount: item.withholdingTaxAmount || 0,
            amount_before_tax: item.amountBeforeTax || 0,
            discount: item.discount || 0,
            discount_type: item.discountType || "thb",
            tax: item.tax || 0,
            tax_amount: item.taxAmount || 0,
            withholding_tax_option: item.withholding_tax_option || "ไม่ระบุ",
          })),
        };

        // Save receipt to database and localStorage
        const savedReceipt = await apiService.createDocument(receiptPayload);
        documentService.save(savedReceipt);

        toast({
          title: "สร้างใบเสร็จรับเงินเรียบร้อยแล้ว",
          description: `ใบเสร็จเลขที่ ${savedReceipt.documentNumber} ถูกสร้างขึ้นจากใบแจ้งหนี้ ${savedInvoice.documentNumber}`,
        });
      }

      // Update the local documents state
      const updatedDocs = documentService.getAll();
      setDocuments(updatedDocs);

      return savedInvoice;
    } catch (error) {
      console.error("Error in post-save hook:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดหลังการบันทึกใบแจ้งหนี้",
        variant: "destructive",
      });
      throw error; // Re-throw to allow the form to handle the error
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />

              {/* Document routes */}
              <Route path="/documents/quotation" element={<Quotation />} />
              <Route
                path="/documents/quotation/new"
                element={
                  <QuotationForm onCancel={() => window.history.back()} />
                }
              />

              <Route path="/documents/invoice" element={<Invoice />} />
              <Route path="/documents/invoice/new" element={<InvoiceForm />} />
              <Route
                path="/documents/invoice/edit/:id"
                element={<EditDocumentPage />}
              />

              <Route path="/documents/tax-invoice" element={<TaxInvoice />} />
              <Route path="/documents/receipt" element={<Receipt />} />
              <Route
                path="/documents/receipt/new"
                element={<ReceiptForm editMode={false} />}
              />
              <Route
                path="/documents/receipt/edit/:id"
                element={<ReceiptForm editMode={true} />}
              />

              <Route path="/documents/credit-note" element={<CreditNote />} />
              <Route
                path="/documents/purchase-order"
                element={<PurchaseOrder />}
              />
              <Route path="/documents/billing" element={<Billing />} />

              {/* Finance routes */}
              <Route path="/finance/bank-accounts" element={<BankAccounts />} />
              <Route path="/finance/cashflow" element={<Cashflow />} />

              {/* Settings routes */}
              <Route
                path="/settings/chart-of-accounts"
                element={<ChartOfAccounts />}
              />
              <Route
                path="/settings/document-numbering"
                element={<DocumentNumbering />}
              />
              <Route path="/settings/company-info" element={<CompanyInfo />} />

              {/* Product Management */}
              <Route
                path="/products/new"
                element={
                  <ProductForm onSuccess={() => window.history.back()} />
                }
              />

              {/* แก้ไขใบเสนอราคา */}
              <Route
                path="/documents/quotation/edit/:id"
                element={<EditDocumentPage />}
              />

              {/* แก้ไขใบเสร็จ */}
              <Route
                path="/documents/receipt/edit/:id"
                element={<ReceiptForm editMode={true} />}
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
