
export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  imageUrls: string[];
  productUrl: string;
  affiliateUrl?: string;
  category: string;
  description: string;
  trendMetric?: string;
  specifications?: Record<string, string>;
  sources?: { uri: string; title: string }[];
}

export interface DealContent {
  caption: string;
  hashtags: string[];
}

export type ApiProvider = 'z-api' | 'evolution' | 'custom';

export interface AffiliateConfig {
  affiliateId: string;
  appKey: string;
  appSecret: string;
  whatsappGroupLink: string;
  webhookUrl?: string;
  webhookRecipient?: string;
  clientToken?: string;
  apiProvider: ApiProvider;
  active: boolean;
}

export enum AppStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  EXTRACTING = 'EXTRACTING',
  GENERATING_COPY = 'GENERATING_COPY',
  AUTOMATING = 'AUTOMATING',
  ERROR = 'ERROR'
}

export interface AutomationSettings {
  isEnabled: boolean;
  minInterval: number;
  maxInterval: number;
  lastPostTime?: number;
  nextPostTime?: number;
}