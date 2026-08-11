import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns'
import { Banknote, TrendingUp, CreditCard, CalendarDays, Target, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'

export function CorteCajaPage() {
  const [filter, setFilter] = useState('day') // day, week, month
  const [data, setData] = useState({
    efectivoEntregar: 0,
    gananciaNeta: 0,
    nuevoFiado: 0,
    table: []
  })
  const [loading, setLoading] = useState(true)

  // Inversion state
  const [inversion, setInversion] = useState({
    total: 0,
    recuperado: 0,
    porcentaje: 0,
    falta: 0,
    productos: []
  })

  useEffect(() => {
    fetchCorte()
  }, [filter])

  useEffect(() => {
    fetchInversion()
  }, [])

  const fetchInversion = async () => {
    const { data: allMovimientos } = await supabase.from('movimientos').select('producto_id, cantidad, tipo_movimiento, metodo_pago')
    const { data: allAbonos } = await supabase.from('abonos').select('cantidad')
    const { data: productos } = await supabase.from('productos').select('id, nombre, precio_costo, precio_venta, stock')

    if (!productos) return

    let totalInv = 0
    let totalRecup = 0

    if (allAbonos) {
      allAbonos.forEach(a => {
        totalRecup += parseFloat(a.cantidad)
      })
    }

    const prodMap = {}
    productos.forEach(p => {
      prodMap[p.id] = { ...p, soldQty: 0, recovered: 0 }
    })

    if (allMovimientos) {
      allMovimientos.forEach(m => {
        const prod = prodMap[m.producto_id]
        if (!prod) return

        if (m.tipo_movimiento === 'venta') {
          prod.soldQty += m.cantidad
          if (m.metodo_pago === 'efectivo') {
            const saleValue = prod.precio_venta * m.cantidad
            prod.recovered += saleValue
            totalRecup += saleValue
          }
        }
      })
    }

    const productosRendimiento = []

    Object.values(prodMap).forEach(p => {
      const historicalQty = p.stock + p.soldQty
      const inversionProd = historicalQty * p.precio_costo
      const porcentajeProd = inversionProd > 0 ? (p.recovered / inversionProd) * 100 : 0
      
      totalInv += inversionProd

      productosRendimiento.push({
        id: p.id,
        nombre: p.nombre,
        inversion: inversionProd,
        recuperado: p.recovered,
        porcentaje: porcentajeProd
      })
    })

    // Sort by percentage descending
    productosRendimiento.sort((a, b) => b.porcentaje - a.porcentaje)

    const porcentaje = totalInv > 0 ? Math.min((totalRecup / totalInv) * 100, 100) : 0
    const falta = Math.max(totalInv - totalRecup, 0)

    setInversion({
      total: totalInv,
      recuperado: totalRecup,
      porcentaje,
      falta,
      productos: productosRendimiento
    })
  }

  const fetchCorte = async () => {
    setLoading(true)
    const now = new Date()
    let startDate
    const endDate = endOfDay(now).toISOString()

    if (filter === 'day') startDate = startOfDay(now).toISOString()
    if (filter === 'week') startDate = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
    if (filter === 'month') startDate = startOfMonth(now).toISOString()

    const { data: movimientos } = await supabase
      .from('movimientos')
      .select('*')
      .gte('fecha', startDate)
      .lte('fecha', endDate)

    const { data: abonos } = await supabase
      .from('abonos')
      .select('*')
      .gte('fecha', startDate)
      .lte('fecha', endDate)

    const { data: productos } = await supabase.from('productos').select('*')

    let totalEfectivoVentas = 0
    let totalFiado = 0
    let totalGanancia = 0
    let totalAbonos = 0

    const productMap = {}

    if (productos) {
      productos.forEach(p => {
        productMap[p.id] = {
          nombre: p.nombre,
          precio_venta: p.precio_venta,
          surtido: 0,
          vendidoEfectivo: 0,
          vendidoFiado: 0,
          stockActual: p.stock
        }
      })
    }

    if (abonos) {
      abonos.forEach(a => {
        totalAbonos += parseFloat(a.cantidad)
      })
    }

    if (movimientos && productos) {
      movimientos.forEach(m => {
        const prod = productMap[m.producto_id]
        if (!prod) return

        if (m.tipo_movimiento === 'surtido_matutino') {
          prod.surtido += m.cantidad
        } else if (m.tipo_movimiento === 'venta') {
          totalGanancia += parseFloat(m.ganancia_neta)
          
          const precioTotal = prod.precio_venta * m.cantidad

          if (m.metodo_pago === 'efectivo') {
            totalEfectivoVentas += parseFloat(precioTotal)
            prod.vendidoEfectivo += m.cantidad
          } else if (m.metodo_pago === 'pendiente') {
            totalFiado += parseFloat(precioTotal)
            prod.vendidoFiado += m.cantidad
          }
        }
      })
    }

    const tableData = Object.values(productMap).filter(
      p => p.surtido > 0 || p.vendidoEfectivo > 0 || p.vendidoFiado > 0
    )

    setData({
      efectivoEntregar: totalEfectivoVentas + totalAbonos,
      gananciaNeta: totalGanancia,
      nuevoFiado: totalFiado,
      table: tableData
    })
    
    setLoading(false)
  }

  return (
    <div className="space-y-6 pb-6">
      
      {/* Estado de Inversión Global (Lifetime) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Target size={20} className="text-indigo-500" /> Estado de Inversión
        </h3>
        
        <div className="flex justify-between items-end mb-3">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Inversión Total</p>
            <p className="text-3xl font-black text-slate-800">${inversion.total.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-1">Recuperado</p>
            <p className="text-3xl font-black text-emerald-500">${inversion.recuperado.toFixed(2)}</p>
          </div>
        </div>

        <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden mb-4 relative shadow-inner">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-2 ${inversion.recuperado >= inversion.total ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'}`}
            style={{ width: `${inversion.porcentaje}%` }}
          >
            {inversion.porcentaje > 15 && (
              <span className="text-[10px] font-black text-white/90">{inversion.porcentaje.toFixed(0)}%</span>
            )}
          </div>
        </div>

        {inversion.recuperado >= inversion.total && inversion.total > 0 ? (
          <p className="text-sm font-bold text-emerald-700 text-center bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shadow-sm animate-in zoom-in-95">
            🎉 ¡Punto de equilibrio superado! Ahora son ganancias netas.
          </p>
        ) : (
          <p className="text-sm font-bold text-indigo-700 text-center bg-indigo-50 p-3 rounded-2xl border border-indigo-100 shadow-sm">
            Faltan <span className="font-black text-indigo-900">${inversion.falta.toFixed(2)}</span> para llegar al punto de equilibrio.
          </p>
        )}
      </div>

      <div className="h-px bg-slate-200 w-full rounded-full"></div>

      {/* Rendimiento por Producto */}
      <div>
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 px-1">
          <BarChart3 size={20} className="text-amber-500" /> Rendimiento por Producto
        </h3>
        
        <div className="space-y-3">
          {inversion.productos.map(p => {
            const isProfit = p.porcentaje >= 100
            const barWidth = Math.min(p.porcentaje, 100)
            
            return (
              <div key={p.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-slate-800 truncate pr-2">{p.nombre}</h4>
                  <span className={clsx(
                    "text-xs font-black px-2 py-1 rounded-lg shrink-0",
                    isProfit ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {p.porcentaje.toFixed(0)}% ROI
                  </span>
                </div>
                
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Inv: ${p.inversion.toFixed(2)}</span>
                  <span>Rec: ${p.recuperado.toFixed(2)}</span>
                </div>

                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={clsx(
                      "h-full rounded-full transition-all duration-1000 ease-out",
                      isProfit ? "bg-emerald-500" : "bg-gradient-to-r from-amber-400 to-orange-500"
                    )}
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
          {inversion.productos.length === 0 && (
            <div className="text-center py-8 text-slate-400 font-medium">
              Aún no hay productos en el inventario.
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-200 w-full rounded-full mt-6"></div>

      {/* Filters for Corte */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 shadow-inner mt-6">
        <button 
          onClick={() => setFilter('day')}
          className={clsx(
            "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
            filter === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Día
        </button>
        <button 
          onClick={() => setFilter('week')}
          className={clsx(
            "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
            filter === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Semana
        </button>
        <button 
          onClick={() => setFilter('month')}
          className={clsx(
            "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
            filter === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Mes
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-slate-200 rounded-3xl"></div>
          <div className="flex gap-4">
            <div className="h-32 bg-slate-200 rounded-3xl flex-1"></div>
            <div className="h-32 bg-slate-200 rounded-3xl flex-1"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-white/10">
              <Banknote size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-emerald-50 mb-3">
                <Banknote size={20} />
                <h2 className="font-bold tracking-wide text-sm uppercase">Efectivo a Entregar</h2>
              </div>
              <p className="text-5xl font-black">${data.efectivoEntregar.toFixed(2)}</p>
              <p className="text-emerald-100 text-sm mt-3 font-medium">Ventas efectivo + Abonos recibidos</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-5 rounded-3xl flex-1 shadow-sm border border-slate-100 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <TrendingUp size={18} className="text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Ganancias</span>
              </div>
              <p className="text-3xl font-black text-slate-800">${data.gananciaNeta.toFixed(2)}</p>
            </div>
            
            <div className="bg-white p-5 rounded-3xl flex-1 shadow-sm border border-slate-100 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <CreditCard size={18} className="text-orange-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Fiado</span>
              </div>
              <p className="text-3xl font-black text-slate-800">${data.nuevoFiado.toFixed(2)}</p>
            </div>
          </div>

          {/* Reconciliation Table */}
          <div className="mt-8">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 px-1">
              <CalendarDays size={20} className="text-purple-500" /> 
              Conciliación
            </h3>
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Dulce</th>
                      <th className="px-4 py-4 text-center text-blue-600">+ Surtido</th>
                      <th className="px-4 py-4 text-center text-emerald-600">- Efectivo</th>
                      <th className="px-4 py-4 text-center text-orange-500">- Fiado</th>
                      <th className="px-5 py-4 text-center text-slate-800">= Queda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.table.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-5 py-10 text-center text-slate-400 font-medium">
                          No hay movimientos en este periodo
                        </td>
                      </tr>
                    ) : (
                      data.table.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-800">{row.nombre}</td>
                          <td className="px-4 py-4 text-center font-medium text-slate-600">{row.surtido}</td>
                          <td className="px-4 py-4 text-center font-medium text-slate-600">{row.vendidoEfectivo}</td>
                          <td className="px-4 py-4 text-center font-medium text-slate-600">{row.vendidoFiado}</td>
                          <td className="px-5 py-4 text-center font-black text-slate-900 bg-slate-50/50">{row.stockActual}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
