import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export const Privacy = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 md:px-8 h-16 flex items-center">
          <Link to="/" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="pt-12 pb-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto bg-white p-8 md:p-14 shadow-sm rounded-2xl border border-slate-200">
          <div className="space-y-8">
            <div className="border-b border-slate-100 pb-8 mb-8">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">Aetheris Privacy Policy</h1>
              <p className="text-slate-500 text-sm font-medium">Last Updated: August 14, 2026 at 00:00 UTC</p>
            </div>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">1. Introduction</h2>
              <p className="text-slate-600 leading-relaxed">
                Aetheris Investment Group LLC ("Aetheris", "Company", "We", "Us", or "Our") values your privacy and is committed to protecting your personal information and financial data.
              </p>
              <p className="text-slate-600 leading-relaxed">
                This Privacy Policy explains how information is collected, used, processed, stored, and protected across our investment platform and related digital services.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">2. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold text-slate-800 mt-4">Account Information</h3>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Username</li>
                <li>Email Address</li>
                <li>Phone Number (if provided)</li>
                <li>Profile Information</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-800 mt-4">Authentication Information</h3>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Login Activity</li>
                <li>Device Information</li>
                <li>Authentication Tokens</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-800 mt-4">Transaction Information</h3>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Deposits</li>
                <li>Withdrawals</li>
                <li>Account Activity</li>
                <li>Referral Activity</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-800 mt-4">Technical Information</h3>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>IP Address</li>
                <li>Browser Type</li>
                <li>Device Type</li>
                <li>Operating System</li>
                <li>Usage Analytics</li>
              </ul>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">3. How We Use Information</h2>
              <p className="text-slate-600 leading-relaxed">
                Information may be used to:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Provide platform services</li>
                <li>Process transactions</li>
                <li>Verify accounts</li>
                <li>Improve platform functionality</li>
                <li>Send notifications</li>
                <li>Prevent fraud</li>
                <li>Maintain security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">4. Email Communications</h2>
              <p className="text-slate-600 leading-relaxed">
                Users may receive emails relating to:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Account verification</li>
                <li>Security alerts</li>
                <li>Transaction notifications</li>
                <li>Platform updates</li>
                <li>Support communications</li>
              </ul>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">5. Push Notifications</h2>
              <p className="text-slate-600 leading-relaxed">
                Users may receive push notifications relating to:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Deposits</li>
                <li>Withdrawals</li>
                <li>Investment activity</li>
                <li>Security events</li>
                <li>Account updates</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                Users may disable notifications through device settings.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">6. Data Storage and Security</h2>
              <p className="text-slate-600 leading-relaxed">
                We implement reasonable security measures including:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Encryption</li>
                <li>Access controls</li>
                <li>Authentication safeguards</li>
                <li>Security monitoring</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                No system can guarantee absolute security.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">7. Sharing Information</h2>
              <p className="text-slate-600 leading-relaxed">
                We do not sell personal information.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Information may be shared with:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Payment processors</li>
                <li>Cloud infrastructure providers</li>
                <li>Authentication providers</li>
                <li>Legal authorities where required</li>
              </ul>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">8. Cookies and Analytics</h2>
              <p className="text-slate-600 leading-relaxed">
                We may use:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Essential Cookies</li>
                <li>Performance Cookies</li>
                <li>Analytics Technologies</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                to improve user experience and platform performance.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">9. User Rights</h2>
              <p className="text-slate-600 leading-relaxed">
                Users may request:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Access to personal data</li>
                <li>Correction of inaccurate information</li>
                <li>Deletion requests where applicable</li>
                <li>Account closure</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                Requests may be submitted through support channels.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">10. Data Retention</h2>
              <p className="text-slate-600 leading-relaxed">
                Information may be retained:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>To provide services</li>
                <li>To comply with legal requirements</li>
                <li>To resolve disputes</li>
                <li>To enforce agreements</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                Retention periods may vary based on applicable laws.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">11. Children's Privacy</h2>
              <p className="text-slate-600 leading-relaxed">
                Aetheris is not intended for individuals under 18 years of age.
              </p>
              <p className="text-slate-600 leading-relaxed">
                We do not knowingly collect information from minors.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">12. International Users</h2>
              <p className="text-slate-600 leading-relaxed">
                Users acknowledge that information may be processed and stored in jurisdictions different from their own.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">13. Policy Updates</h2>
              <p className="text-slate-600 leading-relaxed">
                This Privacy Policy may be updated periodically.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Updated versions will be posted on the Platform.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">14. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                For privacy-related inquiries, compliance questions, or data rights requests:
              </p>
              <div className="text-slate-600 leading-relaxed mt-2 space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p><span className="font-semibold text-slate-800">Company:</span> Aetheris Investment Group LLC</p>
                <p><span className="font-semibold text-slate-800">Support Email:</span> <a href="mailto:support@update.aetheriss.online" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium">support@update.aetheriss.online</a></p>
                <p><span className="font-semibold text-slate-800">Official Website:</span> <a href="https://aetheriss.online" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium">https://aetheriss.online</a></p>
                <p><span className="font-semibold text-slate-800">Corporate Headquarters:</span> Financial District, 100 Wall Street, New York, NY 10005, United States</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
