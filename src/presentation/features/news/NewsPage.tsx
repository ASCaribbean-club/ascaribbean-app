import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { NewsFeed } from './components/NewsFeed'
import { NewsManagementPage } from './NewsManagementPage'

// Dispatcher only (no business logic): the Actus tab is the read-only feed for
// every role, except in the Dirigeant view where it becomes the mobile
// writing console (specs/mobile-dirigeant-habilite.md §1.3, AC-DH-22).
// `isOfficerView` also requires the account to really hold the role
// (AC-DH-03).
export function NewsPage() {
  const { isOfficerView } = useActiveRole()
  return isOfficerView ? <NewsManagementPage /> : <NewsFeed />
}
