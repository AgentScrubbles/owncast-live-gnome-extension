#!/bin/bash

# OwncastLive Extension Installation Script
# Supports GNOME Shell 42-49

EXTENSION_NAME="OwncastLive_Panel@extensions.owncastlive"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_NAME"

echo "Installing OwncastLive GNOME Shell Extension..."

# Detect GNOME Shell version
if command -v gnome-shell &> /dev/null; then
    GNOME_VERSION=$(gnome-shell --version | grep -oP '\d+' | head -1)
    echo "Detected GNOME Shell version: $GNOME_VERSION"
else
    echo "Warning: Could not detect GNOME Shell version. Assuming GNOME 45+."
    GNOME_VERSION=45
fi

# Create extensions directory if it doesn't exist
mkdir -p "$HOME/.local/share/gnome-shell/extensions"

# Remove old installation if exists
if [ -d "$EXTENSION_DIR" ]; then
    echo "Removing old installation..."
    rm -rf "$EXTENSION_DIR"
fi

# Copy extension files
echo "Copying extension files..."
mkdir -p "$EXTENSION_DIR"
mkdir -p "$EXTENSION_DIR/schemas"

# Copy common files
cp metadata.json "$EXTENSION_DIR/"
cp stylesheet.css "$EXTENSION_DIR/"
cp owncast-icon.svg "$EXTENSION_DIR/"
cp schemas/*.xml "$EXTENSION_DIR/schemas/"

# Copy files based on GNOME version
if [ "$GNOME_VERSION" -ge 45 ]; then
    echo "Installing for GNOME 45+ (ESM modules)..."

    # Copy ESM entry points
    cp extension.js "$EXTENSION_DIR/"
    cp prefs.js "$EXTENSION_DIR/"

    # Copy impl/ modules (ESM)
    mkdir -p "$EXTENSION_DIR/impl"
    cp impl/*.js "$EXTENSION_DIR/impl/"
else
    echo "Installing for GNOME 42-44 (legacy imports)..."

    # Copy legacy entry points
    cp extension-legacy.js "$EXTENSION_DIR/extension.js"
    cp prefs-legacy.js "$EXTENSION_DIR/prefs.js"

    # Copy legacy modules
    cp api.js "$EXTENSION_DIR/"
    cp icons.js "$EXTENSION_DIR/"
    cp topbar.js "$EXTENSION_DIR/"
    cp menu_items.js "$EXTENSION_DIR/"
fi

# Compile schemas
echo "Compiling schemas..."
cd "$EXTENSION_DIR"
glib-compile-schemas schemas/

echo ""
echo "Installation complete!"
echo ""
echo "To enable the extension:"
echo "  1. Restart GNOME Shell:"
echo "     - On X11: Press Alt+F2, type 'r', press Enter"
echo "     - On Wayland: Log out and log back in"
echo ""
echo "  2. Enable the extension:"
echo "     gnome-extensions enable $EXTENSION_NAME"
echo ""
echo "Or use the GNOME Extensions app to enable it."
echo ""
echo "To configure the extension, run:"
echo "  gnome-extensions prefs $EXTENSION_NAME"
echo ""
