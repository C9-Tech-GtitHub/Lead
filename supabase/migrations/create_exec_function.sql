-- Create a function to execute arbitrary SQL (for migrations)
-- This allows programmatic migration execution from Node.js

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permission to service role only (not regular users)
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Add a comment explaining what this is for
COMMENT ON FUNCTION public.exec_sql(text) IS 'Allows service role to execute arbitrary SQL for migrations. Never expose to authenticated users.';
