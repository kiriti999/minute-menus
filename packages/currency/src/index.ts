/**
 * Currency formatting utility based on user's locale/country.
 * Uses the browser's Intl API for automatic currency detection.
 */

export {
    applyGstToSubtotal,
    calculateMealPlanSubtotal,
    calculateMealPlanTax,
    calculateOrderTax,
    enrichOrderItemsWithGst,
    INDIAN_RESTAURANT_GST_PERCENT,
    INDIAN_RESTAURANT_GST_RATE,
    isIndianGstApplicable,
} from "./indianGst";
export type { GstOrderItem, OrderTaxBreakdown } from "./indianGst";

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

const TIMEZONE_TO_CURRENCY: Array<{ match: string; currency: string }> = [
    { match: "Asia/Kolkata", currency: "INR" },
    { match: "Asia/Calcutta", currency: "INR" },
    { match: "Asia/Dubai", currency: "AED" },
    { match: "Asia/Singapore", currency: "SGD" },
    { match: "Asia/Tokyo", currency: "JPY" },
    { match: "Asia/Seoul", currency: "KRW" },
    { match: "Asia/Shanghai", currency: "CNY" },
    { match: "Asia/Hong_Kong", currency: "HKD" },
    { match: "Asia/Bangkok", currency: "THB" },
    { match: "Asia/Jakarta", currency: "IDR" },
    { match: "Asia/Manila", currency: "PHP" },
    { match: "Asia/Kuala_Lumpur", currency: "MYR" },
    { match: "Europe/London", currency: "GBP" },
    { match: "Europe/", currency: "EUR" },
    { match: "America/Toronto", currency: "CAD" },
    { match: "America/Vancouver", currency: "CAD" },
    { match: "America/Sao_Paulo", currency: "BRL" },
    { match: "America/Mexico_City", currency: "MXN" },
    { match: "Australia/", currency: "AUD" },
    { match: "Pacific/Auckland", currency: "NZD" },
    { match: "Africa/Johannesburg", currency: "ZAR" },
    { match: "America/New_York", currency: "USD" },
    { match: "America/Chicago", currency: "USD" },
    { match: "America/Denver", currency: "USD" },
    { match: "America/Los_Angeles", currency: "USD" },
];

const regionFromLocale = (localeTag: string): string | undefined => {
    try {
        const LocaleCtor = (Intl as unknown as { Locale?: new (tag: string) => { region?: string } }).Locale;
        if (LocaleCtor) {
            const region = new LocaleCtor(localeTag).region;
            if (region) return region.toUpperCase();
        }
    } catch {
        /* fall through */
    }
    const parts = localeTag.split(/[-_]/);
    const maybe = parts[1]?.toUpperCase();
    return maybe && maybe.length === 2 ? maybe : undefined;
};

/**
 * Detect visitor currency from browser locale, then timezone.
 * Used for Plus checkout pricing when an owner visits the paywall.
 */
export const detectUserCurrency = (): string => {
    try {
        const locale =
            (typeof navigator !== "undefined" && (navigator.languages?.[0] || navigator.language)) ||
            "en-US";
        const region = regionFromLocale(locale);
        if (region && COUNTRY_TO_CURRENCY[region]) {
            return COUNTRY_TO_CURRENCY[region];
        }

        const timezone =
            typeof Intl !== "undefined"
                ? Intl.DateTimeFormat().resolvedOptions().timeZone
                : "";
        for (const row of TIMEZONE_TO_CURRENCY) {
            if (timezone.includes(row.match)) return row.currency;
        }

        return "USD";
    } catch {
        return "USD";
    }
};

/** Zero-decimal currencies for Razorpay amount encoding. */
const ZERO_DECIMAL_CURRENCIES = new Set([
    "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export type PlusPlanId = "annual" | "monthly";

/** Base Plus catalog in USD — converted per visitor region at checkout. */
export const PLUS_USD_PRICES: Record<PlusPlanId, number> = {
    annual: 120,
    monthly: 12,
};

export const normalizeCheckoutCurrency = (code: string | undefined | null): string => {
    const upper = (code ?? "USD").trim().toUpperCase();
    if (EXCHANGE_RATES[upper]) return upper;
    return "USD";
};

/**
 * Convert USD catalog price into major units for the visitor currency
 * (rounded sensibly for zero-decimal currencies).
 */
export const getPlusPlanAmount = (plan: PlusPlanId, currency: string): number => {
    const usd = PLUS_USD_PRICES[plan];
    const target = normalizeCheckoutCurrency(currency);
    const converted = convertFromUSD(usd, target);
    if (ZERO_DECIMAL_CURRENCIES.has(target)) return Math.round(converted);
    return Math.round(converted * 100) / 100;
};

/** Razorpay expects the smallest currency unit (paise/cents), except zero-decimal. */
export const toRazorpayAmountSubunits = (amountMajor: number, currency: string): number => {
    const target = normalizeCheckoutCurrency(currency);
    if (ZERO_DECIMAL_CURRENCIES.has(target)) return Math.round(amountMajor);
    return Math.round(amountMajor * 100);
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

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS CURRENCY (no conversion - prices are already in the target currency)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List of supported currencies for business selection.
 */
export const SUPPORTED_CURRENCIES = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
    { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
    { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
    { code: "THB", name: "Thai Baht", symbol: "฿" },
    { code: "PHP", name: "Philippine Peso", symbol: "₱" },
    { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
    { code: "KRW", name: "South Korean Won", symbol: "₩" },
    { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$" },
    { code: "ZAR", name: "South African Rand", symbol: "R" },
    { code: "TRY", name: "Turkish Lira", symbol: "₺" },
    { code: "PLN", name: "Polish Złoty", symbol: "zł" },
    { code: "SEK", name: "Swedish Krona", symbol: "kr" },
    { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
    { code: "DKK", name: "Danish Krone", symbol: "kr" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
    { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
] as const;

/**
 * Format price in a specific currency (NO conversion - price is already in that currency).
 * Use this for business prices where the owner sets prices directly in their currency.
 */
export const formatPriceInCurrency = (price: number, currencyCode: string): string => {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: currencyCode === "JPY" || currencyCode === "KRW" ? 0 : 2,
        }).format(price);
    } catch {
        return `${price}`;
    }
};

/**
 * Format price compactly for badges (NO conversion).
 */
export const formatPriceCompactInCurrency = (price: number, currencyCode: string): string => {
    const symbol = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)?.symbol ?? "$";

    if (price >= 1000) {
        return `${symbol}${Math.round(price / 100) / 10}k`;
    }

    if (currencyCode === "JPY" || currencyCode === "KRW" || currencyCode === "VND" || currencyCode === "IDR") {
        return `${symbol}${Math.round(price)}`;
    }

    return `${symbol}${Math.floor(price)}`;
};

/**
 * Get symbol for a currency code.
 */
export const getSymbolForCurrency = (currencyCode: string): string => {
    return SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)?.symbol ?? "$";
};
