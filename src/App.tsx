import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Document pages
import Quotation from "./pages/documents/Quotation";
import QuotationForm from "./pages/sub/quotation/QuotationForm";
import Invoice from "./pages/documents/Invoice";
import Receipt from "./pages/documents/Receipt";
import TaxInvoice from "./pages/documents/TaxInvoice";
import CreditNote from "./pages/documents/CreditNote";
import PurchaseOrder from "./pages/documents/PurchaseOrder";
import Billing from "./pages/documents/Billing";

// Finance pages
import BankAccounts from "./pages/finance/BankAccounts";
import Cashflow from "./pages/finance/Cashflow";

// Settings pages
import ChartOfAccounts from "./pages/settings/ChartOfAccounts";
import DocumentNumbering from "./pages/settings/DocumentNumbering";
import CompanyInfo from "./pages/settings/CompanyInfo";
import { ProductForm } from "./pages/sub/create/ProductForm";
import InvoiceForm from "./pages/sub/invoice/InvoiceForm";

const queryClient = new QueryClient();

const App = () => (
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
            <Route path="/quotation/new" element={<QuotationForm onCancel={() => window.history.back()} />} />
            <Route path="/documents/invoice" element={<Invoice />} />
            <Route path="/invoice/new" element={<InvoiceForm onSave={async () => {}} initialData={{
              customer: { name: '', taxId: '', phone: '', address: '' },
              items: [],
              summary: { subtotal: 0, discount: 0, tax: 0, total: 0, withholdingTax: 0 },
              notes: '',
              documentNumber: '',
              documentDate: new Date().toISOString().split('T')[0],
              reference: '',
              status: 'draft'
            }} isLoading={false} />} />
            <Route path="/documents/receipt" element={<Receipt />} />
            <Route path="/documents/tax-invoice" element={<TaxInvoice />} />
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
            <Route path="/products/new" element={<ProductForm onSuccess={() => window.history.back()} />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
