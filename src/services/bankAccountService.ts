import { apiService } from "../pages/services/apiService";

export interface BankAccount {
  id: number;
  bank_name: string;
  account_type: "ออมทรัพย์" | "กระแสรายวัน" | "ประจำ";
  account_number: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashFlowEntry {
  id: number;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  bank_account_id?: number;
  document_id?: number;
  category?: string;
  bank_name?: string;
  account_number?: string;
  created_at: string;
}

export interface CashFlowSummary {
  month: number;
  year: number;
  total_income: number;
  total_expense: number;
  net_flow: number;
}

export const bankAccountService = {
  // ดึงข้อมูลบัญชีธนาคารทั้งหมด
  async getBankAccounts(): Promise<BankAccount[]> {
    const response = await apiService.get("/bank-accounts");
    return response;
  },

  // ดึงข้อมูลบัญชีธนาคารตาม ID
  async getBankAccount(id: number): Promise<BankAccount> {
    const response = await apiService.get(`/bank-accounts/${id}`);
    return response;
  },

  // สร้างบัญชีธนาคารใหม่
  async createBankAccount(data: {
    bank_name: string;
    account_type: string;
    account_number: string;
    current_balance?: number;
  }): Promise<{ success: boolean; id: number }> {
    const response = await apiService.post("/bank-accounts", data);
    return response;
  },

  // อัปเดตยอดบัญชีธนาคาร
  async updateBankAccountBalance(
    id: number,
    amount: number
  ): Promise<{ success: boolean }> {
    const response = await apiService.put(`/bank-accounts/${id}/balance`, {
      amount,
    });
    return response;
  },

  // คำนวณยอดบัญชีธนาคารใหม่จากข้อมูลกระแสเงินสด
  async recalculateBalances(): Promise<{
    success: boolean;
    message: string;
    accounts: BankAccount[];
  }> {
    const response = await apiService.post(
      "/bank-accounts/recalculate-balances"
    );
    return response;
  },

  async createCashFlowFromReceipts(): Promise<{
    success: boolean;
    message: string;
    accounts: BankAccount[];
  }> {
    const response = await apiService.post(
      "/bank-accounts/create-cashflow-from-receipts"
    );
    return response;
  },

  async regenerateCashFlow(): Promise<{
    success: boolean;
    message: string;
    totalEntries: number;
  }> {
    const response = await apiService.post(
      "/bank-accounts/regenerate-cashflow"
    );
    return response;
  },

  // ดึงข้อมูลกระแสเงินสด
  async getCashFlow(params?: {
    month?: number;
    year?: number;
    type?: "income" | "expense";
  }): Promise<CashFlowEntry[]> {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append("month", params.month.toString());
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.type) queryParams.append("type", params.type);

    const response = await apiService.get(
      `/cashflow?${queryParams.toString()}`
    );
    return response;
  },

  // เพิ่มรายการกระแสเงินสด
  async createCashFlowEntry(data: {
    type: "income" | "expense";
    amount: number;
    description: string;
    date: string;
    bank_account_id?: number;
    document_id?: number;
    category?: string;
  }): Promise<{ success: boolean; id: number }> {
    const response = await apiService.post("/cashflow", data);
    return response;
  },

  // ดึงสรุปกระแสเงินสดรายเดือน
  async getCashFlowSummary(year?: number): Promise<CashFlowSummary[]> {
    const queryParams = year ? `?year=${year}` : "";
    const response = await apiService.get(`/cashflow/summary${queryParams}`);
    return response;
  },
};
