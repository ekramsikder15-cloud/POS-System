'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import {
  Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote,
  User, LogOut, Clock, Pause, Play, X, Check, Printer,
  UtensilsCrossed, Package, Bike, ChefHat
} from 'lucide-react'

// Order types
const ORDER_TYPES = [
  { id: 'qsr', label: 'Dine In', icon: UtensilsCrossed },
  { id: 'takeaway', label: 'Takeaway', icon: Package },
  { id: 'delivery', label: 'Delivery', icon: Bike }
]

// Format price in KWD (3 decimals)
const formatPrice = (price, currency = 'KWD') => {
  return Number(price || 0).toFixed(3) + ' ' + currency
}

// Generate order number
const generateOrderNumber = () => {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `ORD-${dateStr}-${seq}`
}

// Format date for receipt
const formatReceiptDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export default function POSPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const receiptRef = useRef(null)
  
  // Menu state
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [modifierGroups, setModifierGroups] = useState([])
  const [modifiers, setModifiers] = useState([])
  const [itemModifierGroups, setItemModifierGroups] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Order state
  const [orderType, setOrderType] = useState('qsr')
  const [cart, setCart] = useState([])
  const [heldOrders, setHeldOrders] = useState([])
  const [orderHistory, setOrderHistory] = useState([])
  
  // Modals
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [holdOrdersModalOpen, setHoldOrdersModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  
  // Item customization state
  const [itemQuantity, setItemQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState([])
  const [specialInstructions, setSpecialInstructions] = useState('')
  
  // Payment state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountReceived, setAmountReceived] = useState('')
  
  // Check authentication
  useEffect(() => {
    const storedUser = localStorage.getItem('pos_user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
    } else {
      router.push('/pos/login')
    }
  }, [router])
  
  // Load data
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])
  
  const loadData = async () => {
    setLoading(true)
    try {
      // Load categories for user's tenant
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('status', 'active')
        .order('sort_order')
      setCategories(cats || [])
      if (cats && cats.length > 0) setSelectedCategory(cats[0].id)
      
      // Load items
      const { data: menuItems } = await supabase
        .from('items')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('status', 'active')
        .order('sort_order')
      setItems(menuItems || [])
      
      // Load modifier groups
      const { data: modGroups } = await supabase
        .from('modifier_groups')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('status', 'active')
      setModifierGroups(modGroups || [])
      
      // Load modifiers
      const { data: mods } = await supabase
        .from('modifiers')
        .select('*')
        .eq('status', 'active')
      setModifiers(mods || [])
      
      // Load item modifier groups
      const { data: itemMods } = await supabase
        .from('item_modifier_groups')
        .select('*')
      setItemModifierGroups(itemMods || [])
      
      // Load today's orders
      const today = new Date().toISOString().slice(0, 10)
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('branch_id', user.branch_id)
        .gte('created_at', today)
        .order('created_at', { ascending: false })
      setOrderHistory(orders || [])
      
      // Load held orders from localStorage
      const held = localStorage.getItem(`pos_held_orders_${user.branch_id}`)
      if (held) setHeldOrders(JSON.parse(held))
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    }
    setLoading(false)
  }
  
  // Filter items
  const filteredItems = items.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory
    const matchesSearch = !searchQuery || 
      item.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name_ar?.includes(searchQuery)
    return matchesCategory && matchesSearch
  })
  
  // Get modifiers for an item
  const getItemModifiers = (itemId) => {
    const groupIds = itemModifierGroups
      .filter(img => img.item_id === itemId)
      .map(img => img.modifier_group_id)
    
    return modifierGroups
      .filter(mg => groupIds.includes(mg.id))
      .map(mg => ({
        ...mg,
        modifiers: modifiers.filter(m => m.modifier_group_id === mg.id)
      }))
  }
  
  // Open item modal
  const openItemModal = (item) => {
    setSelectedItem(item)
    setItemQuantity(1)
    setSelectedModifiers([])
    setSpecialInstructions('')
    setItemModalOpen(true)
  }
  
  // Toggle modifier
  const toggleModifier = (modifier, group) => {
    setSelectedModifiers(prev => {
      const exists = prev.find(m => m.id === modifier.id)
      if (exists) {
        return prev.filter(m => m.id !== modifier.id)
      } else {
        // Check max select
        const groupModifiers = prev.filter(m => 
          modifiers.find(mod => mod.id === m.id)?.modifier_group_id === group.id
        )
        if (groupModifiers.length >= group.max_select) {
          toast.error(`Maximum ${group.max_select} selections for ${group.name_en}`)
          return prev
        }
        return [...prev, modifier]
      }
    })
  }
  
  // Add item to cart
  const addToCart = () => {
    const itemTotal = selectedItem.base_price + selectedModifiers.reduce((sum, m) => sum + m.price, 0)
    const cartItem = {
      id: uuidv4(),
      item: selectedItem,
      quantity: itemQuantity,
      modifiers: selectedModifiers,
      specialInstructions,
      unitPrice: itemTotal,
      totalPrice: itemTotal * itemQuantity
    }
    setCart(prev => [...prev, cartItem])
    setItemModalOpen(false)
    toast.success(`${selectedItem.name_en} added to cart`)
  }
  
  // Update cart item quantity
  const updateCartItemQuantity = (cartItemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const newQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQty, totalPrice: item.unitPrice * newQty }
      }
      return item
    }))
  }
  
  // Remove cart item
  const removeCartItem = (cartItemId) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId))
  }
  
  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
  const taxRate = user?.tenant?.tax_rate || 0
  const serviceChargeRate = user?.tenant?.service_charge_rate || 0
  const tax = subtotal * (taxRate / 100)
  const serviceCharge = subtotal * (serviceChargeRate / 100)
  const total = subtotal + tax + serviceCharge
  const currency = user?.tenant?.currency || 'KWD'
  
  // Hold current order
  const holdOrder = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }
    const held = {
      id: uuidv4(),
      cart,
      orderType,
      timestamp: new Date().toISOString(),
      customerName
    }
    const newHeldOrders = [...heldOrders, held]
    setHeldOrders(newHeldOrders)
    localStorage.setItem(`pos_held_orders_${user.branch_id}`, JSON.stringify(newHeldOrders))
    clearOrder()
    toast.success('Order held')
  }
  
  // Resume held order
  const resumeOrder = (heldOrder) => {
    setCart(heldOrder.cart)
    setOrderType(heldOrder.orderType)
    setCustomerName(heldOrder.customerName || '')
    const newHeldOrders = heldOrders.filter(h => h.id !== heldOrder.id)
    setHeldOrders(newHeldOrders)
    localStorage.setItem(`pos_held_orders_${user.branch_id}`, JSON.stringify(newHeldOrders))
    setHoldOrdersModalOpen(false)
    toast.success('Order resumed')
  }
  
  // Clear order
  const clearOrder = () => {
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    setAmountReceived('')
  }
  
  // Open payment modal
  const openPayment = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }
    setPaymentModalOpen(true)
  }
  
  // Complete order
  const completeOrder = async () => {
    try {
      const orderNumber = generateOrderNumber()
      const orderId = uuidv4()
      
      // Create order
      const orderData = {
        id: orderId,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id,
        order_number: orderNumber,
        channel: 'pos',
        order_type: orderType,
        status: 'pending',
        payment_status: 'paid',
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        subtotal: subtotal,
        tax_amount: tax,
        service_charge: serviceCharge,
        total_amount: total,
        user_id: user.id,
        notes: paymentMethod === 'cash' 
          ? `Cash: ${(parseFloat(amountReceived) || total).toFixed(3)} ${currency}, Change: ${Math.max(0, (parseFloat(amountReceived) || 0) - total).toFixed(3)} ${currency}`
          : `Card payment`
      }
      
      const { error: orderError } = await supabase.from('orders').insert(orderData)
      if (orderError) throw orderError
      
      // Create order items
      const orderItems = cart.map((c) => ({
        id: uuidv4(),
        order_id: orderId,
        item_id: c.item.id,
        item_name_en: c.item.name_en,
        item_name_ar: c.item.name_ar || '',
        quantity: c.quantity,
        unit_price: c.item.base_price,
        total_price: c.totalPrice,
        notes: c.modifiers.length > 0 
          ? c.modifiers.map(m => `+ ${m.name_en}`).join(', ') + (c.specialInstructions ? ` | ${c.specialInstructions}` : '')
          : c.specialInstructions || null
      }))
      
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) {
        console.error('Order items error:', itemsError)
      }
      
      // Build display order for receipt
      const displayOrder = {
        ...orderData,
        items: cart.map(c => ({
          item_id: c.item.id,
          name_en: c.item.name_en,
          name_ar: c.item.name_ar,
          quantity: c.quantity,
          unit_price: c.unitPrice,
          total_price: c.totalPrice,
          modifiers: c.modifiers,
          special_instructions: c.specialInstructions
        })),
        total: total,
        payment_method: paymentMethod,
        amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) || total : total,
        change_amount: paymentMethod === 'cash' ? Math.max(0, (parseFloat(amountReceived) || 0) - total) : 0,
        cashier_name: user.name,
        created_at: new Date().toISOString(),
        branch: user.branch,
        tenant: user.tenant
      }
      
      setLastOrder(displayOrder)
      setOrderHistory(prev => [displayOrder, ...prev])
      setPaymentModalOpen(false)
      setReceiptModalOpen(true)
      clearOrder()
      toast.success(`Order ${orderNumber} completed!`)
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
    }
  }
  
  // Print thermal receipt
  const printReceipt = () => {
    const printContent = receiptRef.current
    if (!printContent) return
    
    const printWindow = window.open('', '_blank', 'width=302,height=600')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${lastOrder?.order_number}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            line-height: 1.4;
            width: 80mm;
            padding: 2mm;
          }
          .receipt-header { text-align: center; margin-bottom: 3mm; padding-bottom: 2mm; border-bottom: 1px dashed #000; }
          .receipt-header h1 { font-size: 16px; font-weight: bold; margin-bottom: 1mm; }
          .receipt-header p { font-size: 10px; margin: 0.5mm 0; }
          .receipt-info { margin: 2mm 0; font-size: 11px; }
          .receipt-info div { margin: 1mm 0; }
          .receipt-items { margin: 3mm 0; padding: 2mm 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
          .receipt-item { margin: 1.5mm 0; }
          .receipt-item-row { display: flex; justify-content: space-between; font-size: 11px; }
          .receipt-item-modifier { font-size: 10px; padding-left: 3mm; color: #555; }
          .receipt-totals { margin: 2mm 0; }
          .receipt-total-line { display: flex; justify-content: space-between; font-size: 11px; margin: 0.5mm 0; }
          .receipt-total-line.total { font-size: 14px; font-weight: bold; margin-top: 2mm; padding-top: 2mm; border-top: 1px solid #000; }
          .receipt-payment { margin: 2mm 0; padding: 2mm 0; border-top: 1px dashed #000; }
          .receipt-footer { text-align: center; margin-top: 3mm; padding-top: 2mm; border-top: 1px dashed #000; font-size: 10px; }
          .receipt-barcode { text-align: center; margin: 2mm 0; font-size: 8px; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }
  
  // Logout
  const logout = () => {
    localStorage.removeItem('pos_user')
    router.push('/pos/login')
  }
  
  if (!user || loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
          <p className="mt-4 text-[#1e3a5f] font-medium">Loading...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col no-print">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-[#d4af37]">RIWA POS</h1>
          <span className="text-sm text-[#a8c5e6]">{user.tenant?.name} - {user.branch?.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4" />
            <span>{user.name}</span>
            <Badge variant="secondary" className="bg-[#a8c5e6] text-[#1e3a5f]">
              {user.role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryModalOpen(true)}
            className="text-white hover:bg-[#2a4a6f]"
          >
            <Clock className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/kitchen')}
            className="text-white hover:bg-[#2a4a6f]"
          >
            <ChefHat className="w-4 h-4 mr-2" />
            Kitchen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-white hover:bg-red-600"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Menu */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Order Type Selector */}
          <div className="flex gap-2 mb-4">
            {ORDER_TYPES.map(type => (
              <Button
                key={type.id}
                variant={orderType === type.id ? 'default' : 'outline'}
                className={`flex-1 h-14 text-lg font-medium ${
                  orderType === type.id 
                    ? 'bg-[#1e3a5f] hover:bg-[#2a4a6f]' 
                    : 'border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#a8c5e6]/20'
                }`}
                onClick={() => setOrderType(type.id)}
              >
                <type.icon className="w-5 h-5 mr-2" />
                {type.label}
              </Button>
            ))}
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg border-[#a8c5e6] focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>
          
          {/* Category Tabs */}
          <ScrollArea className="w-full mb-4">
            <div className="flex gap-2 pb-2">
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="lg"
                  className={`whitespace-nowrap h-12 px-6 ${
                    selectedCategory === cat.id
                      ? 'bg-[#d4af37] hover:bg-[#c9a030] text-[#1e3a5f] font-semibold'
                      : 'border-[#a8c5e6] text-[#1e3a5f] hover:bg-[#a8c5e6]/20'
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name_en}
                </Button>
              ))}
            </div>
          </ScrollArea>
          
          {/* Menu Items Grid */}
          <ScrollArea className="flex-1 pos-scrollbar">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pr-2">
              {filteredItems.map(item => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow border-[#a8c5e6] hover:border-[#1e3a5f] bg-white"
                  onClick={() => openItemModal(item)}
                >
                  <div className="p-4">
                    <div className="aspect-square bg-[#f5f7fa] rounded-lg mb-3 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <UtensilsCrossed className="w-12 h-12 text-[#a8c5e6]" />
                      )}
                    </div>
                    <h3 className="font-semibold text-[#1e3a5f] line-clamp-2">{item.name_en}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-1">{item.name_ar}</p>
                    <p className="text-lg font-bold text-[#d4af37] mt-2">{formatPrice(item.base_price, currency)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Right Panel - Cart */}
        <div className="w-96 bg-white border-l border-[#a8c5e6] flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-[#a8c5e6] bg-[#1e3a5f] text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-semibold">Current Order</span>
              </div>
              <Badge className="bg-[#d4af37] text-[#1e3a5f]">
                {ORDER_TYPES.find(t => t.id === orderType)?.label}
              </Badge>
            </div>
          </div>
          
          {/* Cart Items */}
          <ScrollArea className="flex-1 pos-scrollbar">
            <div className="p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Cart is empty</p>
                </div>
              ) : (
                cart.map(cartItem => (
                  <Card key={cartItem.id} className="border-[#a8c5e6]">
                    <div className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#1e3a5f]">{cartItem.item.name_en}</h4>
                          {cartItem.modifiers.length > 0 && (
                            <div className="text-sm text-gray-500 mt-1">
                              {cartItem.modifiers.map(m => m.name_en).join(', ')}
                            </div>
                          )}
                          {cartItem.specialInstructions && (
                            <div className="text-sm text-[#d4af37] mt-1">
                              Note: {cartItem.specialInstructions}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 -mr-2 -mt-1"
                          onClick={() => removeCartItem(cartItem.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-8 h-8 p-0 border-[#a8c5e6]"
                            onClick={() => updateCartItemQuantity(cartItem.id, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{cartItem.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-8 h-8 p-0 border-[#a8c5e6]"
                            onClick={() => updateCartItemQuantity(cartItem.id, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <span className="font-bold text-[#1e3a5f]">{formatPrice(cartItem.totalPrice, currency)}</span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
          
          {/* Cart Footer */}
          <div className="border-t border-[#a8c5e6] p-4 space-y-3 bg-[#f5f7fa]">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal, currency)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span className="font-medium">{formatPrice(tax, currency)}</span>
                </div>
              )}
              {serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Service ({serviceChargeRate}%)</span>
                  <span className="font-medium">{formatPrice(serviceCharge, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-[#1e3a5f] pt-2 border-t border-[#a8c5e6]">
                <span>Total</span>
                <span className="text-[#d4af37]">{formatPrice(total, currency)}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-12 border-[#a8c5e6] text-[#1e3a5f] hover:bg-[#a8c5e6]/20"
                onClick={clearOrder}
                disabled={cart.length === 0}
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="outline"
                className="h-12 border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10"
                onClick={holdOrder}
                disabled={cart.length === 0}
              >
                <Pause className="w-4 h-4 mr-2" />
                Hold
              </Button>
            </div>
            
            {heldOrders.length > 0 && (
              <Button
                variant="outline"
                className="w-full h-10 border-[#1e3a5f] text-[#1e3a5f]"
                onClick={() => setHoldOrdersModalOpen(true)}
              >
                <Play className="w-4 h-4 mr-2" />
                Held Orders ({heldOrders.length})
              </Button>
            )}
            
            <Button
              className="w-full h-14 text-lg font-bold bg-[#d4af37] hover:bg-[#c9a030] text-[#1e3a5f]"
              onClick={openPayment}
              disabled={cart.length === 0}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Payment ({formatPrice(total, currency)})
            </Button>
          </div>
        </div>
      </div>
      
      {/* Item Customization Modal */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] text-xl">
              {selectedItem?.name_en}
            </DialogTitle>
            <p className="text-gray-500">{selectedItem?.name_ar}</p>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6">
              {/* Base Price */}
              <div className="text-2xl font-bold text-[#d4af37]">
                {formatPrice(selectedItem.base_price, currency)}
              </div>
              
              {/* Quantity */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity</label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-12 h-12 p-0 border-[#1e3a5f]"
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <span className="text-2xl font-bold w-12 text-center">{itemQuantity}</span>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-12 h-12 p-0 border-[#1e3a5f]"
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {/* Modifiers */}
              {getItemModifiers(selectedItem.id).map(group => (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      {group.name_en}
                      {group.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-gray-400">
                      Select up to {group.max_select}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.modifiers.map(mod => (
                      <div
                        key={mod.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedModifiers.find(m => m.id === mod.id)
                            ? 'border-[#d4af37] bg-[#d4af37]/10'
                            : 'border-gray-200 hover:border-[#a8c5e6]'
                        }`}
                        onClick={() => toggleModifier(mod, group)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedModifiers.find(m => m.id === mod.id)
                              ? 'border-[#d4af37] bg-[#d4af37]'
                              : 'border-gray-300'
                          }`}>
                            {selectedModifiers.find(m => m.id === mod.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="font-medium">{mod.name_en}</span>
                        </div>
                        <span className="text-[#d4af37] font-medium">+{formatPrice(mod.price, currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Special Instructions */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Special Instructions</label>
                <Textarea
                  placeholder="E.g., No onions, extra sauce..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="border-[#a8c5e6] focus:border-[#1e3a5f]"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#d4af37] hover:bg-[#c9a030] text-[#1e3a5f] font-bold"
              onClick={addToCart}
            >
              Add to Cart - {formatPrice(
                (selectedItem?.base_price || 0) + 
                selectedModifiers.reduce((sum, m) => sum + m.price, 0),
                currency
              )} × {itemQuantity}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] text-xl">Complete Payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer Name (Optional)</label>
                <Input
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="border-[#a8c5e6]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Phone Number (Optional)</label>
                <Input
                  placeholder="+965 XXXX XXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="border-[#a8c5e6]"
                />
              </div>
            </div>
            
            {/* Payment Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className={`h-16 text-lg ${
                    paymentMethod === 'cash'
                      ? 'bg-[#1e3a5f] hover:bg-[#2a4a6f]'
                      : 'border-[#a8c5e6]'
                  }`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="w-6 h-6 mr-2" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  className={`h-16 text-lg ${
                    paymentMethod === 'card'
                      ? 'bg-[#1e3a5f] hover:bg-[#2a4a6f]'
                      : 'border-[#a8c5e6]'
                  }`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="w-6 h-6 mr-2" />
                  Card
                </Button>
              </div>
            </div>
            
            {/* Cash Amount */}
            {paymentMethod === 'cash' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Amount Received</label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="text-2xl h-14 text-center border-[#a8c5e6] font-bold"
                />
                {parseFloat(amountReceived) >= total && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg text-center">
                    <span className="text-green-600 font-medium">Change: </span>
                    <span className="text-green-700 font-bold text-xl">
                      {formatPrice(parseFloat(amountReceived) - total, currency)}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Order Summary */}
            <div className="bg-[#f5f7fa] rounded-lg p-4">
              <div className="text-center">
                <span className="text-gray-500">Total Amount</span>
                <div className="text-3xl font-bold text-[#d4af37]">{formatPrice(total, currency)}</div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#d4af37] hover:bg-[#c9a030] text-[#1e3a5f] font-bold"
              onClick={completeOrder}
              disabled={paymentMethod === 'cash' && parseFloat(amountReceived) < total}
            >
              <Check className="w-5 h-5 mr-2" />
              Complete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Receipt Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-sm">
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1e3a5f]">Order Complete!</h2>
              <p className="text-gray-500">{lastOrder?.order_number}</p>
            </div>
            
            {/* Receipt Preview */}
            <div ref={receiptRef} className="text-left bg-gray-50 p-4 rounded-lg text-sm font-mono space-y-2">
              <div className="receipt-header">
                <h1>{lastOrder?.tenant?.name || 'RIWA POS'}</h1>
                <p>{lastOrder?.branch?.name}</p>
                <p>{lastOrder?.branch?.address}</p>
                <p>{lastOrder?.branch?.phone}</p>
              </div>
              
              <div className="receipt-info">
                <div>Order: {lastOrder?.order_number}</div>
                <div>Date: {formatReceiptDate(lastOrder?.created_at)}</div>
                <div>Cashier: {lastOrder?.cashier_name}</div>
                <div>Type: {ORDER_TYPES.find(t => t.id === lastOrder?.order_type)?.label}</div>
                {lastOrder?.customer_name && <div>Customer: {lastOrder?.customer_name}</div>}
              </div>
              
              <div className="receipt-items">
                {lastOrder?.items?.map((item, i) => (
                  <div key={i} className="receipt-item">
                    <div className="receipt-item-row">
                      <span>{item.quantity}x {item.name_en}</span>
                      <span>{formatPrice(item.total_price, currency)}</span>
                    </div>
                    {item.modifiers?.map((m, j) => (
                      <div key={j} className="receipt-item-modifier">+ {m.name_en}</div>
                    ))}
                  </div>
                ))}
              </div>
              
              <div className="receipt-totals">
                <div className="receipt-total-line">
                  <span>Subtotal:</span>
                  <span>{formatPrice(lastOrder?.subtotal, currency)}</span>
                </div>
                {lastOrder?.tax_amount > 0 && (
                  <div className="receipt-total-line">
                    <span>Tax:</span>
                    <span>{formatPrice(lastOrder?.tax_amount, currency)}</span>
                  </div>
                )}
                {lastOrder?.service_charge > 0 && (
                  <div className="receipt-total-line">
                    <span>Service:</span>
                    <span>{formatPrice(lastOrder?.service_charge, currency)}</span>
                  </div>
                )}
                <div className="receipt-total-line total">
                  <span>TOTAL:</span>
                  <span>{formatPrice(lastOrder?.total, currency)}</span>
                </div>
              </div>
              
              {lastOrder?.payment_method === 'cash' && (
                <div className="receipt-payment">
                  <div className="receipt-total-line">
                    <span>Cash Received:</span>
                    <span>{formatPrice(lastOrder?.amount_received, currency)}</span>
                  </div>
                  <div className="receipt-total-line">
                    <span>Change:</span>
                    <span>{formatPrice(lastOrder?.change_amount, currency)}</span>
                  </div>
                </div>
              )}
              
              <div className="receipt-barcode">
                *{lastOrder?.order_number}*
              </div>
              
              <div className="receipt-footer">
                <p>Thank you for your visit!</p>
                <p>Powered by RIWA POS</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setReceiptModalOpen(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4a6f]"
                onClick={printReceipt}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Order History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">Today's Orders</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3">
              {orderHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No orders today</p>
                </div>
              ) : (
                orderHistory.map(order => (
                  <Card key={order.id} className="border-[#a8c5e6]">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-[#1e3a5f]">{order.order_number}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </Badge>
                          <div className="text-lg font-bold text-[#d4af37] mt-1">
                            {formatPrice(order.total_amount || order.total, currency)}
                          </div>
                        </div>
                      </div>
                      {order.items && (
                        <div className="text-sm text-gray-600">
                          {order.items?.map(i => `${i.quantity}x ${i.name_en}`).join(', ')}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Held Orders Modal */}
      <Dialog open={holdOrdersModalOpen} onOpenChange={setHoldOrdersModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">Held Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {heldOrders.map(held => (
              <Card
                key={held.id}
                className="border-[#a8c5e6] cursor-pointer hover:border-[#d4af37]"
                onClick={() => resumeOrder(held)}
              >
                <div className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-[#1e3a5f]">
                        {held.customerName || 'Guest'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {held.cart.length} items • {ORDER_TYPES.find(t => t.id === held.orderType)?.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(held.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-[#d4af37] text-[#d4af37]">
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
