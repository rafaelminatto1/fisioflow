@echo off
echo =====================================
echo FisioFlow - Teste WhatsApp Evolution API
echo =====================================
echo.

set API_URL=http://localhost:8080
set API_KEY=fisioflow-2024-secret-key
set INSTANCE_NAME=fisioflow

echo Testando conexao com API...
curl -s %API_URL%/instance/fetchInstances ^
     -H "apikey: %API_KEY%" ^
     -H "Content-Type: application/json" > nul

if errorlevel 1 (
    echo [ERRO] API nao esta rodando!
    echo Execute start-whatsapp.bat primeiro.
    pause
    exit /b 1
)

echo ✅ API respondendo!
echo.

echo Criando instancia WhatsApp...
curl -s -X POST %API_URL%/instance/create ^
     -H "apikey: %API_KEY%" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%INSTANCE_NAME%\",\"token\":\"%API_KEY%\",\"qrcode\":true}" > instance_response.json

if exist instance_response.json (
    echo ✅ Instancia criada!
    echo.
    echo Verificando status...
    
    curl -s %API_URL%/instance/connectionState/%INSTANCE_NAME% ^
         -H "apikey: %API_KEY%" > status_response.json
    
    echo Resposta salva em: status_response.json
    echo.
    
    echo Para conectar o WhatsApp:
    echo 1. Acesse: %API_URL%/instance/connect/%INSTANCE_NAME%
    echo 2. Escaneie o QR Code com seu WhatsApp
    echo 3. Aguarde conexao ser estabelecida
    echo.
    
    echo Para testar envio de mensagem:
    echo curl -X POST %API_URL%/message/sendText/%INSTANCE_NAME% \
    echo      -H "apikey: %API_KEY%" \
    echo      -H "Content-Type: application/json" \
    echo      -d "{\"number\":\"5511999999999\",\"text\":\"Teste FisioFlow!\"}"
    echo.
) else (
    echo [ERRO] Falha ao criar instancia!
)

echo =====================================
echo TESTE CONCLUIDO!
echo =====================================
echo.
echo Endpoints importantes:
echo - Swagger: %API_URL%/docs
echo - QR Code: %API_URL%/instance/connect/%INSTANCE_NAME%
echo - Status: %API_URL%/instance/connectionState/%INSTANCE_NAME%
echo - Enviar: %API_URL%/message/sendText/%INSTANCE_NAME%
echo.
pause