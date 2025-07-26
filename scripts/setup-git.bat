@echo off
echo 🔧 Configurando Git para FisioFlow...

REM Configurações básicas de line endings
echo 📝 Configurando line endings...
git config core.autocrlf true
git config core.safecrlf warn
git config core.eol lf

REM Configurações de push e pull
echo 🚀 Configurando push/pull...
git config push.default simple
git config pull.rebase false
git config branch.autosetupmerge always
git config branch.autosetuprebase always

REM Configurações de merge
echo 🔀 Configurando merge...
git config merge.tool vscode
git config mergetool.vscode.cmd "code --wait $MERGED"
git config merge.conflictstyle diff3
git config rerere.enabled true

REM Configurações de diff
echo 📊 Configurando diff...
git config diff.tool vscode
git config difftool.vscode.cmd "code --wait --diff $LOCAL $REMOTE"

REM Configurações de performance
echo ⚡ Configurando performance...
git config core.preloadindex true
git config core.fscache true
git config gc.auto 256

REM Configurações de segurança
echo 🔒 Configurando segurança...
git config transfer.fsckobjects true
git config fetch.fsckobjects true
git config receive.fsckObjects true

REM Configurações de aliases úteis
echo 🎯 Configurando aliases...
git config alias.st status
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.unstage "reset HEAD --"
git config alias.last "log -1 HEAD"
git config alias.visual "!gitk"
git config alias.graph "log --oneline --graph --decorate --all"
git config alias.amend "commit --amend --no-edit"
git config alias.fixup "commit --fixup"
git config alias.squash "commit --squash"
git config alias.wip "commit -am WIP"
git config alias.unwip "reset HEAD~1"

REM Configurações específicas para Windows
echo 🪟 Configurando para Windows...
git config core.longpaths true
git config core.protectNTFS true
git config core.ignorecase false

REM Configurações para hooks
echo 🪝 Configurando hooks...
git config core.hooksPath .githooks

REM Configurações de commit
echo 💬 Configurando commits...
git config commit.template .gitmessage
git config commit.verbose true

REM Configurações de log
echo 📋 Configurando logs...
git config log.date iso
git config log.decorate short

REM Configurações de rebase
echo 🔄 Configurando rebase...
git config rebase.autoStash true
git config rebase.autoSquash true

REM Configurações de stash
echo 📦 Configurando stash...
git config stash.showPatch true

REM Configurações de tag
echo 🏷️ Configurando tags...
git config tag.sort version:refname

REM Configurações de fetch
echo 📥 Configurando fetch...
git config fetch.prune true
git config fetch.pruneTags true

REM Configurações de status
echo 📊 Configurando status...
git config status.showUntrackedFiles all
git config status.submoduleSummary true

REM Configurações de color
echo 🎨 Configurando cores...
git config color.ui auto
git config color.branch auto
git config color.diff auto
git config color.status auto
git config color.grep auto

echo.
echo ✅ Configurações aplicadas com sucesso!
echo.
echo 💡 Dicas:
echo   • Use 'git st' em vez de 'git status'
echo   • Use 'git graph' para ver o histórico visual
echo   • Use 'git wip' para commits temporários
echo   • Use 'git amend' para corrigir o último commit
echo.
echo 🔧 Configuração do Git concluída!
pause