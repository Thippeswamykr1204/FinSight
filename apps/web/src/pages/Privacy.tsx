import { Link } from "react-router-dom";
import { Brand } from "../components/AppShell";

export default function Privacy() {
  return (
    <div className="privacy-page">
      <Brand />
      <p className="eyebrow" style={{ marginTop: 70 }}>
        Privacy notice · October 21, 2026
      </p>
      <h1>Privacy should be a product decision.</h1>
      <p>
        FinSight is designed for people who keep their own financial records.
        This notice describes the data the application receives, why it is used,
        and the controls available to you.
      </p>
      <h2>What we store</h2>
      <p>
        We store your account profile, encrypted email address, workspace
        records, and security events needed to operate the service. Money values
        are stored as integer paise, never floating-point currency values. We do
        not connect to bank accounts in this release.
      </p>
      <h2>How we protect it</h2>
      <p>
        Passwords are hashed with Argon2id. Access tokens are short-lived,
        refresh tokens rotate in secure HTTP-only cookies, and sensitive fields
        use AES-256-GCM field encryption. Financial records are not placed in
        the browser offline cache. Operators should configure HTTPS, a private
        MongoDB connection, and a production encryption key before serving real
        data.
      </p>
      <h2>Your choices</h2>
      <p>
        You can export your personal data, export an owned workspace, and delete
        your account after transferring or deleting owned workspaces. Deletion
        is designed to remove operational records; legally required retention
        may apply to the operator’s hosting, security, or billing records.
      </p>
      <h2>Regions and contact</h2>
      <p>
        The interface uses India-first INR and Asia/Kolkata conventions.
        Operators deploying FinSight must publish a local contact, grievance
        process, retention schedule, and any additional disclosures required by
        the regions they serve. This product notice is not legal advice.
      </p>
      <p style={{ marginTop: 40 }}>
        <Link to="/register" className="section-link">
          Return to FinSight →
        </Link>
      </p>
    </div>
  );
}
