@echo off
echo =====================================
echo FisioFlow - Iniciando WhatsApp Evolution API
echo =====================================
echo.

cd whatsapp-evolution\evolution-api

echo Verificando configuracao...
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado!
    echo Execute setup-whatsapp-evolution.bat primeiro.
    pause
    exit /b 1
)

echo ✅ Configuracao encontrada!
echo.

echo Iniciando Evolution API...
echo ⚠️  NAO FECHE ESTA JANELA!
echo.
echo Para parar: Ctrl+C
echo API rodando em: http://localhost:8080
echo Swagger docs: http://localhost:8080/docs
echo.

:: Iniciar servidor
npm run start:prod

echo.
echo API parada.
pause