import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';
import InputField from '@/components/shared/InputField';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    } else if (email.length > 254) {
      newErrors.email = 'Email is too long';
    } else if (email.length < 5) {
      newErrors.email = 'Email is too short';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (email.includes(' ')) {
      newErrors.email = 'Email cannot contain spaces';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    setEmail(e.target.value);
    
    // Clear error when user starts typing
    if (errors.email) {
      setErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send password reset email';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg mb-8">
              <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Check Your Email
            </h1>
            <p className="text-base text-muted-foreground mb-8">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>
          
          <div className="card shadow-xl border-0">
            <div className="card-content p-6 sm:p-8">
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Next Steps:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Check your email inbox for the reset link</li>
                    <li>• Click the link to reset your password</li>
                    <li>• Return here to sign in with your new password</li>
                    <li>• Check spam folder if you don't see the email</li>
                  </ul>
                </div>
                
                <div className="flex flex-col space-y-4">
                  <Link
                    to="/login"
                    className="btn-primary w-full text-center"
                  >
                    Back to Sign In
                  </Link>
                  
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                    className="btn-secondary w-full"
                  >
                    Send to Different Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 bg-primary rounded-full flex items-center justify-center shadow-lg mb-8">
            <Mail className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Reset Password
          </h1>
          <p className="text-base text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        
        {/* Reset Form Card */}
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
                  value={email}
                  onChange={handleInputChange}
                  error={errors.email}
                  icon={Mail}
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
                    'Sending reset email...'
                  ) : (
                    'Send Reset Email'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <Link 
            to="/login" 
            className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
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
  );
}