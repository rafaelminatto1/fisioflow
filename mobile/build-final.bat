@echo off
echo =====================================
echo FisioFlow Mobile - Build Final
echo =====================================
echo.

echo Verificando login EAS...
call eas whoami
if errorlevel 1 (
    echo ERRO: Voce nao esta logado no EAS!
    echo.
    echo Execute primeiro:
    echo eas login
    echo.
    echo (Se nao tiver conta: eas register)
    pause
    exit /b 1
)

echo.
echo Testando projeto localmente...
call npx expo doctor
if errorlevel 1 (
    echo Problemas encontrados no projeto!
    echo Continuando mesmo assim...
)

echo.
echo Configurando EAS Build...
call eas build:configure --platform ios
if errorlevel 1 (
    echo Erro na configuracao!
    pause
    exit /b 1
)

echo.
echo Iniciando build para iOS (TestFlight)...
echo ATENCAO: Este processo pode demorar 10-15 minutos!
echo.
call eas build --platform ios --profile preview --non-interactive
if errorlevel 1 (
    echo Erro no build!
    echo.
    echo Possiveis causas:
    echo 1. Bundle ID ja existe - mude para: com.fisioflow.mobile.2025
    echo 2. Conta Apple Developer nao configurada
    echo 3. Problema de rede
    echo.
    pause
    exit /b 1
)

echo.
echo =====================================
echo BUILD CONCLUIDO COM SUCESSO!
echo =====================================
echo.
echo Proximos passos:
echo 1. Execute: submit-final.bat
echo 2. Configure TestFlight no App Store Connect
echo.
pause