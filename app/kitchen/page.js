'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' // Keep for Realtime subscriptions only
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import {
  ChefHat, Clock, Check, AlertCircle, RefreshCw, LogOut, User,
  UtensilsCrossed, Package, Bike, Volume2, VolumeX, Plus, Search, X,
  Settings, Bell, Play
} from 'lucide-react'

// Order types
const ORDER_TYPES = {
  qsr: { label: 'Dine In', icon: UtensilsCrossed, color: 'bg-blue-100 text-blue-700' },
  takeaway: { label: 'Takeaway', icon: Package, color: 'bg-purple-100 text-purple-700' },
  delivery: { label: 'Delivery', icon: Bike, color: 'bg-green-100 text-green-700' }
}

// Notification sounds
const NOTIFICATION_SOUNDS = [
  { id: 'bell', name: 'Bell', description: 'Classic bell sound' },
  { id: 'chime', name: 'Chime', description: 'Soft chime notification' },
  { id: 'alert', name: 'Alert', description: 'Urgent alert tone' },
  { id: 'ding', name: 'Ding', description: 'Simple ding sound' }
]

// Generate sound data URLs (embedded sounds for reliability)
const generateSoundDataUrl = (type) => {
  // These are simple synthesized sounds encoded as base64 WAV
  const sounds = {
    bell: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2DgYF7c2tyeoCEhYGDbXN0gYWDgHRsbXaCh4WAeG5ucHyEh4Z+cmtpcoCIiIZ8cGpocX+IiYd9cGlnb36Ii4l+cWhmbX2IjIp+b2Zla3yIjYt+bmVkaXqHjYx+bGRjZ3iFjI2AbGJhZXWCi46CamBfY3KAio+EaV5dYW9+iJCHaFxbX2x7hpCJaFtZXWp4hI+LaldXWmZ0gY2OjGlUVVdib36KkI1sU1JTXmp5h5KQcFBQUVlkc4WSkXNPTU9VYG5/kZN2TUxNUlxpcouVd0tJSk5XZXOKS1dqfpKKfHRpZ2p0f3+Af3x1cXN0dnqAfoBzdHZzcnN0d3p8fH56d3Z1dnl6fX1+enZ1dnl7fn9/e3Z1d3p8f4F/e3Z2eHt+gYKAe3Z2eHt+goOBfHd3eXx/g4SBfHd3eXyAg4WCfXh4en6BhIaDfnh5e36ChYeEf3l5e36ChYeEf3p6fH+DhoiGgXp6fH+DhoiGgXt7fYCEh4mHgnt7fYCEh4mHgnt7fYCEh4mHgnt7fYCEh4mHgnt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgXt7fYCEh4mHgQ==',
    chime: 'data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToFAAB/f39/f39/f4CAgICAgICBgYGBgYKCgoKCg4ODg4OEhISEhIWFhYWFhoaGhoaHh4eHh4iIiIiIiYmJiYmKioqKiouLi4uLjIyMjIyNjY2NjY6Ojo6Oj4+Pj4+QkJCQkJGRkZGRkpKSkpKTk5OTk5SUlJSUlZWVlZWWlpaWlpeXl5eXmJiYmJiZmZmZmZqampqam5ubm5ucnJycnJ2dnZ2dnp6enp6fn5+fn6CgoKCgoaGhoaGioqKioqOjo6OjpKSkpKSlpaWlpaampqamq6urq6ysrKytra2trq6urq+vr6+wsLCwsbGxsbKysrKzs7OztLS0tLW1tbW2tra2t7e3t7i4uLi5ubm5urq6uru7u7u8vLy8vb29vb6+vr6/v7+/wMDAwMHBwcHCwsLCw8PDw8TExMTFxcXFxsbGxsfHx8fIyMjIycnJycrKysrLy8vLzMzMzM3Nzc3Ozs7Oz8/Pz9DQ0NDR0dHR0tLS0tPT09PU1NTU1dXV1dbW1tbX19fX2NjY2NnZ2dna2tra29vb29zc3Nzd3d3d3t7e3t/f39/g4ODg4eHh4eLi4uLj4+Pj5OTk5OXl5eXm5ubm5+fn5+jo6Ojp6enp6urq6uvr6+vs7Ozs7e3t7e7u7u7v7+/v8PDw8PHx8fHy8vLy8/Pz8/T09PT19fX19vb29vf39/f4+Pj4+fn5+fr6+vr7+/v7/Pz8/P39/f3+/v7+////fw==',
    alert: 'data:audio/wav;base64,UklGRjIGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQ4GAAB/f39/f4B/gH+AgICAgIGAgYGBgYGCgoKCgoODg4ODhISEhISFhYWFhoaGhoeHh4eIiIiIiYmJiYqKioqLi4uLjIyMjI2NjY2Ojo6Oj4+Pj5CQkJCRkZGRkpKSkpOTk5OUlJSUlZWVlZaWlpaXl5eXmJiYmJmZmZmampqam5ubm5ycnJydnZ2dnp6enp+fn5+goKCgoaGhoaKioqKjo6OjpKSkpKWlpaWmpqamq6urq6ysrKytra2trq6urq+vr6+wsLCwsbGxsbKysrKzs7OztLS0tLW1tbW2tra2t7e3t7i4uLi5ubm5urq6uru7u7u8vLy8vb29vb6+vr6/v7+/wMDAwMHBwcHCwsLCw8PDw8TExMTFxcXFxsbGxsfHx8fIyMjIycnJycrKysrLy8vLzMzMzM3Nzc3Ozs7Oz8/Pz9DQ0NDR0dHR0tLS0tPT09PU1NTU1dXV1dbW1tbX19fX2NjY2NnZ2dna2tra29vb29zc3Nzd3d3d3t7e3t/f39/g4ODg4eHh4eLi4uLj4+Pj5OTk5OXl5eXm5ubm5+fn5+jo6Ojp6enp6urq6uvr6+vs7Ozs7e3t7e7u7u7v7+/v8PDw8PHx8fHy8vLy8/Pz8/T09PT19fX19vb29vf39/f4+Pj4+fn5+fr6+vr7+/v7/Pz8/P39/f3+/v7+////fw==',
    ding: 'data:audio/wav;base64,UklGRnoEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YVYEAACAf4B/gH+Af4CAgICAgICBgYGBgYGCgoKCg4ODg4OEhISEhYWFhYaGhoaHh4eHiIiIiImJiYmKioqKi4uLi4yMjIyNjY2Njo6Ojo+Pj4+QkJCQkZGRkZKSkpKTk5OTlJSUlJWVlZWWlpaWl5eXl5iYmJiZmZmZmpqampubm5ucnJycnZ2dnZ6enp6fn5+foKCgoKGhoaGioqKio6Ojo6SkpKSlpaWlpqampqenp6eoqKioqampqaqqqqp/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/fw=='
  }
  return sounds[type] || sounds.bell
}

// Format price in KWD (3 decimals)
const formatPrice = (price) => {
  return Number(price || 0).toFixed(3) + ' KWD'
}

// Format time
const formatTime = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// Calculate time elapsed
const getTimeElapsed = (dateStr) => {
  const created = new Date(dateStr)
  const now = new Date()
  const diffMs = now - created
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins === 1) return '1 min ago'
  if (diffMins < 60) return `${diffMins} mins ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours === 1) return '1 hour ago'
  return `${diffHours} hours ago`
}

// Generate order number
const generateOrderNumber = () => {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `ORD-${dateStr}-${seq}`
}

export default function KitchenPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [lastOrderCount, setLastOrderCount] = useState(0)
  const audioRef = useRef(null)
  
  // Sound settings
  const [soundSettingsOpen, setSoundSettingsOpen] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [selectedSound, setSelectedSound] = useState('bell')
  const [soundVolume, setSoundVolume] = useState([70])
  
  // New order modal state
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false)
  const [orderType, setOrderType] = useState('qsr')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  
  // Load sound settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('kitchen_sound_settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setAudioEnabled(settings.enabled ?? true)
      setSelectedSound(settings.sound ?? 'bell')
      setSoundVolume([settings.volume ?? 70])
    }
  }, [])
  
  // Save sound settings to localStorage
  const saveSoundSettings = () => {
    const settings = {
      enabled: audioEnabled,
      sound: selectedSound,
      volume: soundVolume[0]
    }
    localStorage.setItem('kitchen_sound_settings', JSON.stringify(settings))
    setSoundSettingsOpen(false)
    toast.success('Sound settings saved')
  }
  
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
  
  // Load orders
  const loadOrders = async () => {
    if (!user) return
    
    try {
      const today = new Date().toISOString().slice(0, 10)
      
      // Load orders for user's tenant and branch via API
      const response = await fetch(`/api/orders/list?tenant_id=${user.tenant_id}&branch_id=${user.branch_id}&status=pending,preparing&date=${today}&include_items=true`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load orders')
      }
      
      const ordersWithItems = data.data.orders.map(order => ({
        ...order,
        items: (order.items || []).map(item => ({
          ...item,
          name_en: item.item_name_en || 'Unknown Item',
          name_ar: item.item_name_ar || ''
        }))
      }))
      
      // Check for new orders and play sound
      if (ordersWithItems.length > lastOrderCount && lastOrderCount > 0 && audioEnabled) {
        playNotificationSound()
      }
      setLastOrderCount(ordersWithItems.length)
      setOrders(ordersWithItems)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
    setLoading(false)
  }
  
  // Load menu data
  const loadMenuData = async () => {
    if (!user) return
    
    try {
      // Load categories and items via API
      const [catsRes, itemsRes] = await Promise.all([
        fetch(`/api/menu/categories?tenant_id=${user.tenant_id}&status=active`),
        fetch(`/api/menu/items?tenant_id=${user.tenant_id}&status=active`)
      ])
      
      const catsData = await catsRes.json()
      const itemsData = await itemsRes.json()
      
      setCategories(catsData.success ? catsData.data.categories : [])
      setItems(itemsData.success ? itemsData.data.items : [])
    } catch (error) {
      console.error('Error loading menu:', error)
    }
  }
  
  // Play notification sound
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.src = generateSoundDataUrl(selectedSound)
      audioRef.current.volume = soundVolume[0] / 100
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => console.log('Audio play failed:', e))
    }
  }
  
  // Test sound
  const testSound = (soundId) => {
    if (audioRef.current) {
      audioRef.current.src = generateSoundDataUrl(soundId || selectedSound)
      audioRef.current.volume = soundVolume[0] / 100
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => console.log('Audio play failed:', e))
    }
  }
  
  // Initial load and real-time subscription
  useEffect(() => {
    if (user) {
      loadOrders()
      loadMenuData()
      
      // Set up real-time subscription
      const channel = supabase
        .channel('kitchen-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `tenant_id=eq.${user.tenant_id}`
          },
          (payload) => {
            console.log('Order change:', payload)
            loadOrders()
          }
        )
        .subscribe()
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadOrders, 30000)
      
      return () => {
        supabase.removeChannel(channel)
        clearInterval(interval)
      }
    }
  }, [user])
  
  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
      
      if (error) throw error
      
      toast.success(`Order marked as ${newStatus}`)
      loadOrders()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Failed to update order')
    }
  }
  
  // Filter items by search
  const filteredItems = items.filter(item =>
    item.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name_ar.includes(searchQuery)
  )
  
  // Add item to new order
  const addItemToOrder = (item) => {
    const existing = selectedItems.find(i => i.id === item.id)
    if (existing) {
      setSelectedItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setSelectedItems(prev => [...prev, { ...item, quantity: 1 }])
    }
  }
  
  // Remove item from new order
  const removeItemFromOrder = (itemId) => {
    setSelectedItems(prev => prev.filter(i => i.id !== itemId))
  }
  
  // Update item quantity
  const updateItemQuantity = (itemId, delta) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(0, i.quantity + delta)
        return newQty === 0 ? null : { ...i, quantity: newQty }
      }
      return i
    }).filter(Boolean))
  }
  
  // Create new order
  const createOrder = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please add items to the order')
      return
    }
    
    try {
      const total = selectedItems.reduce((sum, item) => sum + (item.base_price * item.quantity), 0)
      const orderId = uuidv4()
      
      // Create order with correct schema
      const orderData = {
        id: orderId,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id,
        order_number: generateOrderNumber(),
        channel: 'pos',
        order_type: orderType,
        status: 'pending',
        payment_status: 'paid',
        customer_name: customerName || null,
        subtotal: total,
        tax_amount: 0,
        service_charge: 0,
        total_amount: total,
        user_id: user.id,
        notes: specialInstructions || null
      }
      
      const { error: orderError } = await supabase.from('orders').insert(orderData)
      if (orderError) throw orderError
      
      // Create order items
      const orderItems = selectedItems.map((item) => ({
        id: uuidv4(),
        order_id: orderId,
        item_id: item.id,
        item_name_en: item.name_en,
        item_name_ar: item.name_ar || '',
        quantity: item.quantity,
        unit_price: item.base_price,
        total_price: item.base_price * item.quantity
      }))
      
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) {
        console.error('Order items error:', itemsError)
      }
      
      toast.success('Order created successfully!')
      setNewOrderModalOpen(false)
      resetNewOrderForm()
      loadOrders()
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
    }
  }
  
  // Reset new order form
  const resetNewOrderForm = () => {
    setSelectedItems([])
    setCustomerName('')
    setSpecialInstructions('')
    setOrderType('qsr')
    setSearchQuery('')
  }
  
  // Logout
  const logout = () => {
    localStorage.removeItem('pos_user')
    router.push('/pos/login')
  }
  
  // Group orders by status
  const pendingOrders = orders.filter(o => o.status === 'pending')
  const preparingOrders = orders.filter(o => o.status === 'preparing')
  
  if (!user || loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
          <p className="mt-4 text-[#1e3a5f] font-medium">Loading Kitchen Display...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col">
      {/* Audio element for notifications */}
      <audio ref={audioRef} preload="auto" />
      
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <ChefHat className="w-8 h-8 text-[#d4af37]" />
          <div>
            <h1 className="text-xl font-bold">Kitchen Display</h1>
            <p className="text-sm text-[#a8c5e6]">{user.tenant?.name || 'RIWA POS'} - {user.branch?.name || ''}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Sound Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundSettingsOpen(true)}
            className={`text-white hover:bg-[#2a4a6f] ${!audioEnabled && 'opacity-50'}`}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          
          {/* New Order Button */}
          <Button
            onClick={() => setNewOrderModalOpen(true)}
            className="bg-[#d4af37] hover:bg-[#c9a030] text-[#1e3a5f] font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
          
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={loadOrders}
            className="text-white hover:bg-[#2a4a6f]"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
          
          {/* User Info */}
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4" />
            <span>{user.name}</span>
          </div>
          
          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-white hover:bg-red-600"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>
      
      {/* Stats Bar */}
      <div className="bg-white border-b border-[#a8c5e6] px-6 py-3 flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
          <span className="font-medium text-[#1e3a5f]">Pending:</span>
          <span className="text-xl font-bold text-yellow-600">{pendingOrders.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="font-medium text-[#1e3a5f]">Preparing:</span>
          <span className="text-xl font-bold text-blue-600">{preparingOrders.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">Auto-refresh: 30s</span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-2 gap-6 h-full">
          {/* Pending Orders */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-[#1e3a5f]">New Orders</h2>
              <Badge className="bg-yellow-100 text-yellow-700">{pendingOrders.length}</Badge>
            </div>
            
            <ScrollArea className="flex-1 pos-scrollbar">
              <div className="grid gap-4 pr-2">
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No pending orders</p>
                  </div>
                ) : (
                  pendingOrders.map(order => (
                    <Card 
                      key={order.id} 
                      className="border-l-4 border-l-yellow-500 border-[#a8c5e6] order-new"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg text-[#1e3a5f]">
                              {order.order_number}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={ORDER_TYPES[order.order_type]?.color || 'bg-gray-100'}>
                                {ORDER_TYPES[order.order_type]?.label || order.order_type}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatTime(order.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {getTimeElapsed(order.created_at)}
                            </div>
                            {order.customer_name && (
                              <div className="text-sm font-medium text-[#1e3a5f]">
                                {order.customer_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <span className="bg-[#1e3a5f] text-white text-sm font-bold w-6 h-6 rounded flex items-center justify-center flex-shrink-0">
                                {item.quantity}
                              </span>
                              <div className="flex-1">
                                <div className="font-medium text-[#1e3a5f]">{item.name_en || item.item_name_en}</div>
                                {item.notes && (
                                  <div className="text-sm text-[#d4af37] font-medium">
                                    ⚠ {item.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          className="w-full h-12 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white font-semibold"
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                        >
                          Start Preparing
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          {/* Preparing Orders */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold text-[#1e3a5f]">Preparing</h2>
              <Badge className="bg-blue-100 text-blue-700">{preparingOrders.length}</Badge>
            </div>
            
            <ScrollArea className="flex-1 pos-scrollbar">
              <div className="grid gap-4 pr-2">
                {preparingOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No orders being prepared</p>
                  </div>
                ) : (
                  preparingOrders.map(order => (
                    <Card 
                      key={order.id} 
                      className="border-l-4 border-l-blue-500 border-[#a8c5e6]"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg text-[#1e3a5f]">
                              {order.order_number}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={ORDER_TYPES[order.order_type]?.color || 'bg-gray-100'}>
                                {ORDER_TYPES[order.order_type]?.label || order.order_type}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatTime(order.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {getTimeElapsed(order.created_at)}
                            </div>
                            {order.customer_name && (
                              <div className="text-sm font-medium text-[#1e3a5f]">
                                {order.customer_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <span className="bg-blue-500 text-white text-sm font-bold w-6 h-6 rounded flex items-center justify-center flex-shrink-0">
                                {item.quantity}
                              </span>
                              <div className="flex-1">
                                <div className="font-medium text-[#1e3a5f]">{item.name_en || item.item_name_en}</div>
                                {item.notes && (
                                  <div className="text-sm text-[#d4af37] font-medium">
                                    ⚠ {item.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          className="w-full h-12 bg-[#d4af37] hover:bg-[#c9a030] text-[#1e3a5f] font-bold"
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                        >
                          <Check className="w-5 h-5 mr-2" />
                          Mark as Ready
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
      
      {/* Sound Settings Modal */}
      <Dialog open={soundSettingsOpen} onOpenChange={setSoundSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Sound Settings
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#f5f7fa] rounded-lg">
              <div>
                <div className="font-medium text-[#1e3a5f]">Sound Notifications</div>
                <div className="text-sm text-gray-500">Play sound for new orders</div>
              </div>
              <Button
                variant={audioEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={audioEnabled ? 'bg-[#d4af37] text-[#1e3a5f]' : ''}
              >
                {audioEnabled ? 'ON' : 'OFF'}
              </Button>
            </div>
            
            {/* Sound Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">Notification Sound</label>
              <div className="space-y-2">
                {NOTIFICATION_SOUNDS.map(sound => (
                  <div
                    key={sound.id}
                    className={`sound-option ${selectedSound === sound.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSound(sound.id)}
                  >
                    <div>
                      <div className="font-medium text-[#1e3a5f]">{sound.name}</div>
                      <div className="text-sm text-gray-500">{sound.description}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        testSound(sound.id)
                      }}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Volume Slider */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Volume: {soundVolume[0]}%
              </label>
              <Slider
                value={soundVolume}
                onValueChange={setSoundVolume}
                max={100}
                min={10}
                step={10}
                className="w-full"
              />
            </div>
            
            {/* Test Button */}
            <Button
              variant="outline"
              className="w-full border-[#a8c5e6]"
              onClick={() => testSound()}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Test Current Sound
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSoundSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#d4af37] hover:bg-[#c9a030] text-[#1e3a5f]"
              onClick={saveSoundSettings}
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Order Modal */}
      <Dialog open={newOrderModalOpen} onOpenChange={setNewOrderModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] text-xl">Create New Order</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex gap-4">
            {/* Left: Menu Items */}
            <div className="flex-1 flex flex-col">
              {/* Order Type */}
              <div className="flex gap-2 mb-4">
                {Object.entries(ORDER_TYPES).map(([id, type]) => (
                  <Button
                    key={id}
                    variant={orderType === id ? 'default' : 'outline'}
                    size="sm"
                    className={orderType === id ? 'bg-[#1e3a5f]' : ''}
                    onClick={() => setOrderType(id)}
                  >
                    <type.icon className="w-4 h-4 mr-1" />
                    {type.label}
                  </Button>
                ))}
              </div>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-[#a8c5e6]"
                />
              </div>
              
              {/* Items Grid */}
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-3 gap-2 pr-2">
                  {filteredItems.map(item => (
                    <Button
                      key={item.id}
                      variant="outline"
                      className="h-auto p-3 flex flex-col items-start text-left border-[#a8c5e6] hover:border-[#1e3a5f] hover:bg-[#a8c5e6]/10"
                      onClick={() => addItemToOrder(item)}
                    >
                      <span className="font-medium text-[#1e3a5f] text-sm line-clamp-1">{item.name_en}</span>
                      <span className="text-[#d4af37] font-bold text-sm">{formatPrice(item.base_price)}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Right: Selected Items */}
            <div className="w-64 flex flex-col border-l border-[#a8c5e6] pl-4">
              <h3 className="font-semibold text-[#1e3a5f] mb-2">Order Items</h3>
              
              {/* Customer Name */}
              <Input
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mb-2 border-[#a8c5e6]"
              />
              
              {/* Selected Items */}
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-2 pr-2">
                  {selectedItems.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No items selected</p>
                  ) : (
                    selectedItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-[#f5f7fa] rounded">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[#1e3a5f] line-clamp-1">{item.name_en}</div>
                          <div className="text-xs text-[#d4af37]">{formatPrice(item.base_price * item.quantity)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-6 h-6 p-0"
                            onClick={() => updateItemQuantity(item.id, -1)}
                          >
                            -
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-6 h-6 p-0"
                            onClick={() => updateItemQuantity(item.id, 1)}
                          >
                            +
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-6 h-6 p-0 text-red-500"
                          onClick={() => removeItemFromOrder(item.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              {/* Special Instructions */}
              <Textarea
                placeholder="Special instructions..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="mb-4 border-[#a8c5e6] text-sm"
                rows={2}
              />
              
              {/* Total */}
              <div className="border-t border-[#a8c5e6] pt-3 mb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-[#1e3a5f]">Total:</span>
                  <span className="text-xl font-bold text-[#d4af37]">
                    {formatPrice(selectedItems.reduce((sum, item) => sum + (item.base_price * item.quantity), 0))}
                  </span>
                </div>
              </div>
              
              {/* Create Button */}
              <Button
                className="w-full bg-[#d4af37] hover:bg-[#c9a030] text-[#1e3a5f] font-bold"
                onClick={createOrder}
                disabled={selectedItems.length === 0}
              >
                Create Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
