import { describe, it, expect } from '@jest/globals';
import {
  validateCPF,
  validateEmail,
  validatePhone,
  validateCEP,
  validateCRM,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumeric,
  validateDate,
  validateAge,
  validatePassword,
  formatCPF,
  formatPhone,
  formatCEP,
  formatCurrency,
  formatDate,
  sanitizeInput,
  validatePatientData,
  validateUserData,
  createValidationSchema
} from '../validations';

describe('validations', () => {
  describe('validateCPF', () => {
    it('should validate correct CPF', () => {
      // Valid CPF numbers
      expect(validateCPF('123.456.789-09')).toBe(true);
      expect(validateCPF('12345678909')).toBe(true);
      expect(validateCPF('000.000.001-91')).toBe(true);
    });

    it('should reject invalid CPF', () => {
      // Invalid CPF numbers
      expect(validateCPF('123.456.789-00')).toBe(false);
      expect(validateCPF('111.111.111-11')).toBe(false);
      expect(validateCPF('000.000.000-00')).toBe(false);
      expect(validateCPF('123.456.789')).toBe(false);
      expect(validateCPF('abc.def.ghi-jk')).toBe(false);
      expect(validateCPF('')).toBe(false);
      expect(validateCPF(null as any)).toBe(false);
      expect(validateCPF(undefined as any)).toBe(false);
    });

    it('should handle CPF with different formats', () => {
      expect(validateCPF('123.456.789-09')).toBe(true);
      expect(validateCPF('12345678909')).toBe(true);
      expect(validateCPF('123 456 789 09')).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@email.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
      expect(validateEmail('123@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('test..test@domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate correct Brazilian phone numbers', () => {
      expect(validatePhone('(11) 99999-9999')).toBe(true);
      expect(validatePhone('11999999999')).toBe(true);
      expect(validatePhone('(11) 9999-9999')).toBe(true);
      expect(validatePhone('11999999999')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('1199999999')).toBe(false); // Too short
      expect(validatePhone('119999999999')).toBe(false); // Too long
      expect(validatePhone('abc-def-ghij')).toBe(false);
      expect(validatePhone('')).toBe(false);
      expect(validatePhone(null as any)).toBe(false);
    });
  });

  describe('validateCEP', () => {
    it('should validate correct CEP formats', () => {
      expect(validateCEP('12345-678')).toBe(true);
      expect(validateCEP('12345678')).toBe(true);
    });

    it('should reject invalid CEP', () => {
      expect(validateCEP('1234-567')).toBe(false); // Too short
      expect(validateCEP('123456789')).toBe(false); // Too long
      expect(validateCEP('abcde-fgh')).toBe(false);
      expect(validateCEP('')).toBe(false);
    });
  });

  describe('validateCRM', () => {
    it('should validate correct CRM formats', () => {
      expect(validateCRM('12345/SP')).toBe(true);
      expect(validateCRM('123456/RJ')).toBe(true);
      expect(validateCRM('12345-SP')).toBe(true);
    });

    it('should reject invalid CRM', () => {
      expect(validateCRM('12345')).toBe(false); // Missing state
      expect(validateCRM('12345/ZZ')).toBe(false); // Invalid state
      expect(validateCRM('abc/SP')).toBe(false); // Non-numeric
      expect(validateCRM('')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should pass for valid values', () => {
      expect(validateRequired('test')).toBe(true);
      expect(validateRequired('0')).toBe(true);
      expect(validateRequired(0)).toBe(true);
      expect(validateRequired(false)).toBe(true);
    });

    it('should fail for empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });
  });

  describe('validateMinLength', () => {
    it('should validate minimum length', () => {
      expect(validateMinLength('hello', 3)).toBe(true);
      expect(validateMinLength('hello', 5)).toBe(true);
      expect(validateMinLength('hi', 5)).toBe(false);
      expect(validateMinLength('', 1)).toBe(false);
    });
  });

  describe('validateMaxLength', () => {
    it('should validate maximum length', () => {
      expect(validateMaxLength('hello', 10)).toBe(true);
      expect(validateMaxLength('hello', 5)).toBe(true);
      expect(validateMaxLength('hello world', 5)).toBe(false);
    });
  });

  describe('validateNumeric', () => {
    it('should validate numeric values', () => {
      expect(validateNumeric('123')).toBe(true);
      expect(validateNumeric('123.45')).toBe(true);
      expect(validateNumeric('-123')).toBe(true);
      expect(validateNumeric('0')).toBe(true);
    });

    it('should reject non-numeric values', () => {
      expect(validateNumeric('abc')).toBe(false);
      expect(validateNumeric('12a')).toBe(false);
      expect(validateNumeric('')).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('should validate correct date formats', () => {
      expect(validateDate('2023-12-25')).toBe(true);
      expect(validateDate('25/12/2023')).toBe(true);
      expect(validateDate('2023-01-01')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(validateDate('2023-13-25')).toBe(false); // Invalid month
      expect(validateDate('2023-12-32')).toBe(false); // Invalid day
      expect(validateDate('invalid-date')).toBe(false);
      expect(validateDate('')).toBe(false);
    });

    it('should validate date ranges', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      expect(validateDate(today.toISOString().split('T')[0], { 
        min: yesterday.toISOString().split('T')[0],
        max: tomorrow.toISOString().split('T')[0]
      })).toBe(true);

      expect(validateDate(yesterday.toISOString().split('T')[0], { 
        min: today.toISOString().split('T')[0]
      })).toBe(false);
    });
  });

  describe('validateAge', () => {
    it('should validate age ranges', () => {
      expect(validateAge(25, { min: 18, max: 65 })).toBe(true);
      expect(validateAge(18, { min: 18, max: 65 })).toBe(true);
      expect(validateAge(65, { min: 18, max: 65 })).toBe(true);
    });

    it('should reject ages outside range', () => {
      expect(validateAge(17, { min: 18, max: 65 })).toBe(false);
      expect(validateAge(66, { min: 18, max: 65 })).toBe(false);
      expect(validateAge(-5, { min: 0, max: 120 })).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongPass123!')).toBe(true);
      expect(validatePassword('MySecure#Pass1')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('weak')).toBe(false); // Too short
      expect(validatePassword('weakpassword')).toBe(false); // No uppercase, numbers, special chars
      expect(validatePassword('WEAKPASSWORD')).toBe(false); // No lowercase, numbers, special chars
      expect(validatePassword('WeakPassword')).toBe(false); // No numbers, special chars
      expect(validatePassword('WeakPassword123')).toBe(false); // No special chars
    });

    it('should validate with custom requirements', () => {
      const options = {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      };

      expect(validatePassword('MyLongPassword123', options)).toBe(true);
      expect(validatePassword('short123', options)).toBe(false);
    });
  });

  describe('formatting functions', () => {
    describe('formatCPF', () => {
      it('should format CPF correctly', () => {
        expect(formatCPF('12345678909')).toBe('123.456.789-09');
        expect(formatCPF('123.456.789-09')).toBe('123.456.789-09');
        expect(formatCPF('123456')).toBe('123.456');
      });

      it('should handle invalid input', () => {
        expect(formatCPF('')).toBe('');
        expect(formatCPF(null as any)).toBe('');
        expect(formatCPF('abc')).toBe('abc');
      });
    });

    describe('formatPhone', () => {
      it('should format phone numbers correctly', () => {
        expect(formatPhone('11999999999')).toBe('(11) 99999-9999');
        expect(formatPhone('1199999999')).toBe('(11) 9999-9999');
        expect(formatPhone('11999')).toBe('(11) 999');
      });
    });

    describe('formatCEP', () => {
      it('should format CEP correctly', () => {
        expect(formatCEP('12345678')).toBe('12345-678');
        expect(formatCEP('12345-678')).toBe('12345-678');
        expect(formatCEP('12345')).toBe('12345');
      });
    });

    describe('formatCurrency', () => {
      it('should format currency correctly', () => {
        expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
        expect(formatCurrency(0)).toBe('R$ 0,00');
        expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
      });

      it('should handle different locales', () => {
        expect(formatCurrency(1234.56, 'USD', 'en-US')).toBe('$1,234.56');
      });
    });

    describe('formatDate', () => {
      it('should format dates correctly', () => {
        const date = new Date('2023-12-25T10:30:00');
        expect(formatDate(date, 'DD/MM/YYYY')).toBe('25/12/2023');
        expect(formatDate(date, 'YYYY-MM-DD')).toBe('2023-12-25');
        expect(formatDate(date, 'DD/MM/YYYY HH:mm')).toBe('25/12/2023 10:30');
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML input', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('');
      expect(sanitizeInput('<b>Bold text</b>')).toBe('Bold text');
      expect(sanitizeInput('Normal text')).toBe('Normal text');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('\n\ttest\n\t')).toBe('test');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('complex validation schemas', () => {
    describe('validatePatientData', () => {
      it('should validate complete patient data', () => {
        const validPatient = {
          name: 'João Silva',
          cpf: '123.456.789-09',
          email: 'joao@email.com',
          phone: '(11) 99999-9999',
          birthDate: '1990-01-01',
          address: {
            street: 'Rua das Flores, 123',
            city: 'São Paulo',
            state: 'SP',
            cep: '12345-678'
          }
        };

        const result = validatePatientData(validPatient);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual({});
      });

      it('should return errors for invalid patient data', () => {
        const invalidPatient = {
          name: '',
          cpf: '123.456.789-00', // Invalid CPF
          email: 'invalid-email',
          phone: '123',
          birthDate: '2030-01-01', // Future date
          address: {
            street: '',
            city: '',
            state: 'XX', // Invalid state
            cep: '123'
          }
        };

        const result = validatePatientData(invalidPatient);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveProperty('name');
        expect(result.errors).toHaveProperty('cpf');
        expect(result.errors).toHaveProperty('email');
        expect(result.errors).toHaveProperty('phone');
        expect(result.errors).toHaveProperty('birthDate');
        expect(result.errors).toHaveProperty('address.street');
        expect(result.errors).toHaveProperty('address.city');
        expect(result.errors).toHaveProperty('address.state');
        expect(result.errors).toHaveProperty('address.cep');
      });
    });

    describe('validateUserData', () => {
      it('should validate complete user data', () => {
        const validUser = {
          name: 'Dr. João Silva',
          email: 'dr.joao@clinic.com',
          password: 'SecurePass123!',
          role: 'FISIOTERAPEUTA',
          crm: '12345/SP',
          phone: '(11) 99999-9999'
        };

        const result = validateUserData(validUser);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual({});
      });

      it('should validate role-specific requirements', () => {
        const physiotherapistUser = {
          name: 'Dr. João Silva',
          email: 'dr.joao@clinic.com',
          password: 'SecurePass123!',
          role: 'FISIOTERAPEUTA',
          // Missing CRM for physiotherapist
          phone: '(11) 99999-9999'
        };

        const result = validateUserData(physiotherapistUser);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveProperty('crm');
      });
    });

    describe('createValidationSchema', () => {
      it('should create custom validation schema', () => {
        const schema = createValidationSchema({
          username: [
            { validator: validateRequired, message: 'Username is required' },
            { validator: (value) => validateMinLength(value, 3), message: 'Username must be at least 3 characters' }
          ],
          age: [
            { validator: validateNumeric, message: 'Age must be numeric' },
            { validator: (value) => validateAge(parseInt(value), { min: 18, max: 100 }), message: 'Age must be between 18 and 100' }
          ]
        });

        const validData = { username: 'johndoe', age: '25' };
        const invalidData = { username: 'jo', age: '15' };

        expect(schema.validate(validData).isValid).toBe(true);
        expect(schema.validate(invalidData).isValid).toBe(false);
        expect(schema.validate(invalidData).errors).toHaveProperty('username');
        expect(schema.validate(invalidData).errors).toHaveProperty('age');
      });

      it('should support conditional validation', () => {
        const schema = createValidationSchema({
          userType: [
            { validator: validateRequired, message: 'User type is required' }
          ],
          crm: [
            { 
              validator: (value, data) => data.userType !== 'FISIOTERAPEUTA' || validateCRM(value),
              message: 'CRM is required for physiotherapists' 
            }
          ]
        });

        const physiotherapistData = { userType: 'FISIOTERAPEUTA', crm: '' };
        const adminData = { userType: 'ADMIN', crm: '' };

        expect(schema.validate(physiotherapistData).isValid).toBe(false);
        expect(schema.validate(adminData).isValid).toBe(true);
      });
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i.toString(),
        name: `User ${i}`,
        email: `user${i}@example.com`,
        cpf: '123.456.789-09'
      }));

      const startTime = Date.now();
      
      largeDataset.forEach(user => {
        validateEmail(user.email);
        validateCPF(user.cpf);
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (< 1 second)
      expect(executionTime).toBeLessThan(1000);
    });

    it('should handle special characters and unicode', () => {
      expect(validateEmail('joão@email.com')).toBe(true);
      expect(sanitizeInput('José da Silva')).toBe('José da Silva');
      expect(formatCPF('12345678909')).toBe('123.456.789-09');
    });

    it('should be consistent across multiple calls', () => {
      const cpf = '123.456.789-09';
      const email = 'test@email.com';

      // Multiple calls should return same result
      for (let i = 0; i < 100; i++) {
        expect(validateCPF(cpf)).toBe(true);
        expect(validateEmail(email)).toBe(true);
      }
    });

    it('should handle memory efficiently', () => {
      // Test that validation functions don't create memory leaks
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      for (let i = 0; i < 1000; i++) {
        validateCPF('123.456.789-09');
        validateEmail('test@email.com');
        validatePhone('(11) 99999-9999');
        formatCPF('12345678909');
        sanitizeInput(`<script>test${i}</script>`);
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });
  });
});