import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settingsService';
import InputField from '@/components/shared/InputField';
import { User, DollarSign, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountSettingsPage() {
  const { currentUser } = useAuth();
  const [currency, setCurrency] = useState('$');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const currencyOptions = [
    { value: '$', label: 'US Dollar ($)' },
    { value: '€', label: 'Euro (€)' },
    { value: '£', label: 'British Pound (£)' },
    { value: '¥', label: 'Japanese Yen (¥)' },
    { value: '₹', label: 'Indian Rupee (₹)' },
    { value: 'C$', label: 'Canadian Dollar (C$)' },
    { value: 'A$', label: 'Australian Dollar (A$)' },
    { value: '₽', label: 'Russian Ruble (₽)' },
    { value: '₩', label: 'South Korean Won (₩)' },
    { value: '₦', label: 'Nigerian Naira (₦)' },
    { value: '₱', label: 'Philippine Peso (₱)' },
    { value: '₡', label: 'Costa Rican Colón (₡)' },
    { value: '₪', label: 'Israeli New Shekel (₪)' },
    { value: '₫', label: 'Vietnamese Dong (₫)' },
    { value: '₴', label: 'Ukrainian Hryvnia (₴)' },
    { value: '₸', label: 'Kazakhstani Tenge (₸)' },
    { value: '₼', label: 'Azerbaijani Manat (₼)' },
    { value: '₾', label: 'Georgian Lari (₾)' },
    { value: '﷼', label: 'Saudi Riyal (﷼)' },
    { value: 'kr', label: 'Swedish Krona (kr)' },
    { value: 'zł', label: 'Polish Złoty (zł)' },
    { value: 'Kč', label: 'Czech Koruna (Kč)' },
    { value: 'Ft', label: 'Hungarian Forint (Ft)' },
    { value: 'lei', label: 'Romanian Leu (lei)' },
    { value: 'лв', label: 'Bulgarian Lev (лв)' },
    { value: 'kn', label: 'Croatian Kuna (kn)' },
    { value: 'din', label: 'Serbian Dinar (din)' },
    { value: 'CHF', label: 'Swiss Franc (CHF)' },
    { value: 'NOK', label: 'Norwegian Krone (NOK)' },
    { value: 'DKK', label: 'Danish Krone (DKK)' },
    { value: 'SEK', label: 'Swedish Krona (SEK)' },
    { value: 'R', label: 'South African Rand (R)' },
    { value: 'R$', label: 'Brazilian Real (R$)' },
    { value: '$', label: 'Mexican Peso (MX$)' },
    { value: 'S$', label: 'Singapore Dollar (S$)' },
    { value: 'HK$', label: 'Hong Kong Dollar (HK$)' },
    { value: 'NT$', label: 'New Taiwan Dollar (NT$)' },
    { value: '₿', label: 'Bitcoin (₿)' },
    { value: 'Ξ', label: 'Ethereum (Ξ)' }
  ];

  useEffect(() => {
    fetchUserSettings();
  }, [currentUser]);

  const fetchUserSettings = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setInitialLoading(true);
      const settings = await settingsService.getUserSettings(currentUser.uid);
      setCurrency(settings.currency || '$');
    } catch (error) {
      console.error('Error fetching user settings:', error);
      toast.error('Failed to load user settings');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!currentUser?.uid) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);

    try {
      await settingsService.setUserSettings(currentUser.uid, {
        currency
      });
      
      // Also save currency to public app settings so it's available in the API
      await settingsService.setPublicAppSettings(currentUser.uid, {
        currency
      });
      
      setSaved(true);
      toast.success('Settings saved successfully!');
      
      // Reset saved state after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="section-spacing">
        <div className="page-header">
          <h1 className="page-title">Account Settings</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      <div className="page-header">
        <h1 className="page-title">Account Settings</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* User Information */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="card-title">User Information</h2>
            </div>
          </div>
          <div className="card-content space-y-6">
            <InputField
              label="Email Address"
              value={currentUser?.email || 'Not available'}
              disabled
              className="opacity-75 cursor-not-allowed"
            />
            <p className="text-sm text-muted-foreground">
              Your email address cannot be changed from this interface
            </p>
            
            <InputField
              label="User ID"
              value={currentUser?.uid || 'Not available'}
              disabled
              className="opacity-75 cursor-not-allowed"
            />
            <p className="text-sm text-muted-foreground">
              Your unique user identifier used in API endpoints
            </p>
            
            <InputField
              label="Role"
              value="Administrator"
              disabled
              className="opacity-75 cursor-not-allowed"
            />
            <p className="text-sm text-muted-foreground">
              Your current role in the system
            </p>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="card-title">Currency Settings</h2>
            </div>
            <p className="card-description">
              Choose your preferred currency symbol for displaying prices and financial data
            </p>
          </div>
          <div className="card-content">
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-foreground mb-2">
                  Currency Symbol
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="input-field w-full"
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="text-sm font-medium text-foreground mb-2">Preview</h4>
                <p className="text-base text-muted-foreground">
                  Sample price: <span className="font-semibold text-foreground">{currency}99.99</span>
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Settings'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Additional Settings Placeholder */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Additional Settings</h2>
            <p className="card-description">
              System information and additional configuration options
            </p>
          </div>
          <div className="card-content">
            <div className="space-y-6">
              {/* Version Information */}
              <div className="p-6 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-2">System Information</h3>
                    <p className="text-sm text-muted-foreground">Current application version and build details</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">v2.0.0</div>
                    <div className="text-sm text-muted-foreground">User-Isolated CMS</div>
                  </div>
                </div>
              </div>
              
              {/* Future Settings Placeholder */}
              <div className="text-center py-8 text-muted-foreground">
                <p>Additional configuration options will be added here as the application grows.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}