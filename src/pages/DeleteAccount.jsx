export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Deletion Request</h1>
        <p className="text-gray-700 mb-4">
          To delete your Collade AI account and all associated data, please email us at:
        </p>
        <p className="text-blue-600 font-semibold mb-4">
          <a href="mailto:arobindan@gmail.com">arobindan@gmail.com</a>
        </p>
        <p className="text-gray-700 mb-4">
          Include your name and the email address you used to sign up. We will process your request within 7 days.
        </p>
        <p className="text-gray-700">
          Thank you for using Collade AI.
        </p>
      </div>
    </div>
  );
}