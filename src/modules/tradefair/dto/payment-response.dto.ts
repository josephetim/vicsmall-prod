export interface PaymentResponseDto {
  paymentId: string;
  registrationId: string;
  gateway: "paystack";
  reference: string;
  amountKobo: number;
  paymentStatus: string;
  channel?: string;
  paidAt?: string;
}
