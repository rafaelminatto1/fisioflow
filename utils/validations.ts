/**
 * Utilitários de validação para dados médicos e de sistema
 * Inclui validações para CPF, CNPJ, email, telefone e dados sensíveis
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UserValidationData {
  name?: string;
  email?: string;
  cpf?: string;
  phone?: string;
  role?: string;
}

/**
 * Valida CPF brasileiro
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

/**
 * Valida CNPJ brasileiro
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação dos dígitos verificadores
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Valida telefone brasileiro
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Aceita formatos: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

/**
 * Valida força da senha
 */
export function validatePasswordStrength(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Senha é obrigatória');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida dados de usuário
 */
export function validateUserData(userData: UserValidationData): ValidationResult {
  const errors: string[] = [];
  
  if (!userData.name || userData.name.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }
  
  if (!userData.email || !validateEmail(userData.email)) {
    errors.push('Email inválido');
  }
  
  if (userData.cpf && !validateCPF(userData.cpf)) {
    errors.push('CPF inválido');
  }
  
  if (userData.phone && !validatePhoneNumber(userData.phone)) {
    errors.push('Telefone inválido');
  }
  
  const validRoles = ['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO', 'PACIENTE'];
  if (userData.role && !validRoles.includes(userData.role)) {
    errors.push('Tipo de usuário inválido');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Cria schema de validação para formulários
 */
export function createValidationSchema(fields: string[]) {
  return {
    validate: (data: Record<string, any>): ValidationResult => {
      const errors: string[] = [];
      
      fields.forEach(field => {
        if (!data[field]) {
          errors.push(`Campo ${field} é obrigatório`);
        }
      });
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  };
}

/**
 * Valida data de nascimento
 */
export function validateBirthDate(date: string): boolean {
  if (!date) return false;
  
  const birthDate = new Date(date);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  
  // Verifica se a data é válida e se a pessoa tem entre 0 e 120 anos
  return !isNaN(birthDate.getTime()) && 
         birthDate <= today && 
         age >= 0 && 
         age <= 120;
}

/**
 * Valida CEP brasileiro
 */
export function validateCEP(cep: string): boolean {
  if (!cep) return false;
  
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8 && /^\d{8}$/.test(cleanCEP);
}

/**
 * Sanitiza strings para prevenir XSS
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Valida se um valor está dentro de um range numérico
 */
export function validateRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && 
         !isNaN(value) && 
         value >= min && 
         value <= max;
}