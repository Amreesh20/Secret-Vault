import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { Shield, Upload, FileLock, LogOut, User, Download, AlertTriangle, FileText, HardDrive, RefreshCw } from 'lucide-react';

const Dashboard = () => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState("");
    const [filesList, setFilesList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const userEmail = localStorage.getItem("userEmail");
    const vaultKey = localStorage.getItem("vaultKey");

    useEffect(() => {
        if (!userEmail || !vaultKey) {
            navigate("/");
        } else {
            fetchFiles();
        }
    }, []);

    const fetchFiles = async () => {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/files?user_email=${userEmail}`);
            setFilesList(res.data);
        } catch (err) {
            console.error("Failed to load files");
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/");
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus("");
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsLoading(true);
        setStatus("Encrypting & Uploading...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("password", vaultKey);
        formData.append("user_email", userEmail);

        try {
            await axios.post("http://127.0.0.1:8000/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setStatus("Upload Complete");
            setFile(null);
            fetchFiles();
            setTimeout(() => setStatus(""), 3000);
        } catch (error) {
            setStatus("Error: Upload failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (filename) => {
        try {
            const response = await axios.post("http://127.0.0.1:8000/download", {
                filename: filename,
                private_key: vaultKey,
                user_email: userEmail
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename.replace(".enc", ""));
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert("Decryption Failed! Integrity Check Failed.");
        }
    };

    const handleDestroy = async () => {
        const confirm = window.confirm("⚠️ EMERGENCY PROTOCOL ⚠️\n\nAre you sure? This is irreversible.");
        if (confirm) {
            try {
                const res = await axios.post("http://127.0.0.1:8000/destroy-vault", {
                    user_email: userEmail,
                    private_key: vaultKey
                });
                alert(`VAULT DESTROYED.\nRecovery Token: ${res.data.recovery_token}`);
                localStorage.clear();
                navigate("/");
            } catch (err) {
                alert("Destruction Error: " + err.message);
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">

            {/* Top Navigation */}
            <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600/20 p-2 rounded-lg">
                                <Shield className="w-6 h-6 text-blue-500" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-white">Vault<span className="text-blue-500">OS</span></span>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/50 py-1.5 px-3 rounded-full border border-slate-700/50">
                                <User size={14} className="text-blue-400" /> {userEmail}
                            </div>
                            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Actions */}
                    <div className="space-y-6">

                        {/* Upload Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>

                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-500" /> Secure Upload
                            </h3>

                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center transition-colors hover:border-blue-500/50 hover:bg-slate-800/30">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer block">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-400">
                                        <HardDrive size={24} />
                                    </div>
                                    <span className="text-sm text-slate-300 font-medium block">
                                        {file ? file.name : "Click to select file"}
                                    </span>
                                    <span className="text-xs text-slate-500 mt-1 block">AES-256 GCM Encryption</span>
                                </label>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!file || isLoading}
                                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                {isLoading ? "Processing..." : "Encrypt & Store"}
                            </button>

                            {status && <p className="mt-3 text-center text-sm text-emerald-400 font-medium animate-fade-in">{status}</p>}
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-red-500/10 p-2 rounded-lg">
                                    <AlertTriangle className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h4 className="text-red-400 font-bold">Emergency Protocol</h4>
                                    <p className="text-red-300/60 text-xs mt-1 leading-relaxed">
                                        Immediately locks vault and moves all files to deep quarantine. Irreversible without token.
                                    </p>
                                    <button
                                        onClick={handleDestroy}
                                        className="mt-3 text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded font-bold transition-colors"
                                    >
                                        DESTROY VAULT
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: File List */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[500px] flex flex-col">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <FileLock className="w-5 h-5 text-emerald-500" /> Encrypted Storage
                                </h3>
                                <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                    {filesList.length} FILES
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2">
                                {filesList.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                                        <FileText size={48} />
                                        <p>Vault is empty</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filesList.map((f) => (
                                            <div key={f.name} className="group flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-blue-500/30 hover:bg-slate-800/50 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-slate-900 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
                                                        <FileLock size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate max-w-[200px] sm:max-w-xs">
                                                            {f.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                                                            {(f.size / 1024).toFixed(2)} KB • {new Date(f.created * 1000).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleDownload(f.name)}
                                                    className="text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300"
                                                >
                                                    <Download size={16} /> Decrypt
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Dashboard;
