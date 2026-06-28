export type CareActionType =
  | 'call'
  | 'visit'
  | 'meal'
  | 'financial_help'
  | 'transportation'
  | 'custom';

export type CareActionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type CareActionAssignee = {
  id: string;
  care_action_id: string;
  user_id: string | null;
  external_name: string | null;
  is_primary: boolean;
};

export type CareAction = {
  id: string;
  prayer_id: string;
  created_by: string;
  action_type: CareActionType;
  custom_label: string | null;
  due_date: string | null;
  status: CareActionStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  care_action_assignees: CareActionAssignee[];
};

export type PraiseReport = {
  id: string;
  prayer_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type CreateCareActionInput = {
  prayerId: string;
  actionType: CareActionType;
  customLabel?: string;
  assigneeName?: string;
  dueDate?: string | null;
  notes?: string;
};
