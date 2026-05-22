#!/bin/bash
# Sync fork from upstream 20syldev/flowers
# Respects .syncignore (glob patterns supported)
# Usage: ./scripts/update.sh [--dry-run] [--force] [--help]

set -euo pipefail

GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
RED='\033[31m'
DIM='\033[2m'
NC='\033[0m'

REPO="20syldev/flowers"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYNCIGNORE_FILE="${ROOT}/.syncignore"
LASTSYNC_FILE="${ROOT}/.lastsync"

SELF_PROTECTED=("scripts/update.sh" ".syncignore" ".lastsync")
DEFAULT_EXCLUDES=("node_modules/*" ".next/*" "out/*" ".git/*" "package-lock.json" "*.tsbuildinfo" "next-env.d.ts")

DRY_RUN=false
FORCE=false
HAS_JQ=false
UPSTREAM_SHA=""
LAST_SHA=""
WORK=""

ADDED_FILES=()
MODIFIED_FILES=()
DELETED_FILES=()
SKIPPED_FILES=()
IGNORE_PATTERNS=()
OUTDATED_DEPS=()
ERRORS=0

cleanup() { [[ -n "$WORK" ]] && rm -rf "$WORK"; }
trap cleanup EXIT

log_info() { echo -e "${BLUE}→${NC} $*"; }
log_ok()   { echo -e " ${GREEN}✓${NC} $*"; }
log_warn() { echo -e " ${YELLOW}○${NC} $*"; }
log_err()  { echo -e " ${RED}✗${NC} $*"; }
log_dim()  { echo -e "${DIM}  $*${NC}"; }

usage() {
    echo "Usage: $(basename "$0") [--dry-run] [--force] [--help]"
    echo ""
    echo "  --dry-run   Preview changes without applying them"
    echo "  --force     Skip confirmation prompts (auto-delete removed files)"
    echo "  --help      Show this message"
}

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            --dry-run) DRY_RUN=true ;;
            --force)   FORCE=true ;;
            --help|-h) usage; exit 0 ;;
            *) echo -e "${RED}Unknown option: $arg${NC}"; usage; exit 1 ;;
        esac
    done
}

preflight() {
    if ! command -v gh &>/dev/null; then
        log_err "gh CLI is required — https://cli.github.com"
        exit 1
    fi
    if ! gh auth status &>/dev/null; then
        log_err "gh is not authenticated — run: gh auth login"
        exit 1
    fi
    if command -v jq &>/dev/null; then
        HAS_JQ=true
    else
        log_warn "jq not found — dep version check unavailable"
    fi
    if [[ ! -f "${ROOT}/package.json" ]]; then
        log_err "Cannot find package.json at project root: ${ROOT}"
        exit 1
    fi
}

show_last_sync() {
    if [[ -f "$LASTSYNC_FILE" ]]; then
        LAST_SHA=$(sed -n '1p' "$LASTSYNC_FILE")
        local date
        date=$(sed -n '2p' "$LASTSYNC_FILE")
        log_dim "Last sync: ${LAST_SHA:0:7} (${date})"
    fi
}

get_upstream_sha() {
    log_info "Checking upstream ${REPO}..."
    UPSTREAM_SHA=$(gh api "repos/${REPO}/commits/HEAD" --jq '.sha' 2>/dev/null) || {
        log_err "Failed to fetch upstream commit"
        exit 1
    }
    local short="${UPSTREAM_SHA:0:7}"
    log_ok "Upstream HEAD: ${short}"

    if [[ -n "$LAST_SHA" && "$LAST_SHA" == "$UPSTREAM_SHA" ]]; then
        echo ""
        log_warn "Already up to date with upstream (${short})"
        if ! $FORCE; then
            read -rp "  Continue anyway? [y/N] " ans
            [[ "${ans,,}" == "y" ]] || exit 0
        fi
    fi
}

download_upstream() {
    echo ""
    log_info "Downloading ${REPO}@${UPSTREAM_SHA:0:7}..."
    WORK=$(mktemp -d)
    gh api "repos/${REPO}/tarball/${UPSTREAM_SHA}" > "${WORK}/upstream.tar.gz" 2>/dev/null || {
        log_err "Failed to download repository"
        exit 1
    }
    tar -xzf "${WORK}/upstream.tar.gz" -C "${WORK}" --strip-components=1 2>/dev/null || {
        log_err "Failed to extract archive"
        exit 1
    }
    [[ -f "${WORK}/package.json" ]] || {
        log_err "Unexpected archive structure (package.json not found)"
        exit 1
    }
    log_ok "Downloaded"
}

load_syncignore() {
    for p in "${SELF_PROTECTED[@]}" "${DEFAULT_EXCLUDES[@]}"; do
        IGNORE_PATTERNS+=("$p")
    done
    if [[ -f "$SYNCIGNORE_FILE" ]]; then
        while IFS= read -r line; do
            [[ -z "$line" || "$line" == "#"* ]] && continue
            line="${line#"${line%%[![:space:]]*}"}"
            line="${line%"${line##*[![:space:]]}"}"
            [[ -n "$line" ]] && IGNORE_PATTERNS+=("$line")
        done < "$SYNCIGNORE_FILE"
    fi
}

should_skip() {
    local f="$1"
    for p in "${IGNORE_PATTERNS[@]}"; do
        # Unquoted $p enables bash glob matching
        [[ "$f" == $p ]] && return 0
    done
    return 1
}

check_package_versions() {
    $HAS_JQ || return
    while IFS='|' read -r type pkg local_ver up_ver; do
        OUTDATED_DEPS+=("${type}|${pkg}|${local_ver}|${up_ver}")
    done < <(jq -rs '
        .[0] as $local | .[1] as $up |
        [
          (($up.dependencies // {}) | to_entries[] |
           select(.value != ($local.dependencies[.key] // null)) |
           "dep|\(.key)|\($local.dependencies[.key] // "—")|\(.value)"),
          (($up.devDependencies // {}) | to_entries[] |
           select(.value != ($local.devDependencies[.key] // null)) |
           "dev|\(.key)|\($local.devDependencies[.key] // "—")|\(.value)")
        ] | .[]
    ' "${ROOT}/package.json" "${WORK}/package.json" 2>/dev/null)
}

build_manifest() {
    # Walk upstream files
    while IFS= read -r file; do
        local rel="${file#${WORK}/}"
        if [[ "$rel" == "package.json" ]]; then
            check_package_versions
            continue
        fi
        if should_skip "$rel"; then
            SKIPPED_FILES+=("$rel")
        elif [[ ! -f "${ROOT}/${rel}" ]]; then
            ADDED_FILES+=("$rel")
        elif ! cmp -s "${WORK}/${rel}" "${ROOT}/${rel}"; then
            MODIFIED_FILES+=("$rel")
        fi
    done < <(find "${WORK}" -type f ! -name "*.tar.gz" | sort)

    # Detect local files absent upstream (potential deletions)
    while IFS= read -r file; do
        local rel="${file#${ROOT}/}"
        [[ "$rel" == "package.json" ]] && continue
        should_skip "$rel" && continue
        [[ -f "${WORK}/${rel}" ]] || DELETED_FILES+=("$rel")
    done < <(find "${ROOT}" -type f \
        -not -path "${ROOT}/.git/*" \
        -not -path "${ROOT}/node_modules/*" \
        -not -path "${ROOT}/.next/*" \
        -not -path "${ROOT}/out/*" \
        | sort)
}

show_preview() {
    local added=${#ADDED_FILES[@]}
    local modified=${#MODIFIED_FILES[@]}
    local deleted=${#DELETED_FILES[@]}
    local skipped=${#SKIPPED_FILES[@]}

    echo ""
    echo -e "${BLUE}--- Sync Preview ---${NC}"
    echo ""

    if [[ $added -gt 0 ]]; then
        echo -e " ${GREEN}Added (${added}):${NC}"
        local shown=0
        for f in "${ADDED_FILES[@]}"; do
            echo -e "   ${GREEN}+${NC} ${f}"
            ((++shown))
            if [[ $shown -ge 20 && $added -gt 20 ]]; then
                log_dim "  ... and $((added - 20)) more"
                break
            fi
        done
        echo ""
    fi

    if [[ $modified -gt 0 ]]; then
        echo -e " ${BLUE}Modified (${modified}):${NC}"
        local shown=0
        for f in "${MODIFIED_FILES[@]}"; do
            echo -e "   ${BLUE}~${NC} ${f}"
            ((++shown))
            if [[ $shown -ge 20 && $modified -gt 20 ]]; then
                log_dim "  ... and $((modified - 20)) more"
                break
            fi
        done
        echo ""
    fi

    if [[ $deleted -gt 0 ]]; then
        echo -e " ${RED}Not in upstream (${deleted}):${NC}"
        for f in "${DELETED_FILES[@]}"; do
            echo -e "   ${RED}-${NC} ${f}"
        done
        echo ""
    fi

    if [[ $skipped -gt 0 ]]; then
        echo -e " ${YELLOW}Skipped (${skipped}):${NC}"
        for f in "${SKIPPED_FILES[@]}"; do
            log_warn "${f}"
        done
        echo ""
    fi

    local outdated=${#OUTDATED_DEPS[@]}
    if [[ $outdated -gt 0 ]]; then
        echo -e " ${YELLOW}Outdated deps (${outdated}):${NC}"
        for entry in "${OUTDATED_DEPS[@]}"; do
            IFS='|' read -r type pkg local_ver up_ver <<< "$entry"
            echo -e "   ${YELLOW}↑${NC} ${pkg} ${DIM}${local_ver} → ${up_ver} (${type})${NC}"
        done
        echo ""
        log_dim "Run 'npm install' after updating package.json manually."
        echo ""
    fi

    echo -e " ${DIM}Summary: ${added} added, ${modified} modified, ${deleted} not in upstream, ${skipped} skipped, ${outdated} deps outdated${NC}"
    echo ""
}

apply_changes() {
    log_info "Applying changes..."

    for rel in "${ADDED_FILES[@]}"; do
        mkdir -p "$(dirname "${ROOT}/${rel}")"
        if cp -p "${WORK}/${rel}" "${ROOT}/${rel}" 2>/dev/null; then
            log_ok "Added:   ${rel}"
        else
            log_err "Failed to add: ${rel}"
            ((++ERRORS))
        fi
    done

    for rel in "${MODIFIED_FILES[@]}"; do
        if cp -p "${WORK}/${rel}" "${ROOT}/${rel}" 2>/dev/null; then
            log_ok "Updated: ${rel}"
        else
            log_err "Failed to update: ${rel}"
            ((++ERRORS))
        fi
    done

    for rel in "${DELETED_FILES[@]}"; do
        if ! $FORCE; then
            read -rp "  Delete ${rel}? [y/N] " ans
            [[ "${ans,,}" == "y" ]] || { log_warn "Kept: ${rel}"; continue; }
        fi
        if rm "${ROOT}/${rel}" 2>/dev/null; then
            rmdir --parents --ignore-fail-on-non-empty "$(dirname "${ROOT}/${rel}")" 2>/dev/null || true
            log_ok "Deleted: ${rel}"
        else
            log_err "Failed to delete: ${rel}"
            ((++ERRORS))
        fi
    done
}

save_sync_state() {
    echo "${UPSTREAM_SHA}" > "$LASTSYNC_FILE"
    date -u +"%Y-%m-%d %H:%M:%S UTC" >> "$LASTSYNC_FILE"
    log_ok "Sync state saved (${UPSTREAM_SHA:0:7})"
}

main() {
    parse_args "$@"

    echo ""
    log_info "Upstream sync — ${REPO}"
    echo ""

    preflight
    show_last_sync
    get_upstream_sha
    download_upstream
    load_syncignore
    build_manifest
    show_preview

    if $DRY_RUN; then
        log_warn "[DRY RUN] No changes applied"
        exit 0
    fi

    if [[ ${#ADDED_FILES[@]} -eq 0 && ${#MODIFIED_FILES[@]} -eq 0 && ${#DELETED_FILES[@]} -eq 0 ]]; then
        log_ok "Nothing to sync"
        save_sync_state
        exit 0
    fi

    apply_changes

    echo ""
    save_sync_state

    echo ""
    if [[ $ERRORS -gt 0 ]]; then
        log_warn "Sync completed with ${ERRORS} error(s)"
    else
        log_ok "Sync completed successfully"
    fi
}

main "$@"
