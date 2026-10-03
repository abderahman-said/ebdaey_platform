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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string
          actor_type: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string | null
          success?: boolean
        }
        Relationships: []
      }
      admin_login_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_trusted_devices: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          last_seen_at: string
          persistent: boolean
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          persistent?: boolean
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          persistent?: boolean
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      balance_adjustments: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          currency: string
          id: string
          kind: string
          reason: string
          tenant_id: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          reason: string
          tenant_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bunny_video_owners: {
        Row: {
          created_at: string
          library_id: string | null
          tenant_id: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          library_id?: string | null
          tenant_id?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          library_id?: string | null
          tenant_id?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          accent_color: string
          achievement_text: string
          background_url: string | null
          body_font: string
          border_color: string
          border_style: string
          border_width: number
          certificate_text: string
          certificate_title: string
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string
          seal_url: string | null
          secondary_color: string
          show_certificate_id: boolean
          show_date: boolean
          show_expiry: boolean
          show_qr: boolean
          signature_url: string | null
          template_name: string
          tenant_id: string
          title_font: string
          updated_at: string
          watermark_opacity: number
          watermark_url: string | null
        }
        Insert: {
          accent_color?: string
          achievement_text?: string
          background_url?: string | null
          body_font?: string
          border_color?: string
          border_style?: string
          border_width?: number
          certificate_text?: string
          certificate_title?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          seal_url?: string | null
          secondary_color?: string
          show_certificate_id?: boolean
          show_date?: boolean
          show_expiry?: boolean
          show_qr?: boolean
          signature_url?: string | null
          template_name?: string
          tenant_id: string
          title_font?: string
          updated_at?: string
          watermark_opacity?: number
          watermark_url?: string | null
        }
        Update: {
          accent_color?: string
          achievement_text?: string
          background_url?: string | null
          body_font?: string
          border_color?: string
          border_style?: string
          border_width?: number
          certificate_text?: string
          certificate_title?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          seal_url?: string | null
          secondary_color?: string
          show_certificate_id?: boolean
          show_date?: boolean
          show_expiry?: boolean
          show_qr?: boolean
          signature_url?: string | null
          template_name?: string
          tenant_id?: string
          title_font?: string
          updated_at?: string
          watermark_opacity?: number
          watermark_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_bookings: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string
          duration_minutes: number
          google_event_id: string | null
          id: string
          live_course_id: string
          meeting_link: string | null
          notes: string | null
          purchase_id: string | null
          reminder_sent_at: string | null
          session_index: number | null
          status: string
          student_id: string | null
          tenant_id: string
          updated_at: string
          zoom_meeting_id: string | null
          zoom_start_url: string | null
        }
        Insert: {
          booking_date: string
          booking_time: string
          created_at?: string
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          live_course_id: string
          meeting_link?: string | null
          notes?: string | null
          purchase_id?: string | null
          reminder_sent_at?: string | null
          session_index?: number | null
          status?: string
          student_id?: string | null
          tenant_id: string
          updated_at?: string
          zoom_meeting_id?: string | null
          zoom_start_url?: string | null
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          live_course_id?: string
          meeting_link?: string | null
          notes?: string | null
          purchase_id?: string | null
          reminder_sent_at?: string | null
          session_index?: number | null
          status?: string
          student_id?: string | null
          tenant_id?: string
          updated_at?: string
          zoom_meeting_id?: string | null
          zoom_start_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_bookings_live_course_id_fkey"
            columns: ["live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_bookings_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "live_course_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      content_bank_blocks: {
        Row: {
          button_label: string | null
          button_url: string | null
          content_type: string
          course_id: string | null
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          item_id: string
          link_url: string | null
          live_course_id: string | null
          sort_order: number
          tenant_id: string
          text_content: string | null
        }
        Insert: {
          button_label?: string | null
          button_url?: string | null
          content_type: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          item_id: string
          link_url?: string | null
          live_course_id?: string | null
          sort_order?: number
          tenant_id: string
          text_content?: string | null
        }
        Update: {
          button_label?: string | null
          button_url?: string | null
          content_type?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          item_id?: string
          link_url?: string | null
          live_course_id?: string | null
          sort_order?: number
          tenant_id?: string
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_bank_blocks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "content_bank_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_bank_folders: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          live_course_id: string | null
          sort_order: number
          tenant_id: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          live_course_id?: string | null
          sort_order?: number
          tenant_id: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          live_course_id?: string | null
          sort_order?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_bank_folders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_bank_folders_live_course_id_fkey"
            columns: ["live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_bank_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_bank_items: {
        Row: {
          course_id: string | null
          created_at: string
          folder_id: string
          id: string
          live_course_id: string | null
          sort_order: number
          tenant_id: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          folder_id: string
          id?: string
          live_course_id?: string | null
          sort_order?: number
          tenant_id: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          folder_id?: string
          id?: string
          live_course_id?: string | null
          sort_order?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_bank_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_bank_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "content_bank_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_bank_items_live_course_id_fkey"
            columns: ["live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_bank_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_protection_events: {
        Row: {
          course_id: string | null
          created_at: string
          event_type: string
          id: string
          lesson_id: string | null
          session_fingerprint: string | null
          student_id: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          lesson_id?: string | null
          session_fingerprint?: string | null
          student_id: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          lesson_id?: string | null
          session_fingerprint?: string | null
          student_id?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_protection_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_amounts: {
        Row: {
          amount: number
          coupon_id: string
          created_at: string
          currency: string
          id: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          coupon_id: string
          created_at?: string
          currency: string
          id?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          coupon_id?: string
          created_at?: string
          currency?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_amounts_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          course_id: string | null
          created_at: string
          digital_product_id: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_per_customer: number | null
          max_uses: number | null
          tenant_id: string
          used_count: number
        }
        Insert: {
          code: string
          course_id?: string | null
          created_at?: string
          digital_product_id?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_per_customer?: number | null
          max_uses?: number | null
          tenant_id: string
          used_count?: number
        }
        Update: {
          code?: string
          course_id?: string | null
          created_at?: string
          digital_product_id?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_per_customer?: number | null
          max_uses?: number | null
          tenant_id?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_qa_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          course_id: string
          created_at: string
          embedding: string | null
          end_time: number | null
          id: string
          lesson_id: string | null
          source_type: string
          start_time: number | null
          tenant_id: string
        }
        Insert: {
          chunk_index?: number
          chunk_text: string
          course_id: string
          created_at?: string
          embedding?: string | null
          end_time?: number | null
          id?: string
          lesson_id?: string | null
          source_type: string
          start_time?: number | null
          tenant_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          course_id?: string
          created_at?: string
          embedding?: string | null
          end_time?: number | null
          id?: string
          lesson_id?: string | null
          source_type?: string
          start_time?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_qa_chunks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_qa_chunks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_qa_chunks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_qa_conversations: {
        Row: {
          course_id: string
          created_at: string
          id: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_qa_conversations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_qa_conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_qa_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_qa_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          refs: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          refs?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          refs?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_qa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "course_qa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_qa_usage: {
        Row: {
          course_id: string
          day: string
          id: string
          question_count: number
          student_id: string
        }
        Insert: {
          course_id: string
          day?: string
          id?: string
          question_count?: number
          student_id: string
        }
        Update: {
          course_id?: string
          day?: string
          id?: string
          question_count?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_qa_usage_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_qa_usage_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          tenant_id: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          tenant_id: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          adjectives: string | null
          announcement_text: string | null
          announcement_type: string | null
          banner_type: string | null
          banner_video_url: string | null
          buy_button_text: string | null
          card_button_text: string | null
          community_link: string | null
          created_at: string
          description: string | null
          display_order: number
          faqs: Json | null
          gift_course_enabled: boolean
          gift_course_id: string | null
          guarantee_days: number
          guarantee_description: string | null
          guarantee_enabled: boolean
          guarantee_title: string | null
          has_certificate: boolean
          has_community: boolean
          has_individual_support: boolean
          has_lifetime_updates: boolean
          id: string
          is_published: boolean
          is_unlisted: boolean
          landing_dark_mode: boolean | null
          landing_features: Json | null
          landing_header: string | null
          landing_header_color: string | null
          landing_header_size: string | null
          landing_subheader: string | null
          landing_subheader_color: string | null
          landing_subheader_size: string | null
          price: number
          price_before_discount: number | null
          qa_bot_enabled: boolean
          slug: string
          target_audience: string | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          adjectives?: string | null
          announcement_text?: string | null
          announcement_type?: string | null
          banner_type?: string | null
          banner_video_url?: string | null
          buy_button_text?: string | null
          card_button_text?: string | null
          community_link?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          faqs?: Json | null
          gift_course_enabled?: boolean
          gift_course_id?: string | null
          guarantee_days?: number
          guarantee_description?: string | null
          guarantee_enabled?: boolean
          guarantee_title?: string | null
          has_certificate?: boolean
          has_community?: boolean
          has_individual_support?: boolean
          has_lifetime_updates?: boolean
          id?: string
          is_published?: boolean
          is_unlisted?: boolean
          landing_dark_mode?: boolean | null
          landing_features?: Json | null
          landing_header?: string | null
          landing_header_color?: string | null
          landing_header_size?: string | null
          landing_subheader?: string | null
          landing_subheader_color?: string | null
          landing_subheader_size?: string | null
          price?: number
          price_before_discount?: number | null
          qa_bot_enabled?: boolean
          slug: string
          target_audience?: string | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          adjectives?: string | null
          announcement_text?: string | null
          announcement_type?: string | null
          banner_type?: string | null
          banner_video_url?: string | null
          buy_button_text?: string | null
          card_button_text?: string | null
          community_link?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          faqs?: Json | null
          gift_course_enabled?: boolean
          gift_course_id?: string | null
          guarantee_days?: number
          guarantee_description?: string | null
          guarantee_enabled?: boolean
          guarantee_title?: string | null
          has_certificate?: boolean
          has_community?: boolean
          has_individual_support?: boolean
          has_lifetime_updates?: boolean
          id?: string
          is_published?: boolean
          is_unlisted?: boolean
          landing_dark_mode?: boolean | null
          landing_features?: Json | null
          landing_header?: string | null
          landing_header_color?: string | null
          landing_header_size?: string | null
          landing_subheader?: string | null
          landing_subheader_color?: string | null
          landing_subheader_size?: string | null
          price?: number
          price_before_discount?: number | null
          qa_bot_enabled?: boolean
          slug?: string
          target_audience?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_gift_course_id_fkey"
            columns: ["gift_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_download_logs: {
        Row: {
          created_at: string
          digital_product_id: string
          file_id: string
          file_title: string | null
          id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          digital_product_id: string
          file_id: string
          file_title?: string | null
          id?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          digital_product_id?: string
          file_id?: string
          file_title?: string | null
          id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      digital_product_files: {
        Row: {
          created_at: string
          digital_product_id: string
          download_count: number
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          is_sample: boolean
          sort_order: number
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          digital_product_id: string
          download_count?: number
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_sample?: boolean
          sort_order?: number
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          digital_product_id?: string
          download_count?: number
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_sample?: boolean
          sort_order?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_files_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_gift_courses: {
        Row: {
          course_id: string | null
          created_at: string
          digital_product_gift_id: string | null
          digital_product_id: string
          gift_kind: string
          id: string
          live_course_id: string | null
          tenant_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          digital_product_gift_id?: string | null
          digital_product_id: string
          gift_kind?: string
          id?: string
          live_course_id?: string | null
          tenant_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          digital_product_gift_id?: string | null
          digital_product_id?: string
          gift_kind?: string
          id?: string
          live_course_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_gift_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_gift_courses_digital_product_gift_id_fkey"
            columns: ["digital_product_gift_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_gift_courses_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_gift_courses_live_course_id_fkey"
            columns: ["live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_order_bumps: {
        Row: {
          bump_course_id: string | null
          bump_digital_product_id: string | null
          bump_live_course_id: string | null
          created_at: string
          description: string | null
          digital_product_id: string
          discount_price: number | null
          id: string
          is_enabled: boolean
          price: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          created_at?: string
          description?: string | null
          digital_product_id: string
          discount_price?: number | null
          id?: string
          is_enabled?: boolean
          price?: number
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          created_at?: string
          description?: string | null
          digital_product_id?: string
          discount_price?: number | null
          id?: string
          is_enabled?: boolean
          price?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_order_bumps_bump_course_id_fkey"
            columns: ["bump_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_order_bumps_bump_digital_product_id_fkey"
            columns: ["bump_digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_order_bumps_bump_live_course_id_fkey"
            columns: ["bump_live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_order_bumps_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: true
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_purchases: {
        Row: {
          amount_paid: number | null
          bump_amount: number | null
          bump_course_id: string | null
          bump_digital_product_id: string | null
          bump_live_course_id: string | null
          buyer_country: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          digital_product_id: string | null
          discount_amount: number
          gateway: string
          gateway_fee: number
          gross_amount: number
          has_order_bump: boolean
          id: string
          kashier_order_id: string | null
          mentor_net: number
          order_id: string | null
          payment_key: string | null
          payment_status: string
          paymob_order_id: string | null
          paymob_special_reference: string | null
          platform_fee: number
          settled_usd: number | null
          stripe_session_id: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          amount_paid?: number | null
          bump_amount?: number | null
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          buyer_country?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          digital_product_id?: string | null
          discount_amount?: number
          gateway?: string
          gateway_fee?: number
          gross_amount?: number
          has_order_bump?: boolean
          id?: string
          kashier_order_id?: string | null
          mentor_net?: number
          order_id?: string | null
          payment_key?: string | null
          payment_status?: string
          paymob_order_id?: string | null
          paymob_special_reference?: string | null
          platform_fee?: number
          settled_usd?: number | null
          stripe_session_id?: string | null
          student_id: string
          tenant_id: string
        }
        Update: {
          amount_paid?: number | null
          bump_amount?: number | null
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          buyer_country?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          digital_product_id?: string | null
          discount_amount?: number
          gateway?: string
          gateway_fee?: number
          gross_amount?: number
          has_order_bump?: boolean
          id?: string
          kashier_order_id?: string | null
          mentor_net?: number
          order_id?: string | null
          payment_key?: string | null
          payment_status?: string
          paymob_order_id?: string | null
          paymob_special_reference?: string | null
          platform_fee?: number
          settled_usd?: number | null
          stripe_session_id?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_purchases_bump_course_id_fkey"
            columns: ["bump_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_purchases_bump_digital_product_id_fkey"
            columns: ["bump_digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_purchases_bump_live_course_id_fkey"
            columns: ["bump_live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_purchases_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_purchases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_products: {
        Row: {
          adjectives: string | null
          announcement_text: string | null
          announcement_type: string | null
          banner_type: string | null
          banner_video_url: string | null
          buy_button_text: string | null
          card_button_text: string | null
          community_link: string | null
          created_at: string
          description: string | null
          display_order: number
          faqs: Json | null
          gift_courses_enabled: boolean
          guarantee_days: number
          guarantee_description: string | null
          guarantee_enabled: boolean
          guarantee_title: string | null
          has_certificate: boolean
          has_community: boolean
          has_individual_support: boolean
          has_lifetime_updates: boolean
          id: string
          is_published: boolean
          is_unlisted: boolean
          landing_dark_mode: boolean | null
          landing_features: Json | null
          landing_header: string | null
          landing_header_color: string | null
          landing_header_size: string | null
          landing_subheader: string | null
          landing_subheader_color: string | null
          landing_subheader_size: string | null
          price: number
          price_before_discount: number | null
          slug: string
          target_audience: string | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          adjectives?: string | null
          announcement_text?: string | null
          announcement_type?: string | null
          banner_type?: string | null
          banner_video_url?: string | null
          buy_button_text?: string | null
          card_button_text?: string | null
          community_link?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          faqs?: Json | null
          gift_courses_enabled?: boolean
          guarantee_days?: number
          guarantee_description?: string | null
          guarantee_enabled?: boolean
          guarantee_title?: string | null
          has_certificate?: boolean
          has_community?: boolean
          has_individual_support?: boolean
          has_lifetime_updates?: boolean
          id?: string
          is_published?: boolean
          is_unlisted?: boolean
          landing_dark_mode?: boolean | null
          landing_features?: Json | null
          landing_header?: string | null
          landing_header_color?: string | null
          landing_header_size?: string | null
          landing_subheader?: string | null
          landing_subheader_color?: string | null
          landing_subheader_size?: string | null
          price?: number
          price_before_discount?: number | null
          slug: string
          target_audience?: string | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          adjectives?: string | null
          announcement_text?: string | null
          announcement_type?: string | null
          banner_type?: string | null
          banner_video_url?: string | null
          buy_button_text?: string | null
          card_button_text?: string | null
          community_link?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          faqs?: Json | null
          gift_courses_enabled?: boolean
          guarantee_days?: number
          guarantee_description?: string | null
          guarantee_enabled?: boolean
          guarantee_title?: string | null
          has_certificate?: boolean
          has_community?: boolean
          has_individual_support?: boolean
          has_lifetime_updates?: boolean
          id?: string
          is_published?: boolean
          is_unlisted?: boolean
          landing_dark_mode?: boolean | null
          landing_features?: Json | null
          landing_header?: string | null
          landing_header_color?: string | null
          landing_header_size?: string | null
          landing_subheader?: string | null
          landing_subheader_color?: string | null
          landing_subheader_size?: string | null
          price?: number
          price_before_discount?: number | null
          slug?: string
          target_audience?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_id: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          student_id: string
          tenant_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_courses: {
        Row: {
          course_id: string | null
          created_at: string
          gift_course_id: string | null
          gift_digital_product_id: string | null
          gift_kind: string
          gift_live_course_id: string | null
          id: string
          live_course_id: string | null
          tenant_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          gift_course_id?: string | null
          gift_digital_product_id?: string | null
          gift_kind?: string
          gift_live_course_id?: string | null
          id?: string
          live_course_id?: string | null
          tenant_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          gift_course_id?: string | null
          gift_digital_product_id?: string | null
          gift_kind?: string
          gift_live_course_id?: string | null
          id?: string
          live_course_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_courses_gift_course_id_fkey"
            columns: ["gift_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_courses_gift_digital_product_id_fkey"
            columns: ["gift_digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_courses_gift_live_course_id_fkey"
            columns: ["gift_live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_courses_live_course_id_fkey"
            columns: ["live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_cron_secrets: {
        Row: {
          created_at: string
          name: string
          secret: string
        }
        Insert: {
          created_at?: string
          name: string
          secret: string
        }
        Update: {
          created_at?: string
          name?: string
          secret?: string
        }
        Relationships: []
      }
      international_withdrawal_settings: {
        Row: {
          account_type: string
          address: string
          bank_name: string
          beneficiary_name: string
          country_code: string
          created_at: string
          iban: string
          id: string
          id_back_url: string | null
          id_document_type: string
          id_front_url: string | null
          legal_name: string
          rejection_reason: string | null
          status: string
          swift_code: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          address: string
          bank_name: string
          beneficiary_name: string
          country_code: string
          created_at?: string
          iban: string
          id?: string
          id_back_url?: string | null
          id_document_type?: string
          id_front_url?: string | null
          legal_name: string
          rejection_reason?: string | null
          status?: string
          swift_code: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          address?: string
          bank_name?: string
          beneficiary_name?: string
          country_code?: string
          created_at?: string
          iban?: string
          id?: string
          id_back_url?: string | null
          id_document_type?: string
          id_front_url?: string | null
          legal_name?: string
          rejection_reason?: string | null
          status?: string
          swift_code?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "international_withdrawal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          student_id: string
          tenant_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_transcripts: {
        Row: {
          course_id: string
          created_at: string
          error: string | null
          id: string
          language: string | null
          lesson_id: string
          provider: string
          segments: Json | null
          status: string
          tenant_id: string
          transcript_text: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          error?: string | null
          id?: string
          language?: string | null
          lesson_id: string
          provider?: string
          segments?: Json | null
          status?: string
          tenant_id: string
          transcript_text?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          error?: string | null
          id?: string
          language?: string | null
          lesson_id?: string
          provider?: string
          segments?: Json | null
          status?: string
          tenant_id?: string
          transcript_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_transcripts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_transcripts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_transcripts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          audio_url: string | null
          content_type: string
          created_at: string
          description: string | null
          download_filename: string | null
          download_url: string | null
          duration_seconds: number | null
          embed_code: string | null
          file_name: string | null
          id: string
          image_url: string | null
          is_preview: boolean
          is_published: boolean
          pdf_url: string | null
          section_id: string
          sort_order: number
          tenant_id: string
          text_content: string | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          download_filename?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          embed_code?: string | null
          file_name?: string | null
          id?: string
          image_url?: string | null
          is_preview?: boolean
          is_published?: boolean
          pdf_url?: string | null
          section_id: string
          sort_order?: number
          tenant_id: string
          text_content?: string | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          download_filename?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          embed_code?: string | null
          file_name?: string | null
          id?: string
          image_url?: string | null
          is_preview?: boolean
          is_published?: boolean
          pdf_url?: string | null
          section_id?: string
          sort_order?: number
          tenant_id?: string
          text_content?: string | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      live_course_purchases: {
        Row: {
          amount_paid: number | null
          booking_date: string | null
          booking_time: string | null
          bump_amount: number
          bump_course_id: string | null
          bump_digital_product_id: string | null
          bump_live_course_id: string | null
          buyer_country: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          discount_amount: number
          gateway: string
          gateway_fee: number
          gross_amount: number
          has_order_bump: boolean
          id: string
          kashier_order_id: string | null
          live_course_id: string
          mentor_net: number
          payment_key: string | null
          payment_status: string
          paymob_order_id: string | null
          paymob_special_reference: string | null
          platform_fee: number
          settled_usd: number | null
          stripe_session_id: string | null
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          booking_date?: string | null
          booking_time?: string | null
          bump_amount?: number
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          buyer_country?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          gateway?: string
          gateway_fee?: number
          gross_amount?: number
          has_order_bump?: boolean
          id?: string
          kashier_order_id?: string | null
          live_course_id: string
          mentor_net?: number
          payment_key?: string | null
          payment_status?: string
          paymob_order_id?: string | null
          paymob_special_reference?: string | null
          platform_fee?: number
          settled_usd?: number | null
          stripe_session_id?: string | null
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          booking_date?: string | null
          booking_time?: string | null
          bump_amount?: number
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          buyer_country?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          gateway?: string
          gateway_fee?: number
          gross_amount?: number
          has_order_bump?: boolean
          id?: string
          kashier_order_id?: string | null
          live_course_id?: string
          mentor_net?: number
          payment_key?: string | null
          payment_status?: string
          paymob_order_id?: string | null
          paymob_special_reference?: string | null
          platform_fee?: number
          settled_usd?: number | null
          stripe_session_id?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_course_purchases_bump_course_id_fkey"
            columns: ["bump_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_course_purchases_bump_digital_product_id_fkey"
            columns: ["bump_digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_course_purchases_bump_live_course_id_fkey"
            columns: ["bump_live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_course_purchases_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_course_purchases_live_course_id_fkey"
            columns: ["live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_course_purchases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_course_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      live_course_sessions: {
        Row: {
          created_at: string
          duration_minutes: number
          google_event_id: string | null
          id: string
          live_course_id: string
          reminder_sent_at: string | null
          session_date: string
          session_time: string
          sort_order: number
          tenant_id: string
          title: string
          zoom_error: string | null
          zoom_generation_attempted_at: string | null
          zoom_generation_error: string | null
          zoom_join_url: string | null
          zoom_meeting_id: string | null
          zoom_start_url: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          live_course_id: string
          reminder_sent_at?: string | null
          session_date: string
          session_time: string
          sort_order?: number
          tenant_id: string
          title: string
          zoom_error?: string | null
          zoom_generation_attempted_at?: string | null
          zoom_generation_error?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_start_url?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          live_course_id?: string
          reminder_sent_at?: string | null
          session_date?: string
          session_time?: string
          sort_order?: number
          tenant_id?: string
          title?: string
          zoom_error?: string | null
          zoom_generation_attempted_at?: string | null
          zoom_generation_error?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_start_url?: string | null
        }
        Relationships: []
      }
      live_courses: {
        Row: {
          attendance_type: string | null
          banner_type: string | null
          banner_video_url: string | null
          booking_end_date: string | null
          booking_start_date: string | null
          booking_window_days: number | null
          buffer_slots: number
          buy_button_text: string | null
          capacity: number | null
          card_button_text: string | null
          community_link: string | null
          created_at: string
          description: string | null
          display_order: number
          faqs: Json
          gift_course_enabled: boolean
          has_certificate: boolean
          has_community: boolean
          has_individual_support: boolean
          has_lifetime_updates: boolean
          id: string
          is_free: boolean
          is_published: boolean
          is_unlisted: boolean
          landing_features: Json
          landing_header: string | null
          landing_header_color: string | null
          landing_header_size: string | null
          landing_subheader: string | null
          landing_subheader_color: string | null
          landing_subheader_size: string | null
          location_directions: string | null
          location_map_url: string | null
          location_name: string | null
          meeting_link: string | null
          min_lead_hours: number
          post_purchase_email_body: string | null
          post_purchase_email_subject: string | null
          price: number
          price_before_discount: number | null
          product_type: string
          schedule_id: string | null
          send_order_confirmation_email: boolean
          send_post_purchase_email: boolean
          session_duration_minutes: number | null
          sessions_count: number | null
          short_description: string | null
          slug: string
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attendance_type?: string | null
          banner_type?: string | null
          banner_video_url?: string | null
          booking_end_date?: string | null
          booking_start_date?: string | null
          booking_window_days?: number | null
          buffer_slots?: number
          buy_button_text?: string | null
          capacity?: number | null
          card_button_text?: string | null
          community_link?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          faqs?: Json
          gift_course_enabled?: boolean
          has_certificate?: boolean
          has_community?: boolean
          has_individual_support?: boolean
          has_lifetime_updates?: boolean
          id?: string
          is_free?: boolean
          is_published?: boolean
          is_unlisted?: boolean
          landing_features?: Json
          landing_header?: string | null
          landing_header_color?: string | null
          landing_header_size?: string | null
          landing_subheader?: string | null
          landing_subheader_color?: string | null
          landing_subheader_size?: string | null
          location_directions?: string | null
          location_map_url?: string | null
          location_name?: string | null
          meeting_link?: string | null
          min_lead_hours?: number
          post_purchase_email_body?: string | null
          post_purchase_email_subject?: string | null
          price?: number
          price_before_discount?: number | null
          product_type?: string
          schedule_id?: string | null
          send_order_confirmation_email?: boolean
          send_post_purchase_email?: boolean
          session_duration_minutes?: number | null
          sessions_count?: number | null
          short_description?: string | null
          slug: string
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attendance_type?: string | null
          banner_type?: string | null
          banner_video_url?: string | null
          booking_end_date?: string | null
          booking_start_date?: string | null
          booking_window_days?: number | null
          buffer_slots?: number
          buy_button_text?: string | null
          capacity?: number | null
          card_button_text?: string | null
          community_link?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          faqs?: Json
          gift_course_enabled?: boolean
          has_certificate?: boolean
          has_community?: boolean
          has_individual_support?: boolean
          has_lifetime_updates?: boolean
          id?: string
          is_free?: boolean
          is_published?: boolean
          is_unlisted?: boolean
          landing_features?: Json
          landing_header?: string | null
          landing_header_color?: string | null
          landing_header_size?: string | null
          landing_subheader?: string | null
          landing_subheader_color?: string | null
          landing_subheader_size?: string | null
          location_directions?: string | null
          location_map_url?: string | null
          location_name?: string | null
          meeting_link?: string | null
          min_lead_hours?: number
          post_purchase_email_body?: string | null
          post_purchase_email_subject?: string | null
          price?: number
          price_before_discount?: number | null
          product_type?: string
          schedule_id?: string | null
          send_order_confirmation_email?: boolean
          send_post_purchase_email?: boolean
          session_duration_minutes?: number | null
          sessions_count?: number | null
          short_description?: string | null
          slug?: string
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_courses_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "mentor_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_google_calendar_accounts: {
        Row: {
          app_user_id: string | null
          busy_sync_enabled: boolean
          calendar_id: string
          connected_at: string
          connection_api_key: string
          google_email: string
          id: string
          scopes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          app_user_id?: string | null
          busy_sync_enabled?: boolean
          calendar_id?: string
          connected_at?: string
          connection_api_key: string
          google_email: string
          id?: string
          scopes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          app_user_id?: string | null
          busy_sync_enabled?: boolean
          calendar_id?: string
          connected_at?: string
          connection_api_key?: string
          google_email?: string
          id?: string
          scopes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_google_calendar_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_pixels: {
        Row: {
          clarity_connected: boolean
          clarity_project_id: string | null
          created_at: string
          ga_connected: boolean
          ga_measurement_id: string | null
          gtm_connected: boolean
          gtm_container_id: string | null
          id: string
          meta_connected: boolean
          meta_pixel_id: string | null
          snap_connected: boolean
          snap_pixel_id: string | null
          tenant_id: string
          tiktok_connected: boolean
          tiktok_pixel_id: string | null
          updated_at: string
        }
        Insert: {
          clarity_connected?: boolean
          clarity_project_id?: string | null
          created_at?: string
          ga_connected?: boolean
          ga_measurement_id?: string | null
          gtm_connected?: boolean
          gtm_container_id?: string | null
          id?: string
          meta_connected?: boolean
          meta_pixel_id?: string | null
          snap_connected?: boolean
          snap_pixel_id?: string | null
          tenant_id: string
          tiktok_connected?: boolean
          tiktok_pixel_id?: string | null
          updated_at?: string
        }
        Update: {
          clarity_connected?: boolean
          clarity_project_id?: string | null
          created_at?: string
          ga_connected?: boolean
          ga_measurement_id?: string | null
          gtm_connected?: boolean
          gtm_container_id?: string | null
          id?: string
          meta_connected?: boolean
          meta_pixel_id?: string | null
          snap_connected?: boolean
          snap_pixel_id?: string | null
          tenant_id?: string
          tiktok_connected?: boolean
          tiktok_pixel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_pixels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_schedule_overrides: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          is_available: boolean
          schedule_id: string
          start_time: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          schedule_id: string
          start_time?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          schedule_id?: string
          start_time?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_schedule_overrides_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "mentor_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_schedule_slots: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          schedule_id: string
          start_time: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          schedule_id: string
          start_time: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          schedule_id?: string
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_schedule_slots_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "mentor_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_schedules: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          tenant_id: string
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          tenant_id: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          tenant_id?: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentor_zoom_accounts: {
        Row: {
          access_token: string
          connected_at: string
          id: string
          refresh_token: string
          scopes: string | null
          tenant_id: string
          token_expires_at: string
          updated_at: string
          zoom_account_name: string | null
          zoom_email: string
          zoom_user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          id?: string
          refresh_token: string
          scopes?: string | null
          tenant_id: string
          token_expires_at: string
          updated_at?: string
          zoom_account_name?: string | null
          zoom_email: string
          zoom_user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          id?: string
          refresh_token?: string
          scopes?: string | null
          tenant_id?: string
          token_expires_at?: string
          updated_at?: string
          zoom_account_name?: string | null
          zoom_email?: string
          zoom_user_id?: string
        }
        Relationships: []
      }
      notification_campaigns: {
        Row: {
          channel_bell: boolean
          channel_email: boolean
          created_at: string
          description: string | null
          email_body: string | null
          email_cta_text: string | null
          email_cta_url: string | null
          email_open_count: number
          email_subject: string | null
          icon_name: string
          id: string
          is_scheduled: boolean
          link_url: string | null
          scheduled_at: string | null
          sent_count: number
          status: string
          target_course_ids: string[] | null
          target_type: string
          tenant_id: string
          title: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          channel_bell?: boolean
          channel_email?: boolean
          created_at?: string
          description?: string | null
          email_body?: string | null
          email_cta_text?: string | null
          email_cta_url?: string | null
          email_open_count?: number
          email_subject?: string | null
          icon_name?: string
          id?: string
          is_scheduled?: boolean
          link_url?: string | null
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          target_course_ids?: string[] | null
          target_type?: string
          tenant_id: string
          title: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          channel_bell?: boolean
          channel_email?: boolean
          created_at?: string
          description?: string | null
          email_body?: string | null
          email_cta_text?: string | null
          email_cta_url?: string | null
          email_open_count?: number
          email_subject?: string | null
          icon_name?: string
          id?: string
          is_scheduled?: boolean
          link_url?: string | null
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          target_course_ids?: string[] | null
          target_type?: string
          tenant_id?: string
          title?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          body_en: string | null
          category: string
          created_at: string
          default_body: string
          default_subject: string
          description: string | null
          display_name: string
          enabled: boolean
          id: string
          is_system: boolean
          subject: string
          subject_en: string | null
          template_key: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          body_en?: string | null
          category: string
          created_at?: string
          default_body: string
          default_subject: string
          description?: string | null
          display_name: string
          enabled?: boolean
          id?: string
          is_system?: boolean
          subject: string
          subject_en?: string | null
          template_key: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          body_en?: string | null
          category?: string
          created_at?: string
          default_body?: string
          default_subject?: string
          description?: string | null
          display_name?: string
          enabled?: boolean
          id?: string
          is_system?: boolean
          subject?: string
          subject_en?: string | null
          template_key?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string
          id: string
          source: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          source?: string
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          source?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_bump_prices: {
        Row: {
          bump_id: string
          bump_kind: string
          country_code: string | null
          created_at: string
          currency: string
          discount_price: number | null
          id: string
          price: number
          tenant_id: string
        }
        Insert: {
          bump_id: string
          bump_kind: string
          country_code?: string | null
          created_at?: string
          currency?: string
          discount_price?: number | null
          id?: string
          price?: number
          tenant_id: string
        }
        Update: {
          bump_id?: string
          bump_kind?: string
          country_code?: string | null
          created_at?: string
          currency?: string
          discount_price?: number | null
          id?: string
          price?: number
          tenant_id?: string
        }
        Relationships: []
      }
      order_bumps: {
        Row: {
          bump_course_id: string | null
          bump_digital_product_id: string | null
          bump_live_course_id: string | null
          course_id: string | null
          created_at: string
          description: string | null
          discount_price: number | null
          id: string
          is_enabled: boolean
          live_course_id: string | null
          price: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          discount_price?: number | null
          id?: string
          is_enabled?: boolean
          live_course_id?: string | null
          price?: number
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          discount_price?: number | null
          id?: string
          is_enabled?: boolean
          live_course_id?: string | null
          price?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_bump_course_id_fkey"
            columns: ["bump_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_bump_digital_product_id_fkey"
            columns: ["bump_digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_bump_live_course_id_fkey"
            columns: ["bump_live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_live_course_id_fkey"
            columns: ["live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number | null
          bump_amount: number | null
          bump_course_id: string | null
          bump_digital_product_id: string | null
          bump_live_course_id: string | null
          buyer_country: string | null
          coupon_id: string | null
          course_id: string
          created_at: string
          currency: string
          gateway: string
          gateway_fee: number
          gross_amount: number
          has_order_bump: boolean
          id: string
          kashier_order_id: string | null
          mentor_net: number
          payment_key: string | null
          payment_status: string
          paymob_order_id: string | null
          paymob_special_reference: string | null
          platform_fee: number
          product_title: string | null
          settled_usd: number | null
          stripe_session_id: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          amount_paid?: number | null
          bump_amount?: number | null
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          buyer_country?: string | null
          coupon_id?: string | null
          course_id: string
          created_at?: string
          currency?: string
          gateway?: string
          gateway_fee: number
          gross_amount: number
          has_order_bump?: boolean
          id?: string
          kashier_order_id?: string | null
          mentor_net: number
          payment_key?: string | null
          payment_status?: string
          paymob_order_id?: string | null
          paymob_special_reference?: string | null
          platform_fee: number
          product_title?: string | null
          settled_usd?: number | null
          stripe_session_id?: string | null
          student_id: string
          tenant_id: string
        }
        Update: {
          amount_paid?: number | null
          bump_amount?: number | null
          bump_course_id?: string | null
          bump_digital_product_id?: string | null
          bump_live_course_id?: string | null
          buyer_country?: string | null
          coupon_id?: string | null
          course_id?: string
          created_at?: string
          currency?: string
          gateway?: string
          gateway_fee?: number
          gross_amount?: number
          has_order_bump?: boolean
          id?: string
          kashier_order_id?: string | null
          mentor_net?: number
          payment_key?: string | null
          payment_status?: string
          paymob_order_id?: string | null
          paymob_special_reference?: string | null
          platform_fee?: number
          product_title?: string | null
          settled_usd?: number | null
          stripe_session_id?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_bump_course_id_fkey"
            columns: ["bump_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_bump_digital_product_id_fkey"
            columns: ["bump_digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_bump_live_course_id_fkey"
            columns: ["bump_live_course_id"]
            isOneToOne: false
            referencedRelation: "live_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          country: string | null
          created_at: string
          device: string | null
          id: string
          os: string | null
          page_type: string | null
          path: string | null
          referrer: string | null
          session_id: string | null
          source: string | null
          tenant_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          os?: string | null
          page_type?: string | null
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          tenant_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          os?: string | null
          page_type?: string | null
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      payment_callback_log: {
        Row: {
          accepted: boolean
          amount_cents: number | null
          created_at: string
          id: string
          kind: string | null
          payload: Json | null
          paymob_order_id: string | null
          paymob_txn_id: string | null
          reason: string | null
          reference: string | null
          source: string
          success: boolean | null
        }
        Insert: {
          accepted?: boolean
          amount_cents?: number | null
          created_at?: string
          id?: string
          kind?: string | null
          payload?: Json | null
          paymob_order_id?: string | null
          paymob_txn_id?: string | null
          reason?: string | null
          reference?: string | null
          source: string
          success?: boolean | null
        }
        Update: {
          accepted?: boolean
          amount_cents?: number | null
          created_at?: string
          id?: string
          kind?: string | null
          payload?: Json | null
          paymob_order_id?: string | null
          paymob_txn_id?: string | null
          reason?: string | null
          reference?: string | null
          source?: string
          success?: boolean | null
        }
        Relationships: []
      }
      platform_announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "platform_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcements: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          created_by: string | null
          icon_name: string
          id: string
          link_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          icon_name?: string
          id?: string
          link_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          icon_name?: string
          id?: string
          link_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_feature_flags: {
        Row: {
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_prices: {
        Row: {
          compare_at_price: number | null
          country_code: string | null
          created_at: string
          currency: string
          id: string
          price: number
          product_id: string
          product_type: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          compare_at_price?: number | null
          country_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          price?: number
          product_id: string
          product_type: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          compare_at_price?: number | null
          country_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          price?: number
          product_id?: string
          product_type?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          student_id: string
          total_questions: number
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id: string
          score?: number
          student_id: string
          total_questions?: number
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          student_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          id: string
          question_text: string
          question_type: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          question_text: string
          question_type?: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          question_text?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          lesson_id: string
          pass_percentage: number
          tenant_id: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          lesson_id: string
          pass_percentage?: number
          tenant_id: string
          title?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          pass_percentage?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket_key: string
          hits: number
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          hits?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          bucket_key?: string
          hits?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          order_id: string
          reason: string
          refunded_at: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          order_id: string
          reason: string
          refunded_at?: string | null
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          reason?: string
          refunded_at?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          course_id: string | null
          created_at: string
          first_name: string
          id: string
          is_published: boolean
          last_name: string
          product_id: string | null
          product_type: string | null
          proof_type: string | null
          proof_url: string | null
          rating: number
          rating_v2: number | null
          rejection_reason: string | null
          tenant_id: string
          verification_status: string | null
        }
        Insert: {
          comment?: string | null
          course_id?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_published?: boolean
          last_name?: string
          product_id?: string | null
          product_type?: string | null
          proof_type?: string | null
          proof_url?: string | null
          rating?: number
          rating_v2?: number | null
          rejection_reason?: string | null
          tenant_id: string
          verification_status?: string | null
        }
        Update: {
          comment?: string | null
          course_id?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_published?: boolean
          last_name?: string
          product_id?: string | null
          product_type?: string | null
          proof_type?: string | null
          proof_url?: string | null
          rating?: number
          rating_v2?: number | null
          rejection_reason?: string | null
          tenant_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_content_restrictions: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          lifted_at: string | null
          reason: string | null
          scope: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          lifted_at?: string | null
          reason?: string | null
          scope?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          lifted_at?: string | null
          reason?: string | null
          scope?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_content_restrictions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          includes_digital_products: boolean
          is_active: boolean
          plan_type: string
          price: number
          qa_bot_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          includes_digital_products?: boolean
          is_active?: boolean
          plan_type?: string
          price?: number
          qa_bot_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          includes_digital_products?: boolean
          is_active?: boolean
          plan_type?: string
          price?: number
          qa_bot_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_purchases: {
        Row: {
          amount: number
          amount_paid: number | null
          buyer_country: string | null
          created_at: string
          currency: string
          expires_at: string
          gateway: string
          gateway_fee: number
          gateway_reference: string | null
          id: string
          mentor_net: number
          payment_key: string | null
          payment_status: string
          paymob_order_id: string | null
          paymob_special_reference: string | null
          plan_id: string
          platform_fee: number
          settled_usd: number | null
          starts_at: string
          stripe_session_id: string | null
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_paid?: number | null
          buyer_country?: string | null
          created_at?: string
          currency?: string
          expires_at: string
          gateway?: string
          gateway_fee?: number
          gateway_reference?: string | null
          id?: string
          mentor_net?: number
          payment_key?: string | null
          payment_status?: string
          paymob_order_id?: string | null
          paymob_special_reference?: string | null
          plan_id: string
          platform_fee?: number
          settled_usd?: number | null
          starts_at?: string
          stripe_session_id?: string | null
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          buyer_country?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          gateway?: string
          gateway_fee?: number
          gateway_reference?: string | null
          id?: string
          mentor_net?: number
          payment_key?: string | null
          payment_status?: string
          paymob_order_id?: string | null
          paymob_special_reference?: string | null
          plan_id?: string
          platform_fee?: number
          settled_usd?: number | null
          starts_at?: string
          stripe_session_id?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_purchases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_purchases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          bio: string | null
          bio_long: string | null
          certificate_mentor_short_name: boolean
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          dashboard_dark_mode: boolean
          dashboard_language: string
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean
          is_frozen: boolean
          is_withdrawal_frozen: boolean
          last_name: string | null
          name: string
          owner_id: string
          phone: string | null
          primary_color: string | null
          profile_image_url: string | null
          public_language: string
          show_reviews_on_profile: boolean
          slug: string
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_x: string | null
          social_youtube: string | null
          specialty: string | null
          subscriptions_enabled: boolean
          updated_at: string
          whatsapp_default_color: boolean
          whatsapp_number: string | null
        }
        Insert: {
          bio?: string | null
          bio_long?: string | null
          certificate_mentor_short_name?: boolean
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          dashboard_dark_mode?: boolean
          dashboard_language?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          is_frozen?: boolean
          is_withdrawal_frozen?: boolean
          last_name?: string | null
          name: string
          owner_id: string
          phone?: string | null
          primary_color?: string | null
          profile_image_url?: string | null
          public_language?: string
          show_reviews_on_profile?: boolean
          slug: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_x?: string | null
          social_youtube?: string | null
          specialty?: string | null
          subscriptions_enabled?: boolean
          updated_at?: string
          whatsapp_default_color?: boolean
          whatsapp_number?: string | null
        }
        Update: {
          bio?: string | null
          bio_long?: string | null
          certificate_mentor_short_name?: boolean
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          dashboard_dark_mode?: boolean
          dashboard_language?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          is_frozen?: boolean
          is_withdrawal_frozen?: boolean
          last_name?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          primary_color?: string | null
          profile_image_url?: string | null
          public_language?: string
          show_reviews_on_profile?: boolean
          slug?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_x?: string | null
          social_youtube?: string | null
          specialty?: string | null
          subscriptions_enabled?: boolean
          updated_at?: string
          whatsapp_default_color?: boolean
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          created_at: string
          currency: string
          description: string | null
          id: string
          order_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          order_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          order_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watch_progress: {
        Row: {
          duration_seconds: number
          id: string
          lesson_id: string
          position_seconds: number
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          duration_seconds?: number
          id?: string
          lesson_id: string
          position_seconds?: number
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          duration_seconds?: number
          id?: string
          lesson_id?: string
          position_seconds?: number
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_settings: {
        Row: {
          account_type: string | null
          address: string | null
          bank_name: string | null
          beneficiary_name: string | null
          created_at: string
          iban: string
          id: string
          legal_name: string
          national_id_back_url: string | null
          national_id_front_url: string | null
          national_id_image_url: string | null
          rejection_reason: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          bank_name?: string | null
          beneficiary_name?: string | null
          created_at?: string
          iban: string
          id?: string
          legal_name: string
          national_id_back_url?: string | null
          national_id_front_url?: string | null
          national_id_image_url?: string | null
          rejection_reason?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          address?: string | null
          bank_name?: string | null
          beneficiary_name?: string | null
          created_at?: string
          iban?: string
          id?: string
          legal_name?: string
          national_id_back_url?: string | null
          national_id_front_url?: string | null
          national_id_image_url?: string | null
          rejection_reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mentor_zoom_account_status: {
        Row: {
          connected_at: string | null
          scopes: string | null
          tenant_id: string | null
          token_expires_at: string | null
          updated_at: string | null
          zoom_account_name: string | null
          zoom_email: string | null
          zoom_user_id: string | null
        }
        Insert: {
          connected_at?: string | null
          scopes?: string | null
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          zoom_account_name?: string | null
          zoom_email?: string | null
          zoom_user_id?: string | null
        }
        Update: {
          connected_at?: string | null
          scopes?: string | null
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          zoom_account_name?: string | null
          zoom_email?: string | null
          zoom_user_id?: string | null
        }
        Relationships: []
      }
      public_consultation_taken_slots: {
        Row: {
          booking_date: string | null
          booking_time: string | null
          duration_minutes: number | null
          live_course_id: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      public_live_course_sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string | null
          live_course_id: string | null
          session_date: string | null
          session_time: string | null
          sort_order: number | null
          tenant_id: string | null
          title: string | null
          zoom_join_url: string | null
        }
        Relationships: []
      }
      public_mentor_pixels: {
        Row: {
          clarity_connected: boolean | null
          clarity_project_id: string | null
          ga_connected: boolean | null
          ga_measurement_id: string | null
          gtm_connected: boolean | null
          gtm_container_id: string | null
          meta_connected: boolean | null
          meta_pixel_id: string | null
          snap_connected: boolean | null
          snap_pixel_id: string | null
          tenant_id: string | null
          tiktok_connected: boolean | null
          tiktok_pixel_id: string | null
        }
        Insert: {
          clarity_connected?: boolean | null
          clarity_project_id?: string | null
          ga_connected?: boolean | null
          ga_measurement_id?: string | null
          gtm_connected?: boolean | null
          gtm_container_id?: string | null
          meta_connected?: boolean | null
          meta_pixel_id?: string | null
          snap_connected?: boolean | null
          snap_pixel_id?: string | null
          tenant_id?: string | null
          tiktok_connected?: boolean | null
          tiktok_pixel_id?: string | null
        }
        Update: {
          clarity_connected?: boolean | null
          clarity_project_id?: string | null
          ga_connected?: boolean | null
          ga_measurement_id?: string | null
          gtm_connected?: boolean | null
          gtm_container_id?: string | null
          meta_connected?: boolean | null
          meta_pixel_id?: string | null
          snap_connected?: boolean | null
          snap_pixel_id?: string | null
          tenant_id?: string | null
          tiktok_connected?: boolean | null
          tiktok_pixel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_pixels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_mentor_schedule_overrides: {
        Row: {
          date: string | null
          end_time: string | null
          id: string | null
          is_available: boolean | null
          schedule_id: string | null
          start_time: string | null
        }
        Relationships: []
      }
      public_mentor_schedule_slots: {
        Row: {
          day_of_week: number | null
          end_time: string | null
          id: string | null
          schedule_id: string | null
          start_time: string | null
        }
        Relationships: []
      }
      public_tenants: {
        Row: {
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          primary_color: string | null
          profile_image_url: string | null
          public_language: string | null
          show_reviews_on_profile: boolean | null
          slug: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_x: string | null
          social_youtube: string | null
          specialty: string | null
          subscriptions_enabled: boolean | null
          whatsapp_default_color: string | null
          whatsapp_number: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_coupon: { Args: { _coupon_id: string }; Returns: undefined }
      admin_list_coupons: {
        Args: never
        Returns: {
          code: string
          course_title: string
          created_at: string
          digital_product_title: string
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          is_active: boolean
          max_per_customer: number
          max_uses: number
          mentor_name: string
          mentor_slug: string
          tenant_id: string
          used_count: number
        }[]
      }
      admin_list_tenants: {
        Args: never
        Returns: {
          bio: string | null
          bio_long: string | null
          certificate_mentor_short_name: boolean
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          dashboard_dark_mode: boolean
          dashboard_language: string
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean
          is_frozen: boolean
          is_withdrawal_frozen: boolean
          last_name: string | null
          name: string
          owner_id: string
          phone: string | null
          primary_color: string | null
          profile_image_url: string | null
          public_language: string
          show_reviews_on_profile: boolean
          slug: string
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_x: string | null
          social_youtube: string | null
          specialty: string | null
          subscriptions_enabled: boolean
          updated_at: string
          whatsapp_default_color: boolean
          whatsapp_number: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tenants"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_set_coupon_active: {
        Args: { _coupon_id: string; _is_active: boolean }
        Returns: undefined
      }
      admin_tenant_owner_emails: {
        Args: never
        Returns: {
          email: string
          owner_id: string
          tenant_id: string
        }[]
      }
      admin_usd_balances: {
        Args: never
        Returns: {
          tenant_id: string
          usd_balance: number
        }[]
      }
      check_rate_limit: {
        Args: { _key: string; _max_hits: number; _window_seconds: number }
        Returns: boolean
      }
      find_upcoming_consultation_reminders: {
        Args: { _win_end: string; _win_start: string }
        Returns: {
          booking_date: string
          booking_time: string
          duration_minutes: number
          id: string
          live_course_id: string
          meeting_link: string
          student_id: string
          tenant_id: string
          zoom_start_url: string
        }[]
      }
      find_upcoming_live_session_reminders: {
        Args: { _win_end: string; _win_start: string }
        Returns: {
          duration_minutes: number
          id: string
          live_course_id: string
          session_date: string
          session_time: string
          tenant_id: string
          title: string
          zoom_join_url: string
          zoom_start_url: string
        }[]
      }
      get_certificate_mentor_name: {
        Args: { _tenant_id: string }
        Returns: string
      }
      get_my_gcal_account: {
        Args: never
        Returns: {
          busy_sync_enabled: boolean
          calendar_id: string
          connected_at: string
          google_email: string
        }[]
      }
      get_my_tenant_pii: {
        Args: never
        Returns: {
          city: string
          country: string
          email: string
          first_name: string
          last_name: string
          phone: string
        }[]
      }
      get_preview_lesson: {
        Args: { _lesson_id: string }
        Returns: {
          audio_url: string
          content_type: string
          embed_code: string
          id: string
          image_url: string
          pdf_url: string
          text_content: string
          thumbnail_url: string
          title: string
          video_url: string
        }[]
      }
      get_public_course_curriculum: {
        Args: { _course_id: string }
        Returns: {
          content_type: string
          duration_seconds: number
          id: string
          is_preview: boolean
          section_id: string
          sort_order: number
          title: string
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_my_capture_history: {
        Args: { _student_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_used_count: {
        Args: { _coupon_id: string }
        Returns: undefined
      }
      increment_dp_file_download: {
        Args: { _file_id: string }
        Returns: undefined
      }
      is_tenant_slug_available: { Args: { _slug: string }; Returns: boolean }
      match_course_chunks: {
        Args: {
          _course_id: string
          _match_count?: number
          _query_embedding: string
        }
        Returns: {
          chunk_text: string
          end_time: number
          id: string
          lesson_id: string
          similarity: number
          source_type: string
          start_time: number
        }[]
      }
      public_consultation_taken_slots_src: {
        Args: never
        Returns: {
          booking_date: string
          booking_time: string
          duration_minutes: number
          live_course_id: string
          status: string
          tenant_id: string
        }[]
      }
      public_mentor_schedule_overrides_src: {
        Args: never
        Returns: {
          date: string
          end_time: string
          id: string
          is_available: boolean
          schedule_id: string
          start_time: string
        }[]
      }
      public_mentor_schedule_slots_src: {
        Args: never
        Returns: {
          day_of_week: number
          end_time: string
          id: string
          schedule_id: string
          start_time: string
        }[]
      }
      public_tenants_src: {
        Args: never
        Returns: {
          bio: string
          cover_image_url: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          primary_color: string
          profile_image_url: string
          public_language: string
          show_reviews_on_profile: boolean
          slug: string
          social_facebook: string
          social_instagram: string
          social_linkedin: string
          social_tiktok: string
          social_x: string
          social_youtube: string
          specialty: string
          subscriptions_enabled: boolean
          whatsapp_default_color: string
          whatsapp_number: string
        }[]
      }
      purge_stale_rate_limits: { Args: never; Returns: undefined }
      qa_call_edge: { Args: { _body: Json; _fn: string }; Returns: undefined }
      record_purchase_transactions:
        | {
            Args: {
              _description: string
              _gateway_fee: number
              _gross: number
              _order_id: string
              _platform_fee: number
              _tenant_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _currency: string
              _description: string
              _gateway_fee: number
              _gross: number
              _order_id: string
              _platform_fee: number
              _tenant_id: string
            }
            Returns: undefined
          }
      set_my_gcal_busy_sync: { Args: { _enabled: boolean }; Returns: undefined }
      toggle_digital_product_publish: {
        Args: { _id: string; _is_published: boolean }
        Returns: undefined
      }
      update_digital_product: {
        Args: {
          _adjectives?: string
          _banner_type?: string
          _banner_video_url?: string
          _buy_button_text?: string
          _card_button_text?: string
          _community_link?: string
          _description?: string
          _display_order?: number
          _faqs?: Json
          _gift_courses_enabled?: boolean
          _guarantee_days?: number
          _guarantee_description?: string
          _guarantee_enabled?: boolean
          _guarantee_title?: string
          _has_community?: boolean
          _has_individual_support?: boolean
          _has_lifetime_updates?: boolean
          _id: string
          _is_published?: boolean
          _is_unlisted?: boolean
          _landing_features?: Json
          _landing_header?: string
          _landing_header_color?: string
          _landing_header_size?: string
          _landing_subheader?: string
          _landing_subheader_color?: string
          _landing_subheader_size?: string
          _price?: number
          _price_before_discount?: number
          _slug?: string
          _target_audience?: string
          _thumbnail_url?: string
          _title?: string
        }
        Returns: undefined
      }
      update_digital_product_file_title: {
        Args: { _id: string; _title: string }
        Returns: undefined
      }
      update_digital_product_order: {
        Args: { _display_order: number; _id: string }
        Returns: undefined
      }
      verify_certificate: {
        Args: { cert_code: string }
        Returns: {
          certificate_code: string
          completion_date: string
          course_title: string
          mentor_name: string
          mentor_slug: string
          student_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "mentor" | "student"
      transaction_category:
        | "purchase"
        | "subscription"
        | "commission"
        | "gateway_fee"
        | "withdrawal"
        | "refund"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "mentor", "student"],
      transaction_category: [
        "purchase",
        "subscription",
        "commission",
        "gateway_fee",
        "withdrawal",
        "refund",
      ],
    },
  },
} as const
