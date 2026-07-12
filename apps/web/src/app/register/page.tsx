import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
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
        <h1>Register your facility</h1>
        <div className="sub">Create a supplier account to report and track your own water-risk data.</div>
        <RegisterForm />
      </div>
    </div>
  );
}
