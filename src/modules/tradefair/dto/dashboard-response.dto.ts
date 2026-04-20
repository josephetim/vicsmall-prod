export interface DashboardResponseDto {
  premiumSold: number;
  premiumRemaining: number;
  singleSold: number;
  singleRemaining: number;
  sharedSlotsSold: number;
  sharedSlotsRemaining: number;
  activeHolds: number;
  expiredHolds: number;
  failedPayments: number;
  abandonedPayments: number;
  totalRevenueKobo: number;
  occupancyRate: number;
  categorySummary: Array<{
    category: string;
    totalVendors: number;
  }>;
}
