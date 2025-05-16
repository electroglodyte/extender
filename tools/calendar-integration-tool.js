// calendar-integration-tool.js for your extender MCP server

import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import axios from 'axios';

class CalendarIntegrationTool extends MCPTool {
  name = 'calendar_integration';
  description = 'Create and manage travel-related calendar events and reminders';
  
  schema = {
    action: z.enum(['create_trip', 'add_reminder', 'get_upcoming', 'update_event', 'delete_event']),
    title: z.string().optional(),
    start_date: z.string().optional(), // YYYY-MM-DD format
    start_time: z.string().optional(), // HH:MM format
    end_date: z.string().optional(), // YYYY-MM-DD format
    end_time: z.string().optional(), // HH:MM format
    location: z.string().optional(),
    description: z.string().optional(),
    calendar_id: z.string().default('primary'), // Default to primary calendar
    event_id: z.string().optional(), // For update/delete operations
    reminders: z.array(z.object({
      type: z.string(), // E.g., 'check_in', 'departure', etc.
      minutes_before: z.number(), // Minutes before the event to remind
      title: z.string().optional(),
      description: z.string().optional()
    })).optional(),
    include_transit: z.boolean().default(true), // Whether to include transit details in description
    transit_details: z.object({
      to_airport: z.object({
        mode: z.string(),
        departure_time: z.string(),
        arrival_time: z.string(),
        notes: z.string().optional()
      }).optional(),
      return_transit: z.object({
        mode: z.string(),
        departure_time: z.string(),
        arrival_time: z.string(),
        notes: z.string().optional()
      }).optional()
    }).optional()
  };
  
  async execute(params) {
    const { action } = params;
    
    switch (action) {
      case 'create_trip':
        return this.createTripEvent(params);
      case 'add_reminder':
        return this.addReminder(params);
      case 'get_upcoming':
        return this.getUpcomingEvents(params);
      case 'update_event':
        return this.updateEvent(params);
      case 'delete_event':
        return this.deleteEvent(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
  
  async createTripEvent(params) {
    const {
      title,
      start_date,
      start_time,
      end_date,
      end_time,
      location,
      description,
      calendar_id,
      reminders,
      include_transit,
      transit_details
    } = params;
    
    // Validate required parameters
    if (!title || !start_date || !end_date) {
      throw new Error('Title, start date, and end date are required');
    }
    
    // Format dates for Google Calendar
    const startDateTime = start_time 
      ? `${start_date}T${start_time}:00` 
      : `${start_date}T00:00:00`;
      
    const endDateTime = end_time 
      ? `${end_date}T${end_time}:00` 
      : `${end_date}T23:59:59`;
    
    // Build event description with transit details if available
    let fullDescription = description || '';
    
    if (include_transit && transit_details) {
      fullDescription += '\n\n--- TRAVEL DETAILS ---\n\n';
      
      if (transit_details.to_airport) {
        const toAirport = transit_details.to_airport;
        fullDescription += `TO AIRPORT:\n`;
        fullDescription += `Mode: ${toAirport.mode}\n`;
        fullDescription += `Departure: ${toAirport.departure_time}\n`;
        fullDescription += `Arrival at airport: ${toAirport.arrival_time}\n`;
        
        if (toAirport.notes) {
          fullDescription += `Notes: ${toAirport.notes}\n`;
        }
        
        fullDescription += '\n';
      }
      
      if (transit_details.return_transit) {
        const returnTransit = transit_details.return_transit;
        fullDescription += `RETURN JOURNEY:\n`;
        fullDescription += `Mode: ${returnTransit.mode}\n`;
        fullDescription += `Departure: ${returnTransit.departure_time}\n`;
        fullDescription += `Arrival: ${returnTransit.arrival_time}\n`;
        
        if (returnTransit.notes) {
          fullDescription += `Notes: ${returnTransit.notes}\n`;
        }
      }
    }
    
    // Prepare reminder overrides if provided
    const reminderOverrides = [];
    if (reminders && reminders.length > 0) {
      reminders.forEach(reminder => {
        reminderOverrides.push({
          method: 'popup',
          minutes: reminder.minutes_before
        });
      });
    } else {
      // Default reminders for travel
      reminderOverrides.push(
        { method: 'popup', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 2 * 60 }   // 2 hours before
      );
    }
    
    // In a real implementation, this would call the Google Calendar API
    // For demo purposes, we're mocking the response
    
    try {
      // Mock API call
      // const response = await googleCalendarApi.events.insert({...});
      
      // Mock response
      const eventId = `trip_${Math.random().toString(36).substring(2, 10)}`;
      
      // Now, add individual reminders if requested
      if (reminders && reminders.length > 0) {
        // In a proper implementation, this would be a batch insert to Google Calendar
        const reminderPromises = reminders.map(reminder => {
          // Calculate reminder time
          const eventDate = new Date(`${start_date}T${start_time || '00:00:00'}`);
          const reminderDate = new Date(eventDate.getTime() - reminder.minutes_before * 60000);
          
          // Create a title with the type of reminder
          const reminderTitle = reminder.title || `${title} - ${reminder.type} reminder`;
          
          // Create reminder event
          return this.addReminder({
            title: reminderTitle,
            start_date: reminderDate.toISOString().split('T')[0],
            start_time: reminderDate.toISOString().split('T')[1].substring(0, 5),
            end_date: reminderDate.toISOString().split('T')[0],
            end_time: (new Date(reminderDate.getTime() + 30 * 60000)).toISOString().split('T')[1].substring(0, 5),
            description: reminder.description || `Reminder for your trip: ${title}`,
            calendar_id
          });
        });
        
        // Wait for all reminders to be created
        await Promise.all(reminderPromises);
      }
      
      // For check-in reminders specifically, calculate based on airline policies
      if (description && description.includes('flight')) {
        // Extract airline if mentioned
        const airlineMatch = description.match(/\b(Aer Lingus|Ryanair|Air France|Lufthansa|EasyJet|British Airways)\b/i);
        const airline = airlineMatch ? airlineMatch[1] : null;
        
        // Create check-in reminder based on airline
        let checkInHoursBefore = 24; // Default
        
        if (airline) {
          // Adjust based on airline policies
          switch(airline.toLowerCase()) {
            case 'ryanair':
              checkInHoursBefore = 48; // Ryanair allows check-in 48 hours before
              break;
            case 'easyjet':
              checkInHoursBefore = 30; // EasyJet allows check-in 30 days before, but we'll use 30 hours as a reminder
              break;
            case 'aer lingus':
            case 'british airways':
            case 'air france':
            case 'lufthansa':
              checkInHoursBefore = 24; // Most allow 24 hours
              break;
          }
          
          // Calculate check-in time
          const eventDate = new Date(`${start_date}T${start_time || '00:00:00'}`);
          const checkInDate = new Date(eventDate.getTime() - checkInHoursBefore * 60 * 60000);
          
          // Add check-in reminder
          await this.addReminder({
            title: `Check-in reminder for ${title}`,
            start_date: checkInDate.toISOString().split('T')[0],
            start_time: checkInDate.toISOString().split('T')[1].substring(0, 5),
            end_date: checkInDate.toISOString().split('T')[0],
            end_time: (new Date(checkInDate.getTime() + 30 * 60000)).toISOString().split('T')[1].substring(0, 5),
            description: `Time to check in for your flight with ${airline}!`,
            calendar_id
          });
        }
      }
      
      return {
        success: true,
        message: `Trip "${title}" added to calendar successfully`,
        event_id: eventId,
        reminders_added: reminders ? reminders.length : 0
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async addReminder(params) {
    const {
      title,
      start_date,
      start_time,
      end_date,
      end_time,
      description,
      calendar_id
    } = params;
    
    // Validate required parameters
    if (!title || !start_date) {
      throw new Error('Title and start date are required');
    }
    
    // In a real implementation, this would call the Google Calendar API
    // For now, we're mocking the response
    
    try {
      // Mock response
      const eventId = `reminder_${Math.random().toString(36).substring(2, 10)}`;
      
      return {
        success: true,
        message: `Reminder "${title}" added to calendar successfully`,
        event_id: eventId
      };
    } catch (error) {
      console.error('Error creating reminder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getUpcomingEvents(params) {
    const { calendar_id } = params;
    
    // In a real implementation, this would call the Google Calendar API
    // For now, we're mocking the response
    
    try {
      // Mock response - list of upcoming travel events
      return {
        success: true,
        events: [
          {
            id: 'event123',
            title: 'Trip to Paris',
            start: '2025-06-10T08:00:00',
            end: '2025-06-15T20:00:00',
            location: 'Paris, France',
            description: 'Business trip to Paris office',
            reminders: [
              { type: 'check_in', time: '2025-06-09T08:00:00' }
            ]
          },
          {
            id: 'event456',
            title: 'Conference in Berlin',
            start: '2025-07-22T09:00:00',
            end: '2025-07-25T18:00:00',
            location: 'Berlin, Germany',
            description: 'Annual industry conference',
            reminders: [
              { type: 'check_in', time: '2025-07-21T09:00:00' },
              { type: 'departure', time: '2025-07-22T06:00:00' }
            ]
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching events:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async updateEvent(params) {
    const {
      event_id,
      title,
      start_date,
      start_time,
      end_date,
      end_time,
      location,
      description,
      calendar_id
    } = params;
    
    // Validate required parameters
    if (!event_id) {
      throw new Error('Event ID is required for updates');
    }
    
    // In a real implementation, this would call the Google Calendar API
    // For now, we're mocking the response
    
    try {
      // Mock response
      return {
        success: true,
        message: `Event "${title || 'Unknown'}" updated successfully`,
        event_id
      };
    } catch (error) {
      console.error('Error updating event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async deleteEvent(params) {
    const { event_id, calendar_id } = params;
    
    // Validate required parameters
    if (!event_id) {
      throw new Error('Event ID is required for deletion');
    }
    
    // In a real implementation, this would call the Google Calendar API
    // For now, we're mocking the response
    
    try {
      // Mock response
      return {
        success: true,
        message: `Event deleted successfully`,
        event_id
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default CalendarIntegrationTool;