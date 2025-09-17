// app/authentication/login/page.js (or pages/authentication/login.js)
// LoginPage.js
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthAPI } from '../../../lib/api'; // adjust the relative path if needed

export default function LoginPage() {
  const router = useRouter();

  // role can be 'rider' or 'driver'
  const [role, setRole] = useState('rider');

  const [formData, setFormData] = useState({
    email: 'biswasashish655@gmail.com',
    password: 'Ashish-01'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRoleChange = (e) => {
    setRole(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // POST to /api/drive/{role}/login with credentials included
      // Server can set HttpOnly cookie; this client will also receive JSON
      let data;
      if (role === 'rider') {
        data = await AuthAPI.riderLogin({
          email: formData.email,
          password: formData.password,
        });
      } else {
        data = await AuthAPI.driverLogin({
          email: formData.email,
          password: formData.password,
        });
      }

      // If server returns an access token in body and you want to store it:
      // localStorage.setItem('access_token', data?.token); // optional
      // But since api.js uses credentials: 'include', you can rely on HttpOnly cookie

      // Optional: mark logged in flag for UI state
      if (typeof window !== 'undefined') {
        localStorage.setItem('isUserLoggedIn', 'true');
        localStorage.setItem('user_role', role);
      }

      // Redirect post-login: choose any route you want
      // For example, rider dashboard or driver dashboard
      if (role === 'rider') {
        router.push('/'); // rider home
      } else {
        router.push('/driver'); // driver home
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-blue-600 text-white w-12 h-12 rounded-lg flex items-center justify-center font-bold text-2xl mx-auto mb-4">
          R
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Sign in to RideFlex Pro
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/authentication/signup" className="font-medium text-blue-600 hover:text-blue-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sign in as
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('rider')}
                  className={`w-full py-2 rounded-md border text-sm font-medium ${
                    role === 'rider'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Rider
                </button>
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`w-full py-2 rounded-md border text-sm font-medium ${
                    role === 'driver'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Driver
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This selects whether the request goes to /api/drive/rider/login or /api/drive/driver/login
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <span>Google</span>
              </button>
              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <span>Facebook</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
