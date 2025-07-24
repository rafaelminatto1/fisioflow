@echo off
echo =====================================
echo FisioFlow - Start Rapido WhatsApp API
echo =====================================
echo.

echo Navegando para Evolution API...
cd /d "%~dp0whatsapp-evolution\evolution-api"

echo Verificando .env...
if not exist ".env" (
    echo Criando .env...
    (
        echo SERVER_PORT=8080
        echo SERVER_URL=http://localhost:8080
        echo CORS_ORIGIN=*
        echo CORS_METHODS=GET,POST,PUT,DELETE
        echo CORS_CREDENTIALS=true
        echo DATABASE_ENABLED=true
        echo DATABASE_CONNECTION_URI=file:./evolution.db
        echo DATABASE_SYNCHRONIZE=true
        echo DATABASE_LOGGING=false
        echo AUTHENTICATION_TYPE=apikey
        echo AUTHENTICATION_API_KEY=fisioflow-2024-secret-key
        echo AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
        echo WEBHOOK_GLOBAL_URL=http://localhost:5173/api/webhook/whatsapp
        echo WEBHOOK_GLOBAL_ENABLED=true
        echo WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=true
        echo CONFIG_SESSION_PHONE_CLIENT=FisioFlow
        echo CONFIG_SESSION_PHONE_NAME=Sistema FisioFlow
        echo LOG_LEVEL=info
        echo LOG_COLOR=true
        echo LOG_BAILEYS=error
        echo QRCODE_LIMIT=10
        echo QRCODE_COLOR=#1a73e8
        echo DEL_INSTANCE=false
        echo CLEAN_STORE_CLEANING_INTERVAL=7200
        echo CLEAN_STORE_MESSAGES=true
        echo CLEAN_STORE_MESSAGE_UP_TO=false
        echo CLEAN_STORE_CONTACTS=true
        echo CLEAN_STORE_CHATS=true
    ) > .env
    echo ✅ .env criado!
)

echo.
echo =====================================
echo INICIANDO EM MODO DESENVOLVIMENTO
echo =====================================
echo.
echo ⚠️  NAO FECHE ESTA JANELA!
echo.
echo 🌐 API: http://localhost:8080
echo 📚 Docs: http://localhost:8080/docs  
echo 🔑 Key: fisioflow-2024-secret-key
echo.
echo Aguarde a API inicializar...
echo (Primeira vez pode demorar 1-2 minutos)
echo.

:: Iniciar em modo desenvolvimento (não precisa de build)
npm run start

echo.
echo API parada.
pause