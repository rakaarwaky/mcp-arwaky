import { useLoaderData, useSearchParams, useNavigation, useSubmit, useActionData } from 'react-router';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import type { Email, EmailId, SanitizedUser } from '$taxonomy';
import { useToast } from '../context/ToastContext';
import type { InboxListOutput, EmailActionOutput } from '$contract';
import { useIsMobile } from './use_is_mobile';

export function useInbox() {
  const { emails, isAdmin, isMobileInitial, hasMore } = useLoaderData() as InboxListOutput & { isAdmin: boolean; currentUser: SanitizedUser; isMobileInitial: boolean; hasMore: boolean };
  const actionData = useActionData() as (EmailActionOutput & { error?: string }) | undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('f') || 'all';
  const navigation = useNavigation();
  const submit = useSubmit();
  const { showToast } = useToast();
  const [pendingActionId, setPendingActionId] = useState<EmailId | null>(null);
  
  const tableHeadingRef = useRef<HTMLTableHeaderCellElement>(null);
  const mobileHeadingRef = useRef<HTMLHeadingElement>(null);
  const emptyHeadingRef = useRef<HTMLHeadingElement>(null);
  
  const isLoading = navigation.state === 'loading';
  const isMobile = useIsMobile(isMobileInitial);

  // Define derived state IMMEDIATELY after primary state/hooks
  const filtered = useMemo(() => {
    return (emails || []).filter(e => {
      if (filter === 'unread') return e.status === 'unread';
      if (filter === 'starred') return e.isStarred;
      return true;
    });
  }, [emails, filter]);

  const counts = useMemo(() => ({
    all: (emails || []).length,
    unread: (emails || []).filter(e => e.status === 'unread').length,
    starred: (emails || []).filter(e => e.isStarred).length
  }), [emails]);

  // Toast for action results + robust focus management
  useEffect(() => {
    if (actionData?.updated) {
      showToast(`Inbox updated successfully`, 'success');
      setPendingActionId(null);

      const timer = setTimeout(() => {
        // Select target heading based on current UI state (empty vs list, mobile vs desktop)
        const hasEmails = filtered && filtered.length > 0;
        const targetRef = hasEmails
          ? (isMobile ? mobileHeadingRef : tableHeadingRef)
          : emptyHeadingRef;
        
        if (targetRef.current) {
          targetRef.current.focus();
        }
      }, 50);

      return () => clearTimeout(timer);
    } else if (actionData?.error) {
      showToast(actionData.error, 'error');
      setPendingActionId(null);
    }
  }, [actionData, showToast, filtered.length, isMobile]);

  const handleAction = useCallback((id: EmailId, action: string) => {
    if (pendingActionId) return;
    setPendingActionId(id);
    const formData = new FormData();
    formData.append('id', id);
    formData.append('action', action);
    submit(formData, { method: 'post' });
  }, [submit, pendingActionId]);

  return {
    emails,
    isAdmin,
    filter,
    setSearchParams,
    isLoading,
    isMobile,
    filtered,
    counts,
    handleAction,
    hasMore,
    pendingActionId,
    tableHeadingRef,
    mobileHeadingRef,
    emptyHeadingRef
  };
}
