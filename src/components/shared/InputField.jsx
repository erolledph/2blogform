import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function InputField({
  label,
  error,
  required = false,
  className = '',
  type = 'text',
  showPasswordToggle = false,
  icon: Icon = null,
  currencySymbol = null,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = props.id || props.name;
  const actualType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={className}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-base font-medium text-foreground mb-3"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        {currencySymbol && (
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <span className="text-base font-medium text-muted-foreground">{currencySymbol}</span>
          </div>
        )}
        <input
          id={inputId}
          type={actualType}
          className={`input-field ${Icon || currencySymbol ? 'pl-14' : ''} ${showPasswordToggle ? 'pr-14' : ''} ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-6 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Eye className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-3 text-sm text-destructive leading-relaxed">{error}</p>
      )}
    </div>
  );
}