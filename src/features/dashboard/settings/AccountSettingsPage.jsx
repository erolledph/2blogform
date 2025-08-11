import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settingsService';
import InputField from '@/components/shared/InputField';
import LoadingButton from '@/components/shared/LoadingButton';
import { AccountSettingsSkeleton } from '@/components/shared/SkeletonLoader';
import { User, DollarSign, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountSettingsPage() {
  const { currentUser, invalidateUserSettingsCache } = useAuth();
  const [currency, setCurrency] = useState('$');
  const [displayName, setDisplayName] = useState('');
  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
    website: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

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
      setDisplayName(settings.displayName || '');
      setProfileData({
        displayName: settings.displayName || '',
        bio: settings.bio || '',
        website: settings.website || '',
        location: settings.location || ''
      });
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
      
      // Invalidate user settings cache to ensure fresh data on next fetch
      invalidateUserSettingsCache(currentUser.uid);
      
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

  const handleProfileSave = async (e) => {
    e.preventDefault();
    
    if (!currentUser?.uid) {
      toast.error('User not authenticated');
      return;
    }

    setProfileLoading(true);

    try {
      await settingsService.setUserSettings(currentUser.uid, {
        displayName: profileData.displayName.trim(),
        bio: profileData.bio.trim(),
        website: profileData.website.trim(),
        location: profileData.location.trim()
      });
      
      // Invalidate user settings cache
      invalidateUserSettingsCache(currentUser.uid);
      
      setProfileSaved(true);
      toast.success('Profile updated successfully!');
      
      // Reset saved state after 2 seconds
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset saved state when user makes changes
    if (profileSaved) {
      setProfileSaved(false);
    }
  };


  return (
    <div className="section-spacing">
      <div className="page-header mb-16">
        <h1 className="page-title">Account Settings</h1>
        <p className="page-description">
          Manage your account information and preferences
        </p>
      </div>

      {initialLoading ? (
        <AccountSettingsSkeleton />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          {/* Profile Information */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-blue-100 rounded-lg">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="card-title">Profile Information</h2>
              </div>
              <p className="card-description">
                Update your personal information and bio
              </p>
            </div>
            <div className="card-content">
              <form onSubmit={handleProfileSave} className="space-y-8">
                <InputField
                  label="Display Name"
                  name="displayName"
                  value={profileData.displayName}
                  onChange={handleProfileInputChange}
                  placeholder="Your full name"
                  disabled={profileLoading}
                />
                
                <div>
                  <label className="block text-base font-medium text-foreground mb-3">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    rows={4}
                    className="input-field resize-none"
                    value={profileData.bio}
                    onChange={handleProfileInputChange}
                    placeholder="Tell us about yourself..."
                    disabled={profileLoading}
                  />
                </div>
                
                <InputField
                  label="Website"
                  name="website"
                  type="url"
                  value={profileData.website}
                  onChange={handleProfileInputChange}
                  placeholder="https://yourwebsite.com"
                  disabled={profileLoading}
                />
                
                <InputField
                  label="Location"
                  name="location"
                  value={profileData.location}
                  onChange={handleProfileInputChange}
                  placeholder="City, Country"
                  disabled={profileLoading}
                />
                
                <LoadingButton
                  type="submit"
                  loading={profileLoading}
                  loadingText="Saving..."
                  variant="primary"
                  className="w-full"
                  icon={profileSaved ? Check : Save}
                >
                  {profileSaved ? 'Saved!' : 'Save Profile'}
                </LoadingButton>
              </form>
            </div>
          </div>

          {/* User Information */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h2 className="card-title">User Information</h2>
              </div>
              <p className="card-description">
                Your account details and system information
              </p>
            </div>
            <div className="card-content space-y-8">
              <InputField
                label="Email Address"
                value={currentUser?.email || 'Not available'}
                disabled
                className="opacity-75 cursor-not-allowed"
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your email address cannot be changed from this interface
              </p>
              
              <InputField
                label="User ID"
                value={currentUser?.uid || 'Not available'}
                disabled
                className="opacity-75 cursor-not-allowed"
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your unique user identifier used in API endpoints
              </p>
              
              <InputField
                label="Role"
                value={currentUser?.role === 'admin' ? 'Administrator' : 'User'}
                disabled
                className="opacity-75 cursor-not-allowed"
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your current role in the system
              </p>
            </div>
          </div>

          {/* Currency Settings */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-green-100 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="card-title">Currency Settings</h2>
              </div>
              <p className="card-description">
                Choose your preferred currency symbol for displaying prices and financial data
              </p>
            </div>
            <div className="card-content">
              <form onSubmit={handleSave} className="space-y-8">
                <div>
                  <label htmlFor="currency" className="block text-base font-medium text-foreground mb-3">
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
                
                <div className="p-6 bg-muted/30 rounded-lg border border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">Preview</h4>
                  <p className="text-lg text-muted-foreground">
                    Sample price: <span className="font-semibold text-foreground">{currency}99.99</span>
                  </p>
                </div>
                
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingText="Saving..."
                  variant="primary"
                  icon={saved ? Check : Save}
                >
                  {saved ? 'Saved!' : 'Save Settings'}
                </LoadingButton>
              </form>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Additional Settings</h2>
              <p className="card-description">
                System information and additional configuration options
              </p>
            </div>
            <div className="card-content">
              <div className="space-y-8">
                {/* Account Limits */}
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-base font-semibold text-blue-800 mb-6">Account Limits</h3>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <span className="font-medium text-blue-700">Max Blogs:</span>
                      <div className="text-blue-600 text-lg font-semibold">{currentUser?.maxBlogs || 1}</div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Storage Limit:</span>
                      <div className="text-blue-600 text-lg font-semibold">{currentUser?.totalStorageMB || 100} MB</div>
                    </div>
                  </div>
                </div>
                
                {/* Version Information */}
                <div className="p-6 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-3">System Information</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">Current application version and build details</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">v2.0.0</div>
                      <div className="text-sm text-muted-foreground">User-Isolated CMS</div>
                    </div>
                  </div>
                </div>
                
                {/* Account Statistics */}
                <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-base font-semibold text-green-800 mb-6">Account Statistics</h3>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <span className="font-medium text-green-700">Member Since:</span>
                      <div className="text-green-600 font-medium">
                        {currentUser?.metadata?.creationTime 
                          ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Last Sign In:</span>
                      <div className="text-green-600 font-medium">
                        {currentUser?.metadata?.lastSignInTime 
                          ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString()
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}