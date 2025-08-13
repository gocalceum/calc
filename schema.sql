

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."create_organization_with_owner"("org_name" "text", "org_slug" "text", "org_type" "text" DEFAULT 'accounting_firm'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO organizations (name, slug, type, created_by)
  VALUES (org_name, org_slug, org_type, auth.uid())
  RETURNING id INTO new_org_id;
  
  -- Add the creator as owner
  INSERT INTO organization_members (organization_id, user_id, role, is_active)
  VALUES (new_org_id, auth.uid(), 'owner', true);
  
  -- Set as current organization
  UPDATE profiles 
  SET current_org_id = new_org_id
  WHERE id = auth.uid();
  
  RETURN new_org_id;
END;
$$;


ALTER FUNCTION "public"."create_organization_with_owner"("org_name" "text", "org_slug" "text", "org_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accessible_entities"() RETURNS TABLE("id" "uuid", "organization_id" "uuid", "name" "text", "entity_type" "text", "status" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT DISTINCT 
    e.id,
    e.organization_id,
    e.name,
    e.entity_type,
    e.status
  FROM entities e
  LEFT JOIN entity_permissions ep ON e.id = ep.entity_id
  WHERE 
    e.organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR ep.user_id = auth.uid()
  ORDER BY e.name
$$;


ALTER FUNCTION "public"."get_accessible_entities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_org"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT current_org_id FROM profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."get_current_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_entity"("entity_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE profiles 
  SET current_entity_id = entity_id
  WHERE id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM entities e
    LEFT JOIN entity_permissions ep ON e.id = ep.entity_id
    WHERE e.id = entity_id
    AND (
      e.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR ep.user_id = auth.uid()
    )
  )
$$;


ALTER FUNCTION "public"."switch_entity"("entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_organization"("org_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE profiles 
  SET current_org_id = org_id,
      current_entity_id = NULL
  WHERE id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true
  )
$$;


ALTER FUNCTION "public"."switch_organization"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "entity_id" "uuid",
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "changes" "jsonb" DEFAULT '{}'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text", 'view'::"text", 'export'::"text", 'import'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Audit trail for compliance and security';



CREATE TABLE IF NOT EXISTS "public"."calculations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid",
    "organization_id" "uuid",
    "type" "text" NOT NULL,
    "period_start" "date",
    "period_end" "date",
    "status" "text" DEFAULT 'draft'::"text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "reviewed_by" "uuid",
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."calculations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "legal_name" "text",
    "entity_type" "text" NOT NULL,
    "company_number" "text",
    "vat_number" "text",
    "tax_reference" "text",
    "incorporation_date" "date",
    "year_end" "date",
    "status" "text" DEFAULT 'active'::"text",
    "onboarding_status" "text" DEFAULT 'pending'::"text",
    "primary_contact" "jsonb" DEFAULT '{}'::"jsonb",
    "registered_address" "jsonb" DEFAULT '{}'::"jsonb",
    "trading_address" "jsonb" DEFAULT '{}'::"jsonb",
    "currency" "text" DEFAULT 'GBP'::"text",
    "vat_scheme" "text",
    "accounting_method" "text" DEFAULT 'accrual'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "notes" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "entities_accounting_method_check" CHECK (("accounting_method" = ANY (ARRAY['accrual'::"text", 'cash'::"text"]))),
    CONSTRAINT "entities_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['sole_trader'::"text", 'freelancer'::"text", 'partnership'::"text", 'limited_company'::"text", 'llp'::"text", 'charity'::"text", 'other'::"text"]))),
    CONSTRAINT "entities_onboarding_status_check" CHECK (("onboarding_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text"]))),
    CONSTRAINT "entities_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'dormant'::"text", 'ceased'::"text", 'archived'::"text"]))),
    CONSTRAINT "entities_vat_scheme_check" CHECK (("vat_scheme" = ANY (ARRAY['standard'::"text", 'flat_rate'::"text", 'cash'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."entities" OWNER TO "postgres";


COMMENT ON TABLE "public"."entities" IS 'Client businesses managed by accounting firms';



CREATE TABLE IF NOT EXISTS "public"."entity_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid",
    "user_id" "uuid",
    "permission_level" "text" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "entity_permissions_permission_level_check" CHECK (("permission_level" = ANY (ARRAY['owner'::"text", 'full'::"text", 'read_write'::"text", 'read_only'::"text"])))
);


ALTER TABLE "public"."entity_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."entity_permissions" IS 'Granular access control for entities';



CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "invited_by" "uuid",
    "invited_at" timestamp with time zone,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'accountant'::"text", 'bookkeeper'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_members" IS 'Staff members of accounting firms';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "type" "text" DEFAULT 'accounting_firm'::"text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "subscription_tier" "text" DEFAULT 'starter'::"text",
    "subscription_status" "text" DEFAULT 'active'::"text",
    "email" "text",
    "phone" "text",
    "address" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "organizations_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'trialing'::"text", 'past_due'::"text", 'canceled'::"text", 'paused'::"text"]))),
    CONSTRAINT "organizations_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['starter'::"text", 'professional'::"text", 'enterprise'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Accounting firms using the platform';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "website" "text",
    "avatar_url" "text",
    "current_org_id" "uuid",
    "current_entity_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calculations"
    ADD CONSTRAINT "calculations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_permissions"
    ADD CONSTRAINT "entity_permissions_entity_id_user_id_key" UNIQUE ("entity_id", "user_id");



ALTER TABLE ONLY "public"."entity_permissions"
    ADD CONSTRAINT "entity_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_entity_id" ON "public"."audit_logs" USING "btree" ("entity_id");



CREATE INDEX "idx_audit_logs_org_id" ON "public"."audit_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_calculations_entity_id" ON "public"."calculations" USING "btree" ("entity_id") WHERE ("entity_id" IS NOT NULL);



CREATE INDEX "idx_calculations_org_id" ON "public"."calculations" USING "btree" ("organization_id") WHERE ("organization_id" IS NOT NULL);



CREATE INDEX "idx_entities_org_id" ON "public"."entities" USING "btree" ("organization_id");



CREATE INDEX "idx_entities_status" ON "public"."entities" USING "btree" ("status");



CREATE INDEX "idx_entities_type" ON "public"."entities" USING "btree" ("entity_type");



CREATE INDEX "idx_entity_perms_entity_id" ON "public"."entity_permissions" USING "btree" ("entity_id");



CREATE INDEX "idx_entity_perms_user_id" ON "public"."entity_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_org_members_active" ON "public"."organization_members" USING "btree" ("is_active");



CREATE INDEX "idx_org_members_org_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_created_by" ON "public"."organizations" USING "btree" ("created_by");



CREATE INDEX "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");



CREATE OR REPLACE TRIGGER "update_entities_updated_at" BEFORE UPDATE ON "public"."entities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."calculations"
    ADD CONSTRAINT "calculations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."calculations"
    ADD CONSTRAINT "calculations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."calculations"
    ADD CONSTRAINT "calculations_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calculations"
    ADD CONSTRAINT "calculations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calculations"
    ADD CONSTRAINT "calculations_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_permissions"
    ADD CONSTRAINT "entity_permissions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_permissions"
    ADD CONSTRAINT "entity_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entity_permissions"
    ADD CONSTRAINT "entity_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_current_entity_id_fkey" FOREIGN KEY ("current_entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_current_org_id_fkey" FOREIGN KEY ("current_org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage entity permissions" ON "public"."entity_permissions" USING (("entity_id" IN ( SELECT "e"."id"
   FROM ("public"."entities" "e"
     JOIN "public"."organization_members" "om" ON (("e"."organization_id" = "om"."organization_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."is_active" = true)))));



CREATE POLICY "Admins can manage organization members" ON "public"."organization_members" USING (("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE (("organization_members_1"."user_id" = "auth"."uid"()) AND ("organization_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members_1"."is_active" = true)))));



CREATE POLICY "Admins can update their organizations" ON "public"."organizations" FOR UPDATE USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members"."is_active" = true)))));



CREATE POLICY "Users can create calculations" ON "public"."calculations" FOR INSERT WITH CHECK (("entity_id" IN ( SELECT "e"."id"
   FROM ("public"."entities" "e"
     LEFT JOIN "public"."entity_permissions" "ep" ON (("e"."id" = "ep"."entity_id")))
  WHERE (("e"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'accountant'::"text", 'bookkeeper'::"text"])) AND ("organization_members"."is_active" = true)))) OR (("ep"."user_id" = "auth"."uid"()) AND ("ep"."permission_level" = ANY (ARRAY['owner'::"text", 'full'::"text", 'read_write'::"text"])))))));



CREATE POLICY "Users can create entities in their organizations" ON "public"."entities" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'accountant'::"text"])) AND ("organization_members"."is_active" = true)))));



CREATE POLICY "Users can create organizations" ON "public"."organizations" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update calculations" ON "public"."calculations" FOR UPDATE USING (("entity_id" IN ( SELECT "e"."id"
   FROM ("public"."entities" "e"
     LEFT JOIN "public"."entity_permissions" "ep" ON (("e"."id" = "ep"."entity_id")))
  WHERE (("e"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'accountant'::"text", 'bookkeeper'::"text"])) AND ("organization_members"."is_active" = true)))) OR (("ep"."user_id" = "auth"."uid"()) AND ("ep"."permission_level" = ANY (ARRAY['owner'::"text", 'full'::"text", 'read_write'::"text"])))))));



CREATE POLICY "Users can update entities they have access to" ON "public"."entities" FOR UPDATE USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'accountant'::"text"])) AND ("organization_members"."is_active" = true)))) OR ("id" IN ( SELECT "entity_permissions"."entity_id"
   FROM "public"."entity_permissions"
  WHERE (("entity_permissions"."user_id" = "auth"."uid"()) AND ("entity_permissions"."permission_level" = ANY (ARRAY['owner'::"text", 'full'::"text", 'read_write'::"text"])))))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view audit logs for their organizations" ON "public"."audit_logs" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members"."is_active" = true)))));



CREATE POLICY "Users can view calculations" ON "public"."calculations" FOR SELECT USING (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities")));



CREATE POLICY "Users can view entities in their organizations" ON "public"."entities" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."is_active" = true)))) OR ("id" IN ( SELECT "entity_permissions"."entity_id"
   FROM "public"."entity_permissions"
  WHERE ("entity_permissions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view entity permissions" ON "public"."entity_permissions" FOR SELECT USING (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities")));



CREATE POLICY "Users can view members of their organizations" ON "public"."organization_members" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."is_active" = true)))));



CREATE POLICY "Users can view their organizations" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."is_active" = true)))));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calculations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entity_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_organization_with_owner"("org_name" "text", "org_slug" "text", "org_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_organization_with_owner"("org_name" "text", "org_slug" "text", "org_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization_with_owner"("org_name" "text", "org_slug" "text", "org_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accessible_entities"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_accessible_entities"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accessible_entities"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."switch_entity"("entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."switch_entity"("entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."switch_entity"("entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."switch_organization"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."switch_organization"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."switch_organization"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."calculations" TO "anon";
GRANT ALL ON TABLE "public"."calculations" TO "authenticated";
GRANT ALL ON TABLE "public"."calculations" TO "service_role";



GRANT ALL ON TABLE "public"."entities" TO "anon";
GRANT ALL ON TABLE "public"."entities" TO "authenticated";
GRANT ALL ON TABLE "public"."entities" TO "service_role";



GRANT ALL ON TABLE "public"."entity_permissions" TO "anon";
GRANT ALL ON TABLE "public"."entity_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
