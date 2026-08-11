import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Banknote, Trash2, Package, CheckCircle2, Clock, X, Camera } from 'lucide-react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { clsx } from 'clsx'

export function ScannerPage() {
  const [productos, setProductos] = useState([])
  const [filteredProductos, setFilteredProductos] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [success, setSuccess] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  
  // Modal Fiado/Cobro states
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')

  const productosRef = useRef(productos)

  useEffect(() => {
    fetchProductos()
    fetchClients()
  }, [])

  useEffect(() => {
    productosRef.current = productos
  }, [productos])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredProductos(productos)
    } else {
      setFilteredProductos(
        productos.filter(p => 
          p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.codigo_barras.includes(searchTerm)
        )
      )
    }
  }, [searchTerm, productos])

  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5QrcodeScanner(
      "reader-sell",
      { 
        fps: 30, 
        qrbox: { width: 250, height: 150 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        videoConstraints: {
          facingMode: "environment"
        }
      },
      false
    )

    scanner.render(
      (decodedText) => {
        // Encontrar el producto por código de barras
        const productFound = productosRef.current.find(p => p.codigo_barras === decodedText)
        
        if (productFound) {
          addToCart(productFound)
        } else {
          alert(`Código ${decodedText} no encontrado en el catálogo.`)
        }
        
        setIsScanning(false)
        scanner.clear().catch(console.error)
      },
      (error) => {}
    )

    return () => {
      scanner.clear().catch(console.error)
    }
  }, [isScanning])

  const fetchProductos = async () => {
    setLoading(true)
    const { data } = await supabase.from('productos').select('*').order('nombre')
    if (data) {
      setProductos(data)
      setFilteredProductos(data)
    }
    setLoading(false)
  }

  const fetchClients = async () => {
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    if (data) setClients(data)
  }

  const addToCart = (prod) => {
    if (prod.stock <= 0) {
      alert(`El producto ${prod.nombre} está agotado.`)
      return
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === prod.id)
      if (existing) {
        if (existing.quantity >= prod.stock) {
          alert(`Stock insuficiente de ${prod.nombre}. Solo quedan ${prod.stock} piezas.`)
          return prev
        }
        return prev.map(item => item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { product: prod, quantity: 1 }]
    })
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.precio_venta * item.quantity), 0)
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const confirmSale = async (metodoPago) => {
    if (cart.length === 0) return
    if (metodoPago === 'pendiente' && !selectedClient) {
      alert("Selecciona un compañero para dar fiado.")
      return
    }

    setIsCheckingOut(true)

    try {
      const movimientosToInsert = cart.map(item => ({
        producto_id: item.product.id,
        cantidad: item.quantity,
        tipo_movimiento: 'venta',
        ganancia_neta: (item.product.precio_venta - item.product.precio_costo) * item.quantity,
        metodo_pago: metodoPago,
        cliente_id: metodoPago === 'pendiente' ? selectedClient : null
      }))

      const updatePromises = cart.map(item => {
        const newStock = item.product.stock - item.quantity;
        return supabase.from('productos').update({ stock: newStock }).eq('id', item.product.id)
      })

      await Promise.all([
        supabase.from('movimientos').insert(movimientosToInsert),
        ...updatePromises
      ])

      if (metodoPago === 'pendiente') {
        const client = clients.find(c => c.id === selectedClient)
        await supabase.from('clientes')
          .update({ deuda_total: parseFloat(client.deuda_total) + cartTotal })
          .eq('id', selectedClient)
      }

      setCheckoutModalOpen(false)
      setCart([])
      setSelectedClient('')
      setSuccess('¡Venta realizada con éxito! 🎉')
      fetchProductos()

      setTimeout(() => {
        setSuccess('')
      }, 2500)
    } catch (error) {
      console.error("Error al procesar venta:", error)
      alert("Hubo un error al registrar la venta.")
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-140px)]">
      
      {/* Search & Scan Header */}
      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md pb-4 pt-2 space-y-3">
        {!isScanning ? (
          <button 
            onClick={() => setIsScanning(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl shadow-md font-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Camera size={24} /> Escanear Código
          </button>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-lg animate-in fade-in">
            <div id="reader-sell" className="w-full bg-black/5 [&>div]:border-none [&_video]:object-cover"></div>
            <button 
              type="button"
              onClick={() => setIsScanning(false)}
              className="w-full py-4 bg-red-100 text-red-600 font-black text-sm uppercase transition-colors"
            >
              Cerrar Escáner
            </button>
          </div>
        )}

        <div className="relative shadow-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="O buscar dulce a mano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
          />
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse mt-2">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-200 rounded-3xl"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-32 mt-2">
          {filteredProductos.map(p => {
            const inCart = cart.find(c => c.product.id === p.id)
            const isOutOfStock = p.stock <= 0

            return (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)} 
                disabled={isOutOfStock}
                className={clsx(
                  "p-3 rounded-3xl border flex flex-col items-center relative transition-transform text-center",
                  isOutOfStock ? "bg-slate-50 border-slate-200 opacity-60 grayscale" : "bg-white border-slate-100 shadow-sm active:scale-95 hover:border-blue-200"
                )}
              >
                {/* Cart Badge */}
                {inCart && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center font-black text-xs shadow-lg animate-in zoom-in">
                    {inCart.quantity}
                  </span>
                )}
                
                {/* Thumbnail */}
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover mb-2 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-2 border border-slate-100">
                    <Package size={28} />
                  </div>
                )}
                
                <h4 className="font-bold text-slate-700 text-xs sm:text-sm line-clamp-2 leading-tight mb-1">{p.nombre}</h4>
                <p className="text-emerald-600 font-black text-lg">${p.precio_venta}</p>
                
                {isOutOfStock ? (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-1 bg-red-50 px-2 py-0.5 rounded-lg">Agotado</p>
                ) : (
                  <p className="text-[10px] font-bold text-slate-400 mt-1 bg-slate-50 px-2 py-0.5 rounded-lg">Stock: {p.stock}</p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Floating Cart (Bottom) */}
      {cart.length > 0 && (
        <div className="fixed bottom-[80px] left-0 right-0 px-4 max-w-lg mx-auto z-20 animate-in slide-in-from-bottom-10">
          <div className="bg-slate-900 rounded-3xl p-4 shadow-2xl flex items-center justify-between border border-slate-700">
            <div className="flex flex-col px-2">
              <span className="text-white/60 text-[10px] font-black uppercase tracking-wider mb-0.5">
                Carrito ({cartItemsCount} pzas)
              </span>
              <span className="text-white font-black text-3xl leading-none">
                ${cartTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCart([])} 
                className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white/70 hover:text-red-400 hover:bg-white/20 active:scale-95 transition-all"
              >
                <Trash2 size={24} />
              </button>
              <button 
                onClick={() => setCheckoutModalOpen(true)}
                className="px-6 h-14 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-black text-lg flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-500/40 transition-transform"
              >
                <Banknote size={24} /> Cobrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Options Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl h-auto animate-in slide-in-from-bottom-full sm:zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">Finalizar Venta</h3>
              <button onClick={() => setCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center mb-8">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total a cobrar</p>
              <p className="text-6xl font-black text-emerald-500">${cartTotal.toFixed(2)}</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => confirmSale('efectivo')}
                disabled={isCheckingOut}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-3 transition-transform active:scale-95 disabled:opacity-50"
              >
                {isCheckingOut ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <Banknote size={28} />}
                Pago en Efectivo
              </button>

              <div className="relative py-4 flex items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">O dar a Fiado</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <select 
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 font-bold mb-3"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">Selecciona al compañero...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} (Deuda actual: ${c.deuda_total})</option>
                  ))}
                </select>
                <button
                  onClick={() => confirmSale('pendiente')}
                  disabled={!selectedClient || isCheckingOut}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/20 flex justify-center items-center gap-3 transition-transform active:scale-95 disabled:opacity-50"
                >
                  <Clock size={24} />
                  Fiar por ${cartTotal.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Fullscreen Animation */}
      {success && (
        <div className="fixed inset-0 z-[100] bg-emerald-500 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <div className="bg-white text-emerald-500 rounded-full w-28 h-28 flex items-center justify-center mb-6 shadow-2xl animate-bounce">
            <CheckCircle2 size={70} strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-black tracking-tight">{success}</h2>
        </div>
      )}
    </div>
  )
}
