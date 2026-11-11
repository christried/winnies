// Puts every command that changes the machine outside the repository to the human before it runs (CLAUDE.md § Roles).
// Before R0's phase review, a reviewer told to stay read-only installed 37 packages as root in WSL to reproduce a CI
// flake, and nothing asked first: the auto-mode classifier let it through, and the attribution hook reads git and gh only.
//
//   node scripts/machine-guard.mjs tool    Claude Code PreToolUse hook: a Bash or PowerShell command before it runs (stdin)
//
// The answer is "ask", never "deny": the human's own cleanup of that install needed WSL as root and a PATH edit.
// Commands are judged where a command starts (the line, after `;`, `&&`, `|`, `(`, `--`, `bash -c "`, `sudo`, or
// `NAME=value` prefixes), so a commit message or a grep that only quotes one of them stays possible. Always exits 0.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Where a command word may stand: the start of a line, after a shell separator or `--`, inside the script of a
// `bash -c "…"` or `powershell -Command "…"`, after a wrapper such as `sudo` or `env`, then any `NAME=value` prefixes
// and a path to the program (`"C:\…\winget.exe"`, `/usr/bin/apt`).
const AT = String.raw`(?:^|[;&|({\x60\n]|\s--\s|\s-(?:c|lc|Command)\s+["']|\b(?:sudo|exec|xargs|env|nohup|time|command|call|timeout(?:\s+-\S+)*\s+\S+)\s+)\s*(?:[A-Za-z_]\w*=\S*\s+)*(?:["']?[^\s"';&|]*[\\/])?`;
// Options between a program and its verb: `apt-get -y -qq install`.
const OPTIONS = String.raw`(?:\.exe)?["']?\s+(?:[^\s;&|]+\s+)*?`;
const at = (program, rest, flags = "im") => new RegExp(`${AT}(?:${program})${rest}`, flags);

/** What changes the machine, each with the words the question to the human gives it. */
const RULES = [
  [
    at("apt|apt-get|aptitude|snap|yum|dnf|zypper|apk|brew|winget|scoop|choco|chocolatey", `${OPTIONS}(?:install|reinstall|remove|purge|uninstall|upgrade|dist-upgrade|full-upgrade|autoremove|add|del)\\b`),
    "a system package install or removal",
  ],
  [
    at("dpkg", `${OPTIONS}(?:-i|--install|-r|--remove|-P|--purge)\\b`),
    "a system package install or removal",
  ],
  [
    at("npm|pnpm|yarn|bun", `${OPTIONS}(?:-g|--global)\\b`),
    "a global package",
  ],
  [
    at("yarn", `${OPTIONS}global\\s+(?:add|remove|upgrade)\\b`),
    "a global package",
  ],
  [
    at("corepack", `${OPTIONS}(?:enable|disable|install)\\b`),
    "a global package",
  ],
  [
    at("pip|pip3|pipx|uv|cargo|gem|go", `${OPTIONS}(?:install|uninstall)\\b`),
    "a package installed outside the repository",
  ],
  [
    at("python|python3|py", `${OPTIONS}-m\\s+pip\\s+(?:[^\\s;&|]+\\s+)*?(?:install|uninstall)\\b`),
    "a package installed outside the repository",
  ],
  [
    at("playwright", `${OPTIONS}(?:install|uninstall)\\b`),
    "a browser download into the user's cache",
  ],
  [
    at("(?:Install|Uninstall|Update)-(?:Module|Package|Script|PSResource)|(?:Add|Remove)-AppxPackage|(?:Enable|Disable)-WindowsOptionalFeature|msiexec", ""),
    "a Windows install or removal",
  ],
  [
    at("sudo|su|gsudo|runas|doas", "\\b"),
    "a command run as another user",
  ],
  [
    at("wsl", `${OPTIONS}(?:-u|--user)\\s+root\\b`),
    "WSL as root",
  ],
  [
    at("wsl", `${OPTIONS}--(?:install|uninstall|unregister|import|export|set-default|set-version|update)\\b`),
    "a change to the WSL distributions",
  ],
  [/Start-Process\b[^;\n]*-Verb\s+RunAs\b/i, "a command run as administrator"],
  [
    at("setx", "\\b"),
    "an environment variable of the user or the machine",
  ],
  [/SetEnvironmentVariable\s*\([^)]*(?:["'](?:User|Machine)["']|EnvironmentVariableTarget\]::(?:User|Machine))/i, "an environment variable of the user or the machine"],
  [/(?:Set|New|Remove|Rename)-ItemProperty\s[^;\n]*(?:HKCU|HKLM|HKEY_|Registry::)/i, "a registry write"],
  [
    at("reg", `${OPTIONS}(?:add|delete|import|copy|restore)\\b`),
    "a registry write",
  ],
  [/(?:>|\b(?:tee|Add-Content|Set-Content|Out-File)\b)[^;\n|>]*[\\/]\.(?:bashrc|bash_profile|profile|zshrc|npmrc|gitconfig)\b/i, "a shell or tool profile in the home folder"],
  [/(?:>|\b(?:Add-Content|Set-Content|Out-File))\s*["']?\$PROFILE\b/i, "the PowerShell profile"],
  [
    at("git", `${OPTIONS}config\\s+(?:[^\\s;&|]+\\s+)*?--(?:global|system)\\b`),
    "the git configuration of the user or the machine",
  ],
];

/**
 * What a shell command would change on the machine outside the repository, judged before it runs.
 *
 * @param command The command line of a Bash or PowerShell tool call.
 * @returns One finding per kind of change, without repeats; empty when the command may run without asking.
 */
export function findMachineChange(command) {
  return [
    ...new Set(RULES.filter(([pattern]) => pattern.test(command)).map(([, finding]) => finding)),
  ];
}

function main([mode]) {
  if (mode !== "tool") {
    console.error("usage: node scripts/machine-guard.mjs tool   (a Claude Code PreToolUse hook; the tool call comes on stdin)");
    return 2;
  }
  const findings = findMachineChange(JSON.parse(readFileSync(0, "utf8")).tool_input?.command ?? "");
  if (findings.length > 0) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: `This command changes the machine outside the repository (${findings.join(", ")}). The human approves each such change (CLAUDE.md § Roles).`,
      },
    }));
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(main(process.argv.slice(2)));
