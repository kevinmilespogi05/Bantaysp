import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft, User, Phone, Upload, CheckCircle, ArrowRight, MapPin } from "lucide-react";

const steps = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "ID Upload", icon: Upload },
  { id: 3, label: "Verification", icon: CheckCircle },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [idUploaded, setIdUploaded] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    barangay: "",
    password: "",
  });

  const barangays = [
    "Brgy. San Pablo", "Brgy. Del Pilar", "Brgy. Looc", "Brgy. Sta. Maria",
    "Brgy. San Juan", "Brgy. Balaybay", "Brgy. Nagbayan", "Brgy. San Agustin",
  ];

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      setLoading(true);
      setTimeout(() => { navigate("/app/dashboard"); }, 1500);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f7f9fb" }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-col justify-center px-12 py-16" style={{ backgroundColor: "#800000" }}>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1739525346229-6e122171f68d?w=800)` }}
        />
        <div className="relative z-10">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/70 hover:text-white mb-10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-xl">Bantay SP</div>
              <div className="text-white/60 text-sm">Community Safety Platform</div>
            </div>
          </div>

          <h2 className="text-white mb-4" style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.2 }}>
            Join the Community<br />Guardian Network.
          </h2>
          <p className="text-white/70 text-sm mb-10" style={{ lineHeight: 1.7 }}>
            Become a verified community safety reporter. Your identity is verified
            through a government-issued ID to ensure trusted, authentic reports.
          </p>

          {/* Step indicators */}
          <div className="space-y-4">
            {steps.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  step === s.id ? "bg-white/20" : step > s.id ? "bg-white/10" : "opacity-50"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step > s.id ? "bg-green-400" : "bg-white/20"}`}>
                  {step > s.id ? <CheckCircle className="w-4 h-4 text-white" /> : <s.icon className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">Step {s.id}: {s.label}</div>
                  {step === s.id && <div className="text-white/60" style={{ fontSize: "11px" }}>Current step</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden mb-6">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#800000" }}>
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="font-bold text-gray-900">Bantay SP</div>
            </div>
            {/* Mobile step progress */}
            <div className="flex gap-1.5 mb-2">
              {steps.map((s) => (
                <div
                  key={s.id}
                  className="h-1.5 flex-1 rounded-full transition-all"
                  style={{ backgroundColor: step >= s.id ? "#800000" : "#e5e7eb" }}
                />
              ))}
            </div>
            <p className="text-gray-400 text-sm">Step {step} of 3: {steps[step - 1].label}</p>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h2 className="text-gray-900 mb-1" style={{ fontSize: "1.6rem", fontWeight: 700 }}>Create Account</h2>
                  <p className="text-gray-500 text-sm">Fill in your personal information to get started.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        placeholder="Juan"
                        className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none bg-white"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        placeholder="dela Cruz"
                        className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none bg-white"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="juan@email.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none bg-white"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="09XX XXX XXXX"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none bg-white"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={form.barangay}
                        onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none bg-white appearance-none"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      >
                        <option value="">Select your barangay</option>
                        {barangays.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Create a strong password"
                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none bg-white"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: ID Upload */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h2 className="text-gray-900 mb-1" style={{ fontSize: "1.6rem", fontWeight: 700 }}>Identity Verification</h2>
                  <p className="text-gray-500 text-sm">Upload a valid government-issued ID for account verification.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accepted ID Types</label>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {["PhilSys ID", "Voter's ID", "Driver's License", "Passport", "SSS ID", "UMID"].map((id) => (
                        <div key={id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          <span className="text-xs text-gray-600">{id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    onClick={() => setIdUploaded(true)}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      idUploaded
                        ? "border-green-400 bg-green-50"
                        : "border-gray-200 hover:border-gray-400 bg-gray-50"
                    }`}
                    style={{ borderColor: idUploaded ? "#16a34a" : undefined }}
                  >
                    {idUploaded ? (
                      <>
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-green-700 font-medium text-sm">ID Uploaded Successfully</p>
                        <p className="text-green-600 text-xs mt-1">philippine_national_id.jpg</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium text-sm">Click to upload your ID</p>
                        <p className="text-gray-400 text-xs mt-1">PNG, JPG up to 10MB</p>
                      </>
                    )}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-amber-700 text-xs leading-relaxed">
                      <strong>Privacy Notice:</strong> Your ID is used solely for identity verification
                      and will not be shared with third parties. Data is encrypted and stored securely.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: OTP Verification */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h2 className="text-gray-900 mb-1" style={{ fontSize: "1.6rem", fontWeight: 700 }}>Enter OTP Code</h2>
                  <p className="text-gray-500 text-sm">
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-gray-700">{form.phone || "09XX XXX XXXX"}</span>
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, i)}
                        className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 bg-white outline-none transition-all"
                        style={{ borderColor: digit ? "#800000" : undefined }}
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = digit ? "#800000" : "#e5e7eb")}
                      />
                    ))}
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <div>
                      <p className="text-green-700 text-sm font-medium">Almost there!</p>
                      <p className="text-green-600 text-xs">Enter the code to complete your registration.</p>
                    </div>
                  </div>

                  <p className="text-center text-sm text-gray-500">
                    Didn't receive a code?{" "}
                    <button className="font-medium hover:underline" style={{ color: "#800000" }}>Resend OTP</button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-70"
              style={{ backgroundColor: "#800000" }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : step === 3 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Complete Registration
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {step === 1 && (
            <p className="text-center text-gray-500 text-sm mt-4">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: "#800000" }}>Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
