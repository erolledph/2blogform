// Centralized validation utilities
export const validationRules = {
  email: {
    required: (value) => !value ? 'Email is required' : null,
    format: (value) => {
      if (!value) return null;
      if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
      if (value.length > 254) return 'Email is too long';
      if (value.length < 5) return 'Email is too short';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
      if (value.includes(' ')) return 'Email cannot contain spaces';
      return null;
    }
  },

  password: {
    required: (value) => !value ? 'Password is required' : null,
    length: (value) => {
      if (!value) return null;
      if (value.length < 6) return 'Password must be at least 6 characters';
      if (value.length > 128) return 'Password is too long';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (value.includes(' ')) return 'Password cannot contain spaces';
      if (!/^(?=.*[a-zA-Z])/.test(value)) return 'Password must contain at least one letter';
      if (!/^(?=.*\d)/.test(value)) return 'Password must contain at least one number';
      return null;
    }
  },

  displayName: {
    required: (value) => !value?.trim() ? 'Display name is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length < 2) return 'Display name must be at least 2 characters';
      if (value.length > 100) return 'Display name must be less than 100 characters';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (!/^[a-zA-Z\s\-'\.]+$/.test(value.trim())) {
        return 'Display name can only contain letters, spaces, hyphens, apostrophes, and periods';
      }
      return null;
    }
  },

  title: {
    required: (value) => !value?.trim() ? 'Title is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length < 3) return 'Title must be at least 3 characters';
      if (value.length > 200) return 'Title must be less than 200 characters';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (!/^[a-zA-Z0-9\s\-_.,!?()&:;'"]+$/.test(value.trim())) {
        return 'Title contains invalid characters';
      }
      return null;
    }
  },

  slug: {
    required: (value) => !value?.trim() ? 'Slug is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length < 3) return 'Slug must be at least 3 characters';
      if (value.length > 100) return 'Slug must be less than 100 characters';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (!/^[a-z0-9-]+$/.test(value)) return 'Slug can only contain lowercase letters, numbers, and hyphens';
      if (value.startsWith('-') || value.endsWith('-')) return 'Slug cannot start or end with a hyphen';
      if (value.includes('--')) return 'Slug cannot contain consecutive hyphens';
      return null;
    }
  },

  content: {
    required: (value) => !value?.trim() ? 'Content is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length < 10) return 'Content must be at least 10 characters';
      if (value.length > 50000) return 'Content must be less than 50,000 characters';
      return null;
    }
  },

  productName: {
    required: (value) => !value?.trim() ? 'Product name is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length < 3) return 'Product name must be at least 3 characters';
      if (value.length > 200) return 'Product name must be less than 200 characters';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (!/^[a-zA-Z0-9\s\-_.,!?()&:;'"]+$/.test(value.trim())) {
        return 'Product name contains invalid characters';
      }
      return null;
    }
  },

  description: {
    required: (value) => !value?.trim() ? 'Description is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length < 10) return 'Description must be at least 10 characters';
      if (value.length > 10000) return 'Description must be less than 10,000 characters';
      return null;
    }
  },

  price: {
    required: (value) => {
      if (value === undefined || value === null || value === '') return 'Price is required';
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) return 'Valid price is required';
      return null;
    },
    range: (value) => {
      if (!value) return null;
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return null;
      if (numValue > 999999.99) return 'Price cannot exceed $999,999.99';
      if (numValue === 0) return 'Price must be greater than 0';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        return 'Price can have at most 2 decimal places';
      }
      return null;
    }
  },

  percentOff: {
    range: (value) => {
      if (value === undefined || value === null || value === '') return null;
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        return 'Percent off must be between 0 and 100';
      }
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        return 'Percent off can have at most 2 decimal places';
      }
      return null;
    }
  },

  url: {
    format: (value) => {
      if (!value) return null;
      try {
        new URL(value);
        return null;
      } catch {
        return 'Please enter a valid URL';
      }
    },
    length: (value, maxLength = 500) => {
      if (!value) return null;
      if (value.length > maxLength) return `URL must be less than ${maxLength} characters`;
      return null;
    }
  },

  metaDescription: {
    length: (value) => {
      if (!value) return null;
      if (value.length > 250) return 'Meta description should be less than 250 characters';
      if (value.length > 0 && value.length < 50) {
        return 'Meta description should be at least 50 characters for better SEO';
      }
      return null;
    }
  },

  seoTitle: {
    length: (value) => {
      if (!value) return null;
      if (value.length > 60) return 'SEO title should be less than 60 characters';
      if (value.length > 0 && value.length < 10) return 'SEO title should be at least 10 characters';
      return null;
    }
  },

  author: {
    length: (value) => {
      if (!value) return null;
      if (value.length > 100) return 'Author name must be less than 100 characters';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (value.length > 0 && !/^[a-zA-Z\s\-'\.]+$/.test(value)) {
        return 'Author name can only contain letters, spaces, hyphens, apostrophes, and periods';
      }
      return null;
    }
  },

  category: {
    length: (value) => {
      if (!value) return null;
      if (value.length > 100) return 'Category must be less than 100 characters';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (value.length > 0 && !/^[a-zA-Z0-9\s\-_&]+$/.test(value)) {
        return 'Category can only contain letters, numbers, spaces, hyphens, underscores, and ampersands';
      }
      return null;
    }
  },

  blogName: {
    required: (value) => !value?.trim() ? 'Blog name is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length < 2) return 'Blog name must be at least 2 characters';
      if (value.length > 100) return 'Blog name must be less than 100 characters';
      return null;
    }
  },

  folderName: {
    required: (value) => !value?.trim() ? 'Folder name is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length === 0) return 'Folder name cannot be empty';
      if (value.length > 50) return 'Folder name must be less than 50 characters';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return 'Folder name can only contain letters, numbers, underscores, and hyphens';
      }
      if (trimmed.includes('/') || trimmed.includes('\\')) {
        return 'Folder name cannot contain slashes';
      }
      if (trimmed.startsWith('.') || trimmed.endsWith('.')) {
        return 'Folder name cannot start or end with a period';
      }
      return null;
    }
  },

  fileName: {
    required: (value) => !value?.trim() ? 'File name is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length === 0) return 'File name cannot be empty';
      if (value.length > 100) return 'File name must be less than 100 characters';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
        return 'File name can only contain letters, numbers, underscores, hyphens, and dots';
      }
      if (trimmed.includes('/') || trimmed.includes('\\')) {
        return 'File name cannot contain slashes';
      }
      return null;
    }
  },

  broadcastTitle: {
    required: (value) => !value?.trim() ? 'Broadcast title is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length < 3) return 'Broadcast title must be at least 3 characters';
      if (value.length > 100) return 'Broadcast title must be less than 100 characters';
      return null;
    },
    format: (value) => {
      if (!value) return null;
      if (!/^[a-zA-Z0-9\s\-_.,!?()&:;'"]+$/.test(value.trim())) {
        return 'Broadcast title contains invalid characters';
      }
      return null;
    }
  },

  broadcastDescription: {
    required: (value) => !value?.trim() ? 'Broadcast description is required' : null,
    length: (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length < 10) return 'Broadcast description must be at least 10 characters';
      if (value.length > 160) return 'Broadcast description must be less than 160 characters';
      return null;
    }
  }
};

// Validation runner function
export const validateField = (fieldName, value, rules = []) => {
  const fieldRules = validationRules[fieldName];
  if (!fieldRules) return null;

  // Run specified rules or all rules for the field
  const rulesToRun = rules.length > 0 ? rules : Object.keys(fieldRules);
  
  for (const rule of rulesToRun) {
    if (fieldRules[rule]) {
      const error = fieldRules[rule](value);
      if (error) return error;
    }
  }
  
  return null;
};

// Validate entire form object
export const validateForm = (formData, fieldMappings) => {
  const errors = {};
  
  Object.entries(fieldMappings).forEach(([formField, validationField]) => {
    const error = validateField(validationField, formData[formField]);
    if (error) {
      errors[formField] = error;
    }
  });
  
  return errors;
};

// Password confirmation validation
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  if (confirmPassword.length < 6) return 'Confirmation password must be at least 6 characters';
  return null;
};

// Array validation
export const validateArray = (value, fieldName) => {
  if (!value) return null;
  if (!Array.isArray(value)) return `${fieldName} must be an array`;
  return null;
};

// Custom validation for specific use cases
export const validateImageUrls = (imageUrls) => {
  if (!imageUrls || !Array.isArray(imageUrls)) return null;
  if (imageUrls.length > 5) return 'Maximum 5 images allowed per product';
  
  const invalidUrls = imageUrls.filter(url => {
    try {
      new URL(url);
      return false;
    } catch {
      return true;
    }
  });
  
  if (invalidUrls.length > 0) {
    return `${invalidUrls.length} image URL${invalidUrls.length > 1 ? 's are' : ' is'} invalid`;
  }
  
  return null;
};

// Storage quota validation
export const validateStorageQuota = (maxBlogs, totalStorageMB) => {
  const errors = {};
  
  if (maxBlogs !== undefined) {
    if (!Number.isInteger(maxBlogs) || maxBlogs < 1 || maxBlogs > 50) {
      errors.maxBlogs = 'Maximum blogs must be a positive integer between 1 and 50';
    }
  }
  
  if (totalStorageMB !== undefined) {
    if (!Number.isInteger(totalStorageMB) || totalStorageMB < 100 || totalStorageMB > 100000) {
      errors.totalStorageMB = 'Storage limit must be between 100 and 100,000 MB';
    }
  }
  
  return errors;
};

// Role validation
export const validateRole = (role) => {
  if (!role) return 'Role is required';
  if (!['admin', 'user'].includes(role)) return 'Role must be either "admin" or "user"';
  return null;
};

// Status validation
export const validateStatus = (status) => {
  if (!status) return null;
  if (!['draft', 'published'].includes(status)) return 'Status must be either "draft" or "published"';
  return null;
};