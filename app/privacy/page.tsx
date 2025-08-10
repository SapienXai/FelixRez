import { Suspense } from "react"

export default function PrivacyPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
            
            <div className="prose prose-gray max-w-none">
              <p className="text-sm text-gray-600 mb-6">
                Last updated: {new Date().toLocaleDateString()}
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
                <div className="space-y-3 text-gray-700">
                  <p><strong>Personal Information:</strong></p>
                  <p>• Name, email address, and phone number for reservation purposes</p>
                  <p>• Special dietary requirements or accessibility needs</p>
                  <p>• Reservation history and preferences</p>
                  
                  <p className="mt-4"><strong>Technical Information:</strong></p>
                  <p>• IP address and browser information</p>
                  <p>• Cookies and usage data for website functionality</p>
                  <p>• Device information for mobile optimization</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
                <div className="space-y-3 text-gray-700">
                  <p>• Processing and managing your restaurant reservations</p>
                  <p>• Sending confirmation emails and reservation reminders</p>
                  <p>• Improving our services and user experience</p>
                  <p>• Communicating important updates about your reservations</p>
                  <p>• Analyzing usage patterns to enhance our platform</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Information Sharing</h2>
                <p className="text-gray-700 mb-4">
                  We share your reservation details with the respective restaurants to fulfill your booking. 
                  We do not sell, trade, or otherwise transfer your personal information to third parties 
                  without your consent, except as described in this policy.
                </p>
                <div className="space-y-2 text-gray-700">
                  <p><strong>We may share information with:</strong></p>
                  <p>• Partner restaurants for reservation fulfillment</p>
                  <p>• Service providers who assist in our operations</p>
                  <p>• Legal authorities when required by law</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
                <p className="text-gray-700 mb-4">
                  We implement appropriate security measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction. This includes:
                </p>
                <div className="space-y-2 text-gray-700">
                  <p>• Encrypted data transmission (SSL/TLS)</p>
                  <p>• Secure database storage</p>
                  <p>• Regular security audits and updates</p>
                  <p>• Limited access to personal data by authorized personnel only</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Cookies and Tracking</h2>
                <p className="text-gray-700 mb-4">
                  We use cookies to enhance your browsing experience, remember your preferences, 
                  and analyze website traffic. You can control cookie settings through your browser.
                </p>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Types of cookies we use:</strong></p>
                  <p>• Essential cookies for website functionality</p>
                  <p>• Analytics cookies to understand user behavior</p>
                  <p>• Preference cookies to remember your settings</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
                <div className="space-y-3 text-gray-700">
                  <p>You have the right to:</p>
                  <p>• Access your personal information we hold</p>
                  <p>• Correct inaccurate or incomplete data</p>
                  <p>• Request deletion of your personal information</p>
                  <p>• Opt-out of marketing communications</p>
                  <p>• Data portability where technically feasible</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
                <p className="text-gray-700 mb-4">
                  We retain your personal information only as long as necessary for the purposes outlined 
                  in this policy or as required by law. Reservation data is typically kept for 2 years 
                  for business and legal purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
                <p className="text-gray-700 mb-4">
                  Our services are not directed to children under 13. We do not knowingly collect 
                  personal information from children under 13. If you believe we have collected 
                  such information, please contact us immediately.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
                <p className="text-gray-700 mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of any 
                  significant changes by posting the new policy on this page and updating the 
                  "Last updated" date.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
                <p className="text-gray-700">
                  If you have questions about this Privacy Policy or our data practices, please contact us:
                  <br />Email: info@felixsmile.com
                  <br />Phone: +90 549 412 3888
                  <br />Address: Çıldır mah, 207. Sk. No: 66, 48700 Marmaris/Muğla
                </p>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <a 
                href="/reserve" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                ← Back to Reservations
              </a>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  )
}