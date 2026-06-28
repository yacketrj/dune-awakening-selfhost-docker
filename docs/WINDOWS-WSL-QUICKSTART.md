# Windows / WSL Quick Install

Open **PowerShell as Administrator** and paste this command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; $root=Join-Path $env:USERPROFILE 'dune-awakening-selfhost-docker'; New-Item -ItemType Directory -Force -Path $root | Out-Null; Set-Location $root; $latest=(Invoke-WebRequest -UseBasicParsing -Method Head -Uri 'https://github.com/Red-Blink/dune-awakening-selfhost-docker/releases/latest').BaseResponse.ResponseUri.AbsoluteUri; $version=Split-Path -Leaf $latest; $zip=Join-Path $root 'dune-awakening-selfhost-docker.zip'; $extract=Join-Path $root 'release'; Remove-Item -Recurse -Force $extract -ErrorAction SilentlyContinue; Invoke-WebRequest -UseBasicParsing -Uri ('https://github.com/Red-Blink/dune-awakening-selfhost-docker/archive/refs/tags/' + $version + '.zip') -OutFile $zip; Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force; $repo=(Get-ChildItem -LiteralPath $extract -Directory | Select-Object -First 1).FullName; Set-Location $repo; .\install.ps1"
```

This command:

1. Creates `%USERPROFILE%\dune-awakening-selfhost-docker`.
2. Resolves the latest GitHub release.
3. Downloads the release ZIP.
4. Extracts the release.
5. Runs `install.ps1` from the extracted release.

The PowerShell helper then prepares WSL2, Ubuntu 26.04, Docker Engine inside Ubuntu, and delegates final server startup to the existing Linux `install.sh`.

For the full guide, see [WINDOWS-WSL-INSTALL.md](WINDOWS-WSL-INSTALL.md).
