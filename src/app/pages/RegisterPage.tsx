import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, Phone, Upload, CheckCircle, ArrowRight, MapPin, AlertCircle, Loader, FileText } from "lucide-react";
import { BantayLogo } from "../components/ui/BantayLogo";
import { VerificationNotification } from "../components/ui/VerificationNotification";
import { registerUser, verifyOtp, generateOtp, uploadToCloudinary } from "../services/api";

const steps = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "ID Upload", icon: Upload },
  { id: 3, label: "Verification", icon: CheckCircle },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [idUploaded, setIdUploaded] = useState(false);
  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [idFileName, setIdFileName] = useState<string>("");
  const [uploadingId, setUploadingId] = useState(false);
  const [otpResent, setOtpResent] = useState(false);
  const [showVerificationNotification, setShowVerificationNotification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
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

  const handleNext = async () => {
    setError(null);

    // Step 1 -> Step 2: Register with backend (generates OTP)
    if (step === 1) {
      // Frontend validation
      if (!form.firstName || !form.lastName || !form.email || !form.password || !form.barangay) {
        setError("Please fill in all required fields");
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        setError("Please enter a valid email address");
        return;
      }

      if (form.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      if (!acceptedTerms || !acceptedPrivacy) {
        setError("You must accept the Terms of Service and Privacy Policy to continue");
        return;
      }

      // Validate phone if provided
      if (form.phone && !/^\d{10,15}$/.test(form.phone.replace(/\D/g, ""))) {
        setError("Please enter a valid phone number (10-15 digits)");
        return;
      }

      setLoading(true);
      const { data, error: apiError } = await registerUser({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        barangay: form.barangay,
        role: "resident",
      });

      if (apiError) {
        setError(apiError);
        setLoading(false);
        return;
      }

      if (data) {
        setStep(2);
      }
      setLoading(false);
      return;
    }

    // Step 2 -> Step 3: Check ID uploaded and generate OTP
    if (step === 2) {
      if (!idUploaded || !idPhotoUrl) {
        setError("Please upload your ID to continue");
        return;
      }
      
      // Generate OTP on Step 3 entry (creates pending registration + sends OTP)
      setLoading(true);
      const { data, error: otpError } = await generateOtp({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        barangay: form.barangay,
        role: "resident",
        idPhotoUrl: idPhotoUrl,
      });
      setLoading(false);
      
      if (otpError) {
        setError("Failed to generate verification code: " + otpError);
        return;
      }
      
      // Clear OTP fields for fresh entry
      setOtp(["", "", "", "", "", ""]);
      setStep(3);
      return;
    }

    // Step 3: Verify OTP and complete registration
    if (step === 3) {
      const otpCode = otp.join("");
      if (otpCode.length !== 6) {
        setError("Please enter the complete 6-digit OTP code");
        return;
      }

      setLoading(true);
      const { data, error: apiError } = await verifyOtp({
        email: form.email,
        otp: otpCode,
        idPhotoUrl: idPhotoUrl || undefined,
      });

      if (apiError) {
        setError(apiError);
        setLoading(false);
        return;
      }

      if (data?.success) {
        // ✅ Registration completed, user is pending admin verification
        // Do NOT auto-login - show pending message instead
        setError(null);
        
        // Show beautiful verification notification
        setVerificationEmail(form.email);
        setShowVerificationNotification(true);
      } else {
        setError(data?.message || "OTP verification failed");
      }
      setLoading(false);
    }
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setUploadingId(true);
    setError(null);

    const { data, error } = await uploadToCloudinary(file);

    if (error) {
      setError("Failed to upload ID: " + error);
      setUploadingId(false);
      return;
    }

    if (data) {
      setIdPhotoUrl(data.url);
      setIdFileName(file.name);
      setIdUploaded(true);
    }

    setUploadingId(false);
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);

    const { data, error } = await resendOtp({
      email: form.email,
    });

    if (error) {
      setError("Failed to resend OTP: " + error);
      setLoading(false);
      return;
    }

    if (data?.success) {
      setOtpResent(true);
      setTimeout(() => setOtpResent(false), 3000);
    }

    setLoading(false);
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      setTimeout(() => {
        const next = document.getElementById(`otp-${index + 1}`);
        next?.focus();
      }, 0);
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
            <BantayLogo size={48} />
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
              <BantayLogo size={32} />
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
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-medium">Error</p>
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              </motion.div>
            )}

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

                {/* Terms & Privacy Checkboxes */}
                <div className="mt-6 space-y-3 pt-6 border-t border-gray-200">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptedTerms && acceptedPrivacy}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked);
                        setAcceptedPrivacy(e.target.checked);
                      }}
                      className="mt-1 w-4 h-4 accent-red-700 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="font-semibold hover:underline"
                        style={{ color: "#800000" }}
                      >
                        Terms of Service
                      </button>
                      {" "}and{" "}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="font-semibold hover:underline"
                        style={{ color: "#800000" }}
                      >
                        Privacy Policy
                      </button>
                    </span>
                  </label>
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

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIdUpload}
                    className="hidden"
                  />

                  <div
                    onClick={() => !uploadingId && fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      idUploaded
                        ? "border-green-400 bg-green-50"
                        : uploadingId
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-gray-400 bg-gray-50"
                    }`}
                    style={{ 
                      borderColor: idUploaded ? "#16a34a" : uploadingId ? "#3b82f6" : undefined,
                      opacity: uploadingId ? 0.7 : 1
                    }}
                  >
                    {uploadingId ? (
                      <>
                        <Loader className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
                        <p className="text-blue-700 font-medium text-sm">Uploading your ID...</p>
                        <p className="text-blue-600 text-xs mt-1">Please wait</p>
                      </>
                    ) : idUploaded ? (
                      <>
                        <img src={idPhotoUrl || ""} alt="Uploaded ID" className="w-32 h-32 object-cover rounded-lg mx-auto mb-3" />
                        <p className="text-green-700 font-medium text-sm">ID Uploaded Successfully</p>
                        <p className="text-green-600 text-xs mt-1">{idFileName}</p>
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
                    <span className="font-medium text-gray-700">{form.email}</span>
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          const newOtp = [...otp];
                          newOtp[i] = value;
                          setOtp(newOtp);
                          
                          // Move to next field if user entered a digit
                          if (value && i < 5) {
                            setTimeout(() => {
                              const nextInput = document.getElementById(`otp-${i + 1}`);
                              nextInput?.focus();
                            }, 0);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            if (otp[i]) {
                              // If current field has a value, just clear it
                              const newOtp = [...otp];
                              newOtp[i] = "";
                              setOtp(newOtp);
                            } else if (i > 0) {
                              // If current field is empty, move to previous field
                              const prevInput = document.getElementById(`otp-${i - 1}`);
                              prevInput?.focus();
                            }
                          }
                        }}
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

                  {otpResent && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 animate-pulse">
                      <p className="text-blue-700 text-sm font-medium">OTP Resent</p>
                      <p className="text-blue-600 text-xs">Check your email for the new code.</p>
                    </div>
                  )}

                  <p className="text-center text-sm text-gray-500">
                    Didn't receive a code?{" "}
                    <button 
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="font-medium hover:underline disabled:opacity-50"
                      style={{ color: "#800000" }}
                    >
                      {loading ? "Sending..." : "Resend OTP"}
                    </button>
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

      {/* Verification Notification Modal */}
      <AnimatePresence>
        {showVerificationNotification && (
          <VerificationNotification
            email={verificationEmail}
            onClose={() => setShowVerificationNotification(false)}
            onNavigate={() => {
              setShowVerificationNotification(false);
              navigate("/", { replace: true });
            }}
          />
        )}
      </AnimatePresence>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTermsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5" style={{ color: "#800000" }} />
                  <h3 className="text-xl font-bold text-gray-900">Terms of Service</h3>
                </div>
                <p className="text-sm text-gray-500">Last updated: April 2026</p>
              </div>

              <div className="p-6 space-y-4 text-sm text-gray-700">
                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h4>
                  <p>By using Bantay SP, you agree to comply with these Terms of Service. If you do not agree, please do not use the platform.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">2. User Responsibilities</h4>
                  <p>Users must provide accurate information during registration. You are responsible for maintaining the confidentiality of your account credentials. All activities under your account are your responsibility.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">3. Community Guidelines</h4>
                  <p>Reports must be truthful and submitted in good faith. Users must not submit false, defamatory, or misleading reports. Harassment, hate speech, or illegal content is strictly prohibited.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">4. ID Verification</h4>
                  <p>Users must provide valid government-issued identification for account verification. Bantay SP reserves the right to deny service to users who fail verification or provide false information.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">5. Limitation of Liability</h4>
                  <p>Bantay SP is provided on an "as-is" basis. We do not guarantee the accuracy, completeness, or timeliness of reports. Users use the platform at their own risk.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">6. Termination</h4>
                  <p>Bantay SP reserves the right to suspend or terminate accounts that violate these terms or our community guidelines.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">7. Changes to Terms</h4>
                  <p>We may update these terms at any time. Continued use of Bantay SP constitutes acceptance of updated terms.</p>
                </section>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTermsModal(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-all"
                  style={{ backgroundColor: "#800000" }}
                >
                  Accept & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPrivacyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5" style={{ color: "#800000" }} />
                  <h3 className="text-xl font-bold text-gray-900">Privacy Policy</h3>
                </div>
                <p className="text-sm text-gray-500">Last updated: April 2026</p>
              </div>

              <div className="p-6 space-y-4 text-sm text-gray-700">
                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">1. Information We Collect</h4>
                  <p>We collect personal information including name, email, phone number, government ID, location, and report details. We also collect IP addresses and device information for security purposes.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">2. How We Use Your Information</h4>
                  <p>Your information is used to verify your identity, process reports, improve our services, and communicate with you about your account. We do not sell your personal data to third parties.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">3. Data Security</h4>
                  <p>We implement industry-standard security measures to protect your information. However, no system is completely secure. Users are responsible for protecting their account credentials.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">4. Report Visibility</h4>
                  <p>Community reports may be visible to authorized personnel (admin, patrol, barangay officials) to facilitate response and resolution. Anonymous reports are handled separately with reduced visibility.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">5. Cookies and Tracking</h4>
                  <p>Bantay SP uses cookies and analytics to understand usage patterns and improve user experience. You can control cookie settings in your browser.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">6. Your Rights</h4>
                  <p>You have the right to access, update, or delete your personal information. Contact us for assistance with data requests or privacy concerns.</p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900 mb-2">7. Contact Us</h4>
                  <p>For privacy inquiries, please contact: privacy@bantaysp.gov.ph</p>
                </section>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setAcceptedPrivacy(true);
                    setShowPrivacyModal(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-all"
                  style={{ backgroundColor: "#800000" }}
                >
                  Accept & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}