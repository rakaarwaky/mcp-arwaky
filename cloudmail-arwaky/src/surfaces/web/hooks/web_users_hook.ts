import { useLoaderData, useActionData, useNavigation, useSubmit, useNavigate } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import type { SanitizedUser, ApiOperationSuccess, Deleted } from '$taxonomy';
import type { UserListOutput, UserCreateOutput, UserDeleteOutput } from '$contract';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

export function useUsers() {
  const { users } = useLoaderData() as UserListOutput;
  const actionData = useActionData() as (UserCreateOutput | UserDeleteOutput | { error?: string }) & { timestamp?: number } | undefined;
  const navigation = useNavigation();
  const submit = useSubmit();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isCreating = navigation.state === 'submitting' && navigation.formData?.get('intent') === 'create';

  // Clear form on success
  useEffect(() => {
    if (actionData && 'ok' in actionData && actionData.ok && (actionData as any).credentials) {
      formRef.current?.reset();
      showToast('User provisioned successfully', 'success');
    }
    if (actionData && 'error' in actionData && actionData.error) {
      showToast(actionData.error, 'error');
      setDeletingId(null);
    }
    if (actionData && 'deleted' in actionData && actionData.deleted) {
      showToast('User access revoked', 'success');
      setDeletingId(null);
    }
  }, [actionData, showToast]);

  const handleDelete = async (id: string, email: string) => {
    if (deletingId) return;
    const ok = await confirm({
      title: 'Revoke Access',
      message: `Are you sure you want to permanently delete ${email}?`,
      confirmText: 'Revoke Access',
      type: 'danger'
    });
    if (!ok) return;

    setDeletingId(id);
    const formData = new FormData();
    formData.append('intent', 'delete');
    formData.append('id', id);
    submit(formData, { method: 'post' });
  };

  return {
    users,
    actionData,
    isCreating,
    deletingId,
    handleDelete,
    navigate,
    showToast,
    formRef
  };
}
