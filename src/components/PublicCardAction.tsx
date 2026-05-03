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
      disabled={actionState.inCollection}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (actionState.inCollection) return;
        if (actionState.requiresAuth) {
          onRequireAuth?.();
          return;
        }
        onAddToCollection?.(card);
      }}
      className={`flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-primary px-2 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all disabled:bg-white disabled:text-primary disabled:ring-2 disabled:ring-primary/15 ${className}`}
    >
      {!actionState.inCollection && <Plus size={13} />}
      {actionState.actionLabel}
    </button>
  );
}
