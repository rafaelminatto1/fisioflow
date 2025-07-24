# 🚀 Instruções SUPER SIMPLIFICADAS

## ✅ O que você precisa fazer - APENAS 3 PASSOS!

### 📍 Passo 1: Setup Apple (5 minutos)
1. **Acesse:** https://developer.apple.com/account
2. **Login** com sua conta que já pagou os $99
3. **Vá em:** Identifiers → Clique no "+"
4. **Selecione:** App IDs → App
5. **Bundle ID:** `com.fisioflow.mobile`
6. **Description:** FisioFlow Mobile
7. **Continue → Register**

### 📍 Passo 2: Executar Scripts (10 minutos)
Abra o **Prompt de Comando** como Administrador e execute:

```bash
# Navegue para a pasta
cd C:\Users\rafal\OneDrive\Documentos\CLAUDe\fisioflow-19-07\mobile

# Execute o setup inicial
setup-initial.bat

# Faça login no EAS
eas login

# Execute o build e deploy
build-and-deploy.bat
```

### 📍 Passo 3: Configurar TestFlight (5 minutos)
1. **Acesse:** https://appstoreconnect.apple.com
2. **Clique:** Meus Apps → "+" → Novo App
3. **Preencha:**
   - Nome: FisioFlow Mobile
   - Bundle ID: com.fisioflow.mobile (o que criou no passo 1)
   - SKU: fisioflow2025
4. **Criar**
5. **Vá em:** TestFlight → Aguarde a build aparecer
6. **Adicione testadores** da sua equipe

---

## 🎯 Credenciais de Teste

**Quando o app estiver instalado, use:**

- **Admin:** admin@fisioflow.com / demo123
- **Fisioterapeuta:** maria@fisioflow.com / demo123  
- **Estagiário:** joao@fisioflow.com / demo123

---

## ❗ Se der erro:

### Erro de Bundle ID:
- Use: `com.fisioflow.mobile.2025` (adicione o ano)

### Erro de login:
- Execute: `eas login` novamente
- Use sua conta Apple Developer

### Erro de build:
- Execute: `npm install` na pasta mobile
- Tente: `build-and-deploy.bat` novamente

---

## 📞 Resultado Final

**Em 20 minutos você terá:**
- ✅ App funcionando no TestFlight
- ✅ Sua equipe consegue baixar e testar
- ✅ Sistema completo de fisioterapia mobile

**Total:** 3 passos simples = App pronto!