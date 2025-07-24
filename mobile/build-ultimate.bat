@echo off
echo =====================================
echo FisioFlow Mobile - Build Ultimate
echo =====================================
echo.

echo Verificando login EAS...
call eas whoami
if errorlevel 1 (
    echo ERRO: Faca login primeiro!
    echo Execute: eas login
    pause
    exit /b 1
)

echo.
echo Inicializando projeto EAS...
call eas init --id
if errorlevel 1 (
    echo Erro no eas init, continuando mesmo assim...
)

echo.
echo Configurando build...
call eas build:configure --platform ios
if errorlevel 1 (
    echo Erro na configuracao, continuando...
)

echo.
echo INICIANDO BUILD (pode demorar 15 minutos)...
echo NAO FECHE ESTA JANELA!
echo.

call eas build --platform ios --profile preview --clear-cache
if errorlevel 1 (
    echo.
    echo PRIMEIRO BUILD FALHOU!
    echo Tentando novamente com configuracoes mais simples...
    echo.
    
    echo Removendo eas.json...
    if exist eas.json del eas.json
    
    echo Criando eas.json basico...
    echo { > eas.json
    echo   "cli": { >> eas.json
    echo     "version": ">= 5.0.0" >> eas.json
    echo   }, >> eas.json
    echo   "build": { >> eas.json
    echo     "preview": { >> eas.json
    echo       "distribution": "internal" >> eas.json
    echo     } >> eas.json
    echo   } >> eas.json
    echo } >> eas.json
    
    echo Tentando build novamente...
    call eas build --platform ios --profile preview --clear-cache
    
    if errorlevel 1 (
        echo.
        echo SEGUNDO BUILD TAMBEM FALHOU!
        echo.
        echo Execute manualmente:
        echo 1. eas login
        echo 2. eas init
        echo 3. eas build --platform ios --profile preview
        echo.
        pause
        exit /b 1
    )
)

echo.
echo =====================================
echo BUILD CONCLUIDO COM SUCESSO!
echo =====================================
echo.
echo Proximos passos:
echo 1. Execute: submit-simple-final.bat
echo 2. Configure TestFlight
echo.
pause