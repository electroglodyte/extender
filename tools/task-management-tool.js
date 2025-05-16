// task-management-tool.js for your extender MCP server

import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for storing tasks and projects
const supabaseUrl = 'https://fkzdyannioxbtxfozcmr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZremR5YW5uaW94YnR4Zm96Y21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTEwNDgsImV4cCI6MjA2MjMyNzA0OH0.jTlfkhxSV3q4qrI6xVwOGaHsG8dS1MoVAZhKPvYsy7c';
const supabase = createClient(supabaseUrl, supabaseKey);

// Set up database tables if needed
const setupDatabase = async () => {
  try {
    // Check if projects table exists
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
      
    if (projectsError && projectsError.code === '42P01') {
      // Create projects table
      await supabase.rpc('create_projects_table', {
        sql: `
          CREATE TABLE projects (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'Active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      });
      console.log('Created projects table');
    }
    
    // Check if tasks table exists
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);
      
    if (tasksError && tasksError.code === '42P01') {
      // Create tasks table
      await supabase.rpc('create_tasks_table', {
        sql: `
          CREATE TABLE tasks (
            id SERIAL PRIMARY KEY,
            task_name TEXT NOT NULL,
            status TEXT DEFAULT 'To Do',
            project_id INTEGER REFERENCES projects(id),
            due_date TIMESTAMPTZ,
            completed BOOLEAN DEFAULT FALSE,
            priority TEXT,
            tags TEXT[],
            description TEXT,
            assignee_id INTEGER,
            is_next_action BOOLEAN DEFAULT FALSE,
            location_id INTEGER,
            context TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      });
      console.log('Created tasks table');
    }
    
    // Check if persons table exists
    const { data: personsData, error: personsError } = await supabase
      .from('persons')
      .select('id')
      .limit(1);
      
    if (personsError && personsError.code === '42P01') {
      // Create persons table
      await supabase.rpc('create_persons_table', {
        sql: `
          CREATE TABLE persons (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            role TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      });
      console.log('Created persons table');
    }
  } catch (error) {
    console.error('Database setup error:', error);
  }
};

// Call setup when the server starts
setupDatabase().catch(console.error);

// Get Projects Tool
class GetProjectsTool extends MCPTool {
  name = 'get_projects';
  description = 'Retrieve projects from the database with optional filtering';
  
  schema = {
    limit: z.number().default(10),
    status: z.string().optional(),
    search: z.string().optional()
  };
  
  async execute(params) {
    const { limit, status, search } = params;
    
    let query = supabase.from('projects').select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    query = query.order('created_at', { ascending: false }).limit(limit);
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to get projects: ${error.message}`);
    
    return {
      success: true,
      projects: data || []
    };
  }
}

// Get Tasks Tool
class GetTasksTool extends MCPTool {
  name = 'get_tasks';
  description = 'Retrieve tasks from the database with optional filtering';
  
  schema = {
    limit: z.number().default(10),
    status: z.string().optional(),
    project_id: z.string().optional(),
    completed: z.boolean().optional(),
    is_next_action: z.boolean().optional()
  };
  
  async execute(params) {
    const { limit, status, project_id, completed, is_next_action } = params;
    
    let query = supabase.from('tasks').select('*, projects(title)');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    
    if (completed !== undefined) {
      query = query.eq('completed', completed);
    }
    
    if (is_next_action !== undefined) {
      query = query.eq('is_next_action', is_next_action);
    }
    
    query = query.order('due_date', { ascending: true }).limit(limit);
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to get tasks: ${error.message}`);
    
    return {
      success: true,
      tasks: data || []
    };
  }
}

// Get Persons Tool
class GetPersonsTool extends MCPTool {
  name = 'get_persons';
  description = 'Retrieve person records with optional search';
  
  schema = {
    limit: z.number().default(10),
    search: z.string().optional()
  };
  
  async execute(params) {
    const { limit, search } = params;
    
    let query = supabase.from('persons').select('*');
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    query = query.order('name', { ascending: true }).limit(limit);
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to get persons: ${error.message}`);
    
    return {
      success: true,
      persons: data || []
    };
  }
}

// Create Task Tool
class CreateTaskTool extends MCPTool {
  name = 'create_task';
  description = 'Create a new task in the database';
  
  schema = {
    task_name: z.string(),
    project_id: z.string().optional(),
    due_date: z.string().optional(),
    assignee_id: z.string().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional()
  };
  
  async execute(params) {
    const {
      task_name,
      project_id,
      due_date,
      assignee_id,
      priority,
      tags,
      description
    } = params;
    
    if (!task_name) {
      throw new Error('Task name is required');
    }
    
    const taskData = {
      task_name,
      description,
      priority,
      tags
    };
    
    if (project_id) taskData.project_id = project_id;
    if (due_date) taskData.due_date = due_date;
    if (assignee_id) taskData.assignee_id = assignee_id;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select('id');
      
    if (error) throw new Error(`Failed to create task: ${error.message}`);
    
    return {
      success: true,
      message: `Task "${task_name}" created successfully`,
      task_id: data[0].id
    };
  }
}

// Update Task Tool
class UpdateTaskTool extends MCPTool {
  name = 'update_task';
  description = 'Update an existing task in the database';
  
  schema = {
    id: z.string(),
    task_name: z.string().optional(),
    status: z.string().optional(),
    due_date: z.string().optional(),
    completed: z.boolean().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
    assignee_id: z.string().optional(),
    is_next_action: z.boolean().optional(),
    location_id: z.string().optional(),
    context: z.string().optional()
  };
  
  async execute(params) {
    const { id, ...updateFields } = params;
    
    if (!id) {
      throw new Error('Task ID is required');
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*');
      
    if (error) throw new Error(`Failed to update task: ${error.message}`);
    if (!data || data.length === 0) return { success: false, message: 'Task not found' };
    
    return {
      success: true,
      message: `Task updated successfully`,
      task: data[0]
    };
  }
}

export {
  GetProjectsTool,
  GetTasksTool,
  GetPersonsTool,
  CreateTaskTool,
  UpdateTaskTool
};