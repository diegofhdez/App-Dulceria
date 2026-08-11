import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { LogOut } from 'lucide-react'

// Layout & Pages
import { BottomNav } from './components/layout/BottomNav'
import { LoginPage } from './pages/LoginPage'
import { ScannerPage } from './pages/ScannerPage'
import { InventarioPage } from './pages/InventarioPage'
import { DeudasPage } from './pages/DeudasPage'
import { CorteCajaPage } from './pages/CorteCajaPage'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <Router>
      <div className="pb-16 min-h-screen relative bg-slate-50">
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex justify-between items-center border-b border-slate-100">
          <h1 className="text-xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Dulcería Escolar
          </h1>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>
        </header>
        
        <main className="p-4 max-w-lg mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/scanner" replace />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/deudas" element={<DeudasPage />} />
            <Route path="/corte" element={<CorteCajaPage />} />
          </Routes>
        </main>
        
        <BottomNav />
      </div>
    </Router>
  )
}

export default App
