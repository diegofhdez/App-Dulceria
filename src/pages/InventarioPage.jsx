import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PackagePlus, PlusCircle, AlertCircle, CheckCircle2, Search, X, ScanLine, Image as ImageIcon, Pencil } from 'lucide-react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'

export function InventarioPage() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  // Form states
  const [codigoBarras, setCodigoBarras] = useState('')
  const [nombre, setNombre] = useState('')
  const [stock, setStock] = useState('')
  const [precioCosto, setPrecioCosto] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  
  // Surtido states
  const [surtidoModalOpen, setSurtidoModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [surtidoQty, setSurtidoQty] = useState(1)

  useEffect(() => {
    fetchProductos()
  }, [])

  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5QrcodeScanner(
      "reader-add",
      { 
        fps: 10, 
        qrbox: { width: 300, height: 100 },
        useBarCodeDetectorIfSupported: true,
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: "continuous" }]
        }
      },
      false
    )

    scanner.render(
      (decodedText) => {
        setCodigoBarras(decodedText)
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
    if (data) setProductos(data)
    setLoading(false)
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!codigoBarras || !nombre || !precioCosto || !precioVenta) return
    setIsSaving(true)

    let imageUrl = editingProduct ? editingProduct.imagen_url : null

    // Upload image to Supabase Storage if one is selected
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('productos')
        .upload(fileName, imageFile)
        
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('productos')
          .getPublicUrl(fileName)
        imageUrl = publicUrl
      } else {
        console.error('Error subiendo imagen:', uploadError)
        // Continuamos de todas formas
      }
    }

    const payload = {
      codigo_barras: codigoBarras,
      nombre: nombre.trim(),
      stock: parseInt(stock) || 0,
      precio_costo: parseFloat(precioCosto),
      precio_venta: parseFloat(precioVenta),
      imagen_url: imageUrl
    }

    let error;
    if (editingProduct) {
      const { error: updateError } = await supabase.from('productos').update(payload).eq('id', editingProduct.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('productos').insert(payload)
      error = insertError
    }

    setIsSaving(false)

    if (!error) {
      setSuccessMsg(editingProduct ? 'Producto actualizado correctamente' : 'Producto agregado correctamente')
      setModalOpen(false)
      resetForm()
      fetchProductos()
      setTimeout(() => setSuccessMsg(''), 3000)
    } else {
      alert(editingProduct ? 'Error al actualizar el producto.' : 'Error al agregar el producto. Verifica que el código de barras no exista ya.')
    }
  }

  const resetForm = () => {
    setCodigoBarras('')
    setNombre('')
    setStock('')
    setPrecioCosto('')
    setPrecioVenta('')
    setImageFile(null)
    setImagePreview('')
    setIsScanning(false)
    setEditingProduct(null)
  }

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod)
    setCodigoBarras(prod.codigo_barras || '')
    setNombre(prod.nombre || '')
    setStock(prod.stock !== null && prod.stock !== undefined ? prod.stock : '')
    setPrecioCosto(prod.precio_costo || '')
    setPrecioVenta(prod.precio_venta || '')
    setImagePreview(prod.imagen_url || '')
    setImageFile(null)
    setModalOpen(true)
  }

  const handleOpenSurtido = (prod) => {
    setSelectedProduct(prod)
    setSurtidoQty(1)
    setSurtidoModalOpen(true)
  }

  const handleSurtido = async () => {
    if (!selectedProduct || surtidoQty <= 0) return
    
    const newStock = selectedProduct.stock + parseInt(surtidoQty)
    const { error: updateError } = await supabase
      .from('productos')
      .update({ stock: newStock })
      .eq('id', selectedProduct.id)

    if (!updateError) {
      await supabase.from('movimientos').insert({
        producto_id: selectedProduct.id,
        cantidad: parseInt(surtidoQty),
        tipo_movimiento: 'surtido_matutino',
        metodo_pago: 'n/a'
      })
      setSuccessMsg(`¡Surtido registrado! +${surtidoQty} ${selectedProduct.nombre}`)
      setSurtidoModalOpen(false)
      fetchProductos()
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const filteredProducts = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codigo_barras.includes(searchTerm)
  )

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-blue-100 font-bold text-sm uppercase tracking-wider mb-2">Catálogo</h2>
          <p className="text-5xl font-black">{productos.length}</p>
        </div>
        <PackagePlus size={100} className="text-white/10 absolute -right-4 -top-4" />
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 rounded-2xl flex items-center gap-2 text-sm font-medium border border-green-100 animate-in fade-in">
          <CheckCircle2 size={20} /> {successMsg}
        </div>
      )}

      {/* Search and Add Action */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar dulce..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
          />
        </div>
        <button 
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-2xl font-bold flex items-center gap-2 transition-colors shadow-md active:scale-95"
        >
          <PlusCircle size={24} /> <span className="hidden sm:inline">Nuevo</span>
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-200 rounded-3xl"></div>)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-100 rounded-3xl text-slate-400 font-medium shadow-sm">
            No se encontraron productos
          </div>
        ) : (
          filteredProducts.map(p => (
            <div key={p.id} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between gap-4 transition-all hover:shadow-md">
              <div className="flex items-center gap-4 overflow-hidden">
                {/* Thumbnail */}
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-100 shrink-0 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 shrink-0">
                    <ImageIcon size={32} />
                  </div>
                )}
                
                <div className="min-w-0">
                  <h4 className="font-black text-slate-800 text-lg sm:text-xl truncate leading-tight mb-1">{p.nombre}</h4>
                  <p className="text-xs text-slate-400 font-bold font-mono mb-2 truncate">{p.codigo_barras}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="text-slate-600 font-bold">Stock: <b className={p.stock <= 5 ? "text-red-500" : "text-slate-800"}>{p.stock}</b></span>
                    <span className="text-emerald-600 font-black">${p.precio_venta}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => handleOpenEdit(p)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-2xl transition-colors shadow-sm border border-slate-200 active:scale-95"
                  title="Editar Producto"
                >
                  <Pencil size={20} />
                </button>
                <button 
                  onClick={() => handleOpenSurtido(p)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-2xl flex flex-col items-center justify-center transition-colors shadow-sm border border-blue-100 active:scale-95"
                  title="Surtir Stock"
                >
                  <PlusCircle size={22} className="mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-wider">+ Stock</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-full sm:zoom-in-95">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2">
              <h3 className="text-2xl font-black text-slate-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-5">
              
              {/* Image Upload */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Foto (Opcional)</label>
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-slate-300 shadow-sm" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon size={28} />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        setImageFile(file)
                        setImagePreview(URL.createObjectURL(file))
                      }
                    }}
                    className="flex-1 text-sm font-medium text-slate-600 file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-colors w-full cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Código de Barras</label>
                {isScanning ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden mb-2">
                    <div id="reader-add" className="w-full bg-black/5 [&>div]:border-none [&_video]:object-cover"></div>
                    <button 
                      type="button"
                      onClick={() => setIsScanning(false)}
                      className="w-full py-4 bg-red-100 text-red-600 font-black text-sm uppercase transition-colors"
                    >
                      Cancelar Escaneo
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" required
                      value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)}
                      className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                    />
                    <button 
                      type="button"
                      onClick={() => setIsScanning(true)}
                      className="bg-slate-900 text-white px-5 rounded-2xl flex items-center justify-center transition-transform active:scale-95 shadow-md"
                    >
                      <ScanLine size={24} />
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nombre del Producto</label>
                <input 
                  type="text" required
                  value={nombre} onChange={e => setNombre(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Costo ($)</label>
                  <input 
                    type="number" step="0.01" required
                    value={precioCosto} onChange={e => setPrecioCosto(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Venta ($)</label>
                  <input 
                    type="number" step="0.01" required
                    value={precioVenta} onChange={e => setPrecioVenta(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-900 font-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Stock Inicial (Opcional)</label>
                <input 
                  type="number"
                  value={stock} onChange={e => setStock(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                />
              </div>

              <div className="pt-6 pb-2">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:active:scale-100 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    editingProduct ? 'Guardar Cambios' : 'Guardar Producto'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Surtido Modal */}
      {surtidoModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-800 mb-1">Surtir Stock</h3>
            <p className="text-slate-500 font-medium mb-6">{selectedProduct.nombre}</p>
            
            <div className="mb-8">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                ¿Cuántas piezas nuevas vas a agregar?
              </label>
              <input 
                type="number" min="1"
                value={surtidoQty}
                onChange={(e) => setSurtidoQty(e.target.value)}
                className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl text-4xl font-black text-center outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setSurtidoModalOpen(false)}
                className="flex-1 p-4 font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSurtido}
                className="flex-1 p-4 font-black text-white bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
              >
                Surtir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
