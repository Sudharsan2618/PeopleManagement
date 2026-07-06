
from database.connection import get_db_connection

DDL = """
CREATE TABLE IF NOT EXISTS public.whatsapp_quick_send_templates (
    id serial PRIMARY KEY,
    template_name varchar(150) NOT NULL,
    language_code varchar(20) NOT NULL DEFAULT 'en_US',
    label varchar(150) NOT NULL,
    description text,
    variable_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);
"""


def create_table():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            print("Creating whatsapp_quick_send_templates ...")
            cur.execute(DDL)
        conn.commit()
    print("whatsapp_quick_send_templates ready.")


if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    create_table()
