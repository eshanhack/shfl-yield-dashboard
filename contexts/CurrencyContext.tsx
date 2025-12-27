"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CURRENCIES, Currency } from "@/lib/currency";

interface CurrencyContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCIES[0]); // Default USD

  // Load saved currency from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selected-currency");
    if (saved) {
      const currency = CURRENCIES.find(c => c.code === saved);
      if (currency) {
        setSelectedCurrency(currency);
      }
    }
  }, []);

  const handleSetCurrency = (currency: Currency) => {
    setSelectedCurrency(currency);
    localStorage.setItem("selected-currency", currency.code);
  };

  return (
    <CurrencyContext.Provider value={{ selectedCurrency, setSelectedCurrency: handleSetCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

