import { useState } from 'react'
import type { OwedBlockView } from './finances-view'

// specs/finances-member-advances.md A6 — which member rows are unfolded. Folded
// by default, except when there is ONE member only (unfolded outright). Pure UI
// state: the amounts and the order come from the domain rule through the view.
export function useOwedBlockViewModel(view: OwedBlockView) {
  const [toggled, setToggled] = useState<Set<string>>(new Set())
  const isOnlyMember = view.members.length === 1

  return {
    isExpanded: (userId: string) => (isOnlyMember ? true : toggled.has(userId)),
    toggle: (userId: string) => {
      if (isOnlyMember) return
      setToggled((current) => {
        const next = new Set(current)
        if (next.has(userId)) next.delete(userId)
        else next.add(userId)
        return next
      })
    },
  }
}
