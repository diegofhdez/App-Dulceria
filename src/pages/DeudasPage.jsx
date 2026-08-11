import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { UserPlus, Wallet, AlertCircle, CheckCircle2, X } from 'lucide-react'

export function DeudasPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  
  // States for new client modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientDebt, setNewClientDebt] = useState('')
  
  // States for payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  
  const [successMsg, setSuccessMsg] = useState('')

  const fetchClients = async () => {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('deuda_total', { ascending: false })
    if (data) setClients(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleAddClient = async (e) => {
    e.preventDefault()
    if (!newClientName.trim()) return

    const initialDebt = parseFloat(newClientDebt) || 0

    const { error } = await supabase.from('clientes').insert({ 
      nombre: newClientName.trim(),
      deuda_total: initialDebt
    })
    
    if (!error) {
      setSuccessMsg('Deuda registrada correctamente')
      setNewClientName('') // Clears input state
      setNewClientDebt('')
      setAddModalOpen(false) // Closes modal
      fetchClients()
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleOpenPayment = (client) => {
    setSelectedClient(client)
    setPaymentAmount(client.deuda_total) // Default to full amount
    setPaymentModalOpen(true)
  }

  const handleProcessPayment = async () => {
    if (!selectedClient || !paymentAmount || paymentAmount <= 0) return
    
    // 1. Register 'abono'
    await supabase.from('abonos').insert({
      cliente_id: selectedClient.id,
      cantidad: parseFloat(paymentAmount)
    })

    // 2. Update client debt
    const newDebt = Math.max(0, parseFloat(selectedClient.deuda_total) - parseFloat(paymentAmount))
    await supabase
      .from('clientes')
      .update({ deuda_total: newDebt })
      .eq('id', selectedClient.id)

    setSuccessMsg(`Abono registrado para ${selectedClient.nombre}`)
    setPaymentModalOpen(false)
    fetchClients()
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const debtors = clients.filter(c => parseFloat(c.deuda_total) > 0)
  const totalDebt = debtors.reduce((sum, c) => sum + parseFloat(c.deuda_total), 0)

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl p-6 text-white shadow-xl shadow-orange-500/20">
        <h2 className="text-orange-100 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
          <Wallet size={18} /> Cuentas por Cobrar
        </h2>
        <p className="text-5xl font-black">${totalDebt.toFixed(2)}</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 rounded-2xl flex items-center gap-2 text-sm font-medium border border-green-100 animate-in fade-in">
          <CheckCircle2 size={20} /> {successMsg}
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex justify-between items-center px-1">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <AlertCircle size={20} className="text-orange-500" /> Quienes deben
        </h3>
        <button 
          onClick={() => setAddModalOpen(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-md hover:bg-slate-800 transition-colors"
        >
          <UserPlus size={18} /> Nueva Deuda
        </button>
      </div>
      
      <div>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-3xl"></div>)}
          </div>
        ) : debtors.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm text-slate-800 dark:text-slate-100 font-medium">
            ¡Nadie debe nada! 🎉
          </div>
        ) : (
          <div className="space-y-4">
            {debtors.map(client => (
              <div key={client.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-lg text-slate-800">{client.nombre}</h4>
                  <p className="text-orange-500 font-bold">Deuda: ${parseFloat(client.deuda_total).toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => handleOpenPayment(client)}
                  className="w-full sm:w-auto bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-6 py-4 sm:py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors"
                >
                  <Wallet size={20} /> Recibir Pago
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Debt Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl h-auto animate-in slide-in-from-bottom-full sm:zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">Nueva Deuda</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nombre del Cliente</label>
                <input 
                  type="text" required
                  value={newClientName} 
                  onChange={e => setNewClientName(e.target.value)}
                  autoComplete="off"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 font-medium"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Monto Inicial Adeudado ($)</label>
                <input 
                  type="number" step="0.01" required
                  value={newClientDebt} 
                  onChange={e => setNewClientDebt(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 font-medium"
                  placeholder="0.00"
                />
              </div>
              
              <div className="pt-4">
                <button type="submit" disabled={!newClientName.trim()} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/30 transition-colors">
                  Guardar Deuda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-800 mb-1">Abono</h3>
            <p className="text-slate-500 font-medium mb-6">De: {selectedClient.nombre}</p>
            
            <div className="mb-8">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Efectivo recibido ($)
              </label>
              <input 
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl text-4xl font-black text-center outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 p-4 font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleProcessPayment}
                className="flex-1 p-4 font-black text-white bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
