export const preloadContactsPeopleRoute = (): Promise<unknown[]> =>
  Promise.all([
    import('../features/contacts/pages/ContactListPage'),
    import('../features/contacts/pages/ContactDetailPage'),
    import('../features/contacts/pages/ContactCreatePage'),
  ]);
