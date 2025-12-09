// Creem Product ID Mapping Configuration

// Product IDs for different tiers and billing cycles
// These are production IDs for live environment

export interface ProductConfig {
  monthly: string;
  yearly: string;
}

export const CREEM_PRODUCT_IDS: Record<string, ProductConfig> = {
  starter: {
    monthly: 'prod_6pRi0DCl1h0fEqH3qAIX25',
    yearly: 'prod_3n19V3nvW64SzHGxHFARMe'
  },
  pro: {
    monthly: 'prod_42F3odu5moDVtV9gC9oRQ7',
    yearly: 'prod_1QTk96tAuK62ZKEMdWNpFJ'
  },
  unlimited: {
    monthly: 'prod_wWv176wMRUZsobW8J2aIB',
    yearly: 'prod_gccFskF10GtgbgXXG9AGd'
  }
};

// Usage example:
// CREEM_PRODUCT_IDS.starter.monthly
// CREEM_PRODUCT_IDS.pro.yearly
// CREEM_PRODUCT_IDS.unlimited.monthly
