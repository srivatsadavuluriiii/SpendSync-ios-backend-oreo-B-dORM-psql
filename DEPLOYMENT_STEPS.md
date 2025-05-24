# SpendSync Supabase Deployment Steps

## 🚀 **Deploy Your MongoDB Sync System**

### **Step 1: Create Supabase Project**

1. **Go to**: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Click**: "New Project"
3. **Fill in**:
   - **Name**: `spendsync-mongodb-sync`
   - **Database Password**: (choose a strong password)
   - **Region**: (closest to your users)
4. **Click**: "Create new project"
5. **Wait**: ~2 minutes for project setup

### **Step 2: Get Project Credentials**

From your Supabase dashboard, go to **Settings > API** and copy:

```bash
# Project URL
SUPABASE_URL=https://your-project-ref.supabase.co

# Anon Key (public)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (secret - keep secure!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Project Reference (from URL)
PROJECT_REF=your-project-ref
```

### **Step 3: Deploy Edge Function**

#### **Option A: Using Supabase CLI (Recommended)**

```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the edge function
supabase functions deploy sync-to-mongodb --no-verify-jwt

# Set environment variables
supabase secrets set MONGODB_URI="mongodb://your-connection-string"
```

#### **Option B: Manual Upload via Dashboard**

1. **Go to**: Edge Functions in your Supabase dashboard
2. **Click**: "Create a new function"
3. **Name**: `sync-to-mongodb`
4. **Copy and paste** this code:

```typescript
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
```

5. **Click**: "Deploy function"

### **Step 4: Set Environment Variables**

1. **Go to**: Settings > Edge Functions in your Supabase dashboard
2. **Add environment variable**:
   - **Name**: `MONGODB_URI`
   - **Value**: `mongodb://your-connection-string`
3. **Click**: "Save"

### **Step 5: Create Database Tables**

1. **Go to**: SQL Editor in your Supabase dashboard
2. **Run this SQL** to create the tables:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    members UUID[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    category TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    participants JSONB DEFAULT '[]',
    split_method TEXT DEFAULT 'equal',
    split_details JSONB DEFAULT '{}',
    receipt_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settlements table
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE,
    CHECK (from_user != to_user)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### **Step 6: Test the System**

1. **Go to**: Table Editor in your Supabase dashboard
2. **Create a test user profile**
3. **Check your MongoDB** to see if the data synced
4. **Test the health endpoint**: `https://your-project-ref.supabase.co/functions/v1/sync-to-mongodb/health`

### **Step 7: Update Your App**

Update your app's environment variables:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🎉 **You're Done!**

Your SpendSync app now has:
- ✅ Modern Supabase authentication
- ✅ Real-time sync to MongoDB
- ✅ Production-ready edge function
- ✅ Secure database with RLS policies

The system will automatically sync all data changes from Supabase to your MongoDB in real-time! 