#!/bin/bash

# Script de Deploy Automatizado - FisioFlow
# Sistema Freemium Escalável com Otimizações iOS

set -e  # Exit on any error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
PROJECT_NAME="fisioflow"
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
BACKUP_BEFORE_DEPLOY=${3:-true}

# Funções utilitárias
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar pré-requisitos
check_prerequisites() {
    log_info "Verificando pré-requisitos..."
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose não está instalado"
        exit 1
    fi
    
    # Verificar arquivo .env
    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        log_error "Arquivo .env.${ENVIRONMENT} não encontrado"
        exit 1
    fi
    
    log_success "Pré-requisitos verificados"
}

# Fazer backup do banco de dados
backup_database() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        log_info "Fazendo backup do banco de dados..."
        
        # Criar diretório de backup se não existir
        mkdir -p ./database/backups
        
        # Nome do arquivo de backup
        BACKUP_FILE="./database/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
        
        # Fazer backup
        docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_FILE
        
        if [ $? -eq 0 ]; then
            log_success "Backup criado: $BACKUP_FILE"
        else
            log_error "Falha ao criar backup"
            exit 1
        fi
    else
        log_warning "Backup do banco de dados foi pulado"
    fi
}

# Verificar integridade dos dados
check_data_integrity() {
    log_info "Verificando integridade dos dados..."
    
    # Executar testes de integridade
    docker-compose -f docker-compose.prod.yml exec backend python -m pytest tests/test_data_integrity.py -v
    
    if [ $? -eq 0 ]; then
        log_success "Integridade dos dados verificada"
    else
        log_error "Falha na verificação de integridade dos dados"
        exit 1
    fi
}

# Build das imagens
build_images() {
    log_info "Construindo imagens Docker..."
    
    # Build do frontend
    log_info "Construindo imagem do frontend..."
    docker build -t ${PROJECT_NAME}-frontend:${VERSION} ./frontend
    
    # Build do backend
    log_info "Construindo imagem do backend..."
    docker build -t ${PROJECT_NAME}-backend:${VERSION} ./backend
    
    log_success "Imagens construídas com sucesso"
}

# Executar testes
run_tests() {
    log_info "Executando testes..."
    
    # Testes do backend
    log_info "Executando testes do backend..."
    docker run --rm -v $(pwd)/backend:/app ${PROJECT_NAME}-backend:${VERSION} python -m pytest tests/ -v
    
    # Testes do sistema freemium
    log_info "Executando testes do sistema freemium..."
    docker run --rm -v $(pwd)/backend:/app ${PROJECT_NAME}-backend:${VERSION} python -m pytest tests/test_freemium_system.py -v
    
    # Testes de integração
    log_info "Executando testes de integração..."
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
    docker-compose -f docker-compose.test.yml down
    
    log_success "Todos os testes passaram"
}

# Deploy da aplicação
deploy_application() {
    log_info "Iniciando deploy da aplicação..."
    
    # Copiar arquivo de ambiente
    cp .env.${ENVIRONMENT} .env
    
    # Parar serviços existentes
    log_info "Parando serviços existentes..."
    docker-compose -f docker-compose.prod.yml down
    
    # Limpar volumes órfãos (opcional)
    docker volume prune -f
    
    # Iniciar serviços
    log_info "Iniciando serviços..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Aguardar serviços ficarem prontos
    log_info "Aguardando serviços ficarem prontos..."
    sleep 30
    
    # Executar migrações do banco de dados
    log_info "Executando migrações do banco de dados..."
    docker-compose -f docker-compose.prod.yml exec backend flask db upgrade
    
    # Executar seeds (dados iniciais)
    log_info "Executando seeds..."
    docker-compose -f docker-compose.prod.yml exec backend python scripts/seed_data.py
    
    log_success "Deploy concluído com sucesso"
}

# Verificar saúde da aplicação
check_health() {
    log_info "Verificando saúde da aplicação..."
    
    # Aguardar um pouco para os serviços iniciarem
    sleep 10
    
    # Verificar backend
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        log_success "Backend está saudável"
    else
        log_error "Backend não está respondendo"
        return 1
    fi
    
    # Verificar frontend
    if curl -f http://localhost:80 > /dev/null 2>&1; then
        log_success "Frontend está saudável"
    else
        log_error "Frontend não está respondendo"
        return 1
    fi
    
    # Verificar banco de dados
    if docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U $POSTGRES_USER > /dev/null 2>&1; then
        log_success "Banco de dados está saudável"
    else
        log_error "Banco de dados não está respondendo"
        return 1
    fi
    
    # Verificar Redis
    if docker-compose -f docker-compose.prod.yml exec redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis está saudável"
    else
        log_error "Redis não está respondendo"
        return 1
    fi
    
    log_success "Todos os serviços estão saudáveis"
}

# Executar testes de smoke
run_smoke_tests() {
    log_info "Executando testes de smoke..."
    
    # Teste de login
    log_info "Testando endpoint de login..."
    curl -X POST http://localhost:5000/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"test@fisioflow.com","password":"test123"}' \
        --fail --silent --output /dev/null
    
    # Teste de API do sistema freemium
    log_info "Testando API do sistema freemium..."
    curl -X GET http://localhost:5000/api/freemium/tiers \
        --fail --silent --output /dev/null
    
    # Teste de sincronização iOS
    log_info "Testando endpoint de sincronização iOS..."
    curl -X GET http://localhost:5000/api/ios/sync/status \
        --fail --silent --output /dev/null
    
    log_success "Testes de smoke passaram"
}

# Configurar monitoramento
setup_monitoring() {
    log_info "Configurando monitoramento..."
    
    # Verificar se Prometheus está rodando
    if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
        log_success "Prometheus está rodando"
    else
        log_warning "Prometheus não está respondendo"
    fi
    
    # Verificar se Grafana está rodando
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Grafana está rodando"
    else
        log_warning "Grafana não está respondendo"
    fi
    
    log_info "Configuração de monitoramento concluída"
}

# Rollback em caso de falha
rollback() {
    log_error "Deploy falhou. Iniciando rollback..."
    
    # Parar serviços atuais
    docker-compose -f docker-compose.prod.yml down
    
    # Restaurar backup mais recente
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        LATEST_BACKUP=$(ls -t ./database/backups/backup_*.sql | head -n1)
        if [ -n "$LATEST_BACKUP" ]; then
            log_info "Restaurando backup: $LATEST_BACKUP"
            docker-compose -f docker-compose.prod.yml up -d postgres
            sleep 10
            docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < $LATEST_BACKUP
        fi
    fi
    
    # Iniciar versão anterior
    docker-compose -f docker-compose.prod.yml up -d
    
    log_error "Rollback concluído"
    exit 1
}

# Limpeza pós-deploy
cleanup() {
    log_info "Executando limpeza..."
    
    # Remover imagens antigas
    docker image prune -f
    
    # Remover containers parados
    docker container prune -f
    
    # Manter apenas os 5 backups mais recentes
    if [ -d "./database/backups" ]; then
        ls -t ./database/backups/backup_*.sql | tail -n +6 | xargs -r rm
    fi
    
    log_success "Limpeza concluída"
}

# Função principal
main() {
    log_info "Iniciando deploy do FisioFlow - Ambiente: $ENVIRONMENT, Versão: $VERSION"
    
    # Configurar trap para rollback em caso de erro
    trap rollback ERR
    
    # Executar etapas do deploy
    check_prerequisites
    backup_database
    check_data_integrity
    build_images
    run_tests
    deploy_application
    check_health
    run_smoke_tests
    setup_monitoring
    cleanup
    
    log_success "Deploy concluído com sucesso!"
    log_info "Aplicação disponível em: https://app.fisioflow.com"
    log_info "Monitoramento disponível em: http://localhost:3000 (Grafana)"
    log_info "Métricas disponíveis em: http://localhost:9090 (Prometheus)"
}

# Verificar argumentos
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Uso: $0 [ambiente] [versão] [backup]"
    echo "  ambiente: production, staging, development (padrão: production)"
    echo "  versão: versão da imagem Docker (padrão: latest)"
    echo "  backup: true/false para fazer backup antes do deploy (padrão: true)"
    echo ""
    echo "Exemplos:"
    echo "  $0 production v1.2.0 true"
    echo "  $0 staging latest false"
    exit 0
fi

# Executar função principal
main