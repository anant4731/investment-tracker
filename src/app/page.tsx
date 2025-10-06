import ProtectedRoute from "./components/ProtectedRoute"
import Dashboard from "./components/Dashboard"
import Navbar from "./components/Navbar"

export default function MainPage() {
  return <ProtectedRoute>
    <Navbar></Navbar>
    <Dashboard></Dashboard>
  </ProtectedRoute>
}