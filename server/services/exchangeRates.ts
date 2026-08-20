import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './dbService';
import axios from 'axios';

export async function updateExchangeRates() {
  try {
    const db = getDb();
    console.log('[ExchangeRates] Fetching latest live rates from OpenExchangeRates API...');
    
    // Using Exchangerate-API (free) mapping to USD base
    const response = await axios.get('https://open.er-api.com/v6/latest/USD');
    if (response.data && response.data.rates) {
      const rates = response.data.rates;
      const currencies = Object.keys(rates);
      
      await db.collection('config').doc('rates').set({
        base: 'USD',
        rates: rates,
        last_updated: FieldValue.serverTimestamp(),
        next_update: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
      }, { merge: true });
      
      console.log(`[ExchangeRates] Successfully updated ${currencies.length} currencies.`);
      return { success: true, count: currencies.length };
    } else {
      console.error('[ExchangeRates] Invalid response format.');
      return { success: false, error: 'Invalid response format' };
    }
  } catch (error: any) {
    console.error('[ExchangeRates] Error updating rates:', error.message);
    return { success: false, error: error.message };
  }
}
