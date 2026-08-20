import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

export type Currency = string;

interface CurrencyRates {
  [key: string]: number;
}

interface CurrencyContextType {
  preferredCurrency: Currency;
  localCurrency: string | null;
  setPreferredCurrency: (currency: Currency) => Promise<void>;
  formatCurrency: (amountInUsd: number) => string;
  convertCurrency: (amountInUsd: number) => number;
  rates: CurrencyRates;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferredCurrency, setPreferredCurrencyState] = useState<Currency>('USD');
  const [localCurrency, setLocalCurrency] = useState<string | null>(null);
  const [rates, setRates] = useState<CurrencyRates>({ GBP: 0.79, EUR: 0.92 }); // Default fallbacks

  // Listen to global config for exchange rates
  useEffect(() => {
    const configRef = doc(db, 'config', 'global');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().exchangeRates) {
        setRates(docSnap.data().exchangeRates);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'config/global'));
    return () => unsubscribe();
  }, []);

  // Listen to user's currency preference
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}`;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.preferredCurrency) {
          setPreferredCurrencyState(data.preferredCurrency);
        }
        if (data.local_currency && !['USD', 'GBP', 'EUR'].includes(data.local_currency)) {
          setLocalCurrency(data.local_currency);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, path));
    return () => unsubscribe();
  }, [user]);

  const setPreferredCurrency = async (currency: Currency) => {
    setPreferredCurrencyState(currency);
    if (user) {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', user.uid), { preferredCurrency: currency });
    }
  };

  const convertCurrency = (amountInUsd: number) => {
    if (preferredCurrency === 'USD') return amountInUsd;
    const rate = rates[preferredCurrency];
    return rate ? amountInUsd * rate : amountInUsd;
  };

  const getCurrencySymbol = (currency: string) => {
    const symbolMap: Record<string, string> = {
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'NGN': '₦',
      'ZAR': 'R',
      'GHS': 'GH₵',
      'KES': 'KSh',
      'SEK': 'kr',
      'AED': 'AED',
    };
    return symbolMap[currency] || currency;
  };

  const formatCurrency = (amountInUsd: number) => {
    const converted = convertCurrency(amountInUsd);
    
    // For standard display we can use native Intl.NumberFormat without currency symbol
    // then manually prepend our explicit symbol
    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(converted);

    const symbol = getCurrencySymbol(preferredCurrency);
    // Add space for letters like AED or kr, no space for $, £, €
    const needsSpace = symbol.length > 1;
    return `${symbol}${needsSpace ? ' ' : ''}${formattedNumber}`;
  };

  return (
    <CurrencyContext.Provider value={{ preferredCurrency, localCurrency, setPreferredCurrency, formatCurrency, convertCurrency, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
};
