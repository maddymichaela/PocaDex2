import { Plus } from 'lucide-react';
import { Photocard } from '../types';
import { getCollectionMatchState, getPhotocardMatchId } from '../lib/ownership';

interface PublicCardActionProps {
  card: Photocard;
  currentUserId?: string | null;
  ownPhotocards: Photocard[];
  onAddToCollection?: (card: Photocard) => void;
  onRequireAuth?: () => void;
  className?: string;
}

export function getPublicCardActionState(
  card: Photocard,
  currentUserId: string | null | undefined,
  ownPhotocards: Photocard[],
) {
  return getCollectionMatchState(card, ownPhotocards, currentUserId);
}

export default function PublicCardAction({
  card,
  currentUserId,
  ownPhotocards,
  onAddToCollection,
  onRequireAuth,
  className = '',
}: PublicCardActionProps) {
  const actionState = getPublicCardActionState(card, currentUserId, ownPhotocards);
  const cardOwnerId = card.ownerUserId ?? (card as Photocard & { user_id?: unknown; userId?: unknown }).user_id ?? (card as Photocard & { userId?: unknown }).userId;

  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    console.debug('[PocaDex global search layout/action debug]', {
      cardId: card.id,
      cardOwnerId,
      currentUserId,
      matchId: getPhotocardMatchId(card),
      isOwnCard: actionState.isOwner,
      alreadyInCollection: actionState.alreadyInCollection,
      matchType: actionState.matchType,
      renderedActionLabel: actionState.actionLabel,
      cardHeightClassComponentUsed: 'PhotocardCard shared binder layout footer action',
    });
  }

  return (
    <button
      type="button"
      disabled={actionState.isTrackedInBinder}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (actionState.isTrackedInBinder) return;
        if (actionState.requiresAuth) {
          onRequireAuth?.();
          return;
        }
        onAddToCollection?.(card);
      }}
      className={`flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 border-primary/25 bg-white px-2 text-[8px] font-black uppercase tracking-widest text-primary shadow-sm transition-all hover:bg-primary hover:text-white disabled:border-primary/15 disabled:bg-white disabled:text-primary disabled:opacity-70 ${className}`}
    >
      {!actionState.isTrackedInBinder && <Plus size={13} />}
      <span className="truncate">{actionState.actionLabel}</span>
    </button>
  );
}
