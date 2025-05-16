#!/bin/bash

# Setup script for Extender MCP Server
echo "Setting up Extender MCP Server environment..."

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Update config paths
echo "Updating config paths in cursor/mcp.json..."

# Get the current directory
CURRENT_DIR=$(pwd)
NODE_PATH=$(which node)

# Create a script to update the mcp.json file with absolute paths
cat > update_config.js << EOF
const fs = require('fs');
const path = require('path');

// Read the current mcp.json file
const configPath = path.join('${CURRENT_DIR}', 'cursor', 'mcp.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Update with absolute paths
config.mcpServers["Extender MCP Server"].command = "${NODE_PATH}";
config.mcpServers["Extender MCP Server"].args = ["${CURRENT_DIR}/mcp-server.js"];

// Write the updated config back
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('MCP config updated with absolute paths');
EOF

# Run the update script
node update_config.js
rm update_config.js

# Check if Claude Desktop config directory exists
CLAUDE_DIR="$HOME/.anthropic/claude-desktop"
if [ -d "$CLAUDE_DIR" ]; then
  echo "Claude Desktop config directory found at $CLAUDE_DIR"
  
  # Create MCP directory if it doesn't exist
  MCP_DIR="$CLAUDE_DIR/mcp"
  mkdir -p "$MCP_DIR"
  
  # Copy the config file
  echo "Copying MCP config to Claude Desktop..."
  cp cursor/mcp.json "$MCP_DIR/"
  echo "MCP configuration installed to Claude Desktop"
else
  echo "Claude Desktop config directory not found at $CLAUDE_DIR"
  echo "You'll need to manually configure the MCP server in Claude Desktop"
  echo "Use the configuration in cursor/mcp.json as a reference"
fi

echo "Setup complete! You can now start the server with 'npm start'"
