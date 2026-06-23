export default function Privacy() {
  return (
    <div className="min-h-screen bg-white text-gray-800 px-6 py-16 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy for Collade AI</h1>
      <p className="text-sm text-gray-500 mb-8">Effective Date: May 4, 2026</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
        <p className="mb-2">When you use Collade AI, we collect:</p>
        <ul className="list-disc ml-6 space-y-1">
          <li>Name and email address (when you sign in with Google)</li>
          <li>App interactions (career searches, credits used, features you use)</li>
        </ul>
        <p className="mt-2">We do not collect your location, payment info, contacts, photos, or device ID.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
        <p className="mb-2">We use your information to:</p>
        <ul className="list-disc ml-6 space-y-1">
          <li>Provide, operate, and improve Collade AI</li>
          <li>Manage your credits and account</li>
          <li>Understand how users interact with the app (analytics)</li>
          <li>Prevent fraud and abuse</li>
          <li>Personalize career suggestions</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Data Sharing</h2>
        <p>We do not sell or share your personal data with any third party. Payments are processed securely by Razorpay. We do not store your payment information.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Data Retention</h2>
        <p>Your data is stored as long as you have an active account. You can request account deletion by emailing <a href="mailto:arobindan@gmail.com" className="text-blue-600 underline">arobindan@gmail.com</a>. Your data will be removed within 7 days.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Children's Privacy</h2>
        <p>Collade AI is intended for users aged 13 and above. If you are under 13, please use this app with a parent or guardian.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Contact Us</h2>
        <p>If you have questions about this policy, please contact us at: <a href="mailto:arobindan@gmail.com" className="text-blue-600 underline">arobindan@gmail.com</a></p>
      </section>
    </div>
  );
}