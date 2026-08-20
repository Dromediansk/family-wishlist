/**
 * How many groups one account may bring into existence. Counted on
 * `groups.created_by`, so leaving a group does not give the budget back.
 *
 * Insurance against an abuse vector the invite-only plan does not have yet,
 * which is why it is a constant rather than a setting.
 * docs/content/groups.md#the-creation-cap
 */
export const MAX_GROUPS_PER_ACCOUNT = 5;
