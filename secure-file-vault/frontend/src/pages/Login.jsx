import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Key, ArrowRight, ShieldCheck } from "lucide-react";

const Login = () => {
    const [formData, setFormData] = useState({ email: "", password: "", private_key: "" });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await axios.post("https://secret-vault-bbsy.onrender.com/login-vault", formData);
            localStorage.setItem("userEmail", formData.email);
            localStorage.setItem("vaultKey", formData.private_key);
            navigate("/dashboard");
        } catch (err) {
            // If Locked (403), go to the NEW Recovery Page
            if (err.response?.status === 403) {
                navigate("/recovery", {
                    state: {
                        email: formData.email,
                        private_key: formData.private_key
                    }
                });
            } else {
                setError(err.response?.data?.detail || "Access Denied.");
                setIsLoading(false); // Enable button again
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in relative z-10">

                <div className="text-center mb-8">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700 shadow-lg">
                        <ShieldCheck className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Secure Vault</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <input
                        name="email"
                        type="email"
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-950/50 border border-slate-700 rounded-lg text-slate-200 focus:border-blue-500 outline-none"
                        placeholder="Email"
                        required
                    />

                    <input
                        type="password"
                        name="password"
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-950/50 border border-slate-700 rounded-lg text-slate-200 focus:border-blue-500 outline-none"
                        placeholder="Password"
                        required
                    />

                    <textarea
                        name="private_key"
                        onChange={handleChange}
                        className="w-full p-3 bg-black/40 border border-slate-700 rounded-lg text-emerald-500 font-mono text-xs h-24 resize-none focus:border-emerald-500 outline-none"
                        placeholder="Private Key (Hex)"
                        required
                    />

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <Lock className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <button
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? "Verifying..." : "Unlock Vault"} <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                <div className="mt-6 text-center pt-6 border-t border-slate-800">
                    <Link to="/register" className="text-blue-400 hover:text-blue-300 text-sm">Create New Locker</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
