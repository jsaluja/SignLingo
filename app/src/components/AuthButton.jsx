import { signInWithGoogle, signOutUser } from "../lib/firebase";

export default function AuthButton({ user }) {
  if (!user) {
    return (
      <button className="auth-signin" onClick={() => signInWithGoogle().catch(e => console.error("[Auth]", e.code, e.message))}>
        Sign in
      </button>
    );
  }

  return (
    <div className="auth-user">
      {user.photoURL && (
        <img src={user.photoURL} className="auth-avatar" alt="" referrerPolicy="no-referrer" />
      )}
      <span className="auth-name">{user.displayName?.split(" ")[0]}</span>
      <button className="auth-signout" onClick={signOutUser}>Sign out</button>
    </div>
  );
}
