@echo off
echo =====================================
echo FisioFlow - Corrigir Setup WhatsApp
echo =====================================
echo.

cd whatsapp-evolution\evolution-api

echo Criando arquivo .env correto...
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
echo # Database ^(SQLite para simplicidade^)
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

echo ✅ Arquivo .env criado no local correto!
echo.

echo Verificando se funciona...
if exist ".env" (
    echo ✅ .env encontrado!
    echo ✅ Configuracao corrigida!
) else (
    echo ❌ Erro ao criar .env
)

echo.
echo Agora execute: start-whatsapp-direct.bat
echo.
pause