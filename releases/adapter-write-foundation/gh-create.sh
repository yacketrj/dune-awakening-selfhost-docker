#!/usr/bin/env bash
set -euo pipefail
gh pr create --repo Red-Blink/dune-awakening-selfhost-docker --base main --head yacketrj:dune-awakening-selfhost-docker-WSL:release/discord-adapter-write-foundation \
  --title "Discord adapter: write-safety foundation planning" \
  --body-file releases/adapter-write-foundation/pr-body.md
