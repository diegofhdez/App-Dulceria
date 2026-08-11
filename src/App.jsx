import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { LogOut, Sun, Moon, Bell, AlertTriangle } from 'lucide-react'

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

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    }
    return 'light'
  })

  const [lowStockItems, setLowStockItems] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

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

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (!session) return
    const fetchLowStock = async () => {
      const { data } = await supabase.from('productos').select('*').lte('stock', 3).order('stock', { ascending: true })
      if (data) setLowStockItems(data)
    }
    fetchLowStock()
  }, [session, showNotifications])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <Router>
      <div className="pb-16 min-h-screen relative bg-slate-50 dark:bg-slate-950">
        <header className="bg-white dark:bg-slate-900 shadow-sm p-4 sticky top-0 z-50 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
          <h1 className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 font-black tracking-tight">
            Bite
          </h1>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Cambiar Tema"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative"
                title="Notificaciones"
              >
                <Bell size={20} />
                {lowStockItems.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </button>

              {/* Dropdown Notificaciones */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Bajo Stock</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto relative z-50">
                      {lowStockItems.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                          Todo está bien surtido
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {lowStockItems.map(item => (
                            <div key={item.id} className="p-3 flex items-start gap-3">
                              <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{item.nombre}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Quedan: {item.stock}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
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
