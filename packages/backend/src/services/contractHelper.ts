export function monthsBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

export function calculateContractFee(
  fee: number,
  feeType: string,
  overlapMonths: number,
  contractMonths: number,
  maxPatients: number,
): { totalFee: number; consumedFee: number } {
  switch (feeType) {
    case 'fixed': {
      const prorated = contractMonths > 0 ? fee * (overlapMonths / contractMonths) : 0;
      return { totalFee: fee, consumedFee: Math.round(prorated * 100) / 100 };
    }
    case 'monthly': {
      const total = fee * overlapMonths;
      return { totalFee: Math.round(total * 100) / 100, consumedFee: Math.round(total * 100) / 100 };
    }
    case 'per_patient': {
      const total = fee * overlapMonths * maxPatients;
      return { totalFee: Math.round(total * 100) / 100, consumedFee: Math.round(total * 100) / 100 };
    }
    default:
      return { totalFee: 0, consumedFee: 0 };
  }
}

export function calculateConsumedSince(
  fee: number,
  feeType: string,
  sinceDate: Date,
  contractStart: Date,
  contractEnd: Date,
  maxPatients: number,
  now: Date = new Date(),
): number {
  const overlapStart = sinceDate > contractStart ? sinceDate : contractStart;
  const overlapEnd = now < contractEnd ? now : contractEnd;
  if (overlapStart >= overlapEnd) return 0;
  const overlapMonths = monthsBetween(overlapStart, overlapEnd);
  const contractMonths = monthsBetween(contractStart, contractEnd);
  const { consumedFee } = calculateContractFee(fee, feeType, overlapMonths, contractMonths, maxPatients);
  return consumedFee;
}
