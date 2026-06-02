import { useLoaderData, useActionData, useNavigation, useSubmit } from 'react-router';
import { useEffect, useState } from 'react';
import type { WorkerSettingsGetOutput, WorkerSettingsUpdateOutput, CleanupOutput } from '$contract';
import type { ApiOperationSuccess, ErrorMessage } from '$taxonomy';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

export function useSettings() {
  const settingsData = useLoaderData() as WorkerSettingsGetOutput;
  const actionData = useActionData() as (WorkerSettingsUpdateOutput & CleanupOutput & { error?: string, intent?: string, message?: string }) | undefined;
  const navigation = useNavigation();
  const submit = useSubmit();
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');

  const isSaving = navigation.state !== 'idle';
  const activeIntent = navigation.formData?.get('intent');

  useEffect(() => {
    if (actionData) {
      if (actionData.error) {
        showToast(actionData.error, 'error');
      } else if (actionData.ok) {
        showToast(actionData.message || 'Success', 'success');
        if (actionData.intent === 'save_setting') {
          setEditKey('');
          setEditValue('');
        }
      }
    }
  }, [actionData, showToast]);

  const handleCleanup = async () => {
    const ok = await confirm({
      title: 'System Cleanup',
      message: 'Remove expired emails and sessions from the database?',
      confirmText: 'Run Cleanup',
      type: 'warning'
    });
    if (ok) {
      const formData = new FormData();
      formData.append('intent', 'cleanup');
      submit(formData, { method: 'post' });
    }
  };

  const configGroups = [
    { title: 'Network & Auth', keys: ['CMF_API_BASE_URL', 'USER_EMAIL_DOMAIN', 'MAILFLARE_USER_DOMAIN'] },
    { title: 'Identity & Admin', keys: ['ADMIN_DISPLAY_NAME', 'ADMIN_EMAIL'] },
    { title: 'System Quotas', keys: ['QUOTA_MAX_EMAILS', 'QUOTA_MAX_INBOXES', 'QUOTA_MAX_RPM', 'CLEANUP_MAX_AGE_HOURS', 'CMF_QUOTA_MAX_EMAILS', 'CMF_QUOTA_MAX_INBOXES', 'RATE_LIMIT_DEFAULT', 'RATE_LIMIT_WINDOW', 'SESSION_MAX_AGE'] }
  ];

  return {
    settings: settingsData,
    editKey,
    setEditKey,
    editValue,
    setEditValue,
    isSaving,
    activeIntent,
    handleCleanup,
    configGroups
  };
}
