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

// Form components
import { DocumentForm } from "./pages/sub/create/DocumentForm";
import QuotationForm from "./pages/sub/quotation/QuotationForm";

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
          status: "ต้นฉบับ",
          reference: savedInvoice.documentNumber,
        };

        // Save receipt to database and localStorage
        const savedReceipt = await apiService.createDocument(receiptData);
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

  const InvoiceFormWrapper = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const [initialData, setInitialData] = useState<DocumentData | undefined>(
      undefined
    );
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (id) {
        console.log("InvoiceFormWrapper: กำลังหา invoice id:", id);
        const localDoc = documents.find((d) => String(d.id) === String(id));
        if (localDoc) {
          console.log("InvoiceFormWrapper: เจอใน documents:", localDoc);
          setInitialData(localDoc);
          setLoading(false);
        } else {
          apiService
            .getDocumentById(id)
            .then((doc) => {
              console.log(
                "InvoiceFormWrapper: apiService.getDocumentById ได้:",
                doc
              );
              setInitialData(doc);
            })
            .catch((e) => {
              console.error(
                "InvoiceFormWrapper: apiService.getDocumentById error:",
                e
              );
              setInitialData(undefined);
            })
            .finally(() => setLoading(false));
        }
      } else {
        setInitialData(undefined);
        setLoading(false);
      }
    }, [id, documents]);

    const newInvoiceData: DocumentData = {
      id: `inv_${Date.now()}`,
      documentNumber: "",
      customer: { name: "", tax_id: "", phone: "", address: "" },
      items: [],
      summary: {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        withholdingTax: 0,
      },
      status: "รอชำระ",
      documentDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      reference: "",
      notes: "",
      priceType: "exclusive",
      documentType: "invoice",
    };

    if (loading) return <div>Loading...</div>;

    if (!id) {
      // ไม่มี id = สร้างใหม่
      console.log(
        "InvoiceFormWrapper: initialData สำหรับสร้างใหม่:",
        newInvoiceData
      );
      return (
        <InvoiceForm
          onSave={async (data) => {
            await handleSaveInvoice(data);
            navigate("/documents/invoice");
          }}
          initialData={newInvoiceData}
          isLoading={isLoading}
        />
      );
    }

    console.log(
      "InvoiceFormWrapper: initialData ที่จะส่งเข้า InvoiceForm:",
      initialData
    );
    return (
      <InvoiceForm
        onSave={async (data) => {
          await handleSaveInvoice(data);
          navigate("/documents/invoice");
        }}
        initialData={initialData}
        isLoading={isLoading}
      />
    );
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
              <Route path="/invoice/new" element={<InvoiceFormWrapper />} />
              <Route
                path="/invoice/edit/:id"
                element={<InvoiceFormWrapper />}
              />

              <Route path="/documents/tax-invoice" element={<TaxInvoice />} />
              <Route path="/documents/receipt" element={<Receipt />} />

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
                path="/quotations/edit/:id"
                element={<EditDocumentPage />}
              />
              <Route
                path="/documents/quotation/edit/:id"
                element={<EditDocumentPage />}
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
