-- Create function to call edge function for MongoDB sync
CREATE OR REPLACE FUNCTION public.sync_to_mongodb()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url TEXT;
    payload JSONB;
    http_request_id BIGINT;
BEGIN
    -- Get the webhook URL from environment or use default
    webhook_url := COALESCE(
        current_setting('app.settings.mongodb_sync_webhook_url', true),
        'https://your-project-ref.supabase.co/functions/v1/sync-to-mongodb'
    );
    
    -- Build the payload based on the trigger operation
    IF TG_OP = 'DELETE' THEN
        payload := jsonb_build_object(
            'type', 'db_change',
            'table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
            'eventType', 'DELETE',
            'old', row_to_json(OLD),
            'new', null,
            'timestamp', extract(epoch from now())
        );
    ELSIF TG_OP = 'INSERT' THEN
        payload := jsonb_build_object(
            'type', 'db_change',
            'table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
            'eventType', 'INSERT',
            'old', null,
            'new', row_to_json(NEW),
            'timestamp', extract(epoch from now())
        );
    ELSIF TG_OP = 'UPDATE' THEN
        payload := jsonb_build_object(
            'type', 'db_change',
            'table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
            'eventType', 'UPDATE',
            'old', row_to_json(OLD),
            'new', row_to_json(NEW),
            'timestamp', extract(epoch from now())
        );
    END IF;
    
    -- Make HTTP request to edge function (async)
    -- Note: This requires the http extension to be enabled
    -- For now, we'll use pg_net if available, otherwise log the event
    BEGIN
        -- Try to use pg_net for async HTTP requests
        SELECT net.http_post(
            url := webhook_url,
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
                      COALESCE(current_setting('app.settings.supabase_service_role_key', true), '') || '"}'::jsonb,
            body := payload
        ) INTO http_request_id;
        
        -- Log successful webhook call
        RAISE LOG 'MongoDB sync webhook called for table % with operation %', TG_TABLE_NAME, TG_OP;
        
    EXCEPTION WHEN OTHERS THEN
        -- If pg_net is not available or fails, log the event for manual processing
        RAISE LOG 'Failed to call MongoDB sync webhook for table % with operation %: %', TG_TABLE_NAME, TG_OP, SQLERRM;
        
        -- Insert into a sync queue table for retry mechanism
        INSERT INTO public.sync_queue (table_name, operation, payload, created_at, status)
        VALUES (TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, TG_OP, payload, NOW(), 'pending')
        ON CONFLICT DO NOTHING;
    END;
    
    -- Return the appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sync queue table for failed sync attempts
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    retry_count INTEGER DEFAULT 0,
    error_message TEXT
);

-- Create index on sync_queue for efficient processing
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON public.sync_queue(created_at);

-- Create triggers for each table to sync to MongoDB

-- Auth users trigger (special handling needed)
CREATE OR REPLACE FUNCTION public.sync_auth_users()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url TEXT;
    payload JSONB;
    http_request_id BIGINT;
BEGIN
    webhook_url := COALESCE(
        current_setting('app.settings.mongodb_sync_webhook_url', true),
        'https://your-project-ref.supabase.co/functions/v1/sync-to-mongodb'
    );
    
    IF TG_OP = 'DELETE' THEN
        payload := jsonb_build_object(
            'type', 'db_change',
            'table', 'auth.users',
            'eventType', 'DELETE',
            'old', row_to_json(OLD),
            'new', null,
            'timestamp', extract(epoch from now())
        );
    ELSIF TG_OP = 'INSERT' THEN
        payload := jsonb_build_object(
            'type', 'db_change',
            'table', 'auth.users',
            'eventType', 'INSERT',
            'old', null,
            'new', row_to_json(NEW),
            'timestamp', extract(epoch from now())
        );
    ELSIF TG_OP = 'UPDATE' THEN
        payload := jsonb_build_object(
            'type', 'db_change',
            'table', 'auth.users',
            'eventType', 'UPDATE',
            'old', row_to_json(OLD),
            'new', row_to_json(NEW),
            'timestamp', extract(epoch from now())
        );
    END IF;
    
    BEGIN
        SELECT net.http_post(
            url := webhook_url,
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
                      COALESCE(current_setting('app.settings.supabase_service_role_key', true), '') || '"}'::jsonb,
            body := payload
        ) INTO http_request_id;
        
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.sync_queue (table_name, operation, payload, created_at, status)
        VALUES ('auth.users', TG_OP, payload, NOW(), 'pending')
        ON CONFLICT DO NOTHING;
    END;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for auth.users
CREATE TRIGGER sync_auth_users_to_mongodb
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_auth_users();

-- Create triggers for public tables
CREATE TRIGGER sync_user_profiles_to_mongodb
    AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_to_mongodb();

CREATE TRIGGER sync_groups_to_mongodb
    AFTER INSERT OR UPDATE OR DELETE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.sync_to_mongodb();

CREATE TRIGGER sync_expenses_to_mongodb
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.sync_to_mongodb();

CREATE TRIGGER sync_settlements_to_mongodb
    AFTER INSERT OR UPDATE OR DELETE ON public.settlements
    FOR EACH ROW EXECUTE FUNCTION public.sync_to_mongodb();

CREATE TRIGGER sync_notifications_to_mongodb
    AFTER INSERT OR UPDATE OR DELETE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.sync_to_mongodb();

-- Function to process sync queue (for retry mechanism)
CREATE OR REPLACE FUNCTION public.process_sync_queue()
RETURNS INTEGER AS $$
DECLARE
    queue_item RECORD;
    webhook_url TEXT;
    http_request_id BIGINT;
    processed_count INTEGER := 0;
BEGIN
    webhook_url := COALESCE(
        current_setting('app.settings.mongodb_sync_webhook_url', true),
        'https://your-project-ref.supabase.co/functions/v1/sync-to-mongodb'
    );
    
    -- Process pending items in the sync queue
    FOR queue_item IN 
        SELECT * FROM public.sync_queue 
        WHERE status = 'pending' 
        AND retry_count < 5 
        ORDER BY created_at 
        LIMIT 100
    LOOP
        BEGIN
            -- Update status to processing
            UPDATE public.sync_queue 
            SET status = 'processing', retry_count = retry_count + 1
            WHERE id = queue_item.id;
            
            -- Make HTTP request
            SELECT net.http_post(
                url := webhook_url,
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
                          COALESCE(current_setting('app.settings.supabase_service_role_key', true), '') || '"}'::jsonb,
                body := queue_item.payload
            ) INTO http_request_id;
            
            -- Mark as completed
            UPDATE public.sync_queue 
            SET status = 'completed', processed_at = NOW()
            WHERE id = queue_item.id;
            
            processed_count := processed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Mark as failed if max retries reached
            IF queue_item.retry_count >= 4 THEN
                UPDATE public.sync_queue 
                SET status = 'failed', error_message = SQLERRM
                WHERE id = queue_item.id;
            ELSE
                UPDATE public.sync_queue 
                SET status = 'pending', error_message = SQLERRM
                WHERE id = queue_item.id;
            END IF;
        END;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually trigger bulk sync
CREATE OR REPLACE FUNCTION public.trigger_bulk_sync()
RETURNS JSONB AS $$
DECLARE
    webhook_url TEXT;
    payload JSONB;
    http_request_id BIGINT;
BEGIN
    webhook_url := COALESCE(
        current_setting('app.settings.mongodb_sync_webhook_url', true),
        'https://your-project-ref.supabase.co/functions/v1/sync-to-mongodb'
    ) || '/bulk';
    
    payload := jsonb_build_object(
        'action', 'bulk_sync',
        'timestamp', extract(epoch from now())
    );
    
    BEGIN
        SELECT net.http_post(
            url := webhook_url,
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
                      COALESCE(current_setting('app.settings.supabase_service_role_key', true), '') || '"}'::jsonb,
            body := payload
        ) INTO http_request_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Bulk sync triggered successfully',
            'request_id', http_request_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to trigger bulk sync',
            'error', SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 