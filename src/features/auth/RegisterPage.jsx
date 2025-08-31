import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { settingsService } from '@/services/settingsService';
import { blogService } from '@/services/blogService';
import { validateField, validatePasswordConfirmation } from '@/utils/validation';
import InputField from '@/components/shared/InputField';
import toast from 'react-hot-toast';
import { UserPlus, Mail, Lock, User } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    // Display name validation using centralized rules
    const displayNameError = validateField('displayName', formData.displayName);
    if (displayNameError) newErrors.displayName = displayNameError;
    
    // Email validation using centralized rules
    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;
    
    // Password validation using centralized rules
    const passwordError = validateField('password', formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    // Confirm password validation using centralized rules
    const confirmPasswordError = validatePasswordConfirmation(formData.password, formData.confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;
      
      // Initialize user settings
      await settingsService.setUserSettings(user.uid, {
        role: 'user',
        canManageMultipleBlogs: false,
        currency: '$',
        maxBlogs: 1,
        totalStorageMB: 100,
        displayName: formData.displayName.trim()
      });
      
      // Create default blog
      await blogService.ensureDefaultBlog(user.uid);
      
      toast.success('Account created successfully! Welcome to Admin CMS!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 bg-primary rounded-full flex items-center justify-center shadow-lg mb-8">
            <UserPlus className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Create Account
          </h1>
          <p className="text-base text-muted-foreground">
            Join Admin CMS and start managing your content
          </p>
        </div>
        
        {/* Registration Form Card */}
        <div className="card shadow-xl border-0">
          <div className="card-content p-6 sm:p-8 lg:p-10">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Display Name Field */}
                <InputField
                  label="Display Name"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Enter your full name"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  error={errors.displayName}
                  icon={User}
                  className="w-full"
                />
                
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
                  autoComplete="new-password"
                  required
                  placeholder="Create a password (min 6 characters)"
                  value={formData.password}
                  onChange={handleInputChange}
                  error={errors.password}
                  icon={Lock}
                  showPasswordToggle={true}
                  className="w-full"
                />
                
                {/* Confirm Password Field */}
                <InputField
                  label="Confirm Password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  error={errors.confirmPassword}
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
                    'Creating account...'
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-base text-muted-foreground">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}