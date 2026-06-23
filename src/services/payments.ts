/**
 * Stripe Connect payment service — scaffold only.
 * Authorize on booking, capture on completion, payout to washer.
 */

export async function authorizePayment(_jobId: string, _amountCents: number): Promise<void> {
  throw new Error('Stripe Connect not implemented yet');
}

export async function capturePayment(_jobId: string): Promise<void> {
  throw new Error('Stripe Connect not implemented yet');
}

export async function createWasherConnectAccount(_userId: string): Promise<string> {
  throw new Error('Stripe Connect not implemented yet');
}
