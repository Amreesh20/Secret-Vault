import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Shield, Key, AlertTriangle, Copy, Check, ChevronLeft } from "lucide-react";

const Register = () => {
    const [formData, setFormData] = useState({ email: "", password: "", security_question: "Mothers Maiden Name", security_answer: "" });
    const [privateKey, setPrivateKey] = useState(null);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://127.0.0.1:8000/create-vault", formData);
            setPrivateKey(res.data.YOUR_PRIVATE_KEY);
        } catch (err) {
            setError(err.response?.data?.detail || "Registration Failed");
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(privateKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">

                {!privateKey ? (
                    <>
                        <div className="mb-8">
                            <Link to="/" className="text-slate-500 hover:text-white flex items-center gap-1 text-sm mb-6 transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Login</Link>
                            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                                <Shield className="w-8 h-8 text-emerald-500" /> Create Locker
                            </h2>
                            <p className="text-slate-400 text-sm">Initialize a new AES-256 encrypted vault.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <input name="email" placeholder="Email Address" onChange={handleChange} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-white transition-colors" required />
                                <input type="password" name="password" placeholder="Master Password" onChange={handleChange} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-white transition-colors" required />
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Recovery Question</label>
                                <select name="security_question" onChange={handleChange} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg mb-3 text-slate-300 outline-none focus:border-emerald-500">
                                    <option>Mothers Maiden Name</option>
                                    <option>First Pet Name</option>
                                    <option>Favorite Teacher</option>
                                </select>
                                <input name="security_answer" placeholder="Your Answer" onChange={handleChange} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-white transition-colors" required />
                            </div>

                            {error && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900/50">{error}</p>}

                            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all mt-4">
                                Generate Secure Keys
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center space-y-6 animate-fade-in">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                            <Key className="w-8 h-8 text-emerald-500" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white">Vault Initialized</h2>
                            <p className="text-slate-400 text-sm mt-1">This is your Master Private Key.</p>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg text-left">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-200/80 leading-relaxed">
                                    <span className="text-yellow-400 font-bold block mb-1">CRITICAL WARNING</span>
                                    We do not store this key. If you lose it, your data is mathematically impossible to recover. Save it immediately.
                                </p>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="bg-black p-4 rounded-lg border border-slate-800 text-left font-mono text-emerald-400 text-xs break-all leading-relaxed shadow-inner">
                                {privateKey}
                            </div>
                            <button
                                onClick={copyToClipboard}
                                className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-md transition-colors border border-slate-700"
                                title="Copy to Clipboard"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        <Link to="/" className="block w-full bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg font-bold border border-slate-700 transition-all">
                            I have saved it safely → Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;
