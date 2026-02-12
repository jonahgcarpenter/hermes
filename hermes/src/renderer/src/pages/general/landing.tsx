import { Link } from 'react-router-dom'

export default function Landing(): React.JSX.Element {
  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold text-blue-500 mb-4">Welcome to Landing</h1>
      <Link to="/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Go to Login
      </Link>
    </div>
  )
}
