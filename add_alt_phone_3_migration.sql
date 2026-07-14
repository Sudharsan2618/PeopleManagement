-- Add alt_phone_3 field to prospects table
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS alt_phone_3 character varying(20);
