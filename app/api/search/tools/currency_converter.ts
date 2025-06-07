import { z } from 'zod';
import { Daytona, SandboxTargetRegion } from '@daytonaio/sdk';

export const currencyConverterSchema = z.object({
  from: z.string().describe('The source currency code.'),
  to: z.string().describe('The target currency code.'),
  amount: z.number().describe('The amount to convert. Default is 1.'),
});

export type CurrencyConverterParams = z.infer<typeof currencyConverterSchema>;

interface CurrencyConverterContext {
  serverEnv: {
    DAYTONA_API_KEY?: string;
    DAYTONA_API_URL?: string;
  };
}

export async function executeCurrencyConverter(
  { from, to, amount }: CurrencyConverterParams,
  { serverEnv }: CurrencyConverterContext,
) {
  const code = `
import yfinance as yf

# Get exchange rates for both directions
from_currency = '${from}'
to_currency = '${to}'
amount = ${amount}

# Forward conversion (from -> to)
currency_pair_forward = f'{from_currency}{to_currency}=X'
data_forward = yf.Ticker(currency_pair_forward).history(period='1d')
rate_forward = data_forward['Close'].iloc[-1]
converted_amount = rate_forward * amount

# Reverse conversion (to -> from)  
currency_pair_reverse = f'{to_currency}{from_currency}=X'
data_reverse = yf.Ticker(currency_pair_reverse).history(period='1d')
rate_reverse = data_reverse['Close'].iloc[-1]

print(f"Forward rate: {rate_forward}")
print(f"Reverse rate: {rate_reverse}")
print(f"Converted amount: {converted_amount}")
`;
  console.log('Currency pair:', from, to);

  const daytona = new Daytona({
    apiKey: serverEnv.DAYTONA_API_KEY,
    apiUrl: serverEnv.DAYTONA_API_URL,
  });
  const sandbox = await daytona.create({
    image: "mind-analysis:1749032298",
    language: 'python',
    // target: SandboxTargetRegion.US,
    resources: {
      cpu: 2,
      memory: 5,
      disk: 10,
    },
    autoStopInterval: 0
  })

  const execution = await sandbox.process.codeRun(code);
  let message = '';

  if (execution.result) {
    message += execution.result;
  }

  if (execution.artifacts?.stdout) {
    message += execution.artifacts.stdout;
  }

  await sandbox.delete();

  // Parse the output to extract rates
  const lines = message.split('\n');
  let forwardRate = null;
  let reverseRate = null;
  let convertedAmount = null;

  for (const line of lines) {
    if (line.includes('Forward rate:')) {
      forwardRate = parseFloat(line.split(': ')[1]);
    }
    if (line.includes('Reverse rate:')) {
      reverseRate = parseFloat(line.split(': ')[1]);
    }
    if (line.includes('Converted amount:')) {
      convertedAmount = parseFloat(line.split(': ')[1]);
    }
  }

  return { 
    rate: convertedAmount || message.trim(),
    forwardRate: forwardRate,
    reverseRate: reverseRate,
    fromCurrency: from,
    toCurrency: to,
    amount: amount,
    convertedAmount: convertedAmount
  };
}
