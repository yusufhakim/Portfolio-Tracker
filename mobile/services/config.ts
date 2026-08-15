import Constants from "expo-constants";

/**
 * Finnhub API key (US equities/ETFs). Read from EXPO_PUBLIC_FINNHUB_API_KEY if
 * set, otherwise from app.json `extra.finnhubApiKey`. This is a personal free
 * key and can be regenerated at https://finnhub.io if needed.
 */
export const FINNHUB_API_KEY: string =
  process.env.EXPO_PUBLIC_FINNHUB_API_KEY ??
  (Constants.expoConfig?.extra?.finnhubApiKey as string | undefined) ??
  "";

export const BASE_CURRENCY = "USD";
