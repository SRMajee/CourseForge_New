export interface CreateCheckoutResponse {
  url: string;
}

export interface TopUpPack {
  id: string;
  name: string;
  credits: number;
  priceInRupees: number;
}
