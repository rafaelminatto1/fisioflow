@echo off
echo =====================================
echo FisioFlow Mobile - Submit TestFlight
echo =====================================
echo.

echo Verificando builds disponiveis...
call eas build:list --platform ios --limit 5

echo.
echo Submetendo ultima build para App Store Connect...
call eas submit --platform ios --latest --non-interactive

echo.
echo =====================================
echo SUBMIT CONCLUIDO!
echo =====================================
echo.
echo O app foi enviado para o App Store Connect.
echo Em 5-10 minutos aparecera no TestFlight.
echo.
echo Proximo passo:
echo 1. Acesse: https://appstoreconnect.apple.com
echo 2. Va em TestFlight
echo 3. Adicione testadores internos
echo 4. Distribua para sua equipe
echo.
pause