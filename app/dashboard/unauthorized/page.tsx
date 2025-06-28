export default function UnauthorizedPage() {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-700">
            Your email is not authorized to access this platform.
          </p>
        </div>
      </div>
    );
  }
  