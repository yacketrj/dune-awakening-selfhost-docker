#!/usr/bin/env bash
set -euo pipefail
gh pr create --repo Red-Blink/dune-awakening-selfhost-docker --base main --head yacketrj:dune-awakening-selfhost-docker-WSL:release/v1.4.0 \
  --title "Release v1.4.0" \
  --body-file releases/v1.4.0/pr-body.md
