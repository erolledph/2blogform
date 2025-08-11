import React from 'react';

export default function ProgressBar({
  progress = 0,
  showPercentage = true,
  size = 'md',
  color = 'primary',
  animated = true,
  className = ''
}) {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4'
  };

  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  const backgroundClasses = {
    primary: 'bg-primary/20',
    success: 'bg-green-100',
    warning: 'bg-amber-100',
    error: 'bg-red-100',
    info: 'bg-blue-100'
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={`w-full ${backgroundClasses[color]} rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300 ease-out ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

// Circular progress component
export function CircularProgress({
  progress = 0,
  size = 40,
  strokeWidth = 4,
  color = 'primary',
  showPercentage = true,
  className = ''
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colorClasses = {
    primary: 'stroke-primary',
    success: 'stroke-green-500',
    warning: 'stroke-amber-500',
    error: 'stroke-red-500',
    info: 'stroke-blue-500'
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colorClasses[color]} transition-all duration-300 ease-out`}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-foreground">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Multi-step progress indicator
export function StepProgress({
  steps = [],
  currentStep = 0,
  completedSteps = [],
  className = ''
}) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-sm ${
                  isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 transition-colors duration-300 ${
                  isCompleted ? 'bg-green-500' : 'bg-muted'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}