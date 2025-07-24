@echo off
echo =====================================
echo FisioFlow Mobile - Submit Final
echo =====================================
echo.

echo Listando builds disponiveis...
call eas build:list --platform ios --limit 3

echo.
echo Submetendo para App Store Connect...
call eas submit --platform ios --latest --non-interactive
if errorlevel 1 (
    echo Erro no submit!
    echo.
    echo Verifique se:
    echo 1. O build foi concluido com sucesso
    echo 2. Sua conta Apple Developer esta ativa
    echo 3. Voce tem permissoes de upload
    echo.
    pause
    exit /b 1
)

echo.
echo =====================================
echo SUBMIT CONCLUIDO!
echo =====================================
echo.
echo SEU APP FOI ENVIADO PARA O APP STORE CONNECT!
echo.
echo Proximos passos:
echo 1. Acesse: https://appstoreconnect.apple.com
echo 2. Va em "Meus Apps" > "FisioFlow Mobile"
echo 3. Clique em "TestFlight"
echo 4. Aguarde 5-10 minutos para aparecer a build
echo 5. Adicione testadores internos (sua equipe)
echo 6. Distribua para testar!
echo.
echo Credenciais de teste no app:
echo - Admin: admin@fisioflow.com / demo123
echo - Fisio: maria@fisioflow.com / demo123
echo - Estagiario: joao@fisioflow.com / demo123
echo.
pause