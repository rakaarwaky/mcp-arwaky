import { asUsername, asUserId, SUCCESS } from '$taxonomy';
import { listUsersApi, createUserApi, deleteUserApi } from '../lib/web_api_barrel';
import { useUsers } from '../hooks/web_users_hook';
import UsersView from '../components/UsersView';
import Layout from '../components/Layout';
import type { UserListOutput, UserCreateOutput, UserDeleteOutput } from '$contract';
import type { AppContext } from '../root';

export async function loader({ request, context }: { request: Request, context: AppContext }): Promise<UserListOutput> {
  const url = new URL(request.url);
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;
  
  try {
    const data = await listUsersApi(url.origin, headers, apiHandler);
    return { users: data.users };
  } catch (err) {
    throw new Response(err instanceof Error ? err.message : 'Failed to load users', { status: 500 });
  }
}

export async function action({ request, context }: { request: Request, context: AppContext }): Promise<UserCreateOutput | UserDeleteOutput | { error: string }> {
  const url = new URL(request.url);
  const formData = await request.formData();
  const intent = formData.get('intent');
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;

  try {
    if (intent === 'create') {
      const usernameRaw = formData.get('username') as string;
      if (!usernameRaw) throw new Error('Username is required');
      
      let username;
      try {
        username = asUsername(usernameRaw);
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Invalid username format' };
      }
      
      const result = await createUserApi(username, url.origin, headers, apiHandler);
      return { 
        ok: SUCCESS, 
        user: result.user,
        credentials: result.credentials 
      };
    }
    if (intent === 'delete') {
      const id = formData.get('id') as string;
      return await deleteUserApi(asUserId(id), url.origin, headers, apiHandler);
    }
    return { error: 'Unknown intent' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Operation failed' };
  }
}

export function meta() {
  return [
    { title: "User Directory | Cloud Mail Flare" },
    { name: "description", content: "Manage system users and access levels" },
  ];
}

export default function UsersPage() {
  const usersProps = useUsers();
  return (
    <Layout title="Active Directory">
      <UsersView {...usersProps} />
    </Layout>
  );
}
