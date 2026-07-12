import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="wordmark">
          <div className="drop"></div>
          <div>
            <span>HYDRIS</span>
            <small>SUPPLIER COMMAND CENTER</small>
          </div>
        </div>
        <h1>Sign in</h1>
        <div className="sub">Access the supplier water-risk dashboard.</div>
        <LoginForm />
      </div>
    </div>
  );
}
