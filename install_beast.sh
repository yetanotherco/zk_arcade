#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "Installing Beast..."

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

echo "Beasy $CURRENT_TAG installed successfully in $Beast_BIN_PATH."
echo "Detected your preferred shell is $PREF_SHELL and added Beast to PATH."
echo "Run 'source $PROFILE' or start a new terminal session to use Beast."
