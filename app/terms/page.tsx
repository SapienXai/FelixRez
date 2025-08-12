import { Suspense } from "react"
import { MANAGEMENT_EMAIL } from "@/lib/email-service"

export default function TermsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>
            
            <div className="prose prose-gray max-w-none">
              <p className="text-sm text-gray-600 mb-6">
                Last updated: {new Date().toLocaleDateString()}
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 mb-4">
                  By using Felix Smile Company's reservation system, you agree to be bound by these Terms and Conditions. 
                  If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Reservation Policy</h2>
                <div className="space-y-3 text-gray-700">
                  <p>• Reservations are subject to availability and confirmation.</p>
                  <p>• You can edit your reservation within 3 hours of booking.</p>
                  <p>• If you cannot make your reservation, please cancel it to allow others to book.</p>
                  <p>• Late arrivals may result in table reassignment after a 15-minute grace period.</p>
                  <p>• No-shows may be subject to a cancellation fee.</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Cancellation Policy</h2>
                <p className="text-gray-700 mb-4">
                  Cancellations must be made at least 2 hours before your reservation time. 
                  Last-minute cancellations or no-shows may incur charges.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Restaurant Policies</h2>
                <div className="space-y-3 text-gray-700">
                  <p>• Dress code may apply at certain establishments.</p>
                  <p>• Special dietary requirements should be mentioned during booking.</p>
                  <p>• Children are welcome, but high chairs are subject to availability.</p>
                  <p>• Smoking is prohibited in all indoor areas.</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Liability</h2>
                <p className="text-gray-700 mb-4">
                  Felix Smile Company acts as a booking platform. We are not responsible for the quality of service, 
                  food, or any incidents that may occur at the restaurant premises.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Protection</h2>
                <p className="text-gray-700 mb-4">
                  Your personal information is handled in accordance with our Privacy Policy. 
                  We only collect information necessary for reservation management.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Changes to Terms</h2>
                <p className="text-gray-700 mb-4">
                  We reserve the right to modify these terms at any time. 
                  Continued use of our services constitutes acceptance of any changes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact Information</h2>
                <p className="text-gray-700">
                  For questions about these terms, please contact us at:
                  <br />Email: {MANAGEMENT_EMAIL}
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