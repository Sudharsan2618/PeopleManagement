-- Add alt_phone_2 field to prospects table
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS alt_phone_2 character varying(20);
