export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          username?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      lists: {
        Row: {
          id: string;
          name: string;
          emoji: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          emoji?: string;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          emoji?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lists_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      list_members: {
        Row: {
          list_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          list_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "list_members_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "list_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      items: {
        Row: {
          id: string;
          list_id: string;
          title: string;
          category: string | null;
          added_by: string | null;
          completed: boolean;
          completed_at: string | null;
          total_votes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          title: string;
          category?: string | null;
          added_by?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          total_votes?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          category?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          total_votes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          }
        ];
      };
      votes: {
        Row: {
          id: string;
          item_id: string;
          user_id: string;
          list_id: string;
          voted_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          user_id: string;
          list_id: string;
          voted_date?: string;
          created_at?: string;
        };
        Update: {
          voted_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_profile_by_email: {
        Args: { lookup_email: string };
        Returns: { id: string; username: string }[];
      };
      get_list_owner_id: {
        Args: { p_list_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type List = Database["public"]["Tables"]["lists"]["Row"];
export type ListMember = Database["public"]["Tables"]["list_members"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type Vote = Database["public"]["Tables"]["votes"]["Row"];
