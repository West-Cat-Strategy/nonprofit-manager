/**
 * MODULE-OWNERSHIP: contacts route preload boundary
 *
 * Route preload helpers for contact routes must resolve through feature ownership.
 */

export const preloadContactsPeopleRoute = (): Promise<unknown[]> =>
  Promise.all([
    import('./pages/ContactListPage'),
    import('./pages/ContactDetailPage'),
    import('./pages/ContactCreatePage'),
    import('./pages/ContactPrintPage'),
  ]);
