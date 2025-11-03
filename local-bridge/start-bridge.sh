#!/bin/bash

# Start Local Bridge Server
# This script is run automatically on login via LaunchAgent

cd "$(dirname "$0")"
exec /opt/homebrew/Cellar/node/23.5.0/bin/node server.js >> ~/Library/Logs/local-bridge.log 2>&1
