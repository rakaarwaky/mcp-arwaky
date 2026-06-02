import { redirect } from 'react-router';
import { asUserId, asName, asPassword, createEmailAddress, asServiceProvider, asInboxId, SUCCESS, ACTION_UPDATED } from '$taxonomy';
import type { User, EmailAddress, Name, Password, SanitizedUser, ApiOperationSuccess } from '$taxonomy';
import { getUserApi, updateUserApi, deleteUserApi, listAccountsApi, createAccountApi } from '../lib/web_api_barrel';
import { useUserEdit } from '../hooks/web_useredit_hook';
import UserEditView from '../components/UserEditView';
import Layout from '../components/Layout';
import type { UserGetOutput, GetAccountOutput, UserUpdateOutput, CreateAccountOutput, UserDeleteOutput } from '$contract';
import type { AppContext } from '../root';

export async function loader({ params, request, context }: { params: { userId: string }, request: Request, context: AppContext }): Promise<UserGetOutput & GetAccountOutput> {
  const url = new URL(request.url);
  const userId = asUserId(params.userId);
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;
  
  try {
    const [userData, accountsData] = await Promise.all([
      getUserApi(userId, url.origin, headers, apiHandler),
      listAccountsApi(userId, url.origin, headers, apiHandler).catch(() => ({ account: null })),
    ]);
    return { user: userData.user, account: accountsData.account };
  } catch (err) {
    throw new Response(err instanceof Error ? err.message : 'User not found', { status: 404 });
  }
}

export async function action({ request, params, context }: { request: Request; params: { userId: string }, context: AppContext }): Promise<UserUpdateOutput | CreateAccountOutput | Response | { error: string }> {
  const url = new URL(request.url);
  const userId = asUserId(params.userId);
  const formData = await request.formData();
  const intent = formData.get('intent');
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;

  try {
    if (intent === 'save') {
      const email = formData.get('email') as string;
      const displayName = formData.get('displayName') as string;
      const newPassword = formData.get('newPassword') as string;

      const updates: { email?: EmailAddress; displayName?: Name; password?: Password } = {};
      if (email) {
        try {
          updates.email = createEmailAddress(email);
        } catch (e) {
          return { error: 'Invalid email format' };
        }
      }
      if (displayName) updates.displayName = asName(displayName);
      if (newPassword) updates.password = asPassword(newPassword);

      if (Object.keys(updates).length === 0) return { ok: SUCCESS, info: 'No changes' };

      const result = await updateUserApi(userId, updates, url.origin, headers, apiHandler);
      return { user: result.user, ok: SUCCESS, message: 'User updated successfully' };
    }

    if (intent === 'link-account') {
      let targetEmail;
      try {
        targetEmail = createEmailAddress(formData.get('targetEmail') as string);
      } catch (e) {
        return { error: 'Invalid target email format' };
      }
      const servicePassword = formData.get('servicePassword') as string;
      const apiKey = formData.get('apiKey') as string;
      const provider = formData.get('provider') as string;

      const result = await createAccountApi({
        inboxId: asInboxId(userId),
        provider: asServiceProvider(provider),
        targetEmail,
        password: servicePassword ? asPassword(servicePassword) : undefined,
        apiKey: apiKey || undefined
      }, url.origin, headers, apiHandler);
      return { accountId: result.accountId, ok: SUCCESS, message: 'External account linked successfully' };
    }

    if (intent === 'delete') {
      await deleteUserApi(userId, url.origin, headers, apiHandler);
      return redirect('/users');
    }

    return { error: 'Unknown intent' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Action failed' };
  }
}

export function meta({ data }: { data: { user: SanitizedUser } | undefined }) {
  const name = data?.user?.displayName || data?.user?.email.full || "User";
  return [
    { title: `Edit ${name} | Cloud Mail Flare` },
    { name: "description", content: "Update user profile and account settings" },
  ];
}

export default function UserEditPage() {
  const editProps = useUserEdit();
  const title = editProps.user ? `Edit Account: ${editProps.user.displayName || editProps.user.email.full}` : "Identity Profile";
  
  return (
    <Layout title={title}>
      <UserEditView {...editProps} />
    </Layout>
  );
}
