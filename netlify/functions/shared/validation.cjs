// Shared validation utilities for Netlify Functions
const validationRules = {
  email: {
    required: (value) => !value ? 'Email is required' : null,
    format: (value) => {
      if (!value) return null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Invalid email format';
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
    }
  },

  password: {
    required: (value) => !value ? 'Password is required' : null,
    length: (value) => {
      if (!value) return null;
      if (value.length < 6) return 'Password must be at least 6 characters';
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
      if (value === undefined || value === null) return 'Price is required';
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) return 'Price must be a valid number >= 0';
      return null;
    },
    range: (value) => {
      if (value === undefined || value === null) return null;
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return null;
      if (numValue > 999999.99) return 'Price cannot exceed $999,999.99';
      return null;
    }
  },

  percentOff: {
    range: (value) => {
      if (value === undefined || value === null) return null;
      if (value.length > 250) return 'Meta description should be less than 250 characters';
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        return 'Percent off must be a number between 0 and 100';
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

  role: {
    required: (value) => !value ? 'Role is required' : null,
    format: (value) => {
      if (!value) return null;
      if (!['admin', 'user'].includes(value)) return 'Role must be either "admin" or "user"';
      return null;
    }
  },

  status: {
    format: (value) => {
      if (!value) return null;
      if (!['draft', 'published'].includes(value)) return 'Status must be either "draft" or "published"';
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
const validateField = (fieldName, value, rules = []) => {
  const fieldRules = validationRules[fieldName];
  if (!fieldRules) return null;

  const rulesToRun = rules.length > 0 ? rules : Object.keys(fieldRules);
  
  for (const rule of rulesToRun) {
    if (fieldRules[rule]) {
      const error = fieldRules[rule](value);
      if (error) return error;
    }
  }
  
  return null;
};

// Validate entire object
const validateObject = (data, fieldMappings) => {
  const errors = {};
  
  Object.entries(fieldMappings).forEach(([dataField, validationField]) => {
    const error = validateField(validationField, data[dataField]);
    if (error) {
      errors[dataField] = error;
    }
  });
  
  return errors;
};

// Array validation
const validateArray = (value, fieldName) => {
  if (!value) return null;
  if (!Array.isArray(value)) return `${fieldName} must be an array`;
  return null;
};

// Storage quota validation
const validateStorageQuota = (maxBlogs, totalStorageMB) => {
  const errors = {};
  
  if (maxBlogs !== undefined && (!Number.isInteger(maxBlogs) || maxBlogs < 1 || maxBlogs > 50)) {
    errors.maxBlogs = 'maxBlogs must be a positive integer between 1 and 50';
  }
  
  if (totalStorageMB !== undefined && (!Number.isInteger(totalStorageMB) || totalStorageMB < 100 || totalStorageMB > 100000)) {
    errors.totalStorageMB = 'totalStorageMB must be a positive integer between 100 and 100,000';
  }
  
  return errors;
};

module.exports = {
  validationRules,
  validateField,
  validateObject,
  validateArray,
  validateStorageQuota
};