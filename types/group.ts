export type GroupMemberRole = 'member' | 'leader' | 'admin';

export type PrayerGroup = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  member_id: string;
  user_id: string;
  display_name: string | null;
  role: GroupMemberRole;
  joined_at: string;
};

export type GroupInvite = {
  id: string;
  group_id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
};

export type GroupWithMeta = PrayerGroup & {
  member_count?: number;
  my_role?: GroupMemberRole;
};
