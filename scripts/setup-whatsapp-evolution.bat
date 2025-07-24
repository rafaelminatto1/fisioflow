@echo off
echo =====================================
echo FisioFlow - Setup WhatsApp Evolution API
echo =====================================
echo.

echo Verificando pre-requisitos...

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado!
    echo Baixe em: https://nodejs.org
    echo Instale e execute este script novamente.
    pause
    exit /b 1
)

:: Verificar Git
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao encontrado!
    echo Baixe em: https://git-scm.com
    echo Instale e execute este script novamente.
    pause
    exit /b 1
)

echo ✅ Pre-requisitos OK!
echo.

:: Criar diretorio para Evolution API
if not exist "whatsapp-evolution" (
    mkdir whatsapp-evolution
)

cd whatsapp-evolution

echo Clonando Evolution API...
if not exist "evolution-api" (
    git clone https://github.com/EvolutionAPI/evolution-api.git
    if errorlevel 1 (
        echo [ERRO] Falha ao clonar repositorio!
        pause
        exit /b 1
    )
)

cd evolution-api

echo.
echo Instalando dependencias...
call npm install
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)

echo.
echo Criando arquivo de configuracao...

:: Criar .env personalizado para FisioFlow
(
echo # Evolution API - FisioFlow Configuration
echo.
echo # Server Configuration
echo SERVER_PORT=8080
echo SERVER_URL=http://localhost:8080
echo.
echo # CORS
echo CORS_ORIGIN=*
echo CORS_METHODS=GET,POST,PUT,DELETE
echo CORS_CREDENTIALS=true
echo.
echo # Database (SQLite para simplicidade)
echo DATABASE_ENABLED=true
echo DATABASE_CONNECTION_URI=file:./evolution.db
echo DATABASE_SYNCHRONIZE=true
echo DATABASE_LOGGING=false
echo.
echo # API Security
echo AUTHENTICATION_TYPE=apikey
echo AUTHENTICATION_API_KEY=fisioflow-2024-secret-key
echo AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
echo.
echo # Webhook Configuration
echo WEBHOOK_GLOBAL_URL=http://localhost:5173/api/webhook/whatsapp
echo WEBHOOK_GLOBAL_ENABLED=true
echo WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=true
echo.
echo # WhatsApp Configuration
echo CONFIG_SESSION_PHONE_CLIENT=FisioFlow
echo CONFIG_SESSION_PHONE_NAME=Sistema FisioFlow
echo.
echo # Logs
echo LOG_LEVEL=info
echo LOG_COLOR=true
echo LOG_BAILEYS=error
echo.
echo # QR Code
echo QRCODE_LIMIT=10
echo QRCODE_COLOR=#1a73e8
echo.
echo # Instance Settings
echo DEL_INSTANCE=false
echo CLEAN_STORE_CLEANING_INTERVAL=7200
echo CLEAN_STORE_MESSAGES=true
echo CLEAN_STORE_MESSAGE_UP_TO=false
echo CLEAN_STORE_CONTACTS=true
echo CLEAN_STORE_CHATS=true
) > .env

echo ✅ Arquivo .env criado!
echo.

echo =====================================
echo CONFIGURACAO CONCLUIDA!
echo =====================================
echo.
echo Para iniciar a Evolution API:
echo 1. Execute: start-whatsapp.bat
echo 2. Acesse: http://localhost:8080
echo 3. API Key: fisioflow-2024-secret-key
echo.
echo Arquivos criados:
echo - whatsapp-evolution/evolution-api/.env
echo - start-whatsapp.bat
echo - test-whatsapp.bat
echo.
pause