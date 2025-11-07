#!/bin/bash

# OwncastLive Extension Installation Script

EXTENSION_NAME="OwncastLive_Panel@extensions.owncastlive"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_NAME"

echo "Installing OwncastLive GNOME Shell Extension..."

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
cp -r * "$EXTENSION_DIR/"

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
