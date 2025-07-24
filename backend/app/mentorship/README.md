# Módulo de Mentoria - FisioFlow

## Visão Geral

O módulo de mentoria é um sistema completo para gerenciamento de programas de estágio e desenvolvimento profissional em fisioterapia. Desenvolvido com foco em escalabilidade, integridade de dados e sistema freemium.

## Características Principais

### 🎯 Funcionalidades Core
- **Dashboard de Métricas**: Visão consolidada do progresso dos estagiários
- **Gestão de Estagiários**: Cadastro, acompanhamento e avaliação
- **Competências**: Sistema de tracking de habilidades e conhecimentos
- **Casos Clínicos**: Biblioteca educacional com análises práticas
- **Recursos Educacionais**: Centro de materiais de estudo
- **Sessões de Mentoria**: Agendamento e acompanhamento
- **Planos de Estudo**: Criação de trilhas personalizadas

### 💎 Sistema Freemium
- **Tier Gratuito**: Até 5 estagiários, 10 casos/mês, 20 recursos
- **Tier Premium**: Até 50 estagiários, 100 casos/mês, recursos ilimitados
- **Tier Enterprise**: Recursos ilimitados, funcionalidades avançadas

### 📱 Otimizado para iOS
- Configurações específicas para aplicativo móvel
- Suporte a modo offline
- Notificações push
- Interface otimizada para mobile

## Estrutura do Módulo

```
app/mentorship/
├── __init__.py              # Inicialização do módulo
├── models.py                # Modelos de banco de dados
├── routes.py                # Endpoints da API RESTful
├── services.py              # Lógica de negócio
├── utils.py                 # Utilitários e helpers
├── config.py                # Configurações específicas
├── blueprint.py             # Configuração do Blueprint
└── README.md                # Esta documentação
```

## Modelos de Dados

### Principais Entidades

#### Intern (Estagiário)
- Informações pessoais e de contato
- Métricas de progresso (horas, casos, notas)
- Status de atividade

#### Competency (Competência)
- Habilidades e conhecimentos requeridos
- Horas necessárias e ordem de aprendizado
- Configuração de obrigatoriedade

#### InternCompetency (Progresso)
- Relacionamento entre estagiário e competência
- Status, progresso percentual, notas
- Feedback do mentor e timestamps

#### EducationalCase (Caso Clínico)
- Casos práticos para análise
- Histórico clínico, exame físico, resultados esperados
- Nível de dificuldade e tempo estimado

#### EducationalResource (Recurso Educacional)
- Materiais de estudo (vídeos, artigos, PDFs)
- Sistema de rating e tags
- Controle de acesso (gratuito/premium)

#### CaseAnalysis (Análise de Caso)
- Submissões dos estagiários
- Diagnóstico, proposta de tratamento
- Avaliação e feedback do mentor

#### MentorshipSession (Sessão de Mentoria)
- Agendamentos entre mentor e estagiário
- Objetivos, notas e feedback
- Controle de duração e status

#### StudyPlan (Plano de Estudo)
- Trilhas personalizadas de aprendizado
- Período de execução e horas totais
- Associação com competências específicas

## API Endpoints

### Dashboard
```
GET /api/mentorship/dashboard-stats
```
Retorna métricas agregadas para o dashboard.

### Estagiários
```
GET    /api/mentorship/interns              # Listar estagiários
POST   /api/mentorship/interns              # Criar estagiário
GET    /api/mentorship/interns/{id}         # Detalhes do estagiário
PUT    /api/mentorship/interns/{id}/competencies/{comp_id}  # Atualizar competência
```

### Casos Clínicos
```
GET    /api/mentorship/cases                # Listar casos
POST   /api/mentorship/cases                # Criar caso
GET    /api/mentorship/cases/{id}           # Detalhes do caso
```

### Recursos Educacionais
```
GET    /api/mentorship/resources            # Listar recursos
POST   /api/mentorship/resources            # Adicionar recurso
GET    /api/mentorship/resources/{id}       # Detalhes do recurso
```

### Utilitários
```
GET    /api/mentorship/specialties          # Listar especialidades
GET    /api/mentorship/tags                 # Listar tags
```

## Configuração e Instalação

### 1. Registrar o Blueprint

No arquivo principal da aplicação (`app/__init__.py`):

```python
from app.mentorship.blueprint import register_mentorship_blueprint

def create_app():
    app = Flask(__name__)
    
    # ... outras configurações ...
    
    # Registrar módulo de mentoria
    register_mentorship_blueprint(app)
    
    return app
```

### 2. Executar Migrações

```bash
# Gerar migração
flask db migrate -m "Add mentorship module"

# Aplicar migração
flask db upgrade
```

### 3. Configurar Variáveis de Ambiente

```env
# Configurações do módulo de mentoria
MENTORSHIP_DEFAULT_PAGE_SIZE=20
MENTORSHIP_MAX_FILE_SIZE_MB=100
MENTORSHIP_ENABLE_CACHING=true
MENTORSHIP_RATE_LIMITING=true
```

## Uso dos Serviços

### Calcular Progresso de Estagiário

```python
from app.mentorship.services import MentorshipService

progress = MentorshipService.calculate_intern_progress(intern_id=1)
print(f"Progresso geral: {progress['overall_progress']}%")
```

### Criar Plano de Estudo

```python
from datetime import datetime, timedelta

start_date = datetime.now()
end_date = start_date + timedelta(weeks=12)

plan = MentorshipService.create_study_plan(
    intern_id=1,
    competency_ids=[1, 2, 3],
    start_date=start_date,
    end_date=end_date,
    title="Plano de Fisioterapia Ortopédica"
)
```

### Submeter Análise de Caso

```python
analysis_data = {
    'analysis_text': 'Análise detalhada do caso...',
    'diagnosis_attempt': 'Lombalgia mecânica',
    'treatment_proposal': 'Exercícios de fortalecimento...',
    'time_spent_minutes': 45,
    'is_completed': True
}

analysis = MentorshipService.submit_case_analysis(
    intern_id=1,
    case_id=1,
    analysis_data=analysis_data
)
```

## Utilitários

### Validação de Dados

```python
from app.mentorship.utils import MentorshipUtils

# Validar email
if MentorshipUtils.validate_email("usuario@exemplo.com"):
    print("Email válido")

# Calcular progresso
progress = MentorshipUtils.calculate_progress_percentage(
    completed_hours=30,
    required_hours=40
)
print(f"Progresso: {progress}%")  # 75%

# Formatar duração
duration = MentorshipUtils.format_duration(90)
print(duration)  # "1h 30min"
```

### Decorators para Validação

```python
from app.mentorship.utils import validate_request_data, require_tier

@mentorship_bp.route('/premium-feature', methods=['POST'])
@require_tier('premium')
@validate_request_data(['name', 'description'], ['optional_field'])
def premium_feature(validated_data):
    # Função disponível apenas para usuários premium
    return jsonify({'success': True})
```

## Sistema de Tiers

### Verificação de Limites

```python
from app.mentorship.config import MentorshipConfig

# Obter limites do tier
limits = MentorshipConfig.get_tier_limits('premium')
max_interns = limits['max_interns']

# Validar upload de arquivo
is_valid, message = MentorshipConfig.validate_file_upload(
    filename="documento.pdf",
    file_size_mb=5
)
```

## Configurações iOS

```python
from app.mentorship.config import iOSMentorshipConfig

# Configurações específicas para iOS
config = iOSMentorshipConfig()
print(f"Modo offline: {config.ENABLE_OFFLINE_MODE}")
print(f"Intervalo de sync: {config.SYNC_INTERVAL_MINUTES} min")
```

## Monitoramento e Logs

### Métricas Importantes
- Taxa de conclusão de competências
- Tempo médio de análise de casos
- Engagement com recursos educacionais
- Frequência de sessões de mentoria

### Logs de Auditoria
- Criação/atualização de estagiários
- Submissão de análises de casos
- Alterações em competências
- Acesso a recursos premium

## Escalabilidade

### Otimizações Implementadas
- **Paginação**: Todos os endpoints de listagem
- **Índices de Banco**: Campos frequentemente consultados
- **Cache**: Métricas do dashboard (5 min)
- **Rate Limiting**: Proteção contra abuso
- **Lazy Loading**: Carregamento sob demanda

### Considerações para Crescimento
- Implementar cache distribuído (Redis)
- Considerar sharding por instituição
- Implementar processamento assíncrono
- Monitorar performance de queries

## Segurança

### Medidas Implementadas
- Validação rigorosa de entrada
- Sanitização de nomes de arquivo
- Controle de acesso por tier
- Rate limiting por endpoint
- Logs de auditoria

### Recomendações Adicionais
- Implementar autenticação JWT
- Criptografar dados sensíveis
- Implementar HTTPS obrigatório
- Backup regular dos dados

## Contribuição

Para contribuir com o módulo:

1. Siga os padrões de código estabelecidos
2. Adicione testes para novas funcionalidades
3. Documente mudanças na API
4. Considere impacto nos diferentes tiers
5. Teste compatibilidade com iOS

## Suporte

Para dúvidas ou problemas:
- Consulte a documentação da API
- Verifique os logs de erro
- Teste em ambiente de desenvolvimento
- Considere limitações do tier do usuário