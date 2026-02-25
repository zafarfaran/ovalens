export type UKRegion = "england" | "wales" | "northern_ireland" | "scotland";

export interface ClientInfo {
  id: string;
  name: string;
  email?: string;
  region: UKRegion;
  dateOfBirth?: string;
  niNumber?: string;
  taxYear: string;
  createdAt: string;
  updatedAt: string;
}
