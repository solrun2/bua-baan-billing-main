import {
  BarChart3,
  FileText,
  CreditCard,
  Settings,
  ChevronDown,
  Receipt,
  FileX,
  ShoppingCart,
  PiggyBank,
  Building,
  Calculator,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
const documentItems = [
  {
    title: "ใบเสนอราคา",
    url: "/documents/quotation",
    icon: FileText,
  },
  {
    title: "ใบแจ้งหนี้",
    url: "/documents/invoice",
    icon: Receipt,
  },
  {
    title: "ใบเสร็จรับเงิน",
    url: "/documents/receipt",
    icon: CreditCard,
  },
  {
    title: "ใบกำกับภาษี",
    url: "/documents/tax-invoice",
    icon: Calculator,
  },
  {
    title: "ใบลดหนี้",
    url: "/documents/credit-note",
    icon: FileX,
  },
  {
    title: "ใบสั่งซื้อ",
    url: "/documents/purchase-order",
    icon: ShoppingCart,
  },
  {
    title: "ใบวางบิล",
    url: "/documents/billing",
    icon: FileText,
  },
];
const financeItems = [
  {
    title: "บัญชีธนาคาร",
    url: "/finance/bank-accounts",
    icon: Building,
  },
  {
    title: "E-Wallet",
    url: "/finance/ewallets",
    icon: Smartphone,
  },
  {
    title: "กระแสเงินสด",
    url: "/finance/cashflow",
    icon: PiggyBank,
  },
];
const settingsItems = [
  {
    title: "ผังบัญชี",
    url: "/settings/chart-of-accounts",
    icon: BarChart3,
  },
  {
    title: "เลขรันเอกสาร",
    url: "/settings/document-numbering",
    icon: FileText,
  },
  {
    title: "ข้อมูลบริษัท",
    url: "/settings/company-info",
    icon: Building,
  },
];
export function AppSidebar() {
  const location = useLocation();
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isActive = (path: string) => location.pathname === path;
  return (
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Ket Document
            </h2>
            <p className="text-sm text-foreground">ระบบจัดการเอกสาร</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className={`${isActive("/") ? "bg-primary text-black font-bold" : "hover:text-black"} transition-colors`}
              >
                <Link to="/" className="flex items-center gap-3 p-3 rounded-lg">
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-muted-foreground hover:text-foreground transition-colors">
                <span className="font-medium">เอกสาร</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${documentsOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {documentItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`${isActive(item.url) ? "bg-primary text-black font-bold" : "hover:text-black"} transition-colors ml-4`}
                      >
                        <Link
                          to={item.url}
                          className="flex items-center gap-3 p-2 rounded-lg"
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible open={financeOpen} onOpenChange={setFinanceOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-muted-foreground hover:text-foreground transition-colors">
                <span className="font-medium">การเงิน</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${financeOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {financeItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`${isActive(item.url) ? "bg-primary text-black font-bold" : "hover:text-black"} transition-colors ml-4`}
                      >
                        <Link
                          to={item.url}
                          className="flex items-center gap-3 p-2 rounded-lg"
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-muted-foreground hover:text-foreground transition-colors">
                <span className="font-medium">ตั้งค่า</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {settingsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`${isActive(item.url) ? "bg-primary text-black font-bold" : "hover:text-black"} transition-colors ml-4`}
                      >
                        <Link
                          to={item.url}
                          className="flex items-center gap-3 p-2 rounded-lg"
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
