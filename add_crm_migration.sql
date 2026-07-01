-- ============================================================
-- CRM Admin Dashboard Migration
-- 1. Add prospect_type column to prospects table
-- 2. Populate existing prospects with appropriate type
-- 3. Create admin user tatti@cems.com
-- ============================================================

-- Step 1: Add prospect_type column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'prospects' AND column_name = 'prospect_type'
    ) THEN
        ALTER TABLE public.prospects
        ADD COLUMN prospect_type VARCHAR(50) NOT NULL DEFAULT 'student_admission';
    END IF;
END
$$;

-- Step 2: Update existing college contact prospects based on their status values
UPDATE public.prospects
SET prospect_type = 'college_contact'
WHERE status IN (
    'Interested',
    'Interested Followup',
    'Proposal To Be Sent',
    'Proposal Sent',
    'Training Date Followup',
    'Qualified',
    'Ringing / Not Reachable',
    'Not Interested',
    'New'
)
AND prospect_type = 'student_admission';

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_prospects_prospect_type ON public.prospects(prospect_type);

-- Step 4: Create admin user tatti@cems.com (plain text password as per existing auth system)
INSERT INTO public.users (name, email, mobile, role, password, is_active, created_at)
SELECT 'Tatti Admin', 'tatti@cems.com', '0000000000', 'admin', 'tatti123', TRUE, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'tatti@cems.com'
);
