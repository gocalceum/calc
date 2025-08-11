export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          extensions?: Json
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      calculations: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          data: Json
          entity_id: string | null
          id: string
          organization_id: string | null
          period_end: string | null
          period_start: string | null
          result: Json | null
          reviewed_by: string | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          entity_id?: string | null
          id?: string
          organization_id?: string | null
          period_end?: string | null
          period_start?: string | null
          result?: Json | null
          reviewed_by?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          entity_id?: string | null
          id?: string
          organization_id?: string | null
          period_end?: string | null
          period_start?: string | null
          result?: Json | null
          reviewed_by?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'calculations_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calculations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      entities: {
        Row: {
          accounting_method: string | null
          company_number: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          custom_fields: Json | null
          entity_type: string
          id: string
          incorporation_date: string | null
          legal_name: string | null
          name: string
          notes: string | null
          onboarding_status: string | null
          organization_id: string | null
          primary_contact: Json | null
          registered_address: Json | null
          status: string | null
          tags: string[] | null
          tax_reference: string | null
          trading_address: Json | null
          updated_at: string | null
          vat_number: string | null
          vat_scheme: string | null
          year_end: string | null
        }
        Insert: {
          accounting_method?: string | null
          company_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_fields?: Json | null
          entity_type: string
          id?: string
          incorporation_date?: string | null
          legal_name?: string | null
          name: string
          notes?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          primary_contact?: Json | null
          registered_address?: Json | null
          status?: string | null
          tags?: string[] | null
          tax_reference?: string | null
          trading_address?: Json | null
          updated_at?: string | null
          vat_number?: string | null
          vat_scheme?: string | null
          year_end?: string | null
        }
        Update: {
          accounting_method?: string | null
          company_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_fields?: Json | null
          entity_type?: string
          id?: string
          incorporation_date?: string | null
          legal_name?: string | null
          name?: string
          notes?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          primary_contact?: Json | null
          registered_address?: Json | null
          status?: string | null
          tags?: string[] | null
          tax_reference?: string | null
          trading_address?: Json | null
          updated_at?: string | null
          vat_number?: string | null
          vat_scheme?: string | null
          year_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'entities_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      entity_permissions: {
        Row: {
          entity_id: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_level: string
          user_id: string | null
        }
        Insert: {
          entity_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_level: string
          user_id?: string | null
        }
        Update: {
          entity_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_level?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'entity_permissions_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          organization_id: string | null
          permissions: Json | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          subscription_status: string | null
          subscription_tier: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          subscription_status?: string | null
          subscription_tier?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          subscription_status?: string | null
          subscription_tier?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          current_entity_id: string | null
          current_org_id: string | null
          id: string
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          current_entity_id?: string | null
          current_org_id?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          current_entity_id?: string | null
          current_org_id?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_current_entity_id_fkey'
            columns: ['current_entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_current_org_id_fkey'
            columns: ['current_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_with_owner: {
        Args: { org_name: string; org_slug: string; org_type?: string }
        Returns: string
      }
      get_accessible_entities: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          organization_id: string
          name: string
          entity_type: string
          status: string
        }[]
      }
      get_current_org: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      switch_entity: {
        Args: { entity_id: string }
        Returns: undefined
      }
      switch_organization: {
        Args: { org_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
