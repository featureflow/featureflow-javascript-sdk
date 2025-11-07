#!/usr/bin/env bash
set -euo pipefail

npm run build

# Extract version from package.json
VERSION=$(node -p "require('./package.json').version")

# Check if version contains prerelease identifiers (alpha, beta, rc, etc.)
if [[ "$VERSION" =~ -(alpha|beta|rc) ]]; then
  # Extract the prerelease tag (e.g., "beta" from "2.0.0-beta.1")
  if [[ "$VERSION" =~ -(alpha) ]]; then
    TAG="alpha"
  elif [[ "$VERSION" =~ -(beta) ]]; then
    TAG="beta"
  elif [[ "$VERSION" =~ -(rc) ]]; then
    TAG="rc"
  fi
  npm publish --tag "$TAG"
else
  npm publish
fi