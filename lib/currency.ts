/**
 * Currency formatting utility based on user's locale/country.
 * Uses the browser's Intl API for automatic currency detection.
 */

// Map of country codes to currency codes
const COUNTRY_TO_CURRENCY: Record<string, string> = {
    US: "USD",
    GB: "GBP",
    UK: "GBP",
    EU: "EUR",
    DE: "EUR",
    FR: "EUR",
    ES: "EUR",
    IT: "EUR",
    NL: "EUR",
    BE: "EUR",
    AT: "EUR",
    PT: "EUR",
    IE: "EUR",
    FI: "EUR",
    GR: "EUR",
    IN: "INR",
    JP: "JPY",
    CN: "CNY",
    KR: "KRW",
    AU: "AUD",
    CA: "CAD",
    MX: "MXN",
    BR: "BRL",
    AE: "AED",
    SA: "SAR",
    SG: "SGD",
    MY: "MYR",
    TH: "THB",
    PH: "PHP",
    ID: "IDR",
    VN: "VND",
    ZA: "ZAR",
    NG: "NGN",
    EG: "EGP",
    PK: "PKR",
    BD: "BDT",
    RU: "RUB",
    TR: "TRY",
    PL: "PLN",
    SE: "SEK",
    NO: "NOK",
    DK: "DKK",
    CH: "CHF",
    NZ: "NZD",
    HK: "HKD",
    TW: "TWD",
    IL: "ILS",
};

// Approximate exchange rates from USD (updated periodically)
const EXCHANGE_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.5,
    JPY: 149.5,
    CNY: 7.24,
    KRW: 1335,
    AUD: 1.53,
    CAD: 1.36,
    MXN: 17.15,
    BRL: 4.97,
    AED: 3.67,
    SAR: 3.75,
    SGD: 1.34,
    MYR: 4.72,
    THB: 35.8,
    PHP: 56.2,
    IDR: 15650,
    VND: 24500,
    ZAR: 18.9,
    NGN: 1550,
    EGP: 30.9,
    PKR: 278,
    BDT: 110,
    RUB: 92,
    TRY: 32,
    PLN: 3.95,
    SEK: 10.4,
    NOK: 10.6,
    DKK: 6.87,
    CHF: 0.88,
    NZD: 1.64,
    HKD: 7.82,
    TWD: 31.8,
    ILS: 3.67,
};

/**
 * Detect user's currency based on browser locale.
 */
export const detectUserCurrency = (): string => {
    try {
        // Try to get from browser's locale
        const locale = navigator.language || "en-US";
        const countryCode = locale.split("-")[1]?.toUpperCase();

        if (countryCode && COUNTRY_TO_CURRENCY[countryCode]) {
            return COUNTRY_TO_CURRENCY[countryCode];
        }

        // Fallback: try to infer from timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone.includes("Asia/Kolkata") || timezone.includes("Asia/Calcutta")) {
            return "INR";
        }
        if (timezone.includes("Europe/London")) {
            return "GBP";
        }
        if (timezone.includes("Europe/")) {
            return "EUR";
        }
        if (timezone.includes("Asia/Tokyo")) {
            return "JPY";
        }
        if (timezone.includes("Australia/")) {
            return "AUD";
        }

        // Default to USD
        return "USD";
    } catch {
        return "USD";
    }
};

/**
 * Convert amount from USD to target currency.
 */
export const convertFromUSD = (amountUSD: number, targetCurrency: string): number => {
    const rate = EXCHANGE_RATES[targetCurrency] ?? 1;
    return amountUSD * rate;
};

/**
 * Format a price in the user's local currency.
 * @param priceUSD - Price in USD (base currency)
 * @param currency - Target currency code (auto-detected if not provided)
 */
export const formatPrice = (priceUSD: number, currency?: string): string => {
    const targetCurrency = currency ?? detectUserCurrency();
    const convertedPrice = convertFromUSD(priceUSD, targetCurrency);

    try {
        return new Intl.NumberFormat(navigator.language || "en-US", {
            style: "currency",
            currency: targetCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: targetCurrency === "JPY" || targetCurrency === "KRW" ? 0 : 2,
        }).format(convertedPrice);
    } catch {
        // Fallback formatting
        return `$${priceUSD.toFixed(2)}`;
    }
};

/**
 * Get just the currency symbol for the user's locale.
 */
export const getCurrencySymbol = (currency?: string): string => {
    const targetCurrency = currency ?? detectUserCurrency();

    try {
        const formatter = new Intl.NumberFormat(navigator.language || "en-US", {
            style: "currency",
            currency: targetCurrency,
        });

        // Extract symbol from formatted string
        const parts = formatter.formatToParts(0);
        const symbolPart = parts.find(part => part.type === "currency");
        return symbolPart?.value ?? "$";
    } catch {
        return "$";
    }
};

/**
 * Format price for compact display (e.g., on buttons/badges).
 */
export const formatPriceCompact = (priceUSD: number, currency?: string): string => {
    const targetCurrency = currency ?? detectUserCurrency();
    const convertedPrice = convertFromUSD(priceUSD, targetCurrency);
    const symbol = getCurrencySymbol(targetCurrency);

    // For large numbers, use compact notation
    if (convertedPrice >= 1000) {
        return `${symbol}${Math.round(convertedPrice / 100) / 10}k`;
    }

    // For currencies with no decimal (JPY, KRW), show whole number
    if (targetCurrency === "JPY" || targetCurrency === "KRW" || targetCurrency === "VND" || targetCurrency === "IDR") {
        return `${symbol}${Math.round(convertedPrice)}`;
    }

    return `${symbol}${Math.floor(convertedPrice)}`;
};
