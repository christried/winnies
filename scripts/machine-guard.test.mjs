import { describe, expect, it } from "vitest";
import { findMachineChange } from "./machine-guard.mjs";

describe("a command that changes the machine is put to the human", () => {
  it.each([
    // The reviewer's install of Before R0, as it ran.
    ["MSYS_NO_PATHCONV=1 timeout 280 wsl -d Ubuntu -u root -- bash -c \"apt-get update -qq; apt-get install -y -qq --no-install-recommends build-essential python3\"", "WSL as root"],
    ["apt-get -y -qq install build-essential", "a system package install or removal"],
    ["sudo apt install python3", "a command run as another user"],
    ["cd /tmp && apt-get remove --purge nodejs", "a system package install or removal"],
    ["dpkg -i ./node.deb", "a system package install or removal"],
    ["winget install Python.Python.3.14", "a system package install or removal"],
    ["& \"C:\\Users\\me\\AppData\\Local\\Microsoft\\WindowsApps\\winget.exe\" install Git.Git", "a system package install or removal"],
    ["scoop uninstall nodejs", "a system package install or removal"],
    ["choco upgrade all -y", "a system package install or removal"],
    ["npm install -g pnpm", "a global package"],
    ["pnpm add --global vercel", "a global package"],
    ["yarn global add serve", "a global package"],
    ["corepack enable", "a global package"],
    ["pip install requests", "a package installed outside the repository"],
    ["python3 -m pip install --user pyyaml", "a package installed outside the repository"],
    ["uv pip install ruff", "a package installed outside the repository"],
    ["cargo install ripgrep", "a package installed outside the repository"],
    ["pnpm exec playwright install chromium", "a browser download into the user's cache"],
    ["Install-Module PSReadLine -Scope CurrentUser", "a Windows install or removal"],
    ["wsl --unregister Ubuntu", "a change to the WSL distributions"],
    ["Start-Process pwsh -Verb RunAs", "a command run as administrator"],
    ["setx PATH \"%PATH%;C:\\tools\"", "an environment variable of the user or the machine"],
    ["[Environment]::SetEnvironmentVariable('Path', $p, 'User')", "an environment variable of the user or the machine"],
    ["Set-ItemProperty -Path 'HKCU:\\Environment' -Name Path -Value $p", "a registry write"],
    ["reg add HKCU\\Environment /v X /d 1", "a registry write"],
    ["echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc", "a shell or tool profile in the home folder"],
    ["Add-Content $PROFILE 'Set-Alias g git'", "the PowerShell profile"],
    ["git config --global core.autocrlf false", "the git configuration of the user or the machine"],
  ])("%s", (command, finding) => {
    expect(findMachineChange(command)).toContain(finding);
  });
});

describe("a command that stays in the repository runs without asking", () => {
  it.each([
    "pnpm install --frozen-lockfile",
    "pnpm add -D @vitest/eslint-plugin",
    "pnpm vitest run scripts/machine-guard.test.mjs",
    "pnpm test:e2e",
    "git commit -F C:/tmp/message.txt",
    "git config core.autocrlf",
    "git log --oneline -- scripts/install.mjs",
    "grep -n \"apt-get install\" docs/agents/subagents.md",
    "gh issue comment 253 --body-file C:/tmp/comment.md",
    "node scripts/worktree-clean.mjs --unlocked",
    "wsl -l -v",
    "cat ~/.bashrc",
    "gh api repos/christried/winnies/issues/253 --jq .body",
    "Get-Command python3 | Select-Object Source",
  ])("%s", (command) => {
    expect(findMachineChange(command)).toEqual([]);
  });
});
