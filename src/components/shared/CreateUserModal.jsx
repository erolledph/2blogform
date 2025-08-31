import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Modal from './Modal';
import InputField from './InputField';
import { UserPlus, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateUserModal({ isOpen, onClose, onUserCreated }) {
  const { getAuthToken } = useAuth();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Display name validation
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    } else if (formData.displayName.length > 100) {
      newErrors.displayName = 'Display name must be less than 100 characters';
    } else if (!/^[a-zA-Z\s\-'\.]+$/.test(formData.displayName.trim())) {
      newErrors.displayName = 'Display name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }
    
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (formData.password.length > 128) {
      newErrors.password = 'Password is too long';
    } else if (formData.password.includes(' ')) {
      newErrors.password = 'Password cannot contain spaces';
    } else if (!/^(?=.*[a-zA-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one letter';
    } else if (!/^(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm the password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
    
    // Also clear related errors for password confirmation
    if (name === 'password' && errors.confirmPassword && formData.confirmPassword) {
      // Re-validate confirm password when password changes
      if (value === formData.confirmPassword) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      }
    }
    
    if (name === 'confirmPassword' && errors.confirmPassword) {
      // Clear confirm password error if it now matches
      if (value === formData.password) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setCreating(true);
      
      const token = await getAuthToken();
      const response = await fetch('/.netlify/functions/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          displayName: formData.displayName.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      toast.success(`User account created successfully for ${formData.email}`);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: ''
      });
      setErrors({});
      
      // Call the callback to refresh user list
      if (onUserCreated) {
        onUserCreated(result.user);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      
      let errorMessage = 'Failed to create user account';
      if (error.message.includes('email-already-in-use')) {
        errorMessage = 'An account with this email already exists';
      } else if (error.message.includes('weak-password')) {
        errorMessage = 'Password is too weak';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'Invalid email address';
      } else if (error.message.includes('Forbidden')) {
        errorMessage = 'You do not have permission to create users';
      }
      
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New User Account"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Admin User Creation</h4>
          <p className="text-sm text-blue-700">
            Create a new user account with default settings. The user will be able to log in immediately with the provided credentials.
          </p>
        </div>

        <div className="space-y-6">
          {/* Display Name Field */}
          <InputField
            label="Display Name"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            placeholder="Enter user's full name"
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
            placeholder="Enter user's email address"
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
            placeholder="Confirm the password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={errors.confirmPassword}
            icon={Lock}
            showPasswordToggle={true}
            className="w-full"
          />
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-2">Default User Settings</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Role: Regular User (can be changed after creation)</li>
            <li>• Maximum Blogs: 1 (can be increased by admin)</li>
            <li>• Storage Limit: 100 MB (can be increased by admin)</li>
            <li>• Default Blog: Automatically created</li>
            <li>• Email Verification: Not required for admin-created accounts</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            disabled={creating}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="btn-primary"
          >
            {creating ? (
              'Creating Account...'
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Create User Account
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
