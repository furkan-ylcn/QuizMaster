import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useForm } from '../../hooks/hooks';

const Register = () => {
  // Auth and toast context hooks
  const { register, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Form state and validation hook
  const { values, errors, handleChange, handleBlur, validate, reset } = useForm(
    { username: '', email: '', password: '', role: 'player' },
    {
      username: { required: true, minLength: 3 },
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
      role: { required: true }
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
      addToast('Please fill in all required fields correctly', 'error');
      return;
    }

    const result = await register(values);

    if (result.success) {
      addToast('Registration successful! Please login.', 'success');
      reset();
      navigate('/login');
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
              <i className="fas fa-user-plus"></i>
              Register
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
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                {errors.email && <span className="error">{errors.email}</span>}
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

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={values.role}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                >
                  <option value="player">Player</option>
                  <option value="instructor">Instructor</option>
                </select>
                {errors.role && <span className="error">{errors.role}</span>}
              </div>

              <button type="submit" className="btn btn-primary">
                <i className="fas fa-user-plus"></i>
                Register
              </button>
            </form>

            <div className="auth-link">
              <p>Already have an account? <Link to="/login">Login here</Link></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;