import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';

export function Login() {
  const { user, signInWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 dark:bg-slate-950/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="text-center flex flex-col space-y-1.5 p-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Scene Chunks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            A modern screenwriting app for pacing, structure, and organization.
          </p>
        </div>
        <div className="flex justify-center p-6 pt-0">
          <button 
            onClick={signInWithGoogle} 
            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-11 px-8"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
