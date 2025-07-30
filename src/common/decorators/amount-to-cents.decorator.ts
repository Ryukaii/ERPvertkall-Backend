import { Transform } from 'class-transformer';

export function AmountToCents() {
  return Transform(({ value }) => {
    if (value === undefined || value === null) {
      return value;
    }
    
    // Converte de reais para centavos (R$99,99 -> 9999)
    const amountInReais = parseFloat(value);
    return Math.round(amountInReais * 100);
  });
} 