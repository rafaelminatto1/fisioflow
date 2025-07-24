@echo off
echo =====================================
echo FisioFlow Mobile - Build and Deploy
echo =====================================
echo.

echo 1. Instalando dependencias...
call npm install
if errorlevel 1 (
    echo Erro ao instalar dependencias!
    pause
    exit /b 1
)

echo.
echo 2. Fixando dependencias Expo...
call npx expo install --fix
if errorlevel 1 (
    echo Erro ao fixar dependencias!
    pause
    exit /b 1
)

echo.
echo 3. Verificando login EAS...
call eas whoami
if errorlevel 1 (
    echo Voce precisa fazer login no EAS primeiro!
    echo Execute: eas login
    pause
    exit /b 1
)

echo.
echo 4. Configurando build (se necessario)...
call eas build:configure
if errorlevel 1 (
    echo Erro na configuracao!
    pause
    exit /b 1
)

echo.
echo 5. Fazendo build para TestFlight...
call eas build --platform ios --profile preview
if errorlevel 1 (
    echo Erro no build!
    pause
    exit /b 1
)

echo.
echo 6. Submetendo para App Store Connect...
call eas submit --platform ios --latest
if errorlevel 1 (
    echo Erro no submit!
    pause
    exit /b 1
)

echo.
echo =====================================
echo BUILD CONCLUIDO COM SUCESSO!
echo =====================================
echo.
echo O app foi enviado para o App Store Connect.
echo Em 5-10 minutos estara disponivel no TestFlight.
echo.
pause