import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export const Terms = () => {
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
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">Aetheris Terms of Service</h1>
              <p className="text-slate-500 text-sm font-medium">Last Updated: August 14, 2026 at 00:00 UTC</p>
            </div>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                By accessing or using the platform operated by Aetheris Investment Group LLC ("Aetheris", "Platform", "Service", "We", "Us", or "Our"), you agree to be bound by these Terms of Service and all applicable laws and regulations.
              </p>
              <p className="text-slate-600 leading-relaxed">
                If you do not agree to these Terms, you must not access or use the Platform.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">2. Eligibility</h2>
              <p className="text-slate-600 leading-relaxed">
                To use Aetheris, you must:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Be at least 18 years old.</li>
                <li>Have the legal capacity to enter into binding agreements.</li>
                <li>Comply with all applicable laws within your jurisdiction.</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                We reserve the right to suspend or terminate accounts that violate eligibility requirements.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">3. User Accounts</h2>
              <p className="text-slate-600 leading-relaxed">
                Users are responsible for:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Maintaining account security.</li>
                <li>Protecting login credentials.</li>
                <li>Providing accurate information.</li>
                <li>Promptly notifying us of unauthorized account access.</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                Users are solely responsible for activities occurring under their accounts.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">4. Platform Services</h2>
              <p className="text-slate-600 leading-relaxed">
                Aetheris provides digital financial tools, portfolio management features, analytics services, reporting tools, referral systems, and related platform services.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Platform features may be modified, updated, suspended, or discontinued at any time.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">5. Deposits and Account Funding</h2>
              <p className="text-slate-600 leading-relaxed">
                Users may fund their accounts through approved payment methods.
              </p>
              <p className="text-slate-600 leading-relaxed">
                All transactions are subject to:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Verification procedures</li>
                <li>Security reviews</li>
                <li>Fraud prevention checks</li>
                <li>Payment provider policies</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                We reserve the right to reject suspicious transactions.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">6. Withdrawals</h2>
              <p className="text-slate-600 leading-relaxed">
                Withdrawal requests may be subject to:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Identity verification</li>
                <li>Compliance checks</li>
                <li>Security reviews</li>
                <li>Processing timelines</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                The Platform reserves the right to delay or deny withdrawals where fraudulent or unauthorized activity is suspected.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">7. Risk Disclosure</h2>
              <p className="text-slate-600 leading-relaxed">
                All financial activities involve risk.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Users acknowledge that:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Performance may vary.</li>
                <li>Past performance does not guarantee future results.</li>
                <li>Market conditions may impact outcomes.</li>
                <li>Capital loss may occur.</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                Users are responsible for evaluating risks before participating.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">8. Referral Program</h2>
              <p className="text-slate-600 leading-relaxed">
                Referral rewards may be offered through designated referral programs.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Abuse of referral systems, including:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Fake accounts</li>
                <li>Self-referrals</li>
                <li>Fraudulent activity</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                may result in account suspension and forfeiture of rewards.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">9. Prohibited Activities</h2>
              <p className="text-slate-600 leading-relaxed">
                Users may not:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Engage in fraud.</li>
                <li>Use stolen payment methods.</li>
                <li>Manipulate platform systems.</li>
                <li>Attempt unauthorized access.</li>
                <li>Interfere with platform security.</li>
                <li>Violate applicable laws.</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                Violations may result in permanent account termination.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">10. Intellectual Property</h2>
              <p className="text-slate-600 leading-relaxed">
                All platform content, branding, graphics, software, trademarks, and materials remain the property of Aetheris unless otherwise stated.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Unauthorized use is prohibited.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">11. Account Suspension and Termination</h2>
              <p className="text-slate-600 leading-relaxed">
                We reserve the right to suspend or terminate accounts for:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Terms violations</li>
                <li>Fraudulent activity</li>
                <li>Security concerns</li>
                <li>Regulatory compliance requirements</li>
              </ul>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">12. Limitation of Liability</h2>
              <p className="text-slate-600 leading-relaxed">
                To the fullest extent permitted by law, Aetheris shall not be liable for:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Indirect damages</li>
                <li>Lost profits</li>
                <li>Data loss</li>
                <li>Business interruptions</li>
                <li>Third-party service failures</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                Use of the platform is at the user's own risk.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">13. Third-Party Services</h2>
              <p className="text-slate-600 leading-relaxed">
                The Platform may integrate third-party providers including:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 marker:text-slate-300">
                <li>Payment processors</li>
                <li>Authentication providers</li>
                <li>Analytics providers</li>
                <li>Email providers</li>
                <li>Cloud hosting services</li>
              </ul>
              <p className="text-slate-600 leading-relaxed pt-2">
                We are not responsible for third-party service interruptions.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">14. Amendments</h2>
              <p className="text-slate-600 leading-relaxed">
                We may modify these Terms at any time.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Updated Terms will be published on the Platform.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Continued use constitutes acceptance of revised Terms.
              </p>
            </section>

            <section className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-slate-900">15. Contact Information</h2>
              <p className="text-slate-600 leading-relaxed">
                For support, operational inquiries, or legal notifications:
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
