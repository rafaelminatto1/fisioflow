# Integridade de Dados + Escalabilidade - FisioFlow

## Estratégias Técnicas Avançadas

---

## 🔐 **INTEGRIDADE DE DADOS**

### **1. VALIDAÇÃO EM MÚLTIPLAS CAMADAS**

#### **1.1 Frontend Validation (TypeScript)**

```typescript
// types/validation.ts
import { z } from 'zod';

// Schema de validação para paciente
export const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  birthDate: z.date().max(new Date(), 'Data de nascimento não pode ser futura'),
  medicalHistory: z.string().max(5000, 'Histórico médico muito longo'),
  tenantId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para consulta
export const AppointmentSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    therapistId: z.string().uuid(),
    startTime: z.date(),
    endTime: z.date(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
    notes: z.string().max(2000).optional(),
    tenantId: z.string().uuid(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'Horário de fim deve ser posterior ao início',
    path: ['endTime'],
  });

// Validador genérico
export class DataValidator {
  static validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): ValidationResult<T> {
    try {
      const validData = schema.parse(data);
      return { success: true, data: validData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        };
      }
      return {
        success: false,
        errors: [
          { field: 'unknown', message: 'Erro de validação desconhecido' },
        ],
      };
    }
  }

  static validateBatch<T>(
    schema: z.ZodSchema<T>,
    dataArray: unknown[]
  ): BatchValidationResult<T> {
    const results = dataArray.map((data, index) => ({
      index,
      result: this.validate(schema, data),
    }));

    const valid = results.filter((r) => r.result.success);
    const invalid = results.filter((r) => !r.result.success);

    return {
      validCount: valid.length,
      invalidCount: invalid.length,
      validData: valid.map((r) => r.result.data!),
      errors: invalid.map((r) => ({
        index: r.index,
        errors: r.result.errors!,
      })),
    };
  }
}

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

type BatchValidationResult<T> = {
  validCount: number;
  invalidCount: number;
  validData: T[];
  errors: { index: number; errors: ValidationError[] }[];
};

type ValidationError = {
  field: string;
  message: string;
};
```

#### **1.2 Backend Validation (Python/SQLAlchemy)**

```python
# models/validators.py
from sqlalchemy import event
from sqlalchemy.orm import validates
from marshmallow import Schema, fields, validate, ValidationError
import re
from datetime import datetime, date
from typing import Dict, List, Any

class PatientValidator(Schema):
    id = fields.UUID(required=True)
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    email = fields.Email(allow_none=True)
    phone = fields.Str(required=True, validate=validate.Regexp(r'^\+?[1-9]\d{1,14}$'))
    cpf = fields.Str(required=True, validate=validate.Regexp(r'^\d{11}$'))
    birth_date = fields.Date(required=True)
    medical_history = fields.Str(validate=validate.Length(max=5000))
    tenant_id = fields.UUID(required=True)

    def validate_birth_date(self, value):
        if value > date.today():
            raise ValidationError('Data de nascimento não pode ser futura')
        return value

    def validate_cpf(self, value):
        # Validação de CPF brasileiro
        if not self._is_valid_cpf(value):
            raise ValidationError('CPF inválido')
        return value

    @staticmethod
    def _is_valid_cpf(cpf: str) -> bool:
        # Implementação da validação de CPF
        if len(cpf) != 11 or cpf == cpf[0] * 11:
            return False

        # Cálculo dos dígitos verificadores
        for i in range(9, 11):
            value = sum((int(cpf[num]) * ((i+1) - num) for num in range(0, i)))
            digit = ((value * 10) % 11) % 10
            if digit != int(cpf[i]):
                return False
        return True

class AppointmentValidator(Schema):
    id = fields.UUID(required=True)
    patient_id = fields.UUID(required=True)
    therapist_id = fields.UUID(required=True)
    start_time = fields.DateTime(required=True)
    end_time = fields.DateTime(required=True)
    status = fields.Str(validate=validate.OneOf(['scheduled', 'in_progress', 'completed', 'cancelled']))
    notes = fields.Str(validate=validate.Length(max=2000))
    tenant_id = fields.UUID(required=True)

    def validate_time_range(self, data, **kwargs):
        if data['end_time'] <= data['start_time']:
            raise ValidationError('Horário de fim deve ser posterior ao início')

        # Validar se não há conflito com outras consultas
        duration = data['end_time'] - data['start_time']
        if duration.total_seconds() < 900:  # 15 minutos mínimo
            raise ValidationError('Consulta deve ter pelo menos 15 minutos')

        if duration.total_seconds() > 14400:  # 4 horas máximo
            raise ValidationError('Consulta não pode exceder 4 horas')

        return data

# Decorador para validação automática
def validate_data(validator_class):
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Assumindo que o primeiro argumento é o data
            data = args[0] if args else kwargs.get('data')

            validator = validator_class()
            try:
                validated_data = validator.load(data)
                return func(validated_data, *args[1:], **kwargs)
            except ValidationError as e:
                raise ValueError(f"Dados inválidos: {e.messages}")
        return wrapper
    return decorator

# Uso do decorador
class PatientService:
    @validate_data(PatientValidator)
    def create_patient(self, data: Dict[str, Any]) -> Patient:
        # data já está validado aqui
        patient = Patient(**data)
        db.session.add(patient)
        db.session.commit()
        return patient

    @validate_data(PatientValidator)
    def update_patient(self, patient_id: str, data: Dict[str, Any]) -> Patient:
        patient = Patient.query.get_or_404(patient_id)
        for key, value in data.items():
            setattr(patient, key, value)
        db.session.commit()
        return patient
```

### **2. AUDITORIA COMPLETA**

#### **2.1 Sistema de Audit Trail**

```python
# models/audit.py
from sqlalchemy import Column, String, DateTime, Text, JSON, event
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import json
from typing import Dict, Any, Optional

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(100), nullable=False)
    action = Column(String(20), nullable=False)  # INSERT, UPDATE, DELETE
    old_values = Column(JSON)
    new_values = Column(JSON)
    changed_fields = Column(JSON)
    user_id = Column(UUID(as_uuid=True))
    tenant_id = Column(UUID(as_uuid=True))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    @classmethod
    def log_change(cls, table_name: str, record_id: str, action: str,
                   old_values: Optional[Dict] = None, new_values: Optional[Dict] = None,
                   user_id: Optional[str] = None, tenant_id: Optional[str] = None,
                   ip_address: Optional[str] = None, user_agent: Optional[str] = None):

        changed_fields = []
        if old_values and new_values:
            changed_fields = [
                field for field in new_values.keys()
                if old_values.get(field) != new_values.get(field)
            ]

        audit_log = cls(
            table_name=table_name,
            record_id=record_id,
            action=action,
            old_values=old_values,
            new_values=new_values,
            changed_fields=changed_fields,
            user_id=user_id,
            tenant_id=tenant_id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        db.session.add(audit_log)
        db.session.commit()

# Mixin para modelos auditáveis
class AuditableMixin:
    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

    def get_audit_data(self):
        return {
            'table_name': self.__tablename__,
            'record_id': str(self.id),
            'tenant_id': getattr(self, 'tenant_id', None)
        }

# Event listeners para auditoria automática
@event.listens_for(db.session, 'before_flush')
def before_flush(session, flush_context, instances):
    # Capturar estado antes das mudanças
    session._audit_changes = {
        'new': [],
        'dirty': [],
        'deleted': []
    }

    for obj in session.new:
        if isinstance(obj, AuditableMixin):
            session._audit_changes['new'].append({
                'object': obj,
                'data': obj.to_dict()
            })

    for obj in session.dirty:
        if isinstance(obj, AuditableMixin):
            # Capturar valores antigos
            old_values = {}
            for attr in session.get_attribute_history(obj, 'id').unchanged:
                old_values = obj.to_dict()
                break

            session._audit_changes['dirty'].append({
                'object': obj,
                'old_values': old_values,
                'new_values': obj.to_dict()
            })

    for obj in session.deleted:
        if isinstance(obj, AuditableMixin):
            session._audit_changes['deleted'].append({
                'object': obj,
                'data': obj.to_dict()
            })

@event.listens_for(db.session, 'after_flush')
def after_flush(session, flush_context):
    if not hasattr(session, '_audit_changes'):
        return

    # Obter informações do usuário atual (via Flask-Login ou similar)
    current_user = get_current_user()
    request_info = get_request_info()

    # Log das inserções
    for change in session._audit_changes['new']:
        obj = change['object']
        audit_data = obj.get_audit_data()

        AuditLog.log_change(
            table_name=audit_data['table_name'],
            record_id=audit_data['record_id'],
            action='INSERT',
            new_values=change['data'],
            user_id=current_user.id if current_user else None,
            tenant_id=audit_data['tenant_id'],
            ip_address=request_info.get('ip'),
            user_agent=request_info.get('user_agent')
        )

    # Log das atualizações
    for change in session._audit_changes['dirty']:
        obj = change['object']
        audit_data = obj.get_audit_data()

        AuditLog.log_change(
            table_name=audit_data['table_name'],
            record_id=audit_data['record_id'],
            action='UPDATE',
            old_values=change['old_values'],
            new_values=change['new_values'],
            user_id=current_user.id if current_user else None,
            tenant_id=audit_data['tenant_id'],
            ip_address=request_info.get('ip'),
            user_agent=request_info.get('user_agent')
        )

    # Log das exclusões
    for change in session._audit_changes['deleted']:
        obj = change['object']
        audit_data = obj.get_audit_data()

        AuditLog.log_change(
            table_name=audit_data['table_name'],
            record_id=audit_data['record_id'],
            action='DELETE',
            old_values=change['data'],
            user_id=current_user.id if current_user else None,
            tenant_id=audit_data['tenant_id'],
            ip_address=request_info.get('ip'),
            user_agent=request_info.get('user_agent')
        )
```

### **3. BACKUP E RECOVERY**

#### **3.1 Estratégia de Backup Automatizado**

```python
# services/backup_service.py
import os
import boto3
import gzip
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy import text
from celery import Celery

class BackupService:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.bucket_name = os.getenv('BACKUP_BUCKET')
        self.encryption_key = os.getenv('BACKUP_ENCRYPTION_KEY')

    def create_full_backup(self, tenant_id: str = None) -> Dict[str, Any]:
        """Cria backup completo do banco de dados"""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_id = f"backup_{timestamp}_{tenant_id or 'all'}"

        try:
            # 1. Backup do schema
            schema_backup = self._backup_schema()

            # 2. Backup dos dados
            if tenant_id:
                data_backup = self._backup_tenant_data(tenant_id)
            else:
                data_backup = self._backup_all_data()

            # 3. Backup de arquivos
            files_backup = self._backup_files(tenant_id)

            # 4. Criar manifesto do backup
            manifest = {
                'backup_id': backup_id,
                'timestamp': timestamp,
                'tenant_id': tenant_id,
                'type': 'full',
                'schema_file': f"{backup_id}_schema.sql",
                'data_file': f"{backup_id}_data.json.gz",
                'files_manifest': f"{backup_id}_files.json",
                'checksum': self._calculate_checksum(data_backup)
            }

            # 5. Upload para S3
            self._upload_to_s3(backup_id, {
                'manifest': manifest,
                'schema': schema_backup,
                'data': data_backup,
                'files': files_backup
            })

            # 6. Registrar backup no banco
            self._register_backup(manifest)

            return {
                'success': True,
                'backup_id': backup_id,
                'size_mb': len(json.dumps(data_backup)) / (1024 * 1024)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def create_incremental_backup(self, tenant_id: str, since: datetime) -> Dict[str, Any]:
        """Cria backup incremental desde uma data específica"""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_id = f"incremental_{timestamp}_{tenant_id}"

        try:
            # Buscar mudanças desde a última data
            changes = self._get_changes_since(tenant_id, since)

            manifest = {
                'backup_id': backup_id,
                'timestamp': timestamp,
                'tenant_id': tenant_id,
                'type': 'incremental',
                'since': since.isoformat(),
                'changes_count': len(changes),
                'data_file': f"{backup_id}_changes.json.gz"
            }

            # Comprimir e fazer upload
            compressed_changes = gzip.compress(json.dumps(changes).encode())

            self._upload_to_s3(backup_id, {
                'manifest': manifest,
                'changes': compressed_changes
            })

            self._register_backup(manifest)

            return {
                'success': True,
                'backup_id': backup_id,
                'changes_count': len(changes)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def restore_backup(self, backup_id: str, target_tenant_id: str = None) -> Dict[str, Any]:
        """Restaura um backup específico"""
        try:
            # 1. Baixar manifesto
            manifest = self._download_manifest(backup_id)

            # 2. Validar integridade
            if not self._validate_backup_integrity(backup_id, manifest):
                return {'success': False, 'error': 'Backup corrompido'}

            # 3. Criar ponto de restauração
            restore_point = self.create_full_backup(target_tenant_id)

            # 4. Executar restauração
            if manifest['type'] == 'full':
                result = self._restore_full_backup(backup_id, manifest, target_tenant_id)
            else:
                result = self._restore_incremental_backup(backup_id, manifest, target_tenant_id)

            if result['success']:
                # 5. Registrar restauração
                self._register_restore(backup_id, target_tenant_id, restore_point['backup_id'])

            return result

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _get_changes_since(self, tenant_id: str, since: datetime) -> List[Dict]:
        """Busca mudanças no audit log desde uma data"""
        query = text("""
            SELECT table_name, record_id, action, old_values, new_values, timestamp
            FROM audit_logs
            WHERE tenant_id = :tenant_id
            AND timestamp > :since
            ORDER BY timestamp ASC
        """)

        result = db.session.execute(query, {
            'tenant_id': tenant_id,
            'since': since
        })

        return [dict(row) for row in result]

    def _backup_tenant_data(self, tenant_id: str) -> Dict[str, Any]:
        """Backup dos dados de um tenant específico"""
        tables = [
            'users', 'patients', 'appointments', 'exercises',
            'prescriptions', 'exercise_logs', 'documents'
        ]

        backup_data = {}

        for table in tables:
            query = text(f"SELECT * FROM {table} WHERE tenant_id = :tenant_id")
            result = db.session.execute(query, {'tenant_id': tenant_id})
            backup_data[table] = [dict(row) for row in result]

        return backup_data

# Tarefas Celery para backup automático
celery_app = Celery('fisioflow')

@celery_app.task
def daily_backup():
    """Backup diário automático"""
    backup_service = BackupService()

    # Backup completo de todos os tenants
    tenants = db.session.execute(text("SELECT id FROM tenants WHERE active = true")).fetchall()

    results = []
    for tenant in tenants:
        result = backup_service.create_full_backup(str(tenant.id))
        results.append(result)

    # Cleanup de backups antigos (manter últimos 30 dias)
    cleanup_old_backups(days=30)

    return results

@celery_app.task
def hourly_incremental_backup():
    """Backup incremental de hora em hora"""
    backup_service = BackupService()
    since = datetime.utcnow() - timedelta(hours=1)

    tenants = db.session.execute(text("SELECT id FROM tenants WHERE active = true")).fetchall()

    results = []
    for tenant in tenants:
        result = backup_service.create_incremental_backup(str(tenant.id), since)
        results.append(result)

    return results
```

---

## 🚀 **ESCALABILIDADE**

### **1. ARQUITETURA MICROSERVIÇOS**

#### **1.1 Separação de Serviços**

```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - auth-service
      - patient-service
      - appointment-service
      - notification-service

  # Serviço de Autenticação
  auth-service:
    build: ./services/auth
    environment:
      - DATABASE_URL=postgresql://user:pass@auth-db:5432/auth
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - auth-db
      - redis

  # Serviço de Pacientes
  patient-service:
    build: ./services/patients
    environment:
      - DATABASE_URL=postgresql://user:pass@patient-db:5432/patients
      - AUTH_SERVICE_URL=http://auth-service:5000
    depends_on:
      - patient-db

  # Serviço de Agendamentos
  appointment-service:
    build: ./services/appointments
    environment:
      - DATABASE_URL=postgresql://user:pass@appointment-db:5432/appointments
      - PATIENT_SERVICE_URL=http://patient-service:5000
    depends_on:
      - appointment-db

  # Serviço de Notificações
  notification-service:
    build: ./services/notifications
    environment:
      - REDIS_URL=redis://redis:6379
      - SMTP_HOST=${SMTP_HOST}
      - TWILIO_SID=${TWILIO_SID}
    depends_on:
      - redis

  # Bancos de dados separados
  auth-db:
    image: postgres:13
    environment:
      POSTGRES_DB: auth
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - auth_data:/var/lib/postgresql/data

  patient-db:
    image: postgres:13
    environment:
      POSTGRES_DB: patients
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - patient_data:/var/lib/postgresql/data

  appointment-db:
    image: postgres:13
    environment:
      POSTGRES_DB: appointments
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - appointment_data:/var/lib/postgresql/data

  # Cache e Message Broker
  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

  # Message Queue
  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin
    ports:
      - '15672:15672'
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  # Monitoring
  prometheus:
    image: prom/prometheus
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - '3000:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  auth_data:
  patient_data:
  appointment_data:
  redis_data:
  rabbitmq_data:
  grafana_data:
```

#### **1.2 Service Communication**

```python
# services/base/service_client.py
import httpx
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import json
from functools import wraps

class ServiceClient:
    def __init__(self, base_url: str, service_name: str):
        self.base_url = base_url
        self.service_name = service_name
        self.client = httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
        )
        self._circuit_breaker = CircuitBreaker()

    async def get(self, endpoint: str, params: Optional[Dict] = None, headers: Optional[Dict] = None) -> Dict[str, Any]:
        return await self._make_request('GET', endpoint, params=params, headers=headers)

    async def post(self, endpoint: str, data: Optional[Dict] = None, headers: Optional[Dict] = None) -> Dict[str, Any]:
        return await self._make_request('POST', endpoint, json=data, headers=headers)

    async def put(self, endpoint: str, data: Optional[Dict] = None, headers: Optional[Dict] = None) -> Dict[str, Any]:
        return await self._make_request('PUT', endpoint, json=data, headers=headers)

    async def delete(self, endpoint: str, headers: Optional[Dict] = None) -> Dict[str, Any]:
        return await self._make_request('DELETE', endpoint, headers=headers)

    @circuit_breaker
    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"

        # Add correlation ID for tracing
        headers = kwargs.get('headers', {})
        headers['X-Correlation-ID'] = self._generate_correlation_id()
        headers['X-Service-Name'] = self.service_name
        kwargs['headers'] = headers

        try:
            response = await self.client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as e:
            if e.response.status_code >= 500:
                raise ServiceUnavailableError(f"{self.service_name} service unavailable")
            else:
                raise ServiceError(f"Service error: {e.response.status_code}")

        except httpx.RequestError as e:
            raise ServiceConnectionError(f"Connection error to {self.service_name}: {str(e)}")

    def _generate_correlation_id(self) -> str:
        return f"{self.service_name}-{datetime.utcnow().timestamp()}"

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN

    def __call__(self, func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == 'OPEN':
                if datetime.utcnow() - self.last_failure_time > timedelta(seconds=self.timeout):
                    self.state = 'HALF_OPEN'
                else:
                    raise ServiceUnavailableError("Circuit breaker is OPEN")

            try:
                result = await func(*args, **kwargs)
                if self.state == 'HALF_OPEN':
                    self.state = 'CLOSED'
                    self.failure_count = 0
                return result

            except Exception as e:
                self.failure_count += 1
                self.last_failure_time = datetime.utcnow()

                if self.failure_count >= self.failure_threshold:
                    self.state = 'OPEN'

                raise e

        return wrapper

# Clientes específicos para cada serviço
class PatientServiceClient(ServiceClient):
    def __init__(self):
        super().__init__(os.getenv('PATIENT_SERVICE_URL'), 'patient-service')

    async def get_patient(self, patient_id: str, tenant_id: str) -> Dict[str, Any]:
        return await self.get(f"/patients/{patient_id}", headers={'X-Tenant-ID': tenant_id})

    async def create_patient(self, patient_data: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        return await self.post("/patients", data=patient_data, headers={'X-Tenant-ID': tenant_id})

    async def search_patients(self, query: str, tenant_id: str) -> Dict[str, Any]:
        return await self.get("/patients/search", params={'q': query}, headers={'X-Tenant-ID': tenant_id})

class AppointmentServiceClient(ServiceClient):
    def __init__(self):
        super().__init__(os.getenv('APPOINTMENT_SERVICE_URL'), 'appointment-service')

    async def get_appointments(self, patient_id: str, tenant_id: str) -> Dict[str, Any]:
        return await self.get(f"/appointments", params={'patient_id': patient_id}, headers={'X-Tenant-ID': tenant_id})

    async def create_appointment(self, appointment_data: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        return await self.post("/appointments", data=appointment_data, headers={'X-Tenant-ID': tenant_id})

# Service Registry
class ServiceRegistry:
    def __init__(self):
        self.services = {
            'patient': PatientServiceClient(),
            'appointment': AppointmentServiceClient(),
            'auth': ServiceClient(os.getenv('AUTH_SERVICE_URL'), 'auth-service'),
            'notification': ServiceClient(os.getenv('NOTIFICATION_SERVICE_URL'), 'notification-service')
        }

    def get_service(self, service_name: str) -> ServiceClient:
        if service_name not in self.services:
            raise ValueError(f"Service {service_name} not found")
        return self.services[service_name]

# Singleton instance
service_registry = ServiceRegistry()
```

### **2. CACHING ESTRATÉGICO**

#### **2.1 Multi-Level Cache**

```python
# services/cache/cache_manager.py
import redis
import json
import pickle
from typing import Any, Optional, Dict, List
from datetime import timedelta
from functools import wraps
import hashlib

class CacheManager:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=0,
            decode_responses=False
        )
        self.local_cache = {}  # In-memory cache
        self.local_cache_ttl = {}  # TTL tracking

    def get(self, key: str, use_local: bool = True) -> Optional[Any]:
        # 1. Try local cache first
        if use_local and self._is_local_cache_valid(key):
            return self.local_cache[key]

        # 2. Try Redis cache
        try:
            data = self.redis_client.get(key)
            if data:
                value = pickle.loads(data)
                # Update local cache
                if use_local:
                    self._set_local_cache(key, value, ttl=300)  # 5 minutes
                return value
        except Exception as e:
            print(f"Redis error: {e}")

        return None

    def set(self, key: str, value: Any, ttl: int = 3600, use_local: bool = True) -> bool:
        try:
            # Set in Redis
            serialized = pickle.dumps(value)
            self.redis_client.setex(key, ttl, serialized)

            # Set in local cache
            if use_local:
                local_ttl = min(ttl, 300)  # Max 5 minutes for local
                self._set_local_cache(key, value, local_ttl)

            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        try:
            # Delete from Redis
            self.redis_client.delete(key)

            # Delete from local cache
            if key in self.local_cache:
                del self.local_cache[key]
            if key in self.local_cache_ttl:
                del self.local_cache_ttl[key]

            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False

    def invalidate_pattern(self, pattern: str) -> int:
        """Invalida todas as chaves que correspondem ao padrão"""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted = self.redis_client.delete(*keys)

                # Remove from local cache
                for key in list(self.local_cache.keys()):
                    if self._match_pattern(key, pattern):
                        del self.local_cache[key]
                        if key in self.local_cache_ttl:
                            del self.local_cache_ttl[key]

                return deleted
            return 0
        except Exception as e:
            print(f"Cache invalidate error: {e}")
            return 0

    def _set_local_cache(self, key: str, value: Any, ttl: int):
        self.local_cache[key] = value
        self.local_cache_ttl[key] = datetime.utcnow() + timedelta(seconds=ttl)

    def _is_local_cache_valid(self, key: str) -> bool:
        if key not in self.local_cache:
            return False

        if key in self.local_cache_ttl:
            return datetime.utcnow() < self.local_cache_ttl[key]

        return False

    def _match_pattern(self, key: str, pattern: str) -> bool:
        # Simple pattern matching (pode ser melhorado)
        return pattern.replace('*', '') in key

# Cache decorators
def cache_result(ttl: int = 3600, key_prefix: str = "", use_tenant: bool = True):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = _generate_cache_key(func, args, kwargs, key_prefix, use_tenant)

            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl)

            return result
        return wrapper
    return decorator

def invalidate_cache(pattern: str = None, keys: List[str] = None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)

            # Invalidate specified patterns
            if pattern:
                cache_manager.invalidate_pattern(pattern)

            # Invalidate specific keys
            if keys:
                for key in keys:
                    cache_manager.delete(key)

            return result
        return wrapper
    return decorator

def _generate_cache_key(func, args, kwargs, prefix: str, use_tenant: bool) -> str:
    # Create a unique key based on function name and parameters
    func_name = f"{func.__module__}.{func.__name__}"

    # Serialize arguments
    args_str = str(args)
    kwargs_str = str(sorted(kwargs.items()))

    # Create hash
    content = f"{func_name}:{args_str}:{kwargs_str}"
    hash_key = hashlib.md5(content.encode()).hexdigest()

    # Add tenant context if needed
    if use_tenant:
        tenant_id = get_current_tenant_id()  # Function to get current tenant
        hash_key = f"{tenant_id}:{hash_key}"

    # Add prefix
    if prefix:
        hash_key = f"{prefix}:{hash_key}"

    return hash_key

# Global cache manager instance
cache_manager = CacheManager()

# Usage examples
class PatientService:
    @cache_result(ttl=1800, key_prefix="patient")  # 30 minutes
    def get_patient(self, patient_id: str, tenant_id: str):
        # Database query here
        return Patient.query.filter_by(id=patient_id, tenant_id=tenant_id).first()

    @invalidate_cache(pattern="patient:*")
    def update_patient(self, patient_id: str, data: Dict[str, Any]):
        # Update patient in database
        patient = Patient.query.get(patient_id)
        for key, value in data.items():
            setattr(patient, key, value)
        db.session.commit()
        return patient

    @cache_result(ttl=600, key_prefix="patient_list")  # 10 minutes
    def get_patients_by_therapist(self, therapist_id: str, tenant_id: str):
        return Patient.query.filter_by(
            therapist_id=therapist_id,
            tenant_id=tenant_id
        ).all()
```

### **3. DATABASE SHARDING**

#### **3.1 Tenant-based Sharding**

```python
# database/sharding.py
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, scoped_session
from typing import Dict, Optional
import hashlib
import os

class DatabaseShardManager:
    def __init__(self):
        self.shards = {}
        self.shard_config = {
            'shard_1': os.getenv('DATABASE_SHARD_1_URL'),
            'shard_2': os.getenv('DATABASE_SHARD_2_URL'),
            'shard_3': os.getenv('DATABASE_SHARD_3_URL'),
        }
        self.sessions = {}
        self._initialize_shards()

    def _initialize_shards(self):
        for shard_name, connection_string in self.shard_config.items():
            engine = create_engine(
                connection_string,
                pool_size=20,
                max_overflow=30,
                pool_pre_ping=True,
                pool_recycle=3600
            )

            session_factory = sessionmaker(bind=engine)
            self.sessions[shard_name] = scoped_session(session_factory)
            self.shards[shard_name] = engine

    def get_shard_for_tenant(self, tenant_id: str) -> str:
        """Determina qual shard usar baseado no tenant_id"""
        # Hash do tenant_id para distribuição uniforme
        hash_value = int(hashlib.md5(tenant_id.encode()).hexdigest(), 16)
        shard_index = hash_value % len(self.shard_config)
        return f"shard_{shard_index + 1}"

    def get_session(self, tenant_id: str):
        """Retorna a sessão do banco para o tenant específico"""
        shard_name = self.get_shard_for_tenant(tenant_id)
        return self.sessions[shard_name]

    def get_engine(self, tenant_id: str):
        """Retorna o engine do banco para o tenant específico"""
        shard_name = self.get_shard_for_tenant(tenant_id)
        return self.shards[shard_name]

    def execute_on_all_shards(self, query: str, params: Optional[Dict] = None):
        """Executa uma query em todos os shards"""
        results = {}
        for shard_name, session in self.sessions.items():
            try:
                result = session.execute(query, params or {})
                results[shard_name] = result.fetchall()
            except Exception as e:
                results[shard_name] = {'error': str(e)}
        return results

    def migrate_tenant(self, tenant_id: str, target_shard: str):
        """Migra um tenant para outro shard"""
        current_shard = self.get_shard_for_tenant(tenant_id)

        if current_shard == target_shard:
            return {'success': True, 'message': 'Tenant já está no shard correto'}

        try:
            # 1. Backup dos dados do tenant
            backup_data = self._backup_tenant_data(tenant_id, current_shard)

            # 2. Inserir dados no novo shard
            self._restore_tenant_data(tenant_id, target_shard, backup_data)

            # 3. Verificar integridade
            if self._verify_migration(tenant_id, current_shard, target_shard):
                # 4. Remover dados do shard antigo
                self._cleanup_tenant_data(tenant_id, current_shard)

                # 5. Atualizar mapeamento (se usando tabela de mapeamento)
                self._update_tenant_mapping(tenant_id, target_shard)

                return {'success': True, 'message': 'Migração concluída'}
            else:
                # Rollback
                self._cleanup_tenant_data(tenant_id, target_shard)
                return {'success': False, 'message': 'Falha na verificação'}

        except Exception as e:
            return {'success': False, 'message': f'Erro na migração: {str(e)}'}

# Context manager para sessões com tenant
class TenantSession:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.session = shard_manager.get_session(tenant_id)

    def __enter__(self):
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.session.rollback()
        else:
            self.session.commit()
        self.session.close()

# Global shard manager
shard_manager = DatabaseShardManager()

# Usage example
def get_patient_with_sharding(patient_id: str, tenant_id: str):
    with TenantSession(tenant_id) as session:
        return session.query(Patient).filter_by(
            id=patient_id,
            tenant_id=tenant_id
        ).first()
```

---

## 📈 **MONITORAMENTO E OBSERVABILIDADE**

### **1. MÉTRICAS CUSTOMIZADAS**

```python
# monitoring/metrics.py
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
import time
from functools import wraps
from typing import Dict, Any

# Métricas customizadas
REQUEST_COUNT = Counter(
    'fisioflow_requests_total',
    'Total requests',
    ['method', 'endpoint', 'status', 'tenant_id']
)

REQUEST_DURATION = Histogram(
    'fisioflow_request_duration_seconds',
    'Request duration',
    ['method', 'endpoint', 'tenant_id']
)

ACTIVE_USERS = Gauge(
    'fisioflow_active_users',
    'Active users',
    ['tenant_id', 'user_role']
)

DATABASE_CONNECTIONS = Gauge(
    'fisioflow_database_connections',
    'Database connections',
    ['shard', 'status']
)

CACHE_HITS = Counter(
    'fisioflow_cache_hits_total',
    'Cache hits',
    ['cache_type', 'tenant_id']
)

CACHE_MISSES = Counter(
    'fisioflow_cache_misses_total',
    'Cache misses',
    ['cache_type', 'tenant_id']
)

BUSINESS_METRICS = {
    'appointments_created': Counter(
        'fisioflow_appointments_created_total',
        'Appointments created',
        ['tenant_id', 'therapist_id']
    ),
    'patients_registered': Counter(
        'fisioflow_patients_registered_total',
        'Patients registered',
        ['tenant_id']
    ),
    'subscription_upgrades': Counter(
        'fisioflow_subscription_upgrades_total',
        'Subscription upgrades',
        ['from_plan', 'to_plan', 'tenant_id']
    ),
    'revenue': Gauge(
        'fisioflow_revenue_total',
        'Total revenue',
        ['plan', 'tenant_id']
    )
}

def track_request_metrics(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()

        # Extract request info
        request = get_current_request()  # Function to get current request
        method = request.method
        endpoint = request.endpoint
        tenant_id = get_current_tenant_id()

        try:
            result = func(*args, **kwargs)
            status = '200'
            return result
        except Exception as e:
            status = '500'
            raise
        finally:
            duration = time.time() - start_time

            REQUEST_COUNT.labels(
                method=method,
                endpoint=endpoint,
                status=status,
                tenant_id=tenant_id
            ).inc()

            REQUEST_DURATION.labels(
                method=method,
                endpoint=endpoint,
                tenant_id=tenant_id
            ).observe(duration)

    return wrapper

def track_business_metric(metric_name: str, labels: Dict[str, str] = None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)

            if metric_name in BUSINESS_METRICS:
                metric = BUSINESS_METRICS[metric_name]
                if labels:
                    metric.labels(**labels).inc()
                else:
                    metric.inc()

            return result
        return wrapper
    return decorator

class MetricsCollector:
    def __init__(self):
        self.registry = CollectorRegistry()

    def collect_system_metrics(self):
        """Coleta métricas do sistema"""
        # Database connections
        for shard_name in shard_manager.shards.keys():
            engine = shard_manager.shards[shard_name]
            pool = engine.pool

            DATABASE_CONNECTIONS.labels(
                shard=shard_name,
                status='active'
            ).set(pool.checkedout())

            DATABASE_CONNECTIONS.labels(
                shard=shard_name,
                status='idle'
            ).set(pool.checkedin())

    def collect_business_metrics(self):
        """Coleta métricas de negócio"""
        # Active users by tenant and role
        active_users_query = """
            SELECT tenant_id, role, COUNT(*) as count
            FROM users
            WHERE last_activity > NOW() - INTERVAL '1 hour'
            GROUP BY tenant_id, role
        """

        results = shard_manager.execute_on_all_shards(active_users_query)

        for shard_name, shard_results in results.items():
            if 'error' not in shard_results:
                for row in shard_results:
                    ACTIVE_USERS.labels(
                        tenant_id=row['tenant_id'],
                        user_role=row['role']
                    ).set(row['count'])

    def collect_cache_metrics(self):
        """Coleta métricas de cache"""
        cache_info = cache_manager.redis_client.info()

        # Redis metrics
        redis_memory = Gauge('fisioflow_redis_memory_bytes', 'Redis memory usage')
        redis_memory.set(cache_info.get('used_memory', 0))

        redis_connections = Gauge('fisioflow_redis_connections', 'Redis connections')
        redis_connections.set(cache_info.get('connected_clients', 0))

# Scheduler para coleta de métricas
from apscheduler.schedulers.background import BackgroundScheduler

metrics_collector = MetricsCollector()
scheduler = BackgroundScheduler()

# Agendar coleta de métricas
scheduler.add_job(
    metrics_collector.collect_system_metrics,
    'interval',
    seconds=30
)

scheduler.add_job(
    metrics_collector.collect_business_metrics,
    'interval',
    minutes=5
)

scheduler.add_job(
    metrics_collector.collect_cache_metrics,
    'interval',
    minutes=1
)

scheduler.start()
```

---

## 🎯 **ROADMAP DE IMPLEMENTAÇÃO**

### **FASE 1: FUNDAÇÃO (Semanas 1-4)**

- ✅ Validação em múltiplas camadas
- ✅ Sistema de auditoria completo
- ✅ Backup automatizado
- ✅ Monitoramento básico

### **FASE 2: ESCALABILIDADE (Semanas 5-8)**

- 🔄 Implementação de microserviços
- 🔄 Sistema de cache multi-nível
- 🔄 Database sharding
- 🔄 Load balancing

### **FASE 3: OTIMIZAÇÃO (Semanas 9-12)**

- 📊 Métricas avançadas
- 🚀 Performance tuning
- 🔍 Observabilidade completa
- 📈 Analytics em tempo real

### **FASE 4: ENTERPRISE (Semanas 13-16)**

- 🏢 Multi-região deployment
- 🔐 Compliance avançado
- 🤖 Auto-scaling
- 📊 Business intelligence

---

## 💰 **INVESTIMENTO E ROI**

### **CUSTOS ESTIMADOS:**

| Componente           | Custo Mensal   | Custo Anual      |
| -------------------- | -------------- | ---------------- |
| Infraestrutura Cloud | R$ 15.000      | R$ 180.000       |
| Desenvolvimento      | R$ 80.000      | R$ 960.000       |
| DevOps/SRE           | R$ 25.000      | R$ 300.000       |
| Monitoramento        | R$ 5.000       | R$ 60.000        |
| **TOTAL**            | **R$ 125.000** | **R$ 1.500.000** |

### **ROI ESPERADO:**

- **Redução de downtime:** 99.9% uptime = +R$ 500k/ano
- **Eficiência operacional:** 40% redução custos = +R$ 800k/ano
- **Escalabilidade:** Suporte 10x mais usuários = +R$ 2M/ano
- **Compliance:** Evitar multas = +R$ 200k/ano

**ROI Total:** 240% em 18 meses
