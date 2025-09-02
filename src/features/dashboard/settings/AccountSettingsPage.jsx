import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settingsService';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/firebase';
import InputField from '@/components/shared/InputField';
import LoadingButton from '@/components/shared/LoadingButton';
import { AccountSettingsSkeleton } from '@/components/shared/SkeletonLoader';
import { User, DollarSign, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountSettingsPage() {
  const { currentUser, invalidateUserSettingsCache } = useAuth();
  const [currency, setCurrency] = useState('$');
  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
    website: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

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
    if (!currentUser?.uid) {
      toast.error('No user ID available');
      setInitialLoading(false);
      return;
    }

    try {
      setInitialLoading(true);
      const settings = await settingsService.getUserSettings(currentUser.uid);
      
      // Validate response structure
      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings response');
      }

      setCurrency(settings.currency || '$');
      setProfileData({
        displayName: settings.displayName || '',
        bio: settings.bio || '',
        website: settings.website || '',
        location: settings.location || ''
      });
    } catch (error) {
      console.error('Error fetching user settings:', {
        error,
        message: error.message,
        response: error.response?.data,
      });
      
      // Check for non-JSON response
      if (error.message.includes('Unexpected token')) {
        toast.error('Failed to load settings: Invalid server response');
      } else {
        toast.error('Failed to load user settings');
      }
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
      await settingsService.setUserSettings(currentUser.uid, { currency });
      await settingsService.setPublicAppSettings(currentUser.uid, { currency });
      invalidateUserSettingsCache(currentUser.uid);
      setSaved(true);
      toast.success('Settings saved successfully!');
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

      if (profileData.displayName.trim() !== currentUser.displayName) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: profileData.displayName.trim()
          });
        } catch (authUpdateError) {
          console.warn('Failed to update Firebase Auth display name:', authUpdateError);
        }
      }

      invalidateUserSettingsCache(currentUser.uid);
      setProfileSaved(true);
      toast.success('Profile updated successfully!');
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
    if (profileSaved) {
      setProfileSaved(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your account information and preferences</p>
      </header>

      {initialLoading ? (
        <AccountSettingsSkeleton />
      ) : (
        <div className="space-y-8">
          {/* Profile Information */}
          <section className="bg-card rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <User className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Profile Information</h2>
                  <p className="text-sm text-muted-foreground mt-1">Update your personal information and bio</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleProfileSave} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Display Name"
                  name="displayName"
                  value={profileData.displayName}
                  onChange={handleProfileInputChange}
                  placeholder="Your full name"
                  disabled={profileLoading}
                  className="w-full"
                  required
                />
                <InputField
                  label="Website"
                  name="website"
                  type="url"
                  value={profileData.website}
                  onChange={handleProfileInputChange}
                  placeholder="https://yourwebsite.com"
                  disabled={profileLoading}
                  className="w-full"
                />
                <InputField
                  label="Location"
                  name="location"
                  value={profileData.location}
                  onChange={handleProfileInputChange}
                  placeholder="City, Country"
                  disabled={profileLoading}
                  className="w-full"
                />
                <div className="md:col-span-2">
                  <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-2">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                    value={profileData.bio}
                    onChange={handleProfileInputChange}
                    placeholder="Tell us about yourself..."
                    disabled={profileLoading}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <LoadingButton
                  type="submit"
                  loading={profileLoading}
                  loadingText="Saving..."
                  variant="primary"
                  className="w-full sm:w-auto px-6"
                  icon={profileSaved ? Check : Save}
                >
                  {profileSaved ? 'Saved!' : 'Save Profile'}
                </LoadingButton>
              </div>
            </form>
          </section>

          {/* User Information */}
          <section className="bg-card rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <User className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">User Information</h2>
                  <p className="text-sm text-muted-foreground mt-1">Your account details and system information</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputField
                  label="Email Address"
                  value={currentUser?.email || 'Not available'}
                  disabled
                  className="w-full opacity-75 cursor-not-allowed"
                />
                <InputField
                  label="Role"
                  value={currentUser?.role === 'admin' ? 'Administrator' : 'User'}
                  disabled
                  className="w-full opacity-75 cursor-not-allowed"
                />
                <div className="sm:col-span-2">
                  <InputField
                    label="User ID"
                    value={currentUser?.uid || 'Not available'}
                    disabled
                    className="w-full opacity-75 cursor-not-allowed"
                  />
                  <p className="text-sm text-muted-foreground mt-2">Your unique user identifier used in API endpoints</p>
                </div>
              </div>
            </div>
          </section>

          {/* Currency Settings */}
          <section className="bg-card rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Currency Settings</h2>
                  <p className="text-sm text-muted-foreground mt-1">Choose your preferred currency for prices</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleSave} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-foreground mb-2">
                    Currency Symbol
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                    disabled={loading}
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border flex items-center">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Preview</h4>
                    <p className="text-base text-muted-foreground">
                      Sample price: <span className="font-semibold text-foreground">{currency}99.99</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingText="Saving..."
                  variant="primary"
                  className="w-full sm:w-auto px-6"
                  icon={saved ? Check : Save}
                >
                  {saved ? 'Saved!' : 'Save Settings'}
                </LoadingButton>
              </div>
            </form>
          </section>

          {/* Additional Settings */}
          <section className="bg-card rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Additional Settings</h2>
              <p className="text-sm text-muted-foreground mt-1">System information and account configuration</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-800 mb-4">Account Limits</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700">Max Blogs:</span>
                      <div className="text-blue-600 font-semibold">{currentUser?.maxBlogs || 1}</div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Storage Limit:</span>
                      <div className="text-blue-600 font-semibold">{currentUser?.totalStorageMB || 100} MB</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-4">System Information</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Current application version</p>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">v2.0.0</div>
                      <div className="text-sm text-muted-foreground">User-Isolated CMS</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg sm:col-span-2">
                  <h3 className="text-sm font-semibold text-green-800 mb-4">Account Statistics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
          </section>
        </div>
      )}
    </div>
  );
}