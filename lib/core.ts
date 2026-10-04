export type IssuerPrice = {
  issuer: "bStocks" | "Ondo" | "xStocks";
  price: number;
  depthUsd: number;
};

export function impliedOpen(prices: IssuerPrice[]) {
  const depth = prices.reduce((sum, item) => sum + item.depthUsd, 0);
  if (!depth) return 0;
  return prices.reduce((sum, item) => sum + item.price * item.depthUsd, 0) / depth;
}

export function confidence(prices: IssuerPrice[]) {
  const totalDepth = prices.reduce((sum, item) => sum + item.depthUsd, 0);
  const values = prices.map((item) => item.price);
  const midpoint = values.reduce((a, b) => a + b, 0) / values.length;
  const issuerDifference = midpoint
    ? ((Math.max(...values) - Math.min(...values)) / midpoint) * 100
    : 0;

  const canCompareIssuers = prices.length > 1;
  if (totalDepth > 50_000 && canCompareIssuers && issuerDifference < 0.5) return "High" as const;
  if (totalDepth > 10_000 || (canCompareIssuers && issuerDifference < 1.5)) return "Medium" as const;
  return "Low" as const;
}

export function percentChange(current: number, reference: number) {
  return reference ? ((current - reference) / reference) * 100 : 0;
}
