interface BankWithBalance {
  id: string;
  name: string;
  accountNumber: string;
  accountType: string;
  holderName: string;
  document: string;
  isActive: boolean;
  initialBalance: number;
  realBalance: number;
  transactionBalance: number;
}

export interface BanksWithBalanceResponse {
  banks: BankWithBalance[];
}