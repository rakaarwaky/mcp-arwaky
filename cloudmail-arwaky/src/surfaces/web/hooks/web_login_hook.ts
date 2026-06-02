import { useActionData, useNavigate, useNavigation } from 'react-router';
import { useAuth } from '../lib/auth';
import { useToast } from '../context/ToastContext';
import { useEffect } from 'react';

interface LoginActionData {
  error?: string;
  values?: { email: string };
}

export function useLogin() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const actionData = useActionData() as LoginActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  // Redirect if already authenticated
  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  // Show toast on action error
  useEffect(() => {
    if (actionData?.error) {
      showToast(actionData.error, 'error');
    }
  }, [actionData, showToast]);

  return {
    actionData,
    isSubmitting
  };
}
