'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, TENANT_ID, BRANCH_ID } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { User, Lock, ChefHat, ShoppingCart, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loginType, setLoginType] = useState('cashier')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const pinInputRef = useRef(null)
  
  const handlePinChange = (value) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '').slice(0, 4)
    setPin(cleaned)
  }
  
  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num)
    }
  }
  
  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
  }
  
  const handleClear = () => {
    setPin('')
  }
  
  const handleLogin = async () => {
    if (!username.trim()) {
      toast.error('Please enter your username')
      return
    }
    if (pin.length !== 4) {
      toast.error('Please enter a 4-digit PIN')
      return
    }
    
    setLoading(true)
    try {
      // Query user by email or name with matching PIN
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('pin', pin)
        .eq('status', 'active')
      
      if (error) throw error
      
      // Find user by username (email prefix or name)
      const user = users?.find(u => 
        u.email?.split('@')[0].toLowerCase() === username.toLowerCase() ||
        u.name?.toLowerCase() === username.toLowerCase() ||
        u.email?.toLowerCase() === username.toLowerCase()
      )
      
      if (!user) {
        toast.error('Invalid username or PIN')
        setLoading(false)
        return
      }
      
      // Check role permissions
      const allowedRoles = loginType === 'cashier' 
        ? ['cashier', 'tenant_owner', 'branch_manager']
        : ['kitchen', 'tenant_owner', 'branch_manager']
      
      if (!allowedRoles.includes(user.role)) {
        toast.error(`You don't have ${loginType} access`)
        setLoading(false)
        return
      }
      
      // Store user session
      localStorage.setItem('pos_user', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        loginType
      }))
      
      toast.success(`Welcome, ${user.name}!`)
      
      // Redirect based on login type
      if (loginType === 'kitchen') {
        router.push('/kitchen')
      } else {
        router.push('/pos')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed. Please try again.')
    }
    setLoading(false)
  }
  
  return (
    <div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-[#d4af37] rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-[#1e3a5f]">RP</span>
          </div>
          <CardTitle className="text-2xl font-bold text-[#1e3a5f]">RIWA POS</CardTitle>
          <p className="text-sm text-gray-500">Bam Burgers - Point of Sale</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Login Type Tabs */}
          <Tabs value={loginType} onValueChange={setLoginType} className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-[#f5f7fa]">
              <TabsTrigger 
                value="cashier" 
                className="data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Cashier
              </TabsTrigger>
              <TabsTrigger 
                value="kitchen"
                className="data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white"
              >
                <ChefHat className="w-4 h-4 mr-2" />
                Kitchen
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Username Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 text-lg border-[#a8c5e6] focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
              />
            </div>
          </div>
          
          {/* PIN Display */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">PIN Code</label>
            <div className="flex justify-center gap-3 mb-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
                    pin[i] 
                      ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#1e3a5f]' 
                      : 'border-[#a8c5e6] bg-[#f5f7fa]'
                  }`}
                >
                  {pin[i] ? '•' : ''}
                </div>
              ))}
            </div>
            
            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <Button
                  key={num}
                  variant="outline"
                  className="h-14 text-xl font-semibold border-[#a8c5e6] hover:bg-[#a8c5e6]/20 hover:border-[#1e3a5f]"
                  onClick={() => handleNumberClick(String(num))}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-14 text-sm font-medium border-[#a8c5e6] text-red-500 hover:bg-red-50"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                className="h-14 text-xl font-semibold border-[#a8c5e6] hover:bg-[#a8c5e6]/20 hover:border-[#1e3a5f]"
                onClick={() => handleNumberClick('0')}
              >
                0
              </Button>
              <Button
                variant="outline"
                className="h-14 text-sm font-medium border-[#a8c5e6] hover:bg-[#a8c5e6]/20"
                onClick={handleBackspace}
              >
                ←
              </Button>
            </div>
          </div>
          
          {/* Login Button */}
          <Button
            className="w-full h-14 text-lg font-bold bg-[#d4af37] hover:bg-[#c9a030] text-[#1e3a5f]"
            onClick={handleLogin}
            disabled={loading || pin.length !== 4 || !username}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1e3a5f]"></div>
            ) : (
              <>
                Login as {loginType === 'cashier' ? 'Cashier' : 'Kitchen Staff'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
          
          {/* Demo Credentials */}
          <div className="text-center text-sm text-gray-400 pt-2 border-t border-[#a8c5e6]">
            <p>Demo: Username: <span className="text-[#1e3a5f] font-medium">admin</span> | PIN: <span className="text-[#1e3a5f] font-medium">1234</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
