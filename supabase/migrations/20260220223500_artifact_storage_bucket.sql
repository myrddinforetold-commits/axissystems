-- Store external executor artifacts in Supabase Storage.
-- Path convention: <company_id>/<task_id-or-unlinked>/<unique-filename>

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('artifacts', 'artifacts', false, 52428800)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Company members can read artifacts'
  ) THEN
    CREATE POLICY "Company members can read artifacts"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'artifacts'
      AND CASE
        WHEN split_part(name, '/', 1) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[1-5][0-9a-f-]{3}-[89ab][0-9a-f-]{3}-[0-9a-f-]{12}$'
          THEN public.is_company_member(auth.uid(), split_part(name, '/', 1)::uuid)
        ELSE false
      END
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Company owners can delete artifacts'
  ) THEN
    CREATE POLICY "Company owners can delete artifacts"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'artifacts'
      AND CASE
        WHEN split_part(name, '/', 1) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[1-5][0-9a-f-]{3}-[89ab][0-9a-f-]{3}-[0-9a-f-]{12}$'
          THEN public.is_company_owner(auth.uid(), split_part(name, '/', 1)::uuid)
        ELSE false
      END
    );
  END IF;
END $$;
