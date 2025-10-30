-- Enable full row replication for notifications table to support DELETE events in realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;