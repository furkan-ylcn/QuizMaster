import { useState, useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';

// Hook for managing loading states
export const useLoading = () => {
  const [loading, setLoading] = useState(false);

  // Wrap async function to set loading state automatically
  const withLoading = async (asyncFunction) => {
    setLoading(true);
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      setLoading(false);
    }
  };

  return { loading, setLoading, withLoading };
};

// Hook for countdown timer
export const useTimer = (initialTime, onTimeUp) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef(null);

  // Start timer with optional time override
  const startTimer = (time = initialTime) => {
    setTimeRemaining(time);
    setIsActive(true);
  };

  // Stop timer and clear interval
  const stopTimer = () => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Reset timer to initial or given time
  const resetTimer = (time = initialTime) => {
    stopTimer();
    setTimeRemaining(time);
  };

  // Effect to handle countdown logic
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false);
            if (onTimeUp) onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeRemaining, onTimeUp]);

  return {
    timeRemaining,
    isActive,
    startTimer,
    stopTimer,
    resetTimer,
  };
};

// Hook for polling data at intervals
export const usePolling = (fetchFunction, interval = 2000, dependencies = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const { addToast } = useToast();

  // Start polling at given interval
  const startPolling = () => {
    if (intervalRef.current) return; // Already polling

    intervalRef.current = setInterval(async () => {
      try {
        const result = await fetchFunction();
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Polling error:', err);
        setError(err);
        // Avoid spamming toast on every polling error
      }
    }, interval);
  };

  // Stop polling and clear interval
  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Fetch data once immediately
  const fetchOnce = async () => {
    try {
      const result = await fetchFunction();
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err);
      addToast('Failed to fetch data', 'error');
      throw err;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    data,
    error,
    startPolling,
    stopPolling,
    fetchOnce,
  };
};

// Hook for managing form state and validation
export const useForm = (initialValues, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Set value and clear error for a field
  const setValue = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Mark field as touched
  const markTouched = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  // Validate fields based on rules
  const validate = () => {
    const newErrors = {};

    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = values[field];

      if (rules.required && (!value || value.toString().trim() === '')) {
        newErrors[field] = `${field} is required`;
      } else if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[field] = `${field} must be at least ${rules.minLength} characters`;
      } else if (rules.email && value && !/\S+@\S+\.\S+/.test(value)) {
        newErrors[field] = 'Please enter a valid email';
      } else if (rules.custom && value) {
        const customError = rules.custom(value);
        if (customError) {
          newErrors[field] = customError;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset form to initial state
  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  // Handle input change event
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValue(name, type === 'checkbox' ? checked : value);
  };

  // Handle input blur event
  const handleBlur = (e) => {
    const { name } = e.target;
    markTouched(name);
  };

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched: markTouched,
    validate,
    reset,
    handleChange,
    handleBlur,
  };
};

// Hook for managing local storage with state sync
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Set value in state and localStorage
  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Remove value from localStorage and reset state
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
};

// Hook for debouncing a value with delay
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};