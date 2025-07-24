@echo off
echo =====================================
echo FisioFlow - Teste WhatsApp API
echo =====================================
echo.

set API_URL=http://localhost:8080
set API_KEY=fisioflow-2024-secret-key
set INSTANCE_NAME=fisioflow

echo Testando se API esta rodando...
curl -s %API_URL% > nul 2>&1
if errorlevel 1 (
    echo [ERRO] API nao esta respondendo!
    echo.
    echo Execute start-whatsapp-direct.bat primeiro.
    echo Aguarde a API iniciar ^(pode demorar 30 segundos^)
    pause
    exit /b 1
)

echo ✅ API respondendo!
echo.

echo Criando instancia WhatsApp '%INSTANCE_NAME%'...
curl -X POST %API_URL%/instance/create ^
     -H "apikey: %API_KEY%" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%INSTANCE_NAME%\",\"token\":\"%API_KEY%\",\"qrcode\":true,\"webhook\":\"http://localhost:5173/api/webhook/whatsapp\"}" > create_response.json 2>nul

if exist create_response.json (
    echo ✅ Comando de criacao enviado!
    echo.
    
    echo Aguardando 5 segundos...
    timeout /t 5 /nobreak > nul
    
    echo Verificando status da instancia...
    curl -s %API_URL%/instance/connectionState/%INSTANCE_NAME% ^
         -H "apikey: %API_KEY%" > status_response.json 2>nul
    
    if exist status_response.json (
        echo ✅ Status obtido!
        echo Arquivo salvo em: status_response.json
    )
    
    echo.
    echo =====================================
    echo PROXIMOS PASSOS:
    echo =====================================
    echo.
    echo 1. Para ver QR Code e conectar:
    echo    Acesse: %API_URL%/instance/connect/%INSTANCE_NAME%
    echo.
    echo 2. Para ver documentacao:
    echo    Acesse: %API_URL%/docs
    echo.
    echo 3. Para verificar conexao:
    echo    Acesse: %API_URL%/instance/connectionState/%INSTANCE_NAME%
    echo.
    echo 4. Para testar envio de mensagem ^(apos conectar^):
    echo    curl -X POST %API_URL%/message/sendText/%INSTANCE_NAME% \
    echo         -H "apikey: %API_KEY%" \
    echo         -H "Content-Type: application/json" \
    echo         -d "{\"number\":\"5511999999999\",\"text\":\"Teste FisioFlow!\"}"
    echo.
    echo =====================================
    
) else (
    echo [ERRO] Falha ao criar instancia!
    echo Verifique se a API esta rodando corretamente.
)

echo.
echo Abrindo navegador para conectar WhatsApp...
start "" "%API_URL%/instance/connect/%INSTANCE_NAME%"

echo.
pause