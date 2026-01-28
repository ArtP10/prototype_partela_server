import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:4200').split(','),

    // Demo configuration
    maxGuestsPerTable: parseInt(process.env.MAX_GUESTS_PER_TABLE || '4', 10),
    defaultTaxRate: parseFloat(process.env.DEFAULT_TAX_RATE || '0.00'),
    defaultServiceFeeRate: parseFloat(process.env.DEFAULT_SERVICE_FEE_RATE || '0.00'),

    // Helper to check if production
    isProduction: process.env.NODE_ENV === 'production',
};

export default config;
