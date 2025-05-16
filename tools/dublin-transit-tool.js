// dublin-transit-tool.js for your extender MCP server

import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import axios from 'axios';

class DublinTransitTool extends MCPTool {
  name = 'dublin_transit';
  description = 'Plan journeys to and from Dublin Airport, optimized for flight times';
  
  schema = {
    origin: z.string().default('Tuam'), // Default to Tuam as mentioned
    flight_time: z.string(), // HH:MM format
    flight_date: z.string(), // YYYY-MM-DD format
    is_departure: z.boolean().default(true), // True if it's a flight departing from Dublin
    airport_buffer_hours: z.number().default(2), // Hours to arrive before flight
    return_options: z.number().default(3), // Number of journey options to return
    include_traffic: z.boolean().default(true) // Whether to factor in traffic estimates
  };
  
  async execute(params) {
    const {
      origin,
      flight_time,
      flight_date,
      is_departure,
      airport_buffer_hours,
      return_options,
      include_traffic
    } = params;
    
    // Calculate target airport arrival/departure time
    const flightDateTime = new Date(`${flight_date}T${flight_time}`);
    
    // For departures, subtract buffer time to get required arrival time
    // For arrivals, we don't need a buffer
    const targetAirportTime = new Date(flightDateTime);
    if (is_departure) {
      targetAirportTime.setHours(targetAirportTime.getHours() - airport_buffer_hours);
    }
    
    try {
      // Get Citylink bus schedules
      const busSchedules = await this.getCitylinkSchedules(origin, flight_date, is_departure);
      
      // Calculate traffic adjustments if needed
      const trafficAdjustment = include_traffic ? 
        await this.estimateTrafficDelay(origin, targetAirportTime) : 0;
      
      // Find the best bus options based on timing
      const transitOptions = this.findBestTransitOptions(
        busSchedules,
        targetAirportTime,
        is_departure,
        trafficAdjustment,
        return_options
      );
      
      return {
        success: true,
        flight_details: {
          date: flight_date,
          time: flight_time,
          is_departure
        },
        target_airport_time: targetAirportTime.toISOString(),
        transit_options: transitOptions,
        estimated_traffic_delay_minutes: Math.round(trafficAdjustment / 60000), // Convert ms to minutes
        notes: this.generateTransitNotes(transitOptions[0], is_departure)
      };
    } catch (error) {
      console.error('Dublin transit planning error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getCitylinkSchedules(origin, date, isDeparture) {
    // In a real implementation, this would fetch actual schedules from Citylink API
    // or scrape their website
    
    // For demo purposes, using mocked schedules
    // These schedules would vary by day of week, so we're simplifying here
    
    // Times are in 24-hour format
    const mockedSchedules = {
      'Galway': [
        { departure: '03:30', arrival: '06:15', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '05:00', arrival: '07:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '07:00', arrival: '09:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '08:00', arrival: '10:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '09:00', arrival: '11:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '10:00', arrival: '12:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '11:00', arrival: '13:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '12:00', arrival: '14:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '13:00', arrival: '15:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '14:00', arrival: '16:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '15:00', arrival: '17:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '16:00', arrival: '18:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '17:00', arrival: '19:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '18:00', arrival: '20:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '19:00', arrival: '21:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '20:00', arrival: '22:45', route: '760', stops: ['Galway', 'Dublin Airport'] },
        { departure: '22:00', arrival: '00:45', route: '760', stops: ['Galway', 'Dublin Airport'] }
      ],
      'Tuam': [
        { departure: '03:05', arrival: '06:15', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '04:35', arrival: '07:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '06:35', arrival: '09:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '07:35', arrival: '10:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '08:35', arrival: '11:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '09:35', arrival: '12:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '10:35', arrival: '13:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '11:35', arrival: '14:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '12:35', arrival: '15:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '13:35', arrival: '16:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '14:35', arrival: '17:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '15:35', arrival: '18:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '16:35', arrival: '19:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '17:35', arrival: '20:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '18:35', arrival: '21:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '19:35', arrival: '22:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] },
        { departure: '21:35', arrival: '00:45', route: '760', stops: ['Tuam', 'Galway', 'Dublin Airport'] }
      ]
    };
    
    // Return the appropriate schedule based on origin
    if (mockedSchedules[origin]) {
      return mockedSchedules[origin].map(schedule => ({
        ...schedule,
        duration_minutes: this.calculateDurationMinutes(schedule.departure, schedule.arrival),
        booking_url: `https://www.citylink.ie/timetables/galway-dublin-airport-route-760`
      }));
    } else {
      // If we don't have a direct schedule, default to Galway
      return mockedSchedules['Galway'].map(schedule => ({
        ...schedule,
        note: `No direct route from ${origin}, showing Galway schedules. You'll need to arrange transit to Galway first.`,
        duration_minutes: this.calculateDurationMinutes(schedule.departure, schedule.arrival),
        booking_url: `https://www.citylink.ie/timetables/galway-dublin-airport-route-760`
      }));
    }
  }
  
  calculateDurationMinutes(departure, arrival) {
    // Handle overnight journeys
    const depParts = departure.split(':').map(Number);
    const arrParts = arrival.split(':').map(Number);
    
    let depMinutes = depParts[0] * 60 + depParts[1];
    let arrMinutes = arrParts[0] * 60 + arrParts[1];
    
    // If arrival is earlier than departure, it must be the next day
    if (arrMinutes < depMinutes) {
      arrMinutes += 24 * 60; // Add a day in minutes
    }
    
    return arrMinutes - depMinutes;
  }
  
  async estimateTrafficDelay(origin, targetTime) {
    // In a real implementation, this would use a traffic API
    // For now, we'll use a simple heuristic based on time of day
    
    const hour = targetTime.getHours();
    
    // Rush hour periods have higher delays
    if (hour >= 7 && hour <= 9) {
      return 30 * 60000; // 30 minutes in ms for morning rush hour
    } else if (hour >= 16 && hour <= 18) {
      return 35 * 60000; // 35 minutes in ms for evening rush hour
    } else if (hour >= 10 && hour <= 15) {
      return 15 * 60000; // 15 minutes in ms for midday
    } else {
      return 10 * 60000; // 10 minutes in ms for off-peak
    }
  }
  
  findBestTransitOptions(schedules, targetTime, isDeparture, trafficAdjustment, numOptions) {
    const targetTimeMs = targetTime.getTime();
    
    // For departures, we need buses that arrive before the target time (with buffer)
    // For arrivals, we need buses that depart after the flight lands
    
    let suitableOptions = [];
    
    if (isDeparture) {
      // For departures, find buses that get us to the airport on time
      // We convert schedule times to the same date as the flight for comparison
      schedules.forEach(schedule => {
        const [arrHours, arrMinutes] = schedule.arrival.split(':').map(Number);
        
        // Create a new date with the same day as the flight but with the bus arrival time
        const busArrivalTime = new Date(targetTime);
        busArrivalTime.setHours(arrHours, arrMinutes, 0, 0);
        
        // If bus crosses midnight, adjust the date
        if (arrHours < 3 && targetTime.getHours() > 20) { // Assuming buses after midnight are early morning
          busArrivalTime.setDate(busArrivalTime.getDate() + 1);
        }
        
        // Add potential delay from traffic
        const adjustedArrivalTime = new Date(busArrivalTime.getTime() + trafficAdjustment);
        
        // If this bus arrives before our target time, it's a candidate
        if (adjustedArrivalTime.getTime() <= targetTimeMs) {
          suitableOptions.push({
            ...schedule,
            adjusted_arrival_time: adjustedArrivalTime.toISOString(),
            buffer_minutes: Math.round((targetTimeMs - adjustedArrivalTime.getTime()) / 60000),
            includes_traffic_estimate: trafficAdjustment > 0
          });
        }
      });
      
      // Sort by buffer time (ascending) - we want to maximize efficiency while ensuring we arrive on time
      suitableOptions.sort((a, b) => a.buffer_minutes - b.buffer_minutes);
      
    } else {
      // For arrivals, find buses that leave after we land
      schedules.forEach(schedule => {
        const [depHours, depMinutes] = schedule.departure.split(':').map(Number);
        
        // Create a new date with the same day as the flight but with the bus departure time
        const busDepartureTime = new Date(targetTime);
        busDepartureTime.setHours(depHours, depMinutes, 0, 0);
        
        // If bus crosses midnight, adjust the date
        if (depHours > 21 && targetTime.getHours() < 3) { // Assuming late night buses after a very early morning arrival
          busDepartureTime.setDate(busDepartureTime.getDate() - 1);
        }
        
        // If this bus departs after our target time (landing time), it's a candidate
        if (busDepartureTime.getTime() >= targetTimeMs) {
          suitableOptions.push({
            ...schedule,
            adjusted_departure_time: busDepartureTime.toISOString(),
            wait_minutes: Math.round((busDepartureTime.getTime() - targetTimeMs) / 60000),
          });
        }
      });
      
      // Sort by wait time (ascending) - we want to minimize wait time at the airport
      suitableOptions.sort((a, b) => a.wait_minutes - b.wait_minutes);
    }
    
    // Return the requested number of options, or all if we have fewer
    return suitableOptions.slice(0, numOptions);
  }
  
  generateTransitNotes(bestOption, isDeparture) {
    if (!bestOption) {
      return "No suitable transit options found. Consider alternative transportation.";
    }
    
    if (isDeparture) {
      return `Take the ${bestOption.route} Citylink bus departing ${bestOption.departure} to arrive at Dublin Airport at approximately ${bestOption.arrival}. With traffic considerations, you should arrive around ${new Date(bestOption.adjusted_arrival_time).toLocaleTimeString()}, giving you a ${bestOption.buffer_minutes} minute buffer before your ideal airport arrival time.`;
    } else {
      return `After landing, take the ${bestOption.route} Citylink bus departing Dublin Airport at ${bestOption.departure}, which will arrive in ${bestOption.stops[bestOption.stops.length - 1]} at ${bestOption.arrival}. You'll have a ${bestOption.wait_minutes} minute wait at the airport.`;
    }
  }
}

export default DublinTransitTool;