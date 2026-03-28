import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useAuthStore, UserInfo } from '../../stores/authStore';

interface LoginForm {
  username: string;
  password: string;
}

interface LoginErrors {
  username?: string;
  password?: string;
  general?: string;
}

function validate(form: LoginForm): LoginErrors {
  const errors: LoginErrors = {};
  if (!form.username.trim()) {
    errors.username = '请输入用户名';
  }
  if (!form.password) {
    errors.password = '请输入密码';
  }
  return errors;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, setActiveCheckout } = useAuthStore();

  const [form, setForm] = useState<LoginForm>({ username: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof LoginForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on input
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await apiClient.post<{
        token: string;
        userInfo: UserInfo & { activeCheckout?: { pageId: string; pageName: string; branch: string } };
      }>('/auth/login', {
        username: form.username.trim(),
        password: form.password,
      });

      const { token, userInfo } = res.data;
      const { activeCheckout, ...user } = userInfo;
      login(token, user);

      if (activeCheckout) {
        setActiveCheckout(activeCheckout);
        navigate(`/ide/${activeCheckout.pageId}`, { replace: true });
      } else {
        navigate('/pages', { replace: true });
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { status?: number; data?: { message?: string } } }).response
      ) {
        const response = (err as { response: { status: number; data?: { message?: string } } })
          .response;
        if (response.status === 401) {
          setErrors({ general: '账号或密码错误' });
        } else if (response.status === 409) {
          setErrors({ general: '该账号已在其他设备登录，请先退出' });
        } else {
          setErrors({
            general: response.data?.message || '登录失败，请稍后重试',
          });
        }
      } else {
        setErrors({ general: '网络异常，请检查连接' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-center">
      <div className="modal">
        <h1 className="login-title">Appsmith AI-IDE</h1>
        <p className="login-subtitle">登录到开发环境</p>

        <form onSubmit={handleSubmit} className="login-form">
          {errors.general && <div className="error-banner">{errors.general}</div>}

          <div className="form-field">
            <label className="form-label" htmlFor="username">
              用户名
            </label>
            <input
              id="username"
              type="text"
              className={`form-input${errors.username ? ' error' : ''}`}
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              autoFocus
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              className={`form-input${errors.password ? ' error' : ''}`}
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn btn-p" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
