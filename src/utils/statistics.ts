/**
 * Statistical utilities for Format Intelligence
 * Provides t-tests, confidence intervals, correlation analysis, and forecasting
 */

export interface TTestResult {
  tStatistic: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
  mean1: number;
  mean2: number;
  effectSize: number; // Cohen's d
  interpretation: string;
}

export interface ConfidenceInterval {
  mean: number;
  lower: number;
  upper: number;
  confidenceLevel: number;
  standardError: number;
}

export interface ForecastResult {
  predicted: number;
  lower: number;
  upper: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number; // 0-1
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'minor' | 'moderate' | 'critical';
  score: number; // Z-score or similar
  expectedValue: number;
  actualValue: number;
  deviationPercent: number;
}

/**
 * Calculate mean of an array
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculate standard error
 */
export function standardError(values: number[]): number {
  if (values.length === 0) return 0;
  return standardDeviation(values) / Math.sqrt(values.length);
}

/**
 * Perform independent samples t-test
 */
export function tTest(group1: number[], group2: number[], confidenceLevel: number = 0.95): TTestResult {
  const n1 = group1.length;
  const n2 = group2.length;
  
  if (n1 < 2 || n2 < 2) {
    return {
      tStatistic: 0,
      pValue: 1,
      isSignificant: false,
      confidenceLevel,
      mean1: mean(group1),
      mean2: mean(group2),
      effectSize: 0,
      interpretation: 'Insufficient data for statistical test'
    };
  }
  
  const mean1Val = mean(group1);
  const mean2Val = mean(group2);
  const sd1 = standardDeviation(group1);
  const sd2 = standardDeviation(group2);
  
  // Pooled standard deviation
  const pooledSD = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
  
  // t-statistic
  const tStat = (mean1Val - mean2Val) / (pooledSD * Math.sqrt(1/n1 + 1/n2));
  
  // Degrees of freedom
  const df = n1 + n2 - 2;
  
  // Approximate p-value using t-distribution approximation
  const pValue = approximatePValue(Math.abs(tStat), df);
  
  // Cohen's d for effect size
  const cohensD = (mean1Val - mean2Val) / pooledSD;
  
  // Significance threshold (typically 0.05 for 95% confidence)
  const alpha = 1 - confidenceLevel;
  const isSignificant = pValue < alpha;
  
  // Interpretation
  let interpretation = '';
  if (!isSignificant) {
    interpretation = 'No statistically significant difference detected';
  } else {
    const diff = ((mean2Val - mean1Val) / mean1Val) * 100;
    const direction = diff > 0 ? 'increased' : 'decreased';
    interpretation = `Statistically significant ${direction} of ${Math.abs(diff).toFixed(1)}% (p=${pValue.toFixed(3)})`;
  }
  
  return {
    tStatistic: tStat,
    pValue,
    isSignificant,
    confidenceLevel,
    mean1: mean1Val,
    mean2: mean2Val,
    effectSize: Math.abs(cohensD),
    interpretation
  };
}

/**
 * Approximate p-value for t-test (two-tailed)
 */
function approximatePValue(t: number, df: number): number {
  // Simple approximation using normal distribution for large df
  if (df > 30) {
    return 2 * (1 - normalCDF(Math.abs(t)));
  }
  
  // For smaller df, use a lookup table approximation
  const tCritical = {
    5: [2.571, 2.015, 1.476],   // df=5, alpha=0.01, 0.05, 0.10
    10: [3.169, 2.228, 1.812],  // df=10
    20: [2.845, 2.086, 1.725],  // df=20
    30: [2.750, 2.042, 1.697]   // df=30
  };
  
  const closest = [5, 10, 20, 30].reduce((prev, curr) => 
    Math.abs(curr - df) < Math.abs(prev - df) ? curr : prev
  );
  
  const [t01, t05, t10] = tCritical[closest as keyof typeof tCritical];
  
  if (Math.abs(t) >= t01) return 0.01;
  if (Math.abs(t) >= t05) return 0.05;
  if (Math.abs(t) >= t10) return 0.10;
  return 0.20; // Not significant
}

/**
 * Normal CDF approximation
 */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * Calculate confidence interval
 */
export function confidenceInterval(values: number[], confidenceLevel: number = 0.95): ConfidenceInterval {
  const meanVal = mean(values);
  const se = standardError(values);
  
  // Z-score for confidence level (approximation)
  const zScores: { [key: number]: number } = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576
  };
  const zScore = zScores[confidenceLevel] || 1.96;
  
  const margin = zScore * se;
  
  return {
    mean: meanVal,
    lower: meanVal - margin,
    upper: meanVal + margin,
    confidenceLevel,
    standardError: se
  };
}

/**
 * Detect anomalies using modified Z-score (robust to outliers)
 */
export function detectAnomaly(value: number, historicalValues: number[], threshold: number = 3): AnomalyResult {
  if (historicalValues.length < 3) {
    return {
      isAnomaly: false,
      severity: 'minor',
      score: 0,
      expectedValue: value,
      actualValue: value,
      deviationPercent: 0
    };
  }
  
  const medianVal = median(historicalValues);
  const mad = medianAbsoluteDeviation(historicalValues);
  
  // Modified Z-score
  const modifiedZScore = mad === 0 ? 0 : (0.6745 * (value - medianVal)) / mad;
  
  const isAnomaly = Math.abs(modifiedZScore) > threshold;
  const deviationPercent = medianVal === 0 ? 0 : ((value - medianVal) / medianVal) * 100;
  
  // Severity classification
  let severity: 'minor' | 'moderate' | 'critical';
  if (Math.abs(modifiedZScore) > 5) {
    severity = 'critical';
  } else if (Math.abs(modifiedZScore) > 4) {
    severity = 'moderate';
  } else {
    severity = 'minor';
  }
  
  return {
    isAnomaly,
    severity,
    score: modifiedZScore,
    expectedValue: medianVal,
    actualValue: value,
    deviationPercent
  };
}

/**
 * Calculate median
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Calculate median absolute deviation
 */
function medianAbsoluteDeviation(values: number[]): number {
  const medianVal = median(values);
  const deviations = values.map(val => Math.abs(val - medianVal));
  return median(deviations);
}

/**
 * Simple linear regression forecast
 */
export function forecastLinear(values: number[], periodsAhead: number = 1): ForecastResult {
  if (values.length < 3) {
    return {
      predicted: values[values.length - 1] || 0,
      lower: 0,
      upper: 0,
      confidence: 0,
      trend: 'stable',
      trendStrength: 0
    };
  }
  
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;
  
  // Calculate slope and intercept
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Predict
  const predicted = slope * (n + periodsAhead - 1) + intercept;
  
  // Calculate residuals for confidence interval
  const predictions = x.map(xi => slope * xi + intercept);
  const residuals = y.map((yi, i) => yi - predictions[i]);
  const rmse = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / n);
  
  // Confidence interval (approximate)
  const margin = 1.96 * rmse;
  
  // Trend analysis
  const trendStrength = Math.abs(slope) / (mean(values) || 1);
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (slope > 0.05 * mean(values)) trend = 'increasing';
  else if (slope < -0.05 * mean(values)) trend = 'decreasing';
  
  // Confidence based on R-squared
  const yMean = mean(y);
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = 1 - (ssResidual / ssTotal);
  
  return {
    predicted: Math.max(0, predicted),
    lower: Math.max(0, predicted - margin),
    upper: predicted + margin,
    confidence: Math.max(0, Math.min(1, rSquared)),
    trend,
    trendStrength: Math.min(1, trendStrength)
  };
}

/**
 * Exponential smoothing forecast
 */
export function forecastExponential(values: number[], alpha: number = 0.3): number {
  if (values.length === 0) return 0;
  
  let forecast = values[0];
  for (let i = 1; i < values.length; i++) {
    forecast = alpha * values[i] + (1 - alpha) * forecast;
  }
  
  return forecast;
}

/**
 * Calculate correlation coefficient
 */
export function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  
  // length omitted (was unused)
  const meanX = mean(x);
  const meanY = mean(y);
  
  const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const denomX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
  const denomY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
  
  if (denomX === 0 || denomY === 0) return 0;
  
  return numerator / (denomX * denomY);
}

/**
 * Moving average
 */
export function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const subset = values.slice(start, i + 1);
    result.push(mean(subset));
  }
  return result;
}

/**
 * Calculate percentage change
 */
export function percentageChange(before: number, after: number): number {
  if (before === 0) return after > 0 ? 100 : 0;
  return ((after - before) / before) * 100;
}

/**
 * Classify trend strength
 */
export function classifyTrendStrength(trendStrength: number): 'weak' | 'moderate' | 'strong' {
  if (trendStrength > 0.3) return 'strong';
  if (trendStrength > 0.15) return 'moderate';
  return 'weak';
}

/**
 * Calculate confidence score for predictions (0-100)
 */
export function calculateConfidenceScore(
  sampleSize: number,
  variance: number,
  modelFit: number
): number {
  // Factors: larger sample = higher confidence, lower variance = higher confidence, better fit = higher confidence
  const sampleFactor = Math.min(1, sampleSize / 30); // Max out at 30 samples
  const varianceFactor = Math.max(0, 1 - variance / 100); // Assuming variance normalized to 0-100
  const fitFactor = modelFit; // Assuming 0-1
  
  return Math.round((sampleFactor * 0.3 + varianceFactor * 0.3 + fitFactor * 0.4) * 100);
}
