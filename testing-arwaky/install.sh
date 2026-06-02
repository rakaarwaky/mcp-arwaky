#!/bin/bash
# Agentic-Testing Installer
# Cross-platform installation: Linux (Debian/Ubuntu), Fedora, macOS, Windows (PowerShell)
# Usage: curl -sSL https://raw.githubusercontent.com/rakaarwaky/agentic-testing/main/install.sh | bash
#        or: bash install.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Detect OS
detect_os() {
    if [ -n "$OSTYPE" ]; then
        case "$OSTYPE" in
            linux-gnu*)
                if [ -f /etc/os-release ]; then
                    . /etc/os-release
                    case "$ID" in
                        debian|ubuntu|linuxmint)
                            echo "debian"
                            ;;
                        fedora|rhel|centos)
                            echo "fedora"
                            ;;
                        *)
                            echo "linux"
                            ;;
                    esac
                else
                    echo "linux"
                fi
                ;;
            darwin*)
                echo "macos"
                ;;
            *)
                echo "unknown"
                ;;
        esac
    else
        echo "unknown"
    fi
}

OS=$(detect_os)

echo -e "${BOLD}"
echo "   _                    _   _        _____         _   _             "
echo "  /_\  __ _  ___ _ __  | |_(_) ___  |_   _|__  ___| |_(_)_ __   __ _ "
echo " //_\|/ _` |/ _ \ '_ \ | __| |/ __|   | |/ _ \/ __| __| | '_ \ / _` |"
echo "/  _  \ (_| |  __/ | | || |_| | (__    | |  __/\__ \ |_| | | | | (_| |"
echo "\_/ \_/\__, |\___|_| |_| \__|_|\___|   |_|\___||___/\__|_|_| |_|\__, |"
echo "       |___/                                                    |___/ "
echo ""
echo "  Autonomous Unit Testing & Self-Healing for Python"
echo -e "${NC}"
echo -e "  Detected: ${GREEN}$OS${NC}"

# ── Check Python ────────────────────────────────────────────────────
echo -e "${BOLD}[1/5] Checking Python...${NC}"

PYTHON=""
for cmd in python3.13 python3.12 python3; do
    if command -v "$cmd" &>/dev/null; then
        ver=$($cmd -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
        major=$(echo "$ver" | cut -d. -f1)
        minor=$(echo "$ver" | cut -d. -f2)
        if [ "$major" -ge 3 ] && [ "$minor" -ge 12 ]; then
            PYTHON="$cmd"
            echo -e "  ${GREEN}Found: $cmd ($ver)${NC}"
            break
        fi
    fi
done

if [ -z "$PYTHON" ]; then
    echo -e "  ${RED}Python >= 3.12 not found!${NC}"
    echo "  Install Python 3.12+ first:"
    case "$OS" in
        debian)
            echo "    Debian/Ubuntu: sudo apt update && sudo apt install python3.12 python3.12-venv python3-pip"
            echo "    Or use pyenv: curl https://pyenv.run | bash"
            ;;
        fedora)
            echo "    Fedora: sudo dnf install python3.12 python3-pip"
            ;;
        macos)
            echo "    macOS: brew install python3.12"
            echo "    Or use pyenv: brew install pyenv && pyenv install 3.12.0"
            ;;
        *)
            echo "    Install Python 3.12+ from https://python.org/downloads"
            ;;
    esac
    exit 1
fi

# ── Choose install method ───────────────────────────────────────────
echo -e "\n${BOLD}[2/5] Install method:${NC}"

INSTALL_METHOD=""
if command -v uv &>/dev/null; then
    INSTALL_METHOD="uv"
    echo -e "  ${GREEN}Using uv (recommended)${NC}"
elif command -v pip3 &>/dev/null; then
    INSTALL_METHOD="pip"
    echo -e "  Using pip3"
elif command -v pip &>/dev/null; then
    INSTALL_METHOD="pip"
    echo -e "  Using pip"
else
    echo -e "  ${RED}No pip or uv found!${NC}"
    exit 1
fi

# ── Install ─────────────────────────────────────────────────────────
echo -e "\n${BOLD}[3/5] Installing agentic-testing...${NC}"

if [ "$INSTALL_METHOD" = "uv" ]; then
    uv tool install agentic-testing || uv pip install agentic-testing
else
    $PYTHON -m pip install --user agentic-testing
fi

# Verify installation
if command -v agentic-test &>/dev/null; then
    echo -e "  ${GREEN}Installed: $(which agentic-test)${NC}"
elif command -v agentic-testing &>/dev/null; then
    echo -e "  ${GREEN}Installed: $(which agentic-testing)${NC}"
else
    # Try to find LOCAL_BIN dynamically
    if [ "$OS" = "macos" ]; then
        LOCAL_BIN=$($PYTHON -m site --user-base 2>/dev/null)/bin
    else
        LOCAL_BIN="$HOME/.local/bin"
    fi
    
    if [ -f "$LOCAL_BIN/agentic-test" ]; then
        echo -e "  ${YELLOW}agentic-test is at $LOCAL_BIN/agentic-test${NC}"
        echo -e "  ${YELLOW}Add to PATH: export PATH=\"$LOCAL_BIN:\$PATH\"${NC}"
        export PATH="$LOCAL_BIN:$PATH"
    fi
fi

# ── Init config ─────────────────────────────────────────────────────
echo -e "\n${BOLD}[4/5] Initializing configuration...${NC}"

# Find agentic-test command
AGENTIC_TEST=""
for cmd in agentic-test "$HOME/.local/bin/agentic-test"; do
    if command -v "$cmd" &>/dev/null || [ -x "$cmd" ]; then
        AGENTIC_TEST="$cmd"
        break
    fi
done

if [ -n "$AGENTIC_TEST" ]; then
    $AGENTIC_TEST init
else
    echo -e "  ${YELLOW}Could not find agentic-test command for init${NC}"
    echo "  Run manually: agentic-test init"
fi

# ── Done ────────────────────────────────────────────────────────────
echo -e "\n${BOLD}[5/5] Done!${NC}"
echo ""
echo -e "${GREEN}Agentic-Testing is ready.${NC}"
echo ""
echo "Quick start:"
echo "  agentic-test run ./tests/         # run tests with self-healing"
echo "  agentic-test analyze file.py     # analyze code with AST"
echo "  agentic-test workflow full-test  # run a pre-defined workflow"
echo ""
echo "As MCP server:"
echo "  agentic-testing                  # start MCP server (stdio)"
echo ""
