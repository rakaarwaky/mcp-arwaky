import { useLoaderData, useNavigate, useSubmit, useNavigation, useActionData, useFetcher } from 'react-router';
import type { Email } from '$taxonomy';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useEffect, useRef, useCallback } from 'react';
import type { EmailGetOutput, EmailActionOutput } from '$contract';

export function useEmail() {
  const { email, error } = useLoaderData() as EmailGetOutput & { error: string | null };
  const actionData = useActionData() as (EmailActionOutput & { error?: string }) | undefined;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const submit = useSubmit();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const isSubmitting = navigation.state === 'submitting';
  const lastIntent = (navigation.formData?.get('intent') as string) ?? '';

  // Track which email ID has been marked as read to prevent duplicate submissions
  const markedEmailIdRef = useRef<string | null>(null);

  const handleAction = useCallback(async (intent: string) => {
    if (intent === 'delete') {
      const isConfirmed = await confirm({
        title: 'Delete Email',
        message: 'Are you sure you want to delete this email permanently?',
        confirmText: 'Delete',
        type: 'danger'
      });
      if (!isConfirmed) return;
    }

    const formData = new FormData();
    formData.append('intent', intent);
    submit(formData, { method: 'post' });
  }, [confirm, submit]);

  // Mark as read automatically when viewed
  useEffect(() => {
    if (email && email.status === 'unread' && email.id !== markedEmailIdRef.current) {
      const timer = setTimeout(() => {
        const formData = new FormData();
        formData.append('intent', 'mark_read');
        fetcher.submit(formData, { method: 'post' });
        markedEmailIdRef.current = email.id;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [email?.status, email?.id, email, fetcher]);

  // Toast for action results
  useEffect(() => {
    if (actionData?.updated) {
      if (lastIntent === 'delete') {
        showToast('Email deleted successfully', 'success');
        navigate('/inbox');
      } else {
        showToast(`Email updated successfully`, 'success');
      }
    }
    if (actionData?.error) {
      showToast(actionData.error, 'error');
    }
  }, [actionData, showToast, navigate, lastIntent]);

  return {
    email,
    error,
    isSubmitting,
    handleAction,
    navigate,
    showToast
  };
}
