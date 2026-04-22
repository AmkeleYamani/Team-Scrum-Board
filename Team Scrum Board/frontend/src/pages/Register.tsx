import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const response = await api.post("/auth/register", { name, email, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/dashboard");
    } catch (err: unknown) {
      setError("Unable to register. Please try again.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Create an account</h2>
      <p className="mt-2 text-sm text-slate-500">Register to start managing projects and tasks.</p>
      {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 focus:border-slate-900"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 focus:border-slate-900"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 focus:border-slate-900"
          />
        </label>
        <button className="w-full rounded bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700" type="submit">
          Register
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-500">
        Already have an account? <Link to="/login" className="font-semibold text-slate-900 underline">Login</Link>
      </p>
    </div>
  );
}

export default Register;
