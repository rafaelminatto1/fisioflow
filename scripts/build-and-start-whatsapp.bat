@echo off
echo =====================================
echo FisioFlow - Build e Start WhatsApp API
echo =====================================
echo.

echo Navegando para diretorio da Evolution API...
cd whatsapp-evolution\evolution-api

echo Verificando arquivo .env...
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado!
    echo Execute fix-whatsapp-setup.bat primeiro.
    pause
    exit /b 1
)

echo ✅ Arquivo .env encontrado!
echo.

echo Verificando se ja foi compilado...
if not exist "dist" (
    echo ⚠️  Primeira execucao - fazendo build...
    echo Isso pode demorar 2-3 minutos...
    echo.
    
    echo Compilando TypeScript...
    call npm run build
    
    if errorlevel 1 (
        echo [ERRO] Falha no build!
        echo Tentando com metodo alternativo...
        
        echo Instalando TypeScript globalmente...
        call npm install -g typescript
        
        echo Compilando manualmente...
        call npx tsc
        
        if errorlevel 1 (
            echo [ERRO] Build falhou completamente!
            echo Tentando modo desenvolvimento...
            goto DEV_MODE
        )
    )
    
    echo ✅ Build concluido!
)

echo.
echo =====================================
echo INICIANDO EVOLUTION API (PRODUCAO)
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

npm run start:prod
goto END

:DEV_MODE
echo.
echo =====================================
echo INICIANDO EVOLUTION API (DESENVOLVIMENTO)
echo =====================================
echo.
echo ⚠️  NAO FECHE ESTA JANELA!
echo.
echo 🌐 API rodando em: http://localhost:8080
echo 📚 Docs em: http://localhost:8080/docs
echo 🔑 API Key: fisioflow-2024-secret-key
echo.
echo Modo: Desenvolvimento (mais lento, mas funciona)
echo Para parar: Ctrl+C
echo.

npm run start:dev

:END
echo.
echo API foi encerrada.
pause