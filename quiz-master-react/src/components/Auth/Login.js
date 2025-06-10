import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useForm } from '../../hooks/hooks';

const Login = () => {
  // Auth and toast context hooks
  const { login, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Form state and validation hook
  const { values, errors, handleChange, handleBlur, validate } = useForm(
    { username: '', password: '' },
    {
      username: { required: true },
      password: { required: true, minLength: 6 }
    }
  );

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    const result = await login(values);

    if (result.success) {
      addToast('Login successful!', 'success');
      navigate('/dashboard');
    } else {
      addToast(result.message, 'error');
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-form">
            <h2>
              <i className="fas fa-user-circle"></i>
              Login
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={values.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                {errors.username && <span className="error">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                {errors.password && <span className="error">{errors.password}</span>}
              </div>

              <button type="submit" className="btn btn-primary">
                <i className="fas fa-sign-in-alt"></i>
                Login
              </button>
            </form>

            <div className="auth-link">
              <p>Don't have an account? <Link to="/register">Register here</Link></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;