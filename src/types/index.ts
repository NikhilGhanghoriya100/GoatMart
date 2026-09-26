export interface Goat{_id:string;name:string;breed:string;weight:number;age:string;price:number;deliveryCharge?:number;status:"sale"|"sold"|"reserved";health:string;vaccinated:boolean;tag?:string;desc:string;images:string[];videoUrl?:string;seller:string;sellerName:string;sellerRating:number;sellerReviews:number;sellerImg:string;sellerLoc:string;reviews:Review[];averageRating:number;totalReviews:number;views:number;wishlistCount:number;createdAt:string}
export interface Review{_id:string;user:string;userName:string;userAvatar:string;rating:number;text:string;createdAt:string}
export type PayoutStatus = "none" | "unpaid" | "processing" | "paid" | "failed" | "reversed";

export interface OrderPayout {
  status: PayoutStatus;
  transferId?: string;
  recipientAccountId?: string;
  amount?: number;
  currency?: string;
  idempotencyKey?: string;
  initiatedAt?: string;
  processedAt?: string;
  failedAt?: string;
  reversedAt?: string;
  failureReason?: string;
  reversalReason?: string;
  retryCount?: number;
  isManual?: boolean;
  payoutMethod?: "UPI" | "BANK";
  referenceId?: string;
  utrNumber?: string;
  paidAt?: string;
  paidBy?: string;
  paidByName?: string;
  adminNote?: string;
}

export interface SellerBankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  upiId?: string;
  isVerified: boolean;
}

export type PaymentVerificationStatus = "not_submitted" | "pending" | "approved" | "rejected";

export interface SellerPaymentDetails {
  paymentMethod: "UPI" | "BANK";
  phone: string;
  upiId?: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  paymentNote?: string;
  verificationStatus: PaymentVerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  updatedAt?: string;
}

export type PayoutOnboardingStatus = "not_started" | "pending" | "active" | "rejected";

export interface SellerPayoutOnboarding {
  razorpayAccountId?: string;
  status: PayoutOnboardingStatus;
  activatedAt?: string;
}

export interface Order{_id:string;orderId:string;goat:string|Goat;goatName:string;goatBreed:string;goatImage:string;seller:string;sellerName:string;customer:string;customerName:string;amount:number;status:string;payment:{razorpayOrderId:string;razorpayPaymentId?:string;method?:string;status:string;paidAt?:string};delivery:{name:string;phone:string;email?:string;address:string;city:string;state:string;pin:string;note?:string};timeline:{s:string;d:string;done:boolean}[];reviewed:boolean;createdAt:string;sellerBasePrice?:number;deliveryCharge?:number;buyerPlatformFee?:number;buyerPlatformFeeRate?:number;sellerDeliveryAmount?:number;sellerGoatNet?:number;commissionRate?:number;commissionAmount?:number;sellerNetPayable?:number;currency?:string;financialCalculationVersion?:string;financialCalculatedAt?:string;expenses?:{type:"platform"|"seller";amount:number;reason:string;recordedBy?:string;recordedByRole?:string;recordedAt?:string}[];cancellation?:{cancelledAt?:string;cancelledBy?:string;cancelledByRole?:string;reason?:string;refundCommissionRate?:number;refundCommissionAmount?:number;platformExpense?:number;sellerExpense?:number;totalDeductions?:number;finalRefundAmount?:number};refund?:{status:string;refundId?:string;amount?:number;currency?:string;initiatedAt?:string;processedAt?:string;failedAt?:string;failureReason?:string;reason?:string;breakdown?:{totalCustomerPaid:number;refundCommissionRate:number;refundCommissionAmount:number;platformExpense:number;sellerExpense:number;totalDeductions:number;finalRefundAmount:number}};payout?:OrderPayout}
export interface ChatMessage{_id:string;from:string;fromName:string;fromRole:"customer"|"seller"|"admin";text:string;attachments?:string[];read:boolean;createdAt:string}
export interface Chat{_id:string;goat:string|Goat;goatName:string;goatImage:string;customer:string;customerName:string;seller:string;sellerName:string;messages:ChatMessage[];lastMessage?:string;lastMessageAt?:string;unreadCount:{customer:number;seller:number}}
export interface User{_id:string;name:string;email:string;phone?:string;role:"customer"|"seller"|"admin";avatar?:string;address?:{street:string;city:string;state:string;pin:string};sellerProfile?:{farmName:string;description:string;location:string;status:"pending"|"approved"|"suspended";rating:number;totalReviews:number;totalSales:number;bankDetails?:SellerBankDetails;paymentDetails?:SellerPaymentDetails;payoutOnboarding?:SellerPayoutOnboarding};wishlist:string[];createdAt:string}
export interface ApiResponse<T=unknown>{success:boolean;data?:T;message?:string;error?:string}
export const BREEDS=["Jamunapari","Beetal","Sirohi","Barbari","Black Bengal","Osmanabadi","Totapari","Sojat","Kota","Malwa","Others"] as const;
export type Breed=typeof BREEDS[number];
export const BREED_META: Record<Breed, { emoji: string; color: string; bg: string }> = {
  Jamunapari: { emoji: "🏆", color: "#d4a96e", bg: "#fdf6e8" },
  Beetal: { emoji: "🎖️", color: "#c07050", bg: "#fdf0e8" },
  Sirohi: { emoji: "💎", color: "#b89060", bg: "#fdf4e8" },
  Barbari: { emoji: "⭐", color: "#7b9e87", bg: "#eef6f0" },
  "Black Bengal": { emoji: "🔥", color: "#4a4a4a", bg: "#f0f0f0" },
  Osmanabadi: { emoji: "👑", color: "#c89e3e", bg: "#fdf8e0" },
  Totapari: { emoji: "🌿", color: "#a8785e", bg: "#f8f0e8" },
  Sojat: { emoji: "✨", color: "#7e9eba", bg: "#e8f0f8" },
  Kota: { emoji: "🐐", color: "#8b7355", bg: "#f5efe7" },
  Malwa: { emoji: "🐐", color: "#8b6f47", bg: "#f7f0e5" },
  Others: { emoji: "🐐", color: "#777777", bg: "#f1f1f1" },
};

