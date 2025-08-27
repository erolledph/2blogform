import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import InputField from '@/components/shared/InputField';
import toast from 'react-hot-toast';
import { Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const { login, currentUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    } else if (formData.email.length > 254) {
      newErrors.email = 'Email is too long';
    } else if (formData.email.length < 5) {
      newErrors.email = 'Email is too short';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      console.log('🔐 Login form submission:', {
        email: formData.email,
        timestamp: new Date().toISOString(),
        environment: import.meta.env.MODE,
        production: import.meta.env.PROD,
        firebaseConfig: {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Present' : 'Missing',
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? 'Present' : 'Missing',
          appId: import.meta.env.VITE_FIREBASE_APP_ID ? 'Present' : 'Missing'
        }
      });
      
      await login(formData.email, formData.password);
      console.log('✅ Login successful for:', formData.email);
      // Don't navigate immediately - let the auth state change handle it
      toast.success('Login successful!');
    } catch (error) {
      console.error('❌ === LOGIN FAILED ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Enhanced production error logging
      if (import.meta.env.PROD) {
        console.error('🚨 PRODUCTION LOGIN ERROR DETAILS:');
        console.error('Environment variables status:', {
          VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? 'Set' : '❌ MISSING',
          VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '❌ MISSING',
          VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || '❌ MISSING',
          VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '❌ MISSING',
          VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? 'Set' : '❌ MISSING',
          VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID ? 'Set' : '❌ MISSING'
        });
        
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
          console.error('');
          console.error('🔧 TO FIX PRODUCTION LOGIN ISSUES:');
          console.error('1. Go to your Bolt Hosting dashboard');
          console.error('2. Navigate to Environment Variables or Settings');
          console.error('3. Add all Firebase environment variables from your .env file');
          console.error('4. Redeploy the application');
          console.error('');
          console.error('📋 Required variables (copy from .env file):');
          console.error('   VITE_FIREBASE_API_KEY');
          console.error('   VITE_FIREBASE_AUTH_DOMAIN');
          console.error('   VITE_FIREBASE_PROJECT_ID');
          console.error('   VITE_FIREBASE_STORAGE_BUCKET');
          console.error('   VITE_FIREBASE_MESSAGING_SENDER_ID');
          console.error('   VITE_FIREBASE_APP_ID');
        }
      }
      
      console.error('Environment variables check:', {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Present' : 'Missing',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? 'Present' : 'Missing',
        appId: import.meta.env.VITE_FIREBASE_APP_ID ? 'Present' : 'Missing'
      });
      console.error('Current URL:', window.location.href);
      console.error('=== END LOGIN ERROR ===');
      
      // Show user-friendly error message
      if (error.code === 'auth/invalid-api-key' || !import.meta.env.VITE_FIREBASE_API_KEY) {
        toast.error('Configuration error. Please contact support.');
      } else {
        toast.error('Failed to login. Please check your credentials.');
      }
      setLoading(false);
    } finally {
      // Don't set loading to false here if login was successful
      // The auth state change will handle the redirect
    }
  }

  // Handle redirect when user becomes authenticated
  React.useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 bg-primary rounded-full flex items-center justify-center shadow-lg mb-8">
            <Lock className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Admin Login
          </h1>
        </div>
        
        {/* Login Form Card */}
        <div className="card shadow-xl border-0">
          <div className="card-content p-6 sm:p-8 lg:p-10">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Email Field */}
                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  icon={Mail}
                  className="w-full"
                />
                
                {/* Password Field */}
                <InputField
                  label="Password"
                  name="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  error={errors.password}
                  icon={Lock}
                  showPasswordToggle={true}
                  className="w-full"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full h-14 sm:h-16 text-base sm:text-lg font-semibold shadow-lg"
                >
                  {loading ? (
                    'Signing in...'
                  ) : (
                    'Sign in to Dashboard'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="space-y-4">
            <Link 
              to="/forgot-password" 
              className="text-primary hover:text-primary/80 font-medium transition-colors text-base"
            >
              Forgot your password?
            </Link>
            <p className="text-base text-muted-foreground">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
