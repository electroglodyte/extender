# Extender MCP Server

An MCP (Model Context Protocol) server with specialized tools for planning and organizing trips, as well as managing tasks and projects. This server provides Claude and other AI assistants with the ability to search for flights, find accommodations, plan transit to/from airports, manage your travel calendar, and keep track of your tasks and projects.

## Features

### Travel Tools
- **Route Memory Tool**: Store and retrieve complex travel routes (e.g., Dublin → Paris → Valence connections)
- **Flight Search Tool**: Search for flights across multiple platforms (Kayak.ie, EDreams)
- **Dublin Transit Tool**: Plan journeys to and from Dublin Airport, optimized for your flight times
- **Accommodation Search Tool**: Find places to stay on Booking.com, Airbnb, and more
- **Calendar Integration Tool**: Add trips and reminders to Google Calendar, including check-in alerts

### Task Management Tools
- **Get Projects Tool**: Retrieve and filter projects from your database
- **Get Tasks Tool**: Retrieve and filter tasks with various criteria
- **Get Persons Tool**: Search and retrieve person records
- **Create Task Tool**: Add new tasks to your projects
- **Update Task Tool**: Modify existing tasks with new details

## Getting Started

### Prerequisites

- Node.js v20 or higher
- A Supabase account for storing preferences, tasks, and projects
- Claude Desktop (or another MCP-compatible AI assistant)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/electroglodyte/extender.git
   cd extender
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the MCP server:
   ```bash
   npm start
   ```

4. In Claude Desktop, connect to the MCP server:
   - Go to Settings > MCP Tools
   - Add a new MCP Server
   - Connect to the running server (typically running on standard I/O)

## Usage Examples

### Planning a Trip

Ask Claude to help plan a trip by mentioning:
- Your desired destination
- Travel dates
- Departure airport (defaults to Dublin Airport)
- Any specific preferences

Claude can then:
1. Search for available flights
2. Find suitable accommodations
3. Plan your transit to/from Dublin Airport
4. Create calendar events with automatic reminders

### Example Travel Queries

- "Find flights from Dublin to Paris for May 25th to May 30th"
- "What are the best transit options to Dublin Airport for a 10 AM flight next Thursday?"
- "Search for accommodations in Berlin from June 15-20 with a maximum price of €200 per night"
- "Remember my route from Dublin to Valence via Paris for future trips"
- "Add my Paris trip to my calendar with check-in reminders"

### Managing Tasks and Projects

Ask Claude to help manage your tasks and projects:
- Create new tasks and assign them to projects
- Get lists of pending tasks
- Update task statuses
- Find tasks assigned to specific people

### Example Task Management Queries

- "Create a new task called 'Prepare presentation' for the Marketing project due next Friday"
- "Show me all my incomplete tasks for the current week"
- "Update the status of the website redesign task to 'In Progress'"
- "List all projects with an Active status"
- "Find all tasks assigned to Sarah"

## Configuration

The Supabase connection details are stored in each tool file. To use your own Supabase instance:

1. Update the `supabaseUrl` and `supabaseKey` variables in each tool file
2. Create the necessary database tables (setup functions are included in each tool)

## Tools Details

### Route Memory Tool

Stores complex routes with multiple segments in a Supabase database.

**Capabilities:**
- Save routes with detailed segment information
- Retrieve routes by name or destination
- Update existing routes
- List all saved routes

### Flight Search Tool

Searches for flights across multiple booking platforms.

**Capabilities:**
- Multi-platform search (Kayak.ie, EDreams)
- Filter by date, price, and airline preferences
- Compare options across sites

### Dublin Transit Tool

Plans journeys to and from Dublin Airport with a focus on Citylink bus services.

**Capabilities:**
- Find optimal bus times based on your flight schedule
- Account for traffic conditions
- Calculate buffer time at the airport
- Support for both Tuam and Galway departures

### Accommodation Search Tool

Searches for places to stay across multiple platforms.

**Capabilities:**
- Multi-platform search (Booking.com, Airbnb)
- Filter by price, amenities, and location
- Store and apply personal preferences by location

### Calendar Integration Tool

Creates and manages travel-related calendar events.

**Capabilities:**
- Add trips to your calendar
- Include transit details in event descriptions
- Set up automatic reminders for check-ins
- Customize reminder timing based on airline policies

### Task Management Tools

A set of tools for managing projects and tasks.

**Capabilities:**
- Create and manage projects
- Create, retrieve, and update tasks
- Filter tasks by status, project, completion, and next action status
- Manage person records for task assignment
- Set priorities, due dates, and contexts for tasks

## License

MIT

---

Created by Armin Prediger (2025)
