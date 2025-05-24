/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  table: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  record: any
  old_record?: any
}

interface SyncConfig {
  tables: {
    [key: string]: {
      mongoCollection: string
      idField: string
      transform?: (record: any) => any
    }
  }
}

interface SyncResult {
  table: string
  status: 'success' | 'error'
  count?: number
  error?: string
}

// Configuration for table mapping
const syncConfig: SyncConfig = {
  tables: {
    // Auth tables
    'auth.users': {
      mongoCollection: 'users',
      idField: 'id',
      transform: (record) => ({
        _id: record.id,
        email: record.email,
        phone: record.phone,
        email_confirmed_at: record.email_confirmed_at,
        phone_confirmed_at: record.phone_confirmed_at,
        created_at: record.created_at,
        updated_at: record.updated_at,
        last_sign_in_at: record.last_sign_in_at,
        raw_app_meta_data: record.raw_app_meta_data,
        raw_user_meta_data: record.raw_user_meta_data,
        is_super_admin: record.is_super_admin,
        role: record.role
      })
    },
    
    // User profiles
    'user_profiles': {
      mongoCollection: 'user_profiles',
      idField: 'id',
      transform: (record) => ({
        _id: record.id,
        user_id: record.user_id,
        first_name: record.first_name,
        last_name: record.last_name,
        avatar_url: record.avatar_url,
        phone: record.phone,
        preferences: record.preferences,
        created_at: record.created_at,
        updated_at: record.updated_at
      })
    },
    
    // Expenses
    'expenses': {
      mongoCollection: 'expenses',
      idField: 'id',
      transform: (record) => ({
        _id: record.id,
        title: record.title,
        description: record.description,
        amount: record.amount,
        currency: record.currency,
        category: record.category,
        created_by: record.created_by,
        group_id: record.group_id,
        participants: record.participants,
        split_method: record.split_method,
        split_details: record.split_details,
        receipt_url: record.receipt_url,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at
      })
    },
    
    // Groups
    'groups': {
      mongoCollection: 'groups',
      idField: 'id',
      transform: (record) => ({
        _id: record.id,
        name: record.name,
        description: record.description,
        created_by: record.created_by,
        members: record.members,
        settings: record.settings,
        created_at: record.created_at,
        updated_at: record.updated_at
      })
    },
    
    // Settlements
    'settlements': {
      mongoCollection: 'settlements',
      idField: 'id',
      transform: (record) => ({
        _id: record.id,
        from_user: record.from_user,
        to_user: record.to_user,
        amount: record.amount,
        currency: record.currency,
        group_id: record.group_id,
        status: record.status,
        payment_method: record.payment_method,
        payment_reference: record.payment_reference,
        notes: record.notes,
        created_at: record.created_at,
        updated_at: record.updated_at,
        settled_at: record.settled_at
      })
    },
    
    // Notifications
    'notifications': {
      mongoCollection: 'notifications',
      idField: 'id',
      transform: (record) => ({
        _id: record.id,
        user_id: record.user_id,
        type: record.type,
        title: record.title,
        message: record.message,
        data: record.data,
        read: record.read,
        created_at: record.created_at,
        read_at: record.read_at
      })
    }
  }
}

async function connectToMongoDB() {
  const mongoUrl = Deno.env.get('MONGODB_URI')
  if (!mongoUrl) {
    throw new Error('MONGODB_URI environment variable is required')
  }
  
  const client = new MongoClient()
  await client.connect(mongoUrl)
  return client
}

async function syncToMongoDB(syncRequest: SyncRequest) {
  const { table, operation, record, old_record } = syncRequest
  
  // Check if table is configured for sync
  const tableConfig = syncConfig.tables[table]
  if (!tableConfig) {
    console.log(`Table ${table} not configured for sync, skipping...`)
    return { success: true, message: 'Table not configured for sync' }
  }
  
  const mongoClient = await connectToMongoDB()
  const db = mongoClient.database('spendsync')
  const collection = db.collection(tableConfig.mongoCollection)
  
  try {
    let result
    
    switch (operation) {
      case 'INSERT':
        const insertDoc = tableConfig.transform ? tableConfig.transform(record) : record
        result = await collection.insertOne(insertDoc)
        console.log(`Inserted document into ${tableConfig.mongoCollection}:`, result)
        break
        
      case 'UPDATE':
        const updateDoc = tableConfig.transform ? tableConfig.transform(record) : record
        const { _id, ...updateFields } = updateDoc
        result = await collection.updateOne(
          { _id: record[tableConfig.idField] },
          { $set: updateFields }
        )
        console.log(`Updated document in ${tableConfig.mongoCollection}:`, result)
        break
        
      case 'DELETE':
        const deleteId = old_record ? old_record[tableConfig.idField] : record[tableConfig.idField]
        result = await collection.deleteOne({ _id: deleteId })
        console.log(`Deleted document from ${tableConfig.mongoCollection}:`, result)
        break
        
      default:
        throw new Error(`Unsupported operation: ${operation}`)
    }
    
    return { success: true, result, operation, table: tableConfig.mongoCollection }
    
  } catch (error) {
    console.error(`Error syncing to MongoDB:`, error)
    throw error
  } finally {
    await mongoClient.close()
  }
}

async function handleWebhook(request: Request) {
  try {
    const payload = await request.json()
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2))
    
    // Handle database webhook from Supabase
    if (payload.type === 'db_change') {
      const { table, eventType, new: newRecord, old: oldRecord } = payload
      
      const syncRequest: SyncRequest = {
        table,
        operation: eventType.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE',
        record: newRecord,
        old_record: oldRecord
      }
      
      const result = await syncToMongoDB(syncRequest)
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
    // Handle manual sync request
    if (payload.action === 'sync') {
      const result = await syncToMongoDB(payload)
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid request type' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
    
  } catch (error) {
    console.error('Error processing webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}

async function handleBulkSync() {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const results: SyncResult[] = []
    
    // Sync each configured table
    for (const [tableName, config] of Object.entries(syncConfig.tables)) {
      try {
        console.log(`Starting bulk sync for table: ${tableName}`)
        
        let recordCount = 0
        
        // Skip auth.users table for bulk sync (handled differently)
        if (tableName === 'auth.users') {
          const { data: users, error } = await supabase.auth.admin.listUsers()
          if (error) throw error
          
          for (const user of users.users) {
            await syncToMongoDB({
              table: tableName,
              operation: 'INSERT',
              record: user
            })
          }
          recordCount = users.users.length
        } else {
          // For regular tables
          const { data, error } = await supabase
            .from(tableName.replace('public.', ''))
            .select('*')
          
          if (error) throw error
          
          for (const record of data || []) {
            await syncToMongoDB({
              table: tableName,
              operation: 'INSERT',
              record
            })
          }
          recordCount = data?.length || 0
        }
        
        results.push({ table: tableName, status: 'success', count: recordCount })
        console.log(`Completed bulk sync for table: ${tableName}`)
        
      } catch (error) {
        console.error(`Error syncing table ${tableName}:`, error)
        results.push({ table: tableName, status: 'error', error: error.message })
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
    
  } catch (error) {
    console.error('Error in bulk sync:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Bulk sync failed', 
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  const url = new URL(req.url)
  
  // Handle different endpoints
  switch (url.pathname) {
    case '/sync-to-mongodb':
      return handleWebhook(req)
      
    case '/sync-to-mongodb/bulk':
      if (req.method === 'POST') {
        return handleBulkSync()
      }
      break
      
    case '/sync-to-mongodb/health':
      return new Response(
        JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
  }
  
  return new Response(
    JSON.stringify({ error: 'Not found' }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404 
    }
  )
}) 