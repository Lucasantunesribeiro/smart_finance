'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { 
  User, 
  Lock, 
  Bell, 
  Palette, 
  Shield,
  Download,
  Trash2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/locale-context';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    bio: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    budgetAlerts: true,
    transactionAlerts: true,
    monthlyReports: true
  });

  const [preferences, setPreferences] = useState({
    language: 'pt-BR',
    currency: 'BRL',
    theme: 'light',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: '1.234,56'
  });
  const { localize } = useTranslation();

  const tabs = [
    { id: 'profile', name: localize('Perfil', 'Profile'), icon: User },
    { id: 'notifications', name: localize('Notificações', 'Notifications'), icon: Bell },
    { id: 'preferences', name: localize('Preferências', 'Preferences'), icon: Palette },
    { id: 'security', name: localize('Segurança', 'Security'), icon: Shield },
    { id: 'data', name: localize('Dados', 'Data'), icon: Download }
  ];

  const notificationLabelMap = {
    emailNotifications: {
      label: localize('Notificações por Email', 'Email Notifications'),
      description: localize('Receber notificações via email', 'Receive notifications via email'),
    },
    pushNotifications: {
      label: localize('Notificações Push', 'Push Notifications'),
      description: localize('Receber notificações push no navegador', 'Receive push notifications in your browser'),
    },
    budgetAlerts: {
      label: localize('Alertas de Orçamento', 'Budget Alerts'),
      description: localize('Ser notificado quando exceder orçamentos', 'Be notified when budgets are exceeded'),
    },
    transactionAlerts: {
      label: localize('Alertas de Transação', 'Transaction Alerts'),
      description: localize('Ser notificado sobre novas transações', 'Receive alerts for new transactions'),
    },
    monthlyReports: {
      label: localize('Relatórios Mensais', 'Monthly Reports'),
      description: localize('Receber relatórios mensais por email', 'Get monthly reports via email'),
    },
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Chama API real para atualizar perfil
      await api.put('/users/profile', profileData);
      toast.success(localize('Perfil atualizado com sucesso!', 'Profile updated successfully!'));
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(localize('Erro ao atualizar perfil', 'Failed to update profile'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    try {
      await api.put('/users/notifications', notificationSettings);
      toast.success(localize('Configurações de notificação salvas!', 'Notification settings saved!'));
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error(localize('Erro ao salvar configurações', 'Failed to save notification settings'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    try {
      await api.put('/users/preferences', preferences);
      toast.success(localize('Preferências salvas!', 'Preferences saved!'));
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast.error(localize('Erro ao salvar preferências', 'Failed to save preferences'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {localize('Informações Pessoais', 'Personal Information')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={profileData.firstName}
              onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
            <input
              type="text"
              value={profileData.lastName}
              onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Conte um pouco sobre você..."
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSaveProfile}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>
            {isLoading
              ? localize('Salvando...', 'Saving...')
              : localize('Salvar Perfil', 'Save Profile')}
          </span>
        </button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {localize('Configurações de Notificação', 'Notification Settings')}
        </h3>
        <div className="space-y-4">
          {Object.entries(notificationSettings).map(([key, value]) => {
            const text = notificationLabelMap[key as keyof typeof notificationLabelMap];
            return (
              <div key={key} className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">
                  {text?.label ?? key}
                </label>
                <p className="text-sm text-gray-600">
                  {text?.description ?? ''}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          );
          })}
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSaveNotifications}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>
            {isLoading
              ? localize('Salvando...', 'Saving...')
              : localize('Salvar Configurações', 'Save Settings')}
          </span>
        </button>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {localize('Preferências do Sistema', 'System Preferences')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
            <select
              value={preferences.language}
              onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
            <select
              value={preferences.currency}
              onChange={(e) => setPreferences(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BRL">Real (R$)</option>
              <option value="USD">Dólar ($)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
              <option value="system">Sistema</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formato de Data</label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => setPreferences(prev => ({ ...prev, dateFormat: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSavePreferences}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>
            {isLoading
              ? localize('Salvando...', 'Saving...')
              : localize('Salvar Preferências', 'Save Preferences')}
          </span>
        </button>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {localize('Segurança da Conta', 'Account Security')}
        </h3>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{localize('Alterar Senha', 'Change Password')}</h4>
                <p className="text-sm text-gray-600">
                  {localize('Última alteração: há 30 dias', 'Last change: 30 days ago')}
                </p>
              </div>
              <button className="text-blue-600 hover:text-blue-800">
                <Lock className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">
                  {localize('Autenticação de Dois Fatores', 'Two-Factor Authentication')}
                </h4>
                <p className="text-sm text-gray-600">
                  {localize('Adicione uma camada extra de segurança', 'Add an extra layer of security')}
                </p>
              </div>
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                {localize('Ativar', 'Enable')}
              </button>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{localize('Sessões Ativas', 'Active Sessions')}</h4>
                <p className="text-sm text-gray-600">
                  {localize('Gerencie seus logins ativos', 'Manage your active logins')}
                </p>
              </div>
              <button className="text-blue-600 hover:text-blue-800">
                {localize('Ver Sessões', 'View Sessions')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users/export-data', { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-finance-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(localize('Dados exportados com sucesso!', 'Data exported successfully!'));
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error(localize('Erro ao exportar dados', 'Failed to export data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        localize(
          'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
          'Are you sure you want to delete your account? This cannot be undone.'
        )
      )
    ) {
      return;
    }
    
    setIsLoading(true);
    try {
      await api.delete('/users/account');
      toast.success(localize('Conta excluída com sucesso', 'Account deleted successfully'));
      // Logout automático após exclusão
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error(localize('Erro ao excluir conta', 'Failed to delete account'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderDataTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {localize('Gerenciamento de Dados', 'Data Management')}
        </h3>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{localize('Exportar Dados', 'Export Data')}</h4>
                <p className="text-sm text-gray-600">
                  {localize('Baixe todos os seus dados em formato JSON', 'Download all your data in JSON format')}
                </p>
              </div>
              <button 
                onClick={handleExportData}
                disabled={isLoading}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isLoading
                    ? localize('Exportando...', 'Exporting...')
                    : localize('Exportar', 'Export')}
                </span>
              </button>
            </div>
          </div>
          
          <div className="p-4 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-red-600">{localize('Excluir Conta', 'Delete Account')}</h4>
                <p className="text-sm text-gray-600">
                  {localize('Remova permanentemente sua conta e todos os dados', 'Permanently remove your account and all data')}
                </p>
              </div>
              <button 
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isLoading ? localize('Excluindo...', 'Deleting...') : localize('Excluir', 'Delete')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {localize('Configurações', 'Settings')}
        </h1>
        <p className="text-gray-600">
          {localize(
            'Gerencie suas preferências e configurações da conta',
            'Manage your account preferences and settings'
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'preferences' && renderPreferencesTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'data' && renderDataTab()}
        </div>
      </div>
    </div>
  );
}; 
