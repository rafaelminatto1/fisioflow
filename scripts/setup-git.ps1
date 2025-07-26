#!/usr/bin/env pwsh
# Script de configuração do Git para FisioFlow
# Configura as melhores práticas para evitar erros futuros

Write-Host "🔧 Configurando Git para FisioFlow..." -ForegroundColor Blue

# Configurações básicas de line endings
Write-Host "📝 Configurando line endings..." -ForegroundColor Yellow
git config core.autocrlf true
git config core.safecrlf warn
git config core.eol lf

# Configurações de push e pull
Write-Host "🚀 Configurando push/pull..." -ForegroundColor Yellow
git config push.default simple
git config pull.rebase false
git config branch.autosetupmerge always
git config branch.autosetuprebase always

# Configurações de merge
Write-Host "🔀 Configurando merge..." -ForegroundColor Yellow
git config merge.tool vscode
git config mergetool.vscode.cmd 'code --wait $MERGED'
git config merge.conflictstyle diff3
git config rerere.enabled true

# Configurações de diff
Write-Host "📊 Configurando diff..." -ForegroundColor Yellow
git config diff.tool vscode
git config difftool.vscode.cmd 'code --wait --diff $LOCAL $REMOTE'

# Configurações de performance
Write-Host "⚡ Configurando performance..." -ForegroundColor Yellow
git config core.preloadindex true
git config core.fscache true
git config gc.auto 256

# Configurações de segurança
Write-Host "🔒 Configurando segurança..." -ForegroundColor Yellow
git config transfer.fsckobjects true
git config fetch.fsckobjects true
git config receive.fsckObjects true

# Configurações de aliases úteis
Write-Host "🎯 Configurando aliases..." -ForegroundColor Yellow
git config alias.st status
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.unstage 'reset HEAD --'
git config alias.last 'log -1 HEAD'
git config alias.visual '!gitk'
git config alias.graph 'log --oneline --graph --decorate --all'
git config alias.amend 'commit --amend --no-edit'
git config alias.fixup 'commit --fixup'
git config alias.squash 'commit --squash'
git config alias.wip 'commit -am "WIP"'
git config alias.unwip 'reset HEAD~1'
git config alias.clean-branches 'branch --merged | grep -v "\*\|main\|master\|develop" | xargs -n 1 git branch -d'

# Configurações específicas para Windows
if ($IsWindows -or $env:OS -eq "Windows_NT") {
    Write-Host "🪟 Configurando para Windows..." -ForegroundColor Yellow
    git config core.longpaths true
    git config core.protectNTFS true
    git config core.ignorecase false
}

# Configurações para hooks
Write-Host "🪝 Configurando hooks..." -ForegroundColor Yellow
git config core.hooksPath .githooks

# Verificar se o diretório .githooks existe, se não, criar
if (!(Test-Path ".githooks")) {
    New-Item -ItemType Directory -Path ".githooks" -Force
    Write-Host "📁 Diretório .githooks criado" -ForegroundColor Green
}

# Configurações de commit
Write-Host "💬 Configurando commits..." -ForegroundColor Yellow
git config commit.template .gitmessage
git config commit.verbose true

# Configurações de log
Write-Host "📋 Configurando logs..." -ForegroundColor Yellow
git config log.date iso
git config log.decorate short

# Configurações de rebase
Write-Host "🔄 Configurando rebase..." -ForegroundColor Yellow
git config rebase.autoStash true
git config rebase.autoSquash true

# Configurações de stash
Write-Host "📦 Configurando stash..." -ForegroundColor Yellow
git config stash.showPatch true

# Configurações de tag
Write-Host "🏷️ Configurando tags..." -ForegroundColor Yellow
git config tag.sort version:refname

# Configurações de fetch
Write-Host "📥 Configurando fetch..." -ForegroundColor Yellow
git config fetch.prune true
git config fetch.pruneTags true

# Configurações de status
Write-Host "📊 Configurando status..." -ForegroundColor Yellow
git config status.showUntrackedFiles all
git config status.submoduleSummary true

# Configurações de color
Write-Host "🎨 Configurando cores..." -ForegroundColor Yellow
git config color.ui auto
git config color.branch auto
git config color.diff auto
git config color.status auto
git config color.grep auto

# Verificar configurações
Write-Host "\n✅ Configurações aplicadas com sucesso!" -ForegroundColor Green
Write-Host "\n📋 Resumo das configurações:" -ForegroundColor Cyan

# Mostrar configurações importantes
$configs = @(
    "core.autocrlf",
    "core.safecrlf",
    "core.eol",
    "push.default",
    "pull.rebase",
    "merge.conflictstyle",
    "rerere.enabled",
    "transfer.fsckobjects",
    "fetch.prune",
    "rebase.autoStash"
)

foreach ($config in $configs) {
    $value = git config --get $config
    if ($value) {
        Write-Host "  $config = $value" -ForegroundColor White
    }
}

Write-Host "\n🎯 Aliases configurados:" -ForegroundColor Cyan
$aliases = git config --get-regexp alias
if ($aliases) {
    $aliases | ForEach-Object {
        Write-Host "  $_" -ForegroundColor White
    }
}

Write-Host "\n💡 Dicas:" -ForegroundColor Yellow
Write-Host "  • Use 'git st' em vez de 'git status'" -ForegroundColor White
Write-Host "  • Use 'git graph' para ver o histórico visual" -ForegroundColor White
Write-Host "  • Use 'git wip' para commits temporários" -ForegroundColor White
Write-Host "  • Use 'git clean-branches' para limpar branches merged" -ForegroundColor White

Write-Host "\n🔧 Configuração do Git concluída!" -ForegroundColor Green