// accommodation-search-tool.js for your extender MCP server

import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for storing preferences
const supabaseUrl = 'https://fkzdyannioxbtxfozcmr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZremR5YW5uaW94YnR4Zm96Y21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTEwNDgsImV4cCI6MjA2MjMyNzA0OH0.jTlfkhxSV3q4qrI6xVwOGaHsG8dS1MoVAZhKPvYsy7c';
const supabase = createClient(supabaseUrl, supabaseKey);

// Set up the database table for accommodation preferences if needed
const setupDatabase = async () => {
  // Check if our table already exists
  const { data, error } = await supabase
    .from('accommodation_preferences')
    .select('id')
    .limit(1);
  
  if (error && error.code === '42P01') { // Table doesn't exist
    // Create the table
    await supabase.rpc('create_accommodation_preferences_table', {
      sql: `
        CREATE TABLE accommodation_preferences (
          id SERIAL PRIMARY KEY,
          location TEXT NOT NULL,
          preference_type TEXT NOT NULL, 
          preference_value TEXT NOT NULL,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    console.log('Created accommodation_preferences table');
  }
};

// Call setup when the server starts
setupDatabase().catch(console.error);

class AccommodationSearchTool extends MCPTool {
  name = 'accommodation_search';
  description = 'Search for accommodations across Booking.com, Airbnb, and other platforms';
  
  schema = {
    action: z.enum(['search', 'save_preference', 'get_preferences']),
    location: z.string().optional(), // City or area
    check_in: z.string().optional(), // YYYY-MM-DD format
    check_out: z.string().optional(), // YYYY-MM-DD format
    adults: z.number().default(1),
    children: z.number().default(0),
    rooms: z.number().default(1),
    max_price: z.number().optional(),
    min_price: z.number().optional(),
    max_results: z.number().default(5),
    amenities: z.array(z.string()).optional(), // ['wifi', 'pool', etc.]
    rating_min: z.number().optional(), // Minimum rating (e.g., 4.0)
    property_type: z.array(z.string()).optional(), // ['hotel', 'apartment', 'house', etc.]
    include_booking: z.boolean().default(true),
    include_airbnb: z.boolean().default(true),
    include_other: z.boolean().default(false),
    preference_type: z.string().optional(), // For saving preferences
    preference_value: z.string().optional(), // For saving preferences
    notes: z.string().optional() // For saving preference notes
  };
  
  async execute(params) {
    const { action } = params;
    
    switch (action) {
      case 'search':
        return this.searchAccommodations(params);
      case 'save_preference':
        return this.savePreference(params);
      case 'get_preferences':
        return this.getPreferences(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
  
  async searchAccommodations(params) {
    const {
      location,
      check_in,
      check_out,
      adults,
      children,
      rooms,
      max_price,
      min_price,
      max_results,
      amenities,
      rating_min,
      property_type,
      include_booking,
      include_airbnb,
      include_other
    } = params;
    
    // Validate required parameters
    if (!location || !check_in || !check_out) {
      throw new Error('Location, check-in, and check-out dates are required');
    }
    
    // Calculate the length of stay in nights
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const stayDurationNights = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    // Get user preferences for this location
    const preferences = await this.getPreferences({ location });
    
    // Array to hold all search result promises
    const searchPromises = [];
    
    // Add platform-specific searches based on parameters
    if (include_booking) {
      searchPromises.push(this.searchBookingCom(params, preferences.preferences));
    }
    
    if (include_airbnb) {
      searchPromises.push(this.searchAirbnb(params, preferences.preferences));
    }
    
    if (include_other) {
      searchPromises.push(this.searchOtherPlatforms(params, preferences.preferences));
    }
    
    // Execute all searches in parallel
    const searchResults = await Promise.allSettled(searchPromises);
    
    // Combine results from all platforms
    let allAccommodations = [];
    searchResults.forEach(result => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allAccommodations = [...allAccommodations, ...result.value];
      }
    });
    
    // Apply filters
    let filteredResults = allAccommodations;
    
    // Filter by price
    if (min_price !== undefined) {
      filteredResults = filteredResults.filter(acc => acc.price >= min_price);
    }
    
    if (max_price !== undefined) {
      filteredResults = filteredResults.filter(acc => acc.price <= max_price);
    }
    
    // Filter by rating
    if (rating_min !== undefined) {
      filteredResults = filteredResults.filter(acc => acc.rating >= rating_min);
    }
    
    // Filter by amenities
    if (amenities && amenities.length > 0) {
      filteredResults = filteredResults.filter(acc => {
        // Check if the accommodation has all requested amenities
        return amenities.every(amenity => 
          acc.amenities && acc.amenities.includes(amenity)
        );
      });
    }
    
    // Filter by property type
    if (property_type && property_type.length > 0) {
      filteredResults = filteredResults.filter(acc => 
        property_type.includes(acc.property_type)
      );
    }
    
    // Sort results by applying a preference score
    filteredResults.sort((a, b) => {
      // Start with comparing prices (lower is better)
      const priceDiff = a.price - b.price;
      
      // Factor in rating (higher is better)
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      
      // Combine price and rating factors
      return priceDiff * 0.7 + ratingDiff * 10 * 0.3;
    });
    
    // Apply user preferences as bonus factors
    if (preferences.preferences && preferences.preferences.length > 0) {
      filteredResults.forEach(result => {
        let preferenceScore = 0;
        
        preferences.preferences.forEach(pref => {
          // Give bonus points for matching preferences
          if (pref.preference_type === 'amenity' && 
              result.amenities && 
              result.amenities.includes(pref.preference_value)) {
            preferenceScore += 10;
          }
          
          if (pref.preference_type === 'property_type' && 
              result.property_type === pref.preference_value) {
            preferenceScore += 15;
          }
          
          if (pref.preference_type === 'neighborhood' && 
              result.neighborhood && 
              result.neighborhood.includes(pref.preference_value)) {
            preferenceScore += 20;
          }
        });
        
        // Add a preference_score property for sorting
        result.preference_score = preferenceScore;
      });
      
      // Re-sort with preference scores included
      filteredResults.sort((a, b) => {
        const aScore = (a.preference_score || 0) - (a.price / 100);
        const bScore = (b.preference_score || 0) - (b.price / 100);
        return bScore - aScore; // Higher score (more preferred) first
      });
    }
    
    // Limit results to requested number
    const limitedResults = filteredResults.slice(0, max_results);
    
    // Calculate nightly prices for comparison
    limitedResults.forEach(result => {
      result.price_per_night = Math.round(result.price / stayDurationNights);
    });
    
    return {
      success: true,
      search_params: params,
      stay_duration_nights: stayDurationNights,
      results: limitedResults,
      total_options_found: filteredResults.length,
      sources: {
        booking_com: include_booking,
        airbnb: include_airbnb,
        other_platforms: include_other
      },
      preferences_applied: preferences.preferences && preferences.preferences.length > 0
    };
  }
  
  async searchBookingCom(params, preferences) {
    // This would be implemented with web scraping or Booking.com API if available
    // For demo purposes, I'm returning mock data
    try {
      const { location, check_in, check_out, adults, rooms } = params;
      
      // In a real implementation, you'd make API calls or scrape search results
      // const response = await axios.get('https://www.booking.com/searchresults.html', { params: {...} });
      
      // Mock response
      return [
        {
          platform: 'booking.com',
          name: 'Grand Hotel Example',
          property_type: 'hotel',
          address: `123 Main Street, ${location}`,
          neighborhood: 'Central District',
          coordinates: {
            latitude: 48.8566,
            longitude: 2.3522
          },
          price: 450, // Total price for the stay
          currency: 'EUR',
          rating: 8.7,
          review_count: 356,
          amenities: ['wifi', 'pool', 'breakfast', 'air conditioning', 'parking'],
          room_type: 'Deluxe Double Room',
          photo_url: 'https://example.com/hotel_photo.jpg',
          booking_url: `https://www.booking.com/hotel/example?checkin=${check_in}&checkout=${check_out}`,
          distance_to_center: '0.5 km',
          cancellation_policy: 'Free cancellation up to 2 days before check-in'
        },
        {
          platform: 'booking.com',
          name: 'Cozy Downtown Apartments',
          property_type: 'apartment',
          address: `45 Park Avenue, ${location}`,
          neighborhood: 'Downtown',
          coordinates: {
            latitude: 48.8615,
            longitude: 2.3410
          },
          price: 320,
          currency: 'EUR',
          rating: 9.1,
          review_count: 187,
          amenities: ['wifi', 'kitchen', 'washer', 'air conditioning'],
          room_type: 'One-Bedroom Apartment',
          photo_url: 'https://example.com/apartment_photo.jpg',
          booking_url: `https://www.booking.com/hotel/example2?checkin=${check_in}&checkout=${check_out}`,
          distance_to_center: '1.2 km',
          cancellation_policy: 'Free cancellation up to 5 days before check-in'
        }
      ];
    } catch (error) {
      console.error('Booking.com search error:', error);
      return [];
    }
  }
  
  async searchAirbnb(params, preferences) {
    // This would be implemented with web scraping or unofficial Airbnb API
    // For demo purposes, I'm returning mock data
    try {
      const { location, check_in, check_out, adults } = params;
      
      // Mock response
      return [
        {
          platform: 'airbnb',
          name: 'Modern Loft with City View',
          property_type: 'apartment',
          address: `Located in ${location}`,
          neighborhood: 'Artistic District',
          coordinates: {
            latitude: 48.8752,
            longitude: 2.3468
          },
          price: 380,
          currency: 'EUR',
          rating: 4.92,
          review_count: 128,
          amenities: ['wifi', 'kitchen', 'air conditioning', 'washer', 'dryer', 'workspace'],
          room_type: 'Entire apartment',
          photo_url: 'https://example.com/airbnb_photo.jpg',
          booking_url: `https://www.airbnb.com/rooms/example?check_in=${check_in}&check_out=${check_out}`,
          distance_to_center: '1.8 km',
          cancellation_policy: 'Moderate - Free cancellation for 48 hours',
          host_name: 'Sophie',
          host_rating: 4.98
        },
        {
          platform: 'airbnb',
          name: 'Charming Historical House',
          property_type: 'house',
          address: `Located in ${location}`,
          neighborhood: 'Old Town',
          coordinates: {
            latitude: 48.8584,
            longitude: 2.3488
          },
          price: 520,
          currency: 'EUR',
          rating: 4.85,
          review_count: 93,
          amenities: ['wifi', 'kitchen', 'garden', 'fireplace', 'free parking'],
          room_type: 'Entire house',
          photo_url: 'https://example.com/airbnb_house_photo.jpg',
          booking_url: `https://www.airbnb.com/rooms/example2?check_in=${check_in}&check_out=${check_out}`,
          distance_to_center: '2.1 km',
          cancellation_policy: 'Strict - Free cancellation for 48 hours',
          host_name: 'Jean-Pierre',
          host_rating: 4.9
        }
      ];
    } catch (error) {
      console.error('Airbnb search error:', error);
      return [];
    }
  }
  
  async searchOtherPlatforms(params, preferences) {
    // This would search other accommodation platforms
    // For demo purposes, returning a simple mock result
    try {
      const { location } = params;
      
      return [
        {
          platform: 'vrbo',
          name: 'Family Villa with Pool',
          property_type: 'villa',
          address: `Suburb area, ${location}`,
          neighborhood: 'Residential Zone',
          price: 680,
          currency: 'EUR',
          rating: 4.7,
          review_count: 42,
          amenities: ['wifi', 'pool', 'kitchen', 'parking', 'air conditioning', 'bbq'],
          room_type: 'Entire villa',
          photo_url: 'https://example.com/vrbo_photo.jpg',
          booking_url: `https://www.vrbo.com/listing/example`,
          distance_to_center: '4.5 km',
          cancellation_policy: 'Moderate'
        }
      ];
    } catch (error) {
      console.error('Other platforms search error:', error);
      return [];
    }
  }
  
  async savePreference({ location, preference_type, preference_value, notes }) {
    // Validate required parameters
    if (!location || !preference_type || !preference_value) {
      throw new Error('Location, preference type, and preference value are required');
    }
    
    // Save to database
    const { data, error } = await supabase
      .from('accommodation_preferences')
      .insert({
        location,
        preference_type,
        preference_value,
        notes
      })
      .select('id');
      
    if (error) throw new Error(`Failed to save preference: ${error.message}`);
    
    return {
      success: true,
      message: `Preference saved for ${location}`,
      preference_id: data[0].id
    };
  }
  
  async getPreferences({ location }) {
    let query = supabase.from('accommodation_preferences').select('*');
    
    // Filter by location if provided
    if (location) {
      query = query.eq('location', location);
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to get preferences: ${error.message}`);
    
    return {
      success: true,
      preferences: data || []
    };
  }
}

export default AccommodationSearchTool;