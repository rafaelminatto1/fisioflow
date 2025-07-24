@echo off
echo =====================================
echo FisioFlow - Iniciar WhatsApp Evolution API
echo =====================================
echo.

echo Navegando para diretorio correto...
cd /d "%~dp0whatsapp-evolution\evolution-api"

echo Verificando arquivo .env...
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado!
    echo Execute fix-whatsapp-setup.bat primeiro.
    pause
    exit /b 1
)

echo ✅ Arquivo .env encontrado!
echo.

echo Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
)

echo.
echo =====================================
echo INICIANDO EVOLUTION API
echo =====================================
echo.
echo ⚠️  NAO FECHE ESTA JANELA!
echo.
echo 🌐 API rodando em: http://localhost:8080
echo 📚 Docs em: http://localhost:8080/docs
echo 🔑 API Key: fisioflow-2024-secret-key
echo.
echo Para parar: Ctrl+C
echo.

:: Iniciar servidor
npm run start:prod

echo.
echo API foi encerrada.
pause