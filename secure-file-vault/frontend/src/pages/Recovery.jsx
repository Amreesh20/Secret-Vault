import { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowRight, AlertTriangle, Lock } from "lucide-react";

const Recovery = () => {
    const [answer, setAnswer] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    // We retrieve the email and key passed from the Login page
    const { email, private_key } = location.state || {};

    useEffect(() => {
        if (!email || !private_key) {
            navigate("/"); // Kick them out if they try to access this page directly
        }
    }, []);

    const handleVerify = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // 1. Attempt to Verify Identity
            const res = await axios.post("https://secret-vault-bbsy.onrender.com/verify-identity", {
                email: email,
                security_answer: answer
            });

            // 2. Success
            setSuccess("Identity Verified! Check your email for access restoration.");
            alert(`TEMPORARY PASSWORD: ${res.data.temp_password}\n\n(In production, this is emailed. Use this to reset your vault.)`);
            navigate("/"); // Send them back to login to try again

        } catch (err) {
            // 3. FAILED - TRIGGER DESTRUCTION
            if (err.response?.status === 410) { // 410 Gone = Destroyed
                setError("INCORRECT ANSWER. VAULT SELF-DESTRUCT INITIATED.");
                try {
                    await axios.post("https://secret-vault-bbsy.onrender.com/destroy-vault", {
                        user_email: email,
                        private_key: private_key
                    });
                    alert("🚨 SECURITY ALERT 🚨\n\nVAULT DESTROYED.\nFiles moved to quarantine.\nRecovery token sent to email.");
                    navigate("/");
                } catch (destroyErr) {
                    setError("Destruction failed (Server Error).");
                }
            } else {
                setError(err.response?.data?.detail || "Verification failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Red Background Pulse for Danger */}
            <div className="absolute top-0 left-0 w-full h-full bg-red-900/10 animate-pulse-slow pointer-events-none"></div>

            <div className="bg-slate-900 border-2 border-red-900/50 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10">

                <div className="text-center mb-6">
                    <div className="bg-red-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50 animate-pulse">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Security Check</h2>
                    <p className="text-red-400 text-sm mt-2 font-bold">FINAL ATTEMPT</p>
                    <p className="text-slate-400 text-xs mt-1">If you fail this, your vault will be destroyed.</p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Answer your Security Question</label>
                        <input
                            type="text"
                            onChange={(e) => setAnswer(e.target.value)}
                            className="w-full p-4 bg-slate-950 border border-slate-700 rounded-lg focus:border-red-500 outline-none text-white placeholder:text-slate-600 transition-colors"
                            placeholder="e.g. Fluffy"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <Lock className="w-4 h-4" /> {success}
                        </div>
                    )}

                    <button
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-500 text-white p-4 rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? "Verifying..." : "Verify Identity"} <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Recovery;
