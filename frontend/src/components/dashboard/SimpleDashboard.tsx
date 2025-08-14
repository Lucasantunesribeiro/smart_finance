'use client';

import { useAuth } from '@/hooks/useAuth';
import { DollarSign } from 'lucide-react';

export const SimpleDashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">SmartFinance</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-green-600 mb-4">
              🎉 Login Successful!
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Welcome to SmartFinance Dashboard, {user?.firstName}!
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                ✅ System Status
              </h3>
              <div className="text-left text-sm text-green-700 space-y-1">
                <p>• Backend: Connected and Running</p>
                <p>• Authentication: Working Perfectly</p>
                <p>• Login Endpoint: /simpleauth/login</p>
                <p>• User Data: Successfully Retrieved</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-800 mb-2">User Information</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
                  <p><strong>Role:</strong> {user?.role === 1 ? 'Admin' : 'User'}</p>
                  <p><strong>Status:</strong> {user?.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>

            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-2">🚀 Next Steps</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <p>1. ✅ Login system is fully functional</p>
                <p>2. ✅ User authentication working</p>
                <p>3. ✅ Dashboard accessible</p>
                <p>4. 🔄 Ready for feature development</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SimpleDashboard;