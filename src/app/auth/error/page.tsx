export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
        <p className="mt-2 text-gray-600">
          Something went wrong during authentication. Please try again.
        </p>
        <a href="/auth/login" className="mt-4 inline-block text-primary hover:underline">
          Return to login
        </a>
      </div>
    </div>
  );
}
