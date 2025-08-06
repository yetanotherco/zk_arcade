#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "Installing Beast..."

# Function to check if RISC Zero is installed
check_risc0_installed() {
    if [ -f "$HOME/.risc0/bin/rzup" ]; then
        local output=$($HOME/.risc0/bin/rzup show 2>/dev/null)
        local rust_installed=$(echo "$output" | awk '/rust/,/^$/ {if (/\* 1\.88\.0/) print "found"}')
        local cargo_risczero_installed=$(echo "$output" | awk '/cargo-risczero/,/^$/ {if (/\* 2\.3\.0/) print "found"}')
        if [ "$rust_installed" = "found" ] && [ "$cargo_risczero_installed" = "found" ]; then
            return 0  # installed
        fi
    fi
    return 1  # not installed
}

# Function to check if SP1 is installed
# NOTE: There is missing to check if the installed version is v5.0.0
check_sp1_installed() {
    if [ -f "$HOME/.sp1/bin/sp1up" ]; then
        return 0  # installed
    fi
    return 1  # not installed
}

# Function to ask for confirmation
ask_confirmation() {
    local message="$1"
    while true; do
        read -p "$message (y/n): " confirm < /dev/tty
        case "$confirm" in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please enter y or n.";;
        esac
    done
}

# Function to install RISC Zero toolchain
install_risc0() {
    if check_risc0_installed; then
        echo "RISC Zero toolchain (rust 1.88.0, cargo-risczero 2.3.0) is already installed."
        return 0
    fi
    
    if ask_confirmation "RISC Zero toolchain is not installed. Do you want to install it?"; then
        echo "Installing RISC Zero toolchain..."
        curl -L https://risczero.com/install | bash
        $HOME/.risc0/bin/rzup install rust 1.88.0
        $HOME/.risc0/bin/rzup install cargo-risczero 2.3.0
        echo "RISC Zero toolchain installed successfully."
    else
        echo "Skipping RISC Zero toolchain installation."
        return 1
    fi
}

# Function to install SP1 toolchain
install_sp1() {
    if check_sp1_installed; then
        echo "SP1 toolchain is already installed."
        return 0
    fi
    
    if ask_confirmation "SP1 toolchain is not installed. Do you want to install it?"; then
        echo "Installing SP1 toolchain..."
        curl -L https://sp1.succinct.xyz | bash
        ~/.sp1/bin/sp1up --version v5.0.0
        echo "SP1 toolchain installed successfully."
    else
        echo "Skipping SP1 toolchain installation."
        return 1
    fi
}

# Install toolchains
install_risc0
install_sp1

BASE_DIR=$HOME
BEAST_DIR="${BEAST_DIR-"$BASE_DIR/.beast"}"
BEAST_BIN_DIR="$BEAST_DIR/bin"
BEAST_BIN_PATH="$BEAST_BIN_DIR/beast"
CURRENT_TAG=$(curl -s -L \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/yetanotherco/zk_arcade/releases/latest \
  | grep '"tag_name":' | awk -F'"' '{print $4}')
RELEASE_URL="https://github.com/yetanotherco/zk_arcade/releases/download/$CURRENT_TAG/"
ARCH=$(uname -m)

if [ "$ARCH" == "x86_64" ]; then
    FILE="beast_x86"
elif [ "$ARCH" == "arm64" ]; then
    FILE="beast_arm64"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

mkdir -p "$BEAST_BIN_DIR"
if curl -sSf -L "$RELEASE_URL$FILE" -o "$BEAST_BIN_PATH"; then
    echo "Beast download successful, installing $CURRENT_TAG release..."
else
    echo "Error: Failed to download $RELEASE_URL$FILE"
    exit 1
fi
chmod +x "$BEAST_BIN_PATH"

# Store the correct profile file (i.e. .profile for bash or .zshenv for ZSH).
case $SHELL in
*/zsh)
    PROFILE="${ZDOTDIR-"$HOME"}/.zshenv"
    PREF_SHELL=zsh
    ;;
*/bash)
    PROFILE=$HOME/.bashrc
    PREF_SHELL=bash
    ;;
*/fish)
    PROFILE=$HOME/.config/fish/config.fish
    PREF_SHELL=fish
    ;;
*/ash)
    PROFILE=$HOME/.profile
    PREF_SHELL=ash
    ;;
*)
    echo "beast: could not detect shell, manually add ${BEAST_BIN_DIR} to your PATH."
    exit 1
esac

# Only add beast if it isn't already in PATH.
if [[ ":$PATH:" != *":${BEAST_BIN_DIR}:"* ]]; then
    # Add the beast directory to the path and ensure the old PATH variables remain.
    # If the shell is fish, echo fish_add_path instead of export.
    if [[ "$PREF_SHELL" == "fish" ]]; then
        echo >> "$PROFILE" && echo "fish_add_path -a $BEAST_BIN_DIR" >> "$PROFILE"
    else
        echo >> "$PROFILE" && echo "export PATH=\"\$PATH:$BEAST_BIN_DIR\"" >> "$PROFILE"
    fi
fi

echo "Beast $CURRENT_TAG installed successfully in $BEAST_BIN_PATH."
echo "Detected your preferred shell is $PREF_SHELL and added Beast to PATH."
echo "Run 'source $PROFILE' or start a new terminal session to use Beast."
