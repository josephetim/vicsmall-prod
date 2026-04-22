export interface InitializePaymentResponseDto {
  authorization_url: string;
  access_code?: string;
  reference: string;
}

export interface VerifyPaymentResponseDto {
  ok: boolean;
  status: string;
  bookingReference?: string;
  alreadyVerified?: boolean;
}
