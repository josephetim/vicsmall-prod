export interface CreateHoldDto {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  brandName: string;
  businessCategory: string[];
  standPreferences?: string;
  standId: string;
  standSlotId?: string;
  termsAccepted: boolean;
}

export interface CreateHoldResponseDto {
  registrationId: string;
  bookingReference: string;
  amountKobo: number;
  holdExpiresAt: string;
  stand: {
    id: string;
    standCode: string;
    label: string;
    standType: "premium" | "single" | "shared";
  };
  slot?: {
    id: string;
    slotCode: string;
    slotLabel: string;
    slotIndex: number;
  };
}
