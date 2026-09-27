import type { SelectOption } from '@/components/ui/SelectField';

/** Maps to `prayers.creator_keeps_personal` for group prayers. */
export type GroupVisibility = 'group_and_me' | 'group_only';

export function toGroupVisibility(creatorKeepsPersonal: boolean): GroupVisibility {
  return creatorKeepsPersonal ? 'group_and_me' : 'group_only';
}

export function groupVisibilityOptions(groupName?: string | null): SelectOption<GroupVisibility>[] {
  const everyone = groupName ? `Everyone in ${groupName}` : 'Everyone in the group';
  return [
    {
      value: 'group_and_me',
      label: everyone,
      description: 'Members see it on their Today list, and it stays on yours too.',
    },
    {
      value: 'group_only',
      label: `${everyone} · group list only`,
      description:
        'Members see it on their Today list. For you, it lives in the group instead of your personal Today list.',
    },
  ];
}

export function describeGroupVisibility(creatorKeepsPersonal: boolean, groupName?: string | null): string {
  const option = groupVisibilityOptions(groupName).find(
    (item) => item.value === toGroupVisibility(creatorKeepsPersonal),
  );
  return option?.label ?? 'Everyone in the group';
}
