import { fraudDetectionService } from '../../src/services/fraudDetectionService';
import { PaymentMethod, FraudCheckRequest } from '../../src/types/payment';

describe('FraudDetectionService', () => {
  describe('checkTransaction', () => {
    it('should return low risk for normal transaction', async () => {
      const request: FraudCheckRequest = {
        userId: 'user-123',
        amount: 50.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        metadata: {},
      };

      const result = await fraudDetectionService.checkTransaction(request);

      expect(result.isHighRisk).toBe(false);
      expect(result.riskScore).toBeLessThan(0.5);
      expect(result.riskFactors).toHaveLength(0);
    });

    it('should return high risk for large amount transaction', async () => {
      const request: FraudCheckRequest = {
        userId: 'user-123',
        amount: 15000.00, // Large amount
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        metadata: {},
      };

      const result = await fraudDetectionService.checkTransaction(request);

      expect(result.isHighRisk).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.riskFactors).toContain('large_amount');
    });

    it('should return high risk for cryptocurrency payment', async () => {
      const request: FraudCheckRequest = {
        userId: 'user-123',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CRYPTOCURRENCY,
        metadata: {},
      };

      const result = await fraudDetectionService.checkTransaction(request);

      expect(result.isHighRisk).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.riskFactors).toContain('high_risk_payment_method');
    });

    it('should return high risk for unusual currency', async () => {
      const request: FraudCheckRequest = {
        userId: 'user-123',
        amount: 100.00,
        currency: 'XYZ', // Unusual currency
        paymentMethod: PaymentMethod.CREDIT_CARD,
        metadata: {},
      };

      const result = await fraudDetectionService.checkTransaction(request);

      expect(result.isHighRisk).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.riskFactors).toContain('unusual_currency');
    });

    it('should accumulate multiple risk factors', async () => {
      const request: FraudCheckRequest = {
        userId: 'user-123',
        amount: 15000.00, // Large amount
        currency: 'XYZ', // Unusual currency
        paymentMethod: PaymentMethod.CRYPTOCURRENCY, // High risk method
        metadata: {},
      };

      const result = await fraudDetectionService.checkTransaction(request);

      expect(result.isHighRisk).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0.8);
      expect(result.riskFactors).toContain('large_amount');
      expect(result.riskFactors).toContain('unusual_currency');
      expect(result.riskFactors).toContain('high_risk_payment_method');
      expect(result.riskFactors.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle missing metadata gracefully', async () => {
      const request: FraudCheckRequest = {
        userId: 'user-123',
        amount: 50.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        // metadata is undefined
      };

      const result = await fraudDetectionService.checkTransaction(request);

      expect(result).toBeDefined();
      expect(typeof result.isHighRisk).toBe('boolean');
      expect(typeof result.riskScore).toBe('number');
      expect(Array.isArray(result.riskFactors)).toBe(true);
    });
  });
});