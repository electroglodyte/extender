// mcp-server.js - Main server file for the extender MCP server

import { McpServer, StdioServerTransport } from 'mcp-framework';
import RouteMemoryTool from './tools/route-memory-tool.js';
import FlightSearchTool from './tools/flight-search-tool.js';
import DublinTransitTool from './tools/dublin-transit-tool.js';
import AccommodationSearchTool from './tools/accommodation-search-tool.js';
import CalendarIntegrationTool from './tools/calendar-integration-tool.js';
import { 
  GetProjectsTool,
  GetTasksTool,
  GetPersonsTool,
  CreateTaskTool,
  UpdateTaskTool
} from './tools/task-management-tool.js';

// Create the MCP server instance
const server = new McpServer();

// Register all the travel tools
server.registerTool(new RouteMemoryTool());
server.registerTool(new FlightSearchTool());
server.registerTool(new DublinTransitTool());
server.registerTool(new AccommodationSearchTool());
server.registerTool(new CalendarIntegrationTool());

// Register task management tools
server.registerTool(new GetProjectsTool());
server.registerTool(new GetTasksTool());
server.registerTool(new GetPersonsTool());
server.registerTool(new CreateTaskTool());
server.registerTool(new UpdateTaskTool());

// Set up server on standard I/O for communication with Claude Desktop
const transport = new StdioServerTransport();
server.addTransport(transport);

// Start the server
server.start();

console.log('Extender MCP Travel Assistant & Task Management Server running...');
