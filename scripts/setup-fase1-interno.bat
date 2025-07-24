@echo off
echo ========================================
echo    FASE 1 - SETUP BASICO INTERNO
echo ========================================
echo.
echo Configuracao para uso interno da equipe
echo (proximos 30 dias)
echo.
echo ========================================
echo    OBJETIVOS DA FASE 1
echo ========================================
echo.
echo ✅ App iOS basico com funcionalidades core
echo ✅ Armazenamento local com Core Data
echo ✅ Interface simples e funcional
echo ✅ Deploy via TestFlight para equipe
echo ✅ Sem complexidade de sistema freemium
echo.
echo ========================================
echo    FUNCIONALIDADES PRIORITARIAS
echo ========================================
echo.
echo 📋 CRUD de Pacientes
echo    - Cadastro, edicao, exclusao
echo    - Busca e filtros basicos
echo    - Armazenamento local seguro
echo.
echo 📅 Agendamento de Consultas
echo    - Calendario simples
echo    - Notificacoes locais
echo    - Status das consultas
echo.
echo 📊 Relatorios Basicos
echo    - Historico de pacientes
echo    - Estatisticas simples
echo    - Exportacao basica
echo.
echo 💾 Backup Local
echo    - Backup automatico no iCloud
echo    - Restauracao de dados
echo    - Integridade garantida
echo.
echo ========================================
echo    ARQUITETURA SIMPLIFICADA
echo ========================================
echo.
echo 📱 Frontend: React Native / Expo
echo 💾 Armazenamento: Core Data (iOS nativo)
echo 🔄 Sincronizacao: Opcional (preparacao futura)
echo 🔐 Autenticacao: Local (sem servidor)
echo 📡 WhatsApp: Desabilitado (por enquanto)
echo.
echo ========================================
echo    COMANDOS DE SETUP
echo ========================================
echo.
echo # 1. Navegar para o projeto mobile
echo cd mobile
echo.
echo # 2. Instalar dependencias
echo npm install
echo npx expo install
echo.
echo # 3. Configurar para iOS
echo npx expo install expo-sqlite
echo npx expo install @react-native-async-storage/async-storage
echo npx expo install expo-notifications
echo.
echo # 4. Iniciar desenvolvimento
echo npx expo start --ios
echo.
echo # 5. Build para TestFlight (quando pronto)
echo eas build --platform ios --profile internal
echo eas submit --platform ios --profile internal
echo.
echo ========================================
echo    CHECKLIST DE DESENVOLVIMENTO
echo ========================================
echo.
echo [ ] Estrutura basica do projeto
echo [ ] Telas de CRUD de pacientes
echo [ ] Sistema de agendamento
echo [ ] Armazenamento local funcionando
echo [ ] Navegacao entre telas
echo [ ] Interface responsiva
echo [ ] Testes basicos
echo [ ] Build de TestFlight
echo [ ] Distribuicao para equipe
echo [ ] Coleta de feedback inicial
echo.
echo ========================================
echo    PROXIMOS PASSOS
echo ========================================
echo.
echo 1. Executar comandos de setup acima
echo 2. Desenvolver funcionalidades prioritarias
echo 3. Testar com a equipe via TestFlight
echo 4. Coletar feedback e iterar
echo 5. Preparar para Fase 2 (refinamento)
echo.
echo ========================================
echo    CONTATO E SUPORTE
echo ========================================
echo.
echo 📧 Para duvidas tecnicas: equipe-dev@fisioflow.com
echo 📱 Para feedback do app: feedback@fisioflow.com
echo 🐛 Para reportar bugs: bugs@fisioflow.com
echo.
echo ========================================
echo Setup da Fase 1 documentado!
echo Consulte SETUP_MOBILE_TESTFLIGHT.md para detalhes.
echo ========================================
echo.
pause