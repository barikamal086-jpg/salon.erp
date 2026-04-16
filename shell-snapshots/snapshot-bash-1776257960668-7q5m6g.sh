# Snapshot file
# Unset all aliases to avoid conflicts with functions
unalias -a 2>/dev/null || true
shopt -s expand_aliases
# Check for rg availability
if ! (unalias rg 2>/dev/null; command -v rg) >/dev/null 2>&1; then
  function rg {
  local _cc_bin="${CLAUDE_CODE_EXECPATH:-}"
  [[ -x $_cc_bin ]] || _cc_bin=$(command -v claude 2>/dev/null)
  if [[ ! -x $_cc_bin ]]; then command rg "$@"; return; fi
  if [[ -n $ZSH_VERSION ]]; then
    ARGV0=rg "$_cc_bin" "$@"
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    ARGV0=rg "$_cc_bin" "$@"
  elif [[ $BASHPID != $$ ]]; then
    exec -a rg "$_cc_bin" "$@"
  else
    (exec -a rg "$_cc_bin" "$@")
  fi
}
fi
export PATH='/c/Users/bari.NTMAD243/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/mingw64/bin:/usr/bin:/c/Users/bari.NTMAD243/bin:/c/Python314/Scripts:/c/Python314:/c/Program Files (x86)/Common Files/Oracle/Java/java8path:/c/Program Files (x86)/Common Files/Oracle/Java/javapath:/c/WINDOWS/system32:/c/WINDOWS:/c/WINDOWS/System32/Wbem:/c/WINDOWS/System32/WindowsPowerShell/v1.0:/c/WINDOWS/System32/OpenSSH:/c/Program Files/dotnet:/cmd:/c/Program Files/nodejs:/c/ProgramData/chocolatey/bin:/c/Users/bari.NTMAD243/Desktop/Scripts:/c/Users/bari.NTMAD243/Desktop:/c/Users/bari.NTMAD243/AppData/Local/Programs/Python/Launcher:/c/Users/bari.NTMAD243/AppData/Local/Microsoft/WindowsApps:/c/Users/bari.NTMAD243/AppData/Local/Programs/Antigravity/bin:/c/Users/bari.NTMAD243/AppData/Roaming/npm:/c/Program Files/nodejs:/c/Python314:/mingw64/bin:/usr/bin/vendor_perl:/usr/bin/core_perl:/c/Users/bari.NTMAD243/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/9c152f8e-ba44-4a53-bd20-18f40330e13d/31912323-9d26-40a6-846d-b6676b69c4bc/bin:/c/Users/bari.NTMAD243/AppData/Roaming/Claude/local-agent-mode-sessions/31912323-9d26-40a6-846d-b6676b69c4bc/9c152f8e-ba44-4a53-bd20-18f40330e13d/rpm/plugin_018pLNd4CGF8vEEmyztWR7fi/bin:/c/Users/bari.NTMAD243/AppData/Roaming/Claude/local-agent-mode-sessions/31912323-9d26-40a6-846d-b6676b69c4bc/9c152f8e-ba44-4a53-bd20-18f40330e13d/rpm/plugin_01MKcJsEAmPJswuCytbMJYZJ/bin:/c/Users/bari.NTMAD243/AppData/Roaming/Claude/local-agent-mode-sessions/31912323-9d26-40a6-846d-b6676b69c4bc/9c152f8e-ba44-4a53-bd20-18f40330e13d/rpm/plugin_01YS7PZc73j8hf4aEJiRr2KQ/bin:/c/Users/bari.NTMAD243/AppData/Roaming/Claude/local-agent-mode-sessions/31912323-9d26-40a6-846d-b6676b69c4bc/9c152f8e-ba44-4a53-bd20-18f40330e13d/rpm/plugin_015mMo6NfTokoNVaKCDw72FM/bin:/c/Users/bari.NTMAD243/AppData/Roaming/Claude/local-agent-mode-sessions/31912323-9d26-40a6-846d-b6676b69c4bc/9c152f8e-ba44-4a53-bd20-18f40330e13d/rpm/plugin_01XVGwZPnnDgUhcsbifr4g6Q/bin'
