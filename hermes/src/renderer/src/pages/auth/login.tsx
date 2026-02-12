import { Link } from 'react-router-dom'

export default function Login(): React.JSX.Element {
  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold text-red-500 mb-4">Login Page</h1>
      <Link to="/" className="text-gray-500 underline hover:text-gray-700">
        Back to Landing
      </Link>
    </div>
  )
}
