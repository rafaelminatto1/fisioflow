#!/bin/bash

echo "========================================"
echo "    FISIOFLOW - BUILD TESTFLIGHT"
echo "========================================"
echo ""
echo "Este script deve ser executado em um Mac"
echo "com Xcode configurado."
echo ""

# Verificar se estamos em um Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Erro: Este script deve ser executado em macOS"
    echo "   macOS é necessário para builds iOS"
    exit 1
fi

# Verificar se EAS CLI está instalado
if ! command -v eas &> /dev/null; then
    echo "📦 Instalando EAS CLI..."
    npm install -g @expo/eas-cli
fi

# Login no EAS (se necessário)
echo "🔐 Verificando autenticação EAS..."
eas whoami || {
    echo "Por favor, faça login no EAS:"
    eas login
}

echo ""
echo "========================================"
echo "    INICIANDO BUILD"
echo "========================================"
echo ""

# Build para TestFlight (distribuição interna)
echo "🚀 Iniciando build para TestFlight..."
echo "   Profile: preview (distribuição interna)"
echo "   Platform: iOS"
echo ""

eas build --platform ios --profile preview

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "    BUILD CONCLUÍDO COM SUCESSO"
    echo "========================================"
    echo ""
    echo "✅ O build foi enviado para o EAS"
    echo "📱 Quando pronto, você pode enviar para TestFlight com:"
    echo "   eas submit --platform ios --latest"
    echo ""
    echo "📧 A equipe receberá um link de convite do TestFlight"
    echo "   quando o app for aprovado pela Apple."
    echo ""
else
    echo ""
    echo "❌ Erro durante o build"
    echo "   Verifique os logs acima para mais detalhes"
    exit 1
fi

echo ""
echo "========================================"
echo "    PRÓXIMOS PASSOS"
echo "========================================"
echo ""
echo "1. ⏳ Aguardar conclusão do build no EAS (5-15 min)"
echo "2. 📱 Executar: eas submit --platform ios --latest"
echo "3. ⌛ Aguardar aprovação da Apple (1-2 dias)"
echo "4. 👥 Enviar convites TestFlight para equipe"
echo "5. 📝 Coletar feedback e iterar"
echo ""
echo "🔗 Acompanhe o progresso em: https://expo.dev"
echo ""