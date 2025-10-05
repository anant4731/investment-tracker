import ProtectedRoute from "./components/ProtectedRoute"
import Stats from "./components/Stats"

export default function MainPage() {
  return <ProtectedRoute>
    <Stats></Stats>
  </ProtectedRoute>
}