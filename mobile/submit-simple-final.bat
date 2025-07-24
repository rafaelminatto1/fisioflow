@echo off
echo =====================================
echo FisioFlow Mobile - Submit Simples Final
echo =====================================
echo.

echo Verificando se ha builds disponiveis...
call eas build:list --platform ios --limit 1 --status=finished
if errorlevel 1 (
    echo ERRO: Nenhuma build concluida encontrada!
    echo.
    echo Voce precisa:
    echo 1. Executar build-simple-final.bat primeiro
    echo 2. Aguardar build terminar (10-15 min)
    echo 3. Depois executar este script
    echo.
    pause
    exit /b 1
)

echo.
echo Submetendo para App Store Connect...
echo Este processo demora 3-5 minutos.
echo.
call eas submit --platform ios --latest --non-interactive
if errorlevel 1 (
    echo.
    echo ERRO NO SUBMIT!
    echo.
    echo Possiveis causas:
    echo 1. App nao foi criado no App Store Connect
    echo 2. Bundle ID nao confere
    echo 3. Permissoes insuficientes na conta Apple
    echo.
    echo Solucao:
    echo 1. Va em: https://appstoreconnect.apple.com
    echo 2. Crie um novo app com Bundle ID: com.fisioflow.mobile
    echo 3. Execute este script novamente
    echo.
    pause
    exit /b 1
)

echo.
echo =====================================
echo SUCESSO! APP ENVIADO!
echo =====================================
echo.
echo SEU APP ESTA NO APP STORE CONNECT!
echo.
echo Proximos passos:
echo 1. Acesse: https://appstoreconnect.apple.com
echo 2. Va em "Meus Apps" > "FisioFlow"
echo 3. Clique em "TestFlight"
echo 4. Aguarde 5-10 min para build aparecer
echo 5. Adicione testadores da sua equipe
echo 6. Distribua!
echo.
echo Credenciais de teste:
echo - admin@fisioflow.com / demo123
echo - maria@fisioflow.com / demo123
echo - joao@fisioflow.com / demo123
echo.
echo PARABENS! Seu app mobile esta pronto!
echo.
pause