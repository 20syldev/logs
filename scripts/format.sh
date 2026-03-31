#!/bin/bash
# Script to clean code formatting and run linting

GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
NC='\033[0m'

echo -e "${BLUE}→${NC} Running Prettier..."
echo ""
npx prettier --write .
echo ""
echo -e "${GREEN}✓${NC} Prettier completed"

echo ""
echo -e "${BLUE}→${NC} Running linter..."
npm run lint -- --fix
echo -e "${GREEN}✓${NC} Linting completed"

echo ""
echo -e "${BLUE}→${NC} Cleaning trailing newlines..."

newline_changes=""
while read -r file; do
    [ -f "$file" ] || continue
    before=$(cat "$file")
    perl -pe 'chomp if eof' -i "$file"
    after=$(cat "$file")
    if [ "$before" != "$after" ]; then
        newline_changes+="${GREEN}✓${NC} Cleaned: $file\n"
    fi
done < <(
  if git rev-parse --is-inside-work-tree &>/dev/null; then
    git ls-files --cached --others --exclude-standard
  else
    find . -type f -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/out/*'
  fi | grep -E '\.(ts|tsx|js|jsx|mjs|mts|css|md|yml|json|webmanifest)$' | grep -v -F -f .prettierignore
)

if [ -n "$newline_changes" ]; then
    echo ""
    echo -e "$newline_changes"
else
    echo -e " ${YELLOW}○${NC} No changes needed\n"
fi

echo -e "${GREEN}✓${NC} Code cleaning completed!"