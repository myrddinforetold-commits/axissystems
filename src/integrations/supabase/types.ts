export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          status: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          status?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_context: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_grounded: boolean
          set_by: string
          stage: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_grounded?: boolean
          set_by: string
          stage?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_grounded?: boolean
          set_by?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_context_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_grounding: {
        Row: {
          aspirations: Json
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          constraints: Json
          created_at: string
          current_state_summary: Json | null
          entities: Json
          id: string
          intended_customer: string | null
          not_yet_exists: Json
          products: Json
          status: string
          technical_context: Json | null
          updated_at: string
        }
        Insert: {
          aspirations?: Json
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          constraints?: Json
          created_at?: string
          current_state_summary?: Json | null
          entities?: Json
          id?: string
          intended_customer?: string | null
          not_yet_exists?: Json
          products?: Json
          status?: string
          technical_context?: Json | null
          updated_at?: string
        }
        Update: {
          aspirations?: Json
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          constraints?: Json
          created_at?: string
          current_state_summary?: Json | null
          entities?: Json
          id?: string
          intended_customer?: string | null
          not_yet_exists?: Json
          products?: Json
          status?: string
          technical_context?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_grounding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memory: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          label: string | null
          pinned_by: string
          source_message_id: string | null
          source_role_id: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          label?: string | null
          pinned_by: string
          source_message_id?: string | null
          source_role_id?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          label?: string | null
          pinned_by?: string
          source_message_id?: string | null
          source_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_memory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memory_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "role_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memory_source_role_id_fkey"
            columns: ["source_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_webhooks: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          event_types: string[] | null
          headers: Json | null
          id: string
          is_active: boolean | null
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          event_types?: string[] | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          event_types?: string[] | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cos_reports: {
        Row: {
          company_id: string
          content: string
          created_at: string
          generated_by: string
          id: string
          report_type: string
          role_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          generated_by: string
          id?: string
          report_type: string
          role_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          generated_by?: string
          id?: string
          report_type?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cos_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cos_reports_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      dead_letter_queue: {
        Row: {
          attempts_made: number
          company_id: string
          created_at: string
          failure_reason: string
          id: string
          last_output: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          role_id: string
          task_id: string
        }
        Insert: {
          attempts_made: number
          company_id: string
          created_at?: string
          failure_reason: string
          id?: string
          last_output?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          role_id: string
          task_id: string
        }
        Update: {
          attempts_made?: number
          company_id?: string
          created_at?: string
          failure_reason?: string
          id?: string
          last_output?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          role_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dead_letter_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dead_letter_queue_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dead_letter_queue_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      output_actions: {
        Row: {
          action_data: Json | null
          action_type: Database["public"]["Enums"]["output_action_type"]
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          task_id: string
          updated_at: string
        }
        Insert: {
          action_data?: Json | null
          action_type: Database["public"]["Enums"]["output_action_type"]
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          action_data?: Json | null
          action_type?: Database["public"]["Enums"]["output_action_type"]
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "output_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "output_actions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_memory: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          memory_type: string
          role_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          memory_type: string
          role_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          memory_type?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_memory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_memory_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_memos: {
        Row: {
          company_id: string
          content: string
          created_at: string
          from_role_id: string
          id: string
          to_role_id: string
          workflow_request_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          from_role_id: string
          id?: string
          to_role_id: string
          workflow_request_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          from_role_id?: string
          id?: string
          to_role_id?: string
          workflow_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_memos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_memos_from_role_id_fkey"
            columns: ["from_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_memos_to_role_id_fkey"
            columns: ["to_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_memos_workflow_request_id_fkey"
            columns: ["workflow_request_id"]
            isOneToOne: false
            referencedRelation: "workflow_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      role_messages: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          role_id: string
          sender: Database["public"]["Enums"]["message_sender"]
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          role_id: string
          sender: Database["public"]["Enums"]["message_sender"]
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          role_id?: string
          sender?: Database["public"]["Enums"]["message_sender"]
        }
        Relationships: [
          {
            foreignKeyName: "role_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_messages_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_objectives: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          priority: number
          role_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          priority?: number
          role_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: number
          role_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_objectives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_objectives_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          authority_level: Database["public"]["Enums"]["authority_level"]
          company_id: string
          created_at: string
          created_by: string
          display_name: string | null
          id: string
          is_activated: boolean
          mandate: string
          memory_scope: Database["public"]["Enums"]["memory_scope"]
          name: string
          system_prompt: string
          updated_at: string
          workflow_status: string
        }
        Insert: {
          authority_level?: Database["public"]["Enums"]["authority_level"]
          company_id: string
          created_at?: string
          created_by: string
          display_name?: string | null
          id?: string
          is_activated?: boolean
          mandate: string
          memory_scope?: Database["public"]["Enums"]["memory_scope"]
          name: string
          system_prompt: string
          updated_at?: string
          workflow_status?: string
        }
        Update: {
          authority_level?: Database["public"]["Enums"]["authority_level"]
          company_id?: string
          created_at?: string
          created_by?: string
          display_name?: string | null
          id?: string
          is_activated?: boolean
          mandate?: string
          memory_scope?: Database["public"]["Enums"]["memory_scope"]
          name?: string
          system_prompt?: string
          updated_at?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          evaluation_reason: string | null
          evaluation_result: Database["public"]["Enums"]["attempt_result"]
          id: string
          model_output: string
          task_id: string
        }
        Insert: {
          attempt_number: number
          created_at?: string
          evaluation_reason?: string | null
          evaluation_result: Database["public"]["Enums"]["attempt_result"]
          id?: string
          model_output: string
          task_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          evaluation_reason?: string | null
          evaluation_result?: Database["public"]["Enums"]["attempt_result"]
          id?: string
          model_output?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attempts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          company_id: string
          completion_criteria: string
          completion_summary: string | null
          created_at: string
          current_attempt: number
          dependency_status: string | null
          depends_on: string[] | null
          description: string
          id: string
          max_attempts: number
          requires_verification: boolean | null
          role_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_by: string
          company_id: string
          completion_criteria: string
          completion_summary?: string | null
          created_at?: string
          current_attempt?: number
          dependency_status?: string | null
          depends_on?: string[] | null
          description: string
          id?: string
          max_attempts?: number
          requires_verification?: boolean | null
          role_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_by?: string
          company_id?: string
          completion_criteria?: string
          completion_summary?: string | null
          created_at?: string
          current_attempt?: number
          dependency_status?: string | null
          depends_on?: string[] | null
          description?: string
          id?: string
          max_attempts?: number
          requires_verification?: boolean | null
          role_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          company_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          output_action_id: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          retry_count: number | null
          webhook_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          output_action_id?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          retry_count?: number | null
          webhook_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          output_action_id?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          retry_count?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_output_action_id_fkey"
            columns: ["output_action_id"]
            isOneToOne: false
            referencedRelation: "output_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "company_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_requests: {
        Row: {
          company_id: string
          created_at: string
          id: string
          proposed_content: string
          request_type: Database["public"]["Enums"]["workflow_request_type"]
          requesting_role_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_task_id: string | null
          status: Database["public"]["Enums"]["workflow_request_status"]
          summary: string
          target_role_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          proposed_content: string
          request_type: Database["public"]["Enums"]["workflow_request_type"]
          requesting_role_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_task_id?: string | null
          status?: Database["public"]["Enums"]["workflow_request_status"]
          summary: string
          target_role_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          proposed_content?: string
          request_type?: Database["public"]["Enums"]["workflow_request_type"]
          requesting_role_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_task_id?: string | null
          status?: Database["public"]["Enums"]["workflow_request_status"]
          summary?: string
          target_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_requests_requesting_role_id_fkey"
            columns: ["requesting_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_requests_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_requests_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: boolean }
      cleanup_old_workflow_requests: {
        Args: { days_old?: number }
        Returns: number
      }
      create_company_with_owner: {
        Args: { company_name: string }
        Returns: string
      }
      create_notification: {
        Args: {
          _company_id: string
          _link?: string
          _message: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          company_id: string
          company_name: string
          email: string
          expires_at: string
          id: string
          role: string
          status: string
        }[]
      }
      has_app_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_owner: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      attempt_result: "pass" | "fail" | "unclear"
      authority_level:
        | "observer"
        | "advisor"
        | "operator"
        | "executive"
        | "orchestrator"
      company_role: "owner" | "member"
      memory_scope: "role" | "company"
      message_sender: "user" | "ai"
      output_action_type:
        | "copy_to_lovable"
        | "export_document"
        | "create_followup"
        | "pin_to_memory"
        | "mark_external"
        | "delegate_to_human"
      task_status:
        | "pending"
        | "running"
        | "completed"
        | "blocked"
        | "stopped"
        | "archived"
        | "system_alert"
      workflow_request_status: "pending" | "approved" | "denied"
      workflow_request_type:
        | "send_memo"
        | "start_task"
        | "continue_task"
        | "suggest_next_task"
        | "review_output"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      attempt_result: ["pass", "fail", "unclear"],
      authority_level: [
        "observer",
        "advisor",
        "operator",
        "executive",
        "orchestrator",
      ],
      company_role: ["owner", "member"],
      memory_scope: ["role", "company"],
      message_sender: ["user", "ai"],
      output_action_type: [
        "copy_to_lovable",
        "export_document",
        "create_followup",
        "pin_to_memory",
        "mark_external",
        "delegate_to_human",
      ],
      task_status: [
        "pending",
        "running",
        "completed",
        "blocked",
        "stopped",
        "archived",
        "system_alert",
      ],
      workflow_request_status: ["pending", "approved", "denied"],
      workflow_request_type: [
        "send_memo",
        "start_task",
        "continue_task",
        "suggest_next_task",
        "review_output",
      ],
    },
  },
} as const
