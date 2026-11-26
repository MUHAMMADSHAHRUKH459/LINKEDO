BEGIN;

DO $$
DECLARE
  constraint_record pg_constraint;
  primary_key_columns text[];
  target_user_fk_exists boolean;
  profiles_id_pk_exists boolean;
  authenticated_role_oid oid;
BEGIN
  IF to_regclass('public.target_companies') IS NULL THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies does not exist';
  END IF;

  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'Incompatible schema: public.profiles does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE oid = 'public.update_updated_at_column()'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.update_updated_at_column() does not exist';
  END IF;

  SELECT c
  INTO constraint_record
  FROM pg_constraint c
  WHERE c.conrelid = 'public.target_companies'::regclass
    AND c.contype = 'p';

  IF constraint_record IS NULL THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies has no primary key';
  END IF;

  SELECT array_agg(a.attname ORDER BY k.ordinality)
  INTO primary_key_columns
  FROM unnest(constraint_record.conkey) WITH ORDINALITY AS k(attnum, ordinality)
  JOIN pg_attribute a
    ON a.attrelid = constraint_record.conrelid
   AND a.attnum = k.attnum;

  IF primary_key_columns IS DISTINCT FROM ARRAY['id'::text, 'user_id'::text] THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies primary key must be exactly (id, user_id)';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.target_companies'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.target_companies'::regclass
           AND attname = 'user_id'
           AND NOT attisdropped)
      ]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.profiles'::regclass
           AND attname = 'id'
           AND NOT attisdropped)
      ]
      AND c.confdeltype = 'c'
      AND c.convalidated
  )
  INTO target_user_fk_exists;

  IF NOT target_user_fk_exists THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies.user_id must reference public.profiles(id)';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.profiles'::regclass
      AND c.contype = 'p'
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.profiles'::regclass
           AND attname = 'id')
      ]
  )
  INTO profiles_id_pk_exists;

  IF NOT profiles_id_pk_exists THEN
    RAISE EXCEPTION 'Incompatible schema: public.profiles.id must be the primary key';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.profiles'::regclass
      AND attname = 'id'
      AND (NOT attnotnull OR atttypid <> 'uuid'::regtype)
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.profiles.id must be a not-null UUID';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.target_companies'::regclass
      AND attname = 'id'
      AND NOT attisdropped
      AND atttypid = 'uuid'::regtype
      AND attnotnull
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies.id must be a not-null UUID';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.target_companies'::regclass
      AND attname = 'user_id'
      AND NOT attisdropped
      AND atttypid = 'uuid'::regtype
      AND attnotnull
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies.user_id must be a not-null UUID';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.target_companies'::regclass
      AND attname = 'name'
      AND NOT attisdropped
      AND atttypid = 'text'::regtype
      AND attnotnull
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies.name must be a not-null TEXT column';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.target_companies'::regclass
      AND attname = 'status'
      AND NOT attisdropped
      AND atttypid = 'text'::regtype
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies.status must be a TEXT column';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.target_companies'::regclass
      AND attname IN ('industry', 'website')
      AND NOT attisdropped
      AND atttypid = 'text'::regtype
    HAVING count(*) = 2
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies.industry and website must be TEXT columns';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.oid = 'public.target_companies'::regclass
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies RLS is not enabled';
  END IF;

  SELECT oid
  INTO authenticated_role_oid
  FROM pg_roles
  WHERE rolname = 'authenticated';

  IF authenticated_role_oid IS NULL OR NOT EXISTS (
    SELECT 1
    FROM pg_policy p
    WHERE p.polrelid = 'public.target_companies'::regclass
      AND p.polname = 'Users can manage their own target companies'
      AND p.polcmd = '*'
      AND p.polpermissive
      AND authenticated_role_oid = ANY(p.polroles)
      AND regexp_replace(
        lower(pg_get_expr(p.polqual, p.polrelid)),
        '[[:space:]()]',
        '',
        'g'
      ) IN ('auth.uid=user_id', 'user_id=auth.uid')
      AND regexp_replace(
        lower(COALESCE(
          pg_get_expr(p.polwithcheck, p.polrelid),
          pg_get_expr(p.polqual, p.polrelid)
        )),
        '[[:space:]()]',
        '',
        'g'
      ) IN ('auth.uid=user_id', 'user_id=auth.uid')
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: target-company ownership policy must enforce auth.uid() = user_id for USING and WITH CHECK';
  END IF;
END;
$$;

-- Validate statuses before changing the status constraint or any data.
DO $$
DECLARE
  unexpected_status text;
BEGIN
  SELECT status
  INTO unexpected_status
  FROM public.target_companies
  WHERE status IS NOT NULL
    AND status NOT IN (
      'Prospect',
      'Engaged',
      'Contacted',
      'Closed',
      'New',
      'Qualified',
      'Interested',
      'Converted'
    )
  LIMIT 1;

  IF unexpected_status IS NOT NULL THEN
    RAISE EXCEPTION
      'Incompatible data: target_companies.status contains unsupported value "%"',
      unexpected_status;
  END IF;
END;
$$;

ALTER TABLE public.target_companies
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'Legacy';

-- Validate every newly added or pre-existing target-company column.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.target_companies'::regclass
      AND attname = 'location'
      AND NOT attisdropped
      AND atttypid = 'text'::regtype
      AND NOT attnotnull
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies.location must be nullable TEXT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.target_companies'::regclass
      AND attname = 'company_size'
      AND NOT attisdropped
      AND atttypid = 'text'::regtype
      AND NOT attnotnull
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies.company_size must be nullable TEXT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d
      ON d.adrelid = a.attrelid
     AND d.adnum = a.attnum
    WHERE a.attrelid = 'public.target_companies'::regclass
      AND a.attname = 'source_type'
      AND NOT a.attisdropped
      AND a.atttypid = 'text'::regtype
      AND a.attnotnull
      AND pg_get_expr(d.adbin, d.adrelid) = '''Legacy''::text'
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.target_companies.source_type must be not-null TEXT defaulting to Legacy';
  END IF;
END;
$$;

-- Validate the existing status constraint before replacing or preserving it.
DO $$
DECLARE
  status_constraint pg_constraint;
BEGIN
  SELECT c
  INTO status_constraint
  FROM pg_constraint c
  WHERE c.conrelid = 'public.target_companies'::regclass
    AND c.contype = 'c'
    AND c.conname = 'target_companies_status_check';

  IF status_constraint IS NOT NULL THEN
    IF NOT status_constraint.convalidated THEN
      RAISE EXCEPTION 'Incompatible schema: target_companies_status_check is not validated';
    END IF;
  END IF;
END;
$$;

ALTER TABLE public.target_companies
  DROP CONSTRAINT IF EXISTS target_companies_status_check;

UPDATE public.target_companies
SET status = CASE status
  WHEN 'Prospect' THEN 'New'
  WHEN 'Engaged' THEN 'Interested'
  ELSE status
END
WHERE status IN ('Prospect', 'Engaged');

ALTER TABLE public.target_companies
  ADD CONSTRAINT target_companies_status_check
  CHECK (
    status IN (
      'New',
      'Qualified',
      'Contacted',
      'Interested',
      'Converted',
      'Closed'
    )
  );

-- Validate data and establish only the exact named company-size constraint.
DO $$
DECLARE
  incompatible_company_size text;
BEGIN
  SELECT company_size
  INTO incompatible_company_size
  FROM public.target_companies
  WHERE company_size IS NOT NULL
    AND company_size NOT IN (
      'Micro (1-10)',
      'Small (11-50)',
      'Medium (51-200)',
      'Mid-Market (201-1000)',
      'Enterprise (1001+)'
    )
  LIMIT 1;

  IF incompatible_company_size IS NOT NULL THEN
    RAISE EXCEPTION
      'Incompatible data: target_companies.company_size contains unsupported value "%"',
      incompatible_company_size;
  END IF;
END;
$$;

ALTER TABLE public.target_companies
  DROP CONSTRAINT IF EXISTS target_companies_company_size_check;

ALTER TABLE public.target_companies
  ADD CONSTRAINT target_companies_company_size_check
  CHECK (
    company_size IS NULL OR company_size IN (
      'Micro (1-10)',
      'Small (11-50)',
      'Medium (51-200)',
      'Mid-Market (201-1000)',
      'Enterprise (1001+)'
    )
  );

-- Validate data and establish only the exact named target source-type constraint.
DO $$
DECLARE
  incompatible_source_type text;
BEGIN
  SELECT source_type
  INTO incompatible_source_type
  FROM public.target_companies
  WHERE source_type NOT IN ('Legacy', 'Manual', 'CSV Import')
  LIMIT 1;

  IF incompatible_source_type IS NOT NULL THEN
    RAISE EXCEPTION
      'Incompatible data: target_companies.source_type contains unsupported value "%"',
      incompatible_source_type;
  END IF;
END;
$$;

ALTER TABLE public.target_companies
  DROP CONSTRAINT IF EXISTS target_companies_source_type_check;

ALTER TABLE public.target_companies
  ADD CONSTRAINT target_companies_source_type_check
  CHECK (source_type IN ('Legacy', 'Manual', 'CSV Import'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lead_generation_criteria JSONB NOT NULL
  DEFAULT '{"industries":[],"locations":[],"company_sizes":[]}'::JSONB;

-- Validate profile column shape before changing grants.
DO $$
DECLARE
  criteria_default_expression text;
  criteria_default_literal text;
  criteria_default_value jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    WHERE a.attrelid = 'public.profiles'::regclass
      AND a.attname = 'lead_generation_criteria'
      AND NOT a.attisdropped
      AND a.atttypid = 'jsonb'::regtype
      AND a.attnotnull
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.profiles.lead_generation_criteria must be a not-null JSONB column';
  END IF;

  SELECT pg_get_expr(d.adbin, d.adrelid)
  INTO criteria_default_expression
  FROM pg_attribute a
  JOIN pg_attrdef d
    ON d.adrelid = a.attrelid
   AND d.adnum = a.attnum
  WHERE a.attrelid = 'public.profiles'::regclass
    AND a.attname = 'lead_generation_criteria'
    AND NOT a.attisdropped;

  IF criteria_default_expression IS NULL
     OR right(criteria_default_expression, 7) <> '::jsonb' THEN
    RAISE EXCEPTION 'Incompatible schema: lead_generation_criteria must have a JSONB literal default';
  END IF;

  criteria_default_expression :=
    left(criteria_default_expression, length(criteria_default_expression) - 7);

  IF length(criteria_default_expression) < 2
     OR left(criteria_default_expression, 1) <> ''''
     OR right(criteria_default_expression, 1) <> '''' THEN
    RAISE EXCEPTION 'Incompatible schema: lead_generation_criteria must have a JSONB literal default';
  END IF;

  criteria_default_literal :=
    substring(
      criteria_default_expression
      FROM 2 FOR length(criteria_default_expression) - 2
    );

  BEGIN
    criteria_default_value := criteria_default_literal::jsonb;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Incompatible schema: lead_generation_criteria default is not valid JSONB';
  END;

  IF criteria_default_value IS DISTINCT FROM
    '{"industries":[],"locations":[],"company_sizes":[]}'::jsonb THEN
    RAISE EXCEPTION 'Incompatible schema: lead_generation_criteria default has an unexpected JSONB value';
  END IF;
END;
$$;

-- Remove broader profile UPDATE privileges, then grant only permitted columns.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;

DO $$
DECLARE
  profile_column record;
BEGIN
  FOR profile_column IN
    SELECT a.attname
    FROM pg_attribute a
    WHERE a.attrelid = 'public.profiles'::regclass
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attname NOT IN (
        'full_name',
        'avatar_url',
        'lead_generation_criteria'
      )
  LOOP
    EXECUTE format(
      'REVOKE UPDATE (%I) ON TABLE public.profiles FROM authenticated',
      profile_column.attname
    );
  END LOOP;
END;
$$;

GRANT UPDATE (
  full_name,
  avatar_url,
  lead_generation_criteria
) ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.company_contacts (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  job_title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_profile_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'Manual',
  verification_status TEXT NOT NULL DEFAULT 'Unverified'
    CHECK (verification_status IN ('Unverified', 'Verified')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT company_contacts_pkey PRIMARY KEY (id, user_id),
  CONSTRAINT company_contacts_company_owner_fkey
    FOREIGN KEY (company_id, user_id)
    REFERENCES public.target_companies(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT company_contacts_source_type_check
    CHECK (source_type IN ('Manual'))
);

-- Validate every existing or newly created company-contact column and default.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.company_contacts'::regclass
      AND attname = 'id'
      AND NOT attisdropped
      AND atttypid = 'uuid'::regtype
      AND attnotnull
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts.id must be a not-null UUID primary-key column';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.company_contacts'::regclass
      AND attname IN ('user_id', 'company_id')
      AND NOT attisdropped
      AND atttypid = 'uuid'::regtype
      AND attnotnull
    HAVING count(*) = 2
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts.user_id and company_id must be not-null UUID columns';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.company_contacts'::regclass
      AND attname = 'full_name'
      AND NOT attisdropped
      AND atttypid = 'text'::regtype
      AND attnotnull
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts.full_name must be not-null TEXT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.company_contacts'::regclass
      AND attname IN (
        'job_title',
        'email',
        'phone',
        'linkedin_profile_url'
      )
      AND NOT attisdropped
      AND atttypid = 'text'::regtype
      AND NOT attnotnull
    HAVING count(*) = 4
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts optional text columns must be nullable TEXT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d
      ON d.adrelid = a.attrelid
     AND d.adnum = a.attnum
    WHERE a.attrelid = 'public.company_contacts'::regclass
      AND a.attname = 'source_type'
      AND NOT a.attisdropped
      AND a.atttypid = 'text'::regtype
      AND a.attnotnull
      AND pg_get_expr(d.adbin, d.adrelid) = '''Manual''::text'
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts.source_type must be not-null TEXT defaulting to Manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d
      ON d.adrelid = a.attrelid
     AND d.adnum = a.attnum
    WHERE a.attrelid = 'public.company_contacts'::regclass
      AND a.attname = 'verification_status'
      AND NOT a.attisdropped
      AND a.atttypid = 'text'::regtype
      AND a.attnotnull
      AND pg_get_expr(d.adbin, d.adrelid) = '''Unverified''::text'
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts.verification_status must be not-null TEXT defaulting to Unverified';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d
      ON d.adrelid = a.attrelid
     AND d.adnum = a.attnum
    WHERE a.attrelid = 'public.company_contacts'::regclass
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp with time zone'::regtype
      AND pg_get_expr(d.adbin, d.adrelid) = 'now()'
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts.created_at must be TIMESTAMPTZ defaulting to NOW()';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d
      ON d.adrelid = a.attrelid
     AND d.adnum = a.attnum
    WHERE a.attrelid = 'public.company_contacts'::regclass
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp with time zone'::regtype
      AND pg_get_expr(d.adbin, d.adrelid) = 'now()'
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts.updated_at must be TIMESTAMPTZ defaulting to NOW()';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d
      ON d.adrelid = a.attrelid
     AND d.adnum = a.attnum
    WHERE a.attrelid = 'public.company_contacts'::regclass
      AND a.attname = 'id'
      AND NOT a.attisdropped
      AND pg_get_expr(d.adbin, d.adrelid) LIKE '%gen_random_uuid%'
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts.id must default to gen_random_uuid()';
  END IF;
END;
$$;

-- Validate exact composite primary key.
DO $$
DECLARE
  primary_key_constraint pg_constraint;
  primary_key_columns text[];
BEGIN
  SELECT c
  INTO primary_key_constraint
  FROM pg_constraint c
  WHERE c.conrelid = 'public.company_contacts'::regclass
    AND c.contype = 'p';

  IF primary_key_constraint IS NULL THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts has no primary key';
  END IF;

  SELECT array_agg(a.attname ORDER BY k.ordinality)
  INTO primary_key_columns
  FROM unnest(primary_key_constraint.conkey) WITH ORDINALITY AS k(attnum, ordinality)
  JOIN pg_attribute a
    ON a.attrelid = primary_key_constraint.conrelid
   AND a.attnum = k.attnum;

  IF primary_key_columns IS DISTINCT FROM ARRAY['id'::text, 'user_id'::text] THEN
    RAISE EXCEPTION 'Incompatible schema: public.company_contacts primary key must be exactly (id, user_id)';
  END IF;
END;
$$;

-- Validate the exact composite owner foreign key:
-- (company_id, user_id) -> target_companies(id, user_id).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.company_contacts'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.target_companies'::regclass
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.company_contacts'::regclass
           AND attname = 'company_id'
           AND NOT attisdropped),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.company_contacts'::regclass
           AND attname = 'user_id'
           AND NOT attisdropped)
      ]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.target_companies'::regclass
           AND attname = 'id'
           AND NOT attisdropped),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.target_companies'::regclass
           AND attname = 'user_id'
           AND NOT attisdropped)
      ]
      AND c.confdeltype = 'c'
      AND c.convalidated
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: company_contacts(company_id, user_id) must reference target_companies(id, user_id) exactly with ON DELETE CASCADE';
  END IF;
END;
$$;

-- Validate the direct user foreign key to profiles(id).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.company_contacts'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.company_contacts'::regclass
           AND attname = 'user_id'
           AND NOT attisdropped)
      ]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.profiles'::regclass
           AND attname = 'id'
           AND NOT attisdropped)
      ]
      AND c.confdeltype = 'c'
      AND c.convalidated
  ) THEN
    RAISE EXCEPTION 'Incompatible schema: company_contacts.user_id must reference profiles(id) exactly with ON DELETE CASCADE';
  END IF;
END;
$$;

-- Validate data and establish the exact verification-status constraint.
DO $$
DECLARE
  incompatible_verification_status text;
BEGIN
  SELECT verification_status
  INTO incompatible_verification_status
  FROM public.company_contacts
  WHERE verification_status NOT IN ('Unverified', 'Verified')
  LIMIT 1;

  IF incompatible_verification_status IS NOT NULL THEN
    RAISE EXCEPTION
      'Incompatible data: company_contacts.verification_status contains unsupported value "%"',
      incompatible_verification_status;
  END IF;
END;
$$;

ALTER TABLE public.company_contacts
  DROP CONSTRAINT IF EXISTS company_contacts_verification_status_check;

ALTER TABLE public.company_contacts
  ADD CONSTRAINT company_contacts_verification_status_check
  CHECK (verification_status IN ('Unverified', 'Verified'));

-- Validate data and establish the exact Manual-only source constraint.
DO $$
DECLARE
  incompatible_source_type text;
BEGIN
  SELECT source_type
  INTO incompatible_source_type
  FROM public.company_contacts
  WHERE source_type IS DISTINCT FROM 'Manual'
  LIMIT 1;

  IF incompatible_source_type IS NOT NULL THEN
    RAISE EXCEPTION
      'Incompatible data: company_contacts.source_type contains unsupported value "%"',
      incompatible_source_type;
  END IF;
END;
$$;

ALTER TABLE public.company_contacts
  DROP CONSTRAINT IF EXISTS company_contacts_source_type_check;

ALTER TABLE public.company_contacts
  ADD CONSTRAINT company_contacts_source_type_check
  CHECK (source_type IN ('Manual'));

ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  authenticated_role_oid oid;
  unsafe_policy_name text;
BEGIN
  SELECT oid
  INTO authenticated_role_oid
  FROM pg_roles
  WHERE rolname = 'authenticated';

  IF authenticated_role_oid IS NULL THEN
    RAISE EXCEPTION 'Incompatible schema: role authenticated does not exist';
  END IF;

  SELECT p.polname
  INTO unsafe_policy_name
  FROM pg_policy p
  WHERE p.polrelid = 'public.company_contacts'::regclass
    AND p.polpermissive
    AND (
      p.polname <> 'Users can manage their own company contacts'
      OR p.polcmd <> '*'
      OR COALESCE(regexp_replace(
        lower(pg_get_expr(p.polqual, p.polrelid)),
        '[[:space:]()]',
        '',
        'g'
      ), '') NOT IN ('auth.uid=user_id', 'user_id=auth.uid')
      OR COALESCE(regexp_replace(
        lower(COALESCE(
          pg_get_expr(p.polwithcheck, p.polrelid),
          pg_get_expr(p.polqual, p.polrelid)
        )),
        '[[:space:]()]',
        '',
        'g'
      ), '') NOT IN ('auth.uid=user_id', 'user_id=auth.uid')
    )
  LIMIT 1;

  IF unsafe_policy_name IS NOT NULL THEN
    RAISE EXCEPTION
      'Incompatible schema: permissive company_contacts policy "%" may bypass user ownership',
      unsafe_policy_name;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Users can manage their own company contacts"
  ON public.company_contacts;

CREATE POLICY "Users can manage their own company contacts"
  ON public.company_contacts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON TABLE public.company_contacts
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.company_contacts
  TO authenticated;

CREATE INDEX IF NOT EXISTS idx_target_companies_user_name
  ON public.target_companies (user_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_target_companies_user_industry
  ON public.target_companies (user_id, industry);

CREATE INDEX IF NOT EXISTS idx_target_companies_user_location
  ON public.target_companies (user_id, location);

CREATE INDEX IF NOT EXISTS idx_target_companies_user_size_stage
  ON public.target_companies (user_id, company_size, status);

CREATE INDEX IF NOT EXISTS idx_company_contacts_user_company
  ON public.company_contacts (user_id, company_id);

DROP TRIGGER IF EXISTS trigger_update_company_contacts
  ON public.company_contacts;

CREATE TRIGGER trigger_update_company_contacts
  BEFORE UPDATE ON public.company_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
