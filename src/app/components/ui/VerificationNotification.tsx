/**
 * VerificationNotification — Beautiful notification for pending verification
 * 
 * Displays a polished alert when user registration is pending admin verification
 * with animated entrance and modern design.
 */

import { motion } from "motion/react";
import { CheckCircle, Clock, Mail } from "lucide-react";

interface VerificationNotificationProps {
  email: string;
  onClose: () => void;
  onNavigate: () => void;
}

export function VerificationNotification({
  email,
  onClose,
  onNavigate,
}: VerificationNotificationProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Notification Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-8 pt-8 pb-6 border-b border-emerald-100">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-100 rounded-full blur-lg opacity-50" />
                <CheckCircle className="w-16 h-16 text-emerald-600 relative" strokeWidth={1.5} />
              </div>
            </motion.div>

            {/* Title */}
            <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
              Almost There!
            </h2>
            <p className="text-center text-sm text-gray-600">
              Your registration is pending admin verification
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-6">
            {/* Info Boxes */}
            <div className="space-y-4">
              {/* Email Confirmation */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100"
              >
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Confirmation sent to
                  </p>
                  <p className="text-sm text-gray-600 break-all">{email}</p>
                </div>
              </motion.div>

              {/* Waiting Status */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100"
              >
                <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Admin Verification
                  </p>
                  <p className="text-sm text-gray-600">
                    Our team will review your information
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                Thank you for joining Bantay SP! We're verifying your information to ensure a safe community. You'll receive an email notification once your account is approved.
              </p>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                What happens next
              </p>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </div>
                    <div className="w-0.5 h-8 bg-gray-300 mt-1" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-gray-900">Review</p>
                    <p className="text-xs text-gray-600">ID verification and info check</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </div>
                    <div className="w-0.5 h-8 bg-gray-300 mt-1" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-gray-900">Approval</p>
                    <p className="text-xs text-gray-600">Get verified and approved</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-gray-900">Access</p>
                    <p className="text-xs text-gray-600">Log in and start protecting</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Stay Here
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNavigate}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:shadow-lg transition-shadow"
            >
              Go to Login
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
