export interface RegistrationResponseDto {
  registrationId: string;
  bookingReference: string;
  registrationStatus: string;
  standType: string;
  stand: {
    id: string;
    standCode: string;
    label: string;
  };
  slot?: {
    id: string;
    slotCode: string;
    slotLabel: string;
  };
  vendor: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    brandName: string;
    businessCategory: string[];
  };
  amountKobo: number;
  paymentStatus?: string;
  paidAt?: string;
  holdExpiresAt?: string;
}
