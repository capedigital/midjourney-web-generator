#!/bin/bash

# Start Local Bridge Server
# This script is run automatically on login via LaunchAgent

cd "$(dirname "$0")"
exec /usr/local/bin/node server.js >> ~/Library/Logs/local-bridge.log 2>&1
