// route-memory-tool.js for your extender MCP server

import { createClient } from '@supabase/supabase-js';
import { MCPTool } from 'mcp-framework';
import { z } from 'zod';

// Initialize Supabase client with your credentials
const supabaseUrl = 'https://fkzdyannioxbtxfozcmr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZremR5YW5uaW94YnR4Zm96Y21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTEwNDgsImV4cCI6MjA2MjMyNzA0OH0.jTlfkhxSV3q4qrI6xVwOGaHsG8dS1MoVAZhKPvYsy7c';
const supabase = createClient(supabaseUrl, supabaseKey);

// First, let's create the database table if it doesn't exist
const setupDatabase = async () => {
  // Check if our table already exists
  const { data, error } = await supabase
    .from('travel_routes')
    .select('id')
    .limit(1);
  
  if (error && error.code === '42P01') { // Table doesn't exist
    // Create the table
    await supabase.rpc('create_travel_routes_table', {
      sql: `
        CREATE TABLE travel_routes (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          origin TEXT NOT NULL,
          destination TEXT NOT NULL,
          segments JSONB NOT NULL,
          notes TEXT,
          last_used TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    console.log('Created travel_routes table');
  }
};

// Call setup when the server starts
setupDatabase().catch(console.error);

// Define the Route Memory MCP Tool
class RouteMemoryTool extends MCPTool {
  name = 'route_memory';
  description = 'Store and retrieve frequent travel routes';
  
  schema = {
    action: z.enum(['save', 'get', 'list', 'update', 'delete']),
    name: z.string().optional(),
    origin: z.string().optional(),
    destination: z.string().optional(),
    segments: z.array(z.object({
      type: z.string(), // e.g., 'flight', 'bus', 'train', etc.
      from: z.string(),
      to: z.string(),
      carrier: z.string().optional(),
      duration: z.string().optional(),
      notes: z.string().optional()
    })).optional(),
    notes: z.string().optional(),
    route_id: z.number().optional()
  };
  
  async execute(params) {
    const { action } = params;
    
    switch (action) {
      case 'save':
        return this.saveRoute(params);
      case 'get':
        return this.getRoute(params);
      case 'list':
        return this.listRoutes(params);
      case 'update':
        return this.updateRoute(params);
      case 'delete':
        return this.deleteRoute(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
  
  async saveRoute({ name, origin, destination, segments, notes }) {
    if (!name || !origin || !destination || !segments) {
      throw new Error('Missing required parameters');
    }
    
    const { data, error } = await supabase
      .from('travel_routes')
      .insert({
        name,
        origin,
        destination,
        segments,
        notes,
        last_used: new Date().toISOString()
      })
      .select('id');
      
    if (error) throw new Error(`Failed to save route: ${error.message}`);
    return { 
      success: true, 
      message: `Route "${name}" saved successfully`,
      route_id: data[0].id
    };
  }
  
  async getRoute({ route_id, name }) {
    if (!route_id && !name) {
      throw new Error('Either route_id or name must be provided');
    }
    
    let query = supabase.from('travel_routes');
    
    if (route_id) {
      query = query.eq('id', route_id);
    } else if (name) {
      query = query.eq('name', name);
    }
    
    const { data, error } = await query.select('*');
    
    if (error) throw new Error(`Failed to get route: ${error.message}`);
    if (!data || data.length === 0) return { success: false, message: 'Route not found' };
    
    // Update last_used timestamp
    await supabase
      .from('travel_routes')
      .update({ last_used: new Date().toISOString() })
      .eq('id', data[0].id);
    
    return { success: true, route: data[0] };
  }
  
  async listRoutes({ origin, destination }) {
    let query = supabase.from('travel_routes').select('*');
    
    if (origin) query = query.eq('origin', origin);
    if (destination) query = query.eq('destination', destination);
    
    // Order by most recently used
    query = query.order('last_used', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to list routes: ${error.message}`);
    return { success: true, routes: data || [] };
  }
  
  async updateRoute({ route_id, name, origin, destination, segments, notes }) {
    if (!route_id) {
      throw new Error('route_id is required for updates');
    }
    
    const updates = {};
    if (name) updates.name = name;
    if (origin) updates.origin = origin;
    if (destination) updates.destination = destination;
    if (segments) updates.segments = segments;
    if (notes) updates.notes = notes;
    updates.last_used = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('travel_routes')
      .update(updates)
      .eq('id', route_id)
      .select('*');
      
    if (error) throw new Error(`Failed to update route: ${error.message}`);
    if (!data || data.length === 0) return { success: false, message: 'Route not found' };
    
    return { success: true, message: 'Route updated successfully', route: data[0] };
  }
  
  async deleteRoute({ route_id }) {
    if (!route_id) {
      throw new Error('route_id is required for deletion');
    }
    
    const { error } = await supabase
      .from('travel_routes')
      .delete()
      .eq('id', route_id);
      
    if (error) throw new Error(`Failed to delete route: ${error.message}`);
    
    return { success: true, message: 'Route deleted successfully' };
  }
}

export default RouteMemoryTool;