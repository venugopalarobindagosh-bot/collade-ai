import { supabase } from './supabaseClient';
import { getCurrentUser } from '@/lib/auth';

const TABLE_MAP = {
  UserCredit: 'user_credits',
  UserSkill: 'user_skill',
  UserAchievement: 'user_achievement',
  MentorPost: 'mentor_post',
  PostReply: 'post_reply',
};

function parseOrder(orderStr) {
  if (!orderStr) return { column: 'created_at', ascending: false };
  const desc = orderStr.startsWith('-');
  const field = orderStr.replace(/^-/, '');
  const columnMap = { created_date: 'created_at', updated_date: 'updated_at' };
  return { column: columnMap[field] || field, ascending: !desc };
}

function normalizeRecord(record) {
  if (!record) return record;
  return { ...record, created_date: record.created_at };
}

function createEntity(tableName) {
  return {
    async filter(filters = {}, order = '-created_at', limit = null) {
      let query = supabase.from(tableName).select('*');
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      const { column, ascending } = parseOrder(order);
      query = query.order(column, { ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(normalizeRecord);
    },

    async list(order = '-created_at', limit = null) {
      return this.filter({}, order, limit);
    },

    async create(record) {
      const user = await getCurrentUser();
      const row = {
        ...record,
        ...(user?.email ? { created_by: user.email } : {}),
        ...(user?.id ? { user_id: user.id } : {}),
      };
      const { data, error } = await supabase.from(tableName).insert(row).select().single();
      if (error) throw error;
      return normalizeRecord(data);
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return normalizeRecord(data);
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

export const entities = Object.fromEntries(
  Object.entries(TABLE_MAP).map(([name, table]) => [name, createEntity(table)])
);
