import { useLoaderData, useActionData, useNavigation, useSubmit, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import type { SanitizedUser, Account, ApiOperationSuccess } from '$taxonomy';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import type { UserGetOutput, GetAccountOutput, UserUpdateOutput, CreateAccountOutput, UserDeleteOutput } from '$contract';

export function useUserEdit() {
  const { user, account } = useLoaderData() as UserGetOutput & GetAccountOutput;
  const actionData = useActionData() as (UserUpdateOutput & CreateAccountOutput & UserDeleteOutput & { error?: string, ok?: ApiOperationSuccess, info?: string, message?: string }) | undefined;
  const navigation = useNavigation();
  const submit = useSubmit();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);

  const isSaving = navigation.state === 'submitting' && navigation.formData?.get('intent') === 'save';

  useEffect(() => {
    if (actionData?.ok && actionData.message) showToast(actionData.message, 'success');
    if (actionData?.ok && actionData.info) showToast(actionData.info, 'info');
    if (actionData?.error) showToast(actionData.error, 'error');
  }, [actionData, showToast]);

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete ${user?.email.full || 'this user'}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!ok) return;

    const formData = new FormData();
    formData.append('intent', 'delete');
    submit(formData, { method: 'post' });
  };

  return {
    user,
    account,
    isSaving,
    showApiKey,
    setShowApiKey,
    handleDelete,
    navigate,
    showToast,
    navigation
  };
}
