# Extender Travel Assistant

An MCP (Model Context Protocol) server with specialized tools for planning and organizing trips. This server provides Claude and other AI assistants with the ability to search for flights, find accommodations, plan transit to/from airports, and manage your travel calendar.

## Features

- **Route Memory Tool**: Store and retrieve complex travel routes (e.g., Dublin → Paris → Valence connections)
- **Flight Search Tool**: Search for flights across multiple platforms (Kayak.ie, EDreams)
- **Dublin Transit Tool**: Plan journeys to and from Dublin Airport, optimized for your flight times
- **Accommodation Search Tool**: Find places to stay on Booking.com, Airbnb, and more
- **Calendar Integration Tool**: Add trips and reminders to Google Calendar, including check-in alerts

## Getting Started

### Prerequisites

- Node.js v20 or higher
- A Supabase account for storing preferences
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

### Example Queries

- "Find flights from Dublin to Paris for May 25th to May 30th"
- "What are the best transit options to Dublin Airport for a 10 AM flight next Thursday?"
- "Search for accommodations in Berlin from June 15-20 with a maximum price of €200 per night"
- "Remember my route from Dublin to Valence via Paris for future trips"
- "Add my Paris trip to my calendar with check-in reminders"

## Configuration

The Supabase connection details are stored in each tool file. To use your own Supabase instance:

1. Update the `supabaseUrl` and `supabaseKey` variables in each tool file
2. Create the necessary database tables (setup functions are included in each tool)

## Tools

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

## License

MIT

---

Created by Armin Prediger (2025)
