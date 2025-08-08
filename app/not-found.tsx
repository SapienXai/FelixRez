import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-lg mb-8">The page you are looking for does not exist.</p>

      <div className="mb-8 p-4 bg-yellow-100 border border-yellow-400 rounded-md max-w-md">
        <h2 className="font-semibold text-yellow-800 mb-2">Looking for the admin page?</h2>
        <p className="text-yellow-800 mb-2">If you're trying to access the admin dashboard, please try these links:</p>
        <ul className="list-disc pl-5 space-y-1 text-yellow-800">
          <li>
            <Link href="/admin-debug" className="text-blue-600 hover:underline">
              Admin Debug Page
            </Link>
          </li>
          <li>
            <Link href="/pages/admin" className="text-blue-600 hover:underline">
              Alternative Admin Page
            </Link>
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <p>Here are some other helpful links:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <Link href="/" className="text-blue-500 hover:underline">
              Home
            </Link>
          </li>
          <li>
            <Link href="/reserve" className="text-blue-500 hover:underline">
              Make a Reservation
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
