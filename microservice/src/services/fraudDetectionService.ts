import { PaymentMethod } from '../types/payment';
import { logger } from '../utils/logger';

interface FraudCheckRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  metadata?: Record<string, any>;
}

interface FraudCheckResult {
  isHighRisk: boolean;
  riskScore: number;
  riskFactors: string[];
  recommendation: 'approve' | 'reject' | 'review';
}

export class FraudDetectionService {
  private readonly riskThresholds = {
    high: 50,
    medium: 30,
    low: 20,
  };

  async checkTransaction(request: FraudCheckRequest): Promise<FraudCheckResult> {
    try {
      const riskFactors: string[] = [];
      let riskScore = 0;

      riskScore += this.checkAmountRisk(request.amount, riskFactors);
      riskScore += this.checkFrequencyRisk(request.userId, riskFactors);
      riskScore += this.checkPaymentMethodRisk(request.paymentMethod, riskFactors);
      riskScore += this.checkCurrencyRisk(request.currency, riskFactors);
      riskScore += this.checkLocationRisk(request.metadata, riskFactors);
      riskScore += this.checkTimeRisk(riskFactors);
      riskScore += this.checkUserBehaviorRisk(request.userId, riskFactors);

      const isHighRisk = riskScore >= this.riskThresholds.high;
      const recommendation = this.getRecommendation(riskScore);

      logger.info('Fraud check completed', {
        userId: request.userId,
        amount: request.amount,
        riskScore,
        riskFactors,
        isHighRisk,
        recommendation,
      });

      return {
        isHighRisk,
        riskScore,
        riskFactors,
        recommendation,
      };
    } catch (error) {
      logger.error('Error in fraud detection:', error);
      
      return {
        isHighRisk: false,
        riskScore: 0,
        riskFactors: [],
        recommendation: 'approve',
      };
    }
  }

  private checkAmountRisk(amount: number, riskFactors: string[]): number {
    if (amount > 10000) {
      riskFactors.push('large_amount');
      return 30;
    } else if (amount > 5000) {
      riskFactors.push('medium_amount');
      return 15;
    } else if (amount > 1000) {
      riskFactors.push('moderate_amount');
      return 5;
    }
    return 0;
  }

  private checkFrequencyRisk(userId: string, riskFactors: string[]): number {
    const recentTransactionCount = Math.floor(Math.random() * 10);
    
    if (recentTransactionCount > 20) {
      riskFactors.push('High transaction frequency');
      return 25;
    } else if (recentTransactionCount > 10) {
      riskFactors.push('Medium transaction frequency');
      return 10;
    }
    return 0;
  }

  private checkPaymentMethodRisk(paymentMethod: PaymentMethod, riskFactors: string[]): number {
    switch (paymentMethod) {
      case PaymentMethod.CRYPTOCURRENCY:
        riskFactors.push('high_risk_payment_method');
        return 40;
      case PaymentMethod.DIGITAL_WALLET:
        riskFactors.push('medium_risk_payment_method');
        return 10;
      case PaymentMethod.BANK_TRANSFER:
        return 5;
      default:
        return 0;
    }
  }

  private checkCurrencyRisk(currency: string, riskFactors: string[]): number {
    const unusualCurrencies = ['XRP', 'BTC', 'ETH', 'LTC', 'DOGE'];
    
    if (unusualCurrencies.includes(currency)) {
      riskFactors.push('unusual_currency');
      return 25;
    }
    
    return 0;
  }

  private checkLocationRisk(metadata: Record<string, any> | undefined, riskFactors: string[]): number {
    if (!metadata?.location) return 0;

    const suspiciousCountries = ['XX', 'YY', 'ZZ'];
    const userCountry = metadata.location.country;

    if (suspiciousCountries.includes(userCountry)) {
      riskFactors.push('Transaction from high-risk country');
      return 30;
    }

    const vpnDetected = metadata.location.vpnDetected;
    if (vpnDetected) {
      riskFactors.push('VPN/Proxy detected');
      return 15;
    }

    return 0;
  }

  private checkTimeRisk(riskFactors: string[]): number {
    const now = new Date();
    const hour = now.getHours();

    if (hour < 6 || hour > 22) {
      riskFactors.push('Transaction during unusual hours');
      return 10;
    }

    return 0;
  }

  private checkUserBehaviorRisk(userId: string, riskFactors: string[]): number {
    const isNewUser = Math.random() < 0.1;
    const hasUnusualPattern = Math.random() < 0.05;

    let risk = 0;

    if (isNewUser) {
      riskFactors.push('New user account');
      risk += 15;
    }

    if (hasUnusualPattern) {
      riskFactors.push('Unusual spending pattern');
      risk += 20;
    }

    return risk;
  }

  private getRecommendation(riskScore: number): 'approve' | 'reject' | 'review' {
    if (riskScore >= this.riskThresholds.high) {
      return 'reject';
    } else if (riskScore >= this.riskThresholds.medium) {
      return 'review';
    } else {
      return 'approve';
    }
  }

  async updateRiskProfile(userId: string, transactionOutcome: 'success' | 'fraud'): Promise<void> {
    try {
      logger.info('Updating risk profile', {
        userId,
        transactionOutcome,
      });
    } catch (error) {
      logger.error('Error updating risk profile:', error);
    }
  }
}

export const fraudDetectionService = new FraudDetectionService();