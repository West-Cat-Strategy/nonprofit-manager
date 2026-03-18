/**
 * @deprecated Import people route components from the owning feature `routeComponents.tsx` files.
 * This root route surface remains as a thin compatibility facade for tests and tooling.
 */
export {
  AccountCreate,
  AccountDetail,
  AccountEdit,
  AccountList,
} from '../features/accounts/routeComponents';
export {
  ContactCreate,
  ContactDetail,
  ContactEdit,
  ContactList,
} from '../features/contacts/routeComponents';
export {
  AssignmentCreate,
  AssignmentEdit,
  VolunteerCreate,
  VolunteerDetail,
  VolunteerEdit,
  VolunteerList,
} from '../features/volunteers/routeComponents';
