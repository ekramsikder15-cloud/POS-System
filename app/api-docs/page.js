'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Code, Server, Database, Lock, ShoppingCart, Users, BarChart3, 
  ChevronDown, ChevronRight, Copy, Check, ExternalLink 
} from 'lucide-react'

const API_BASE = '/api'

const endpoints = [
  {
    category: 'Authentication',
    icon: Lock,
    color: 'bg-purple-100 text-purple-700',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Login with email/password or PIN',
        requestBody: {
          email: 'admin@bamburgers.com',
          // OR
          username: 'bamburger1',
          pin: '1234'
        },
        response: {
          success: true,
          data: {
            user: {
              id: 'uuid',
              name: 'Admin User',
              email: 'admin@bamburgers.com',
              role: 'tenant_owner',
              tenant_id: 'uuid',
              branch_id: 'uuid',
              tenant: { id: 'uuid', name: 'Bam Burgers', currency: 'KWD' },
              branch: { id: 'uuid', name: 'Bam Burgers - Salwa' }
            }
          }
        }
      }
    ]
  },
  {
    category: 'Menu - Categories',
    icon: Database,
    color: 'bg-blue-100 text-blue-700',
    endpoints: [
      {
        method: 'GET',
        path: '/api/menu/categories',
        description: 'Get all categories for a tenant',
        params: [
          { name: 'tenant_id', required: true, description: 'Tenant UUID' },
          { name: 'status', required: false, description: 'Filter by status (active/inactive)' }
        ],
        response: {
          success: true,
          data: { categories: [{ id: 'uuid', name_en: 'Burgers', name_ar: 'برجر' }] }
        }
      },
      {
        method: 'POST',
        path: '/api/menu/categories',
        description: 'Create a new category',
        requestBody: {
          tenant_id: 'uuid',
          name_en: 'New Category',
          name_ar: 'فئة جديدة',
          sort_order: 0,
          status: 'active',
          user_id: 'uuid'
        },
        response: {
          success: true,
          data: { category: { id: 'uuid', name_en: 'New Category' } }
        }
      }
    ]
  },
  {
    category: 'Menu - Items',
    icon: ShoppingCart,
    color: 'bg-green-100 text-green-700',
    endpoints: [
      {
        method: 'GET',
        path: '/api/menu/items',
        description: 'Get menu items with optional modifiers',
        params: [
          { name: 'tenant_id', required: true, description: 'Tenant UUID' },
          { name: 'category_id', required: false, description: 'Filter by category' },
          { name: 'status', required: false, description: 'Filter by status' },
          { name: 'include_modifiers', required: false, description: 'Include modifier groups (true/false)' }
        ],
        response: {
          success: true,
          data: { 
            items: [{ 
              id: 'uuid', 
              name_en: 'Classic Burger', 
              base_price: 2.500,
              modifier_groups: []
            }] 
          }
        }
      },
      {
        method: 'GET',
        path: '/api/menu/items/{id}',
        description: 'Get single item with full details',
        response: {
          success: true,
          data: { 
            item: { 
              id: 'uuid', 
              name_en: 'Classic Burger',
              modifier_groups: [{ id: 'uuid', name_en: 'Extras', modifiers: [] }]
            } 
          }
        }
      },
      {
        method: 'POST',
        path: '/api/menu/items',
        description: 'Create a new menu item',
        requestBody: {
          tenant_id: 'uuid',
          category_id: 'uuid',
          name_en: 'New Burger',
          name_ar: 'برجر جديد',
          base_price: 3.500,
          modifier_group_ids: ['uuid1', 'uuid2'],
          user_id: 'uuid'
        },
        response: {
          success: true,
          data: { item: { id: 'uuid', name_en: 'New Burger' } }
        }
      },
      {
        method: 'PATCH',
        path: '/api/menu/items/{id}',
        description: 'Update menu item',
        requestBody: {
          name_en: 'Updated Name',
          base_price: 4.000,
          status: 'inactive',
          user_id: 'uuid'
        }
      },
      {
        method: 'DELETE',
        path: '/api/menu/items/{id}',
        description: 'Soft delete menu item (sets status to inactive)',
        params: [
          { name: 'user_id', required: false, description: 'User ID for audit' }
        ]
      }
    ]
  },
  {
    category: 'Menu - Modifier Groups',
    icon: Database,
    color: 'bg-yellow-100 text-yellow-700',
    endpoints: [
      {
        method: 'GET',
        path: '/api/menu/modifier-groups',
        description: 'Get all modifier groups with modifiers',
        params: [
          { name: 'tenant_id', required: true, description: 'Tenant UUID' },
          { name: 'status', required: false, description: 'Filter by status' },
          { name: 'include_modifiers', required: false, description: 'Include modifiers (default: true)' }
        ],
        response: {
          success: true,
          data: { 
            modifier_groups: [{ 
              id: 'uuid', 
              name_en: 'Extra Toppings',
              min_select: 0,
              max_select: 3,
              modifiers: [{ id: 'uuid', name_en: 'Cheese', price: 0.500 }]
            }] 
          }
        }
      },
      {
        method: 'POST',
        path: '/api/menu/modifier-groups',
        description: 'Create modifier group with modifiers',
        requestBody: {
          tenant_id: 'uuid',
          name_en: 'Sauces',
          min_select: 0,
          max_select: 2,
          modifiers: [
            { name_en: 'Ketchup', price: 0 },
            { name_en: 'Mayo', price: 0.100 }
          ],
          user_id: 'uuid'
        }
      }
    ]
  },
  {
    category: 'Orders',
    icon: ShoppingCart,
    color: 'bg-orange-100 text-orange-700',
    endpoints: [
      {
        method: 'POST',
        path: '/api/orders/create',
        description: 'Create a new order with items and payment',
        requestBody: {
          tenant_id: 'uuid',
          branch_id: 'uuid',
          order_type: 'qsr',
          channel: 'pos',
          items: [
            {
              item_id: 'uuid',
              quantity: 2,
              modifiers: [{ id: 'uuid', name_en: 'Cheese', price: 0.500 }],
              notes: 'No onions'
            }
          ],
          customer_name: 'John Doe',
          customer_phone: '+96512345678',
          payment_method: 'cash',
          amount_received: 10.000,
          user_id: 'uuid'
        },
        response: {
          success: true,
          data: {
            order: { id: 'uuid', status: 'pending', total_amount: 7.500 },
            order_number: 'ORD-20250131-001'
          }
        }
      },
      {
        method: 'GET',
        path: '/api/orders/list',
        description: 'List orders with filters',
        params: [
          { name: 'tenant_id', required: true, description: 'Tenant UUID' },
          { name: 'branch_id', required: false, description: 'Filter by branch' },
          { name: 'status', required: false, description: 'Filter by status (comma-separated)' },
          { name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' },
          { name: 'channel', required: false, description: 'Filter by channel (pos/website)' },
          { name: 'include_items', required: false, description: 'Include order items (default: true)' },
          { name: 'limit', required: false, description: 'Page size (default: 50)' },
          { name: 'offset', required: false, description: 'Page offset (default: 0)' }
        ],
        response: {
          success: true,
          data: {
            orders: [],
            pagination: { total: 100, limit: 50, offset: 0, has_more: true }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/orders/{id}',
        description: 'Get full order details with items, payments, and history',
        response: {
          success: true,
          data: {
            order: {
              id: 'uuid',
              order_number: 'ORD-20250131-001',
              items: [],
              payments: [],
              states: [],
              allowed_transitions: ['accepted', 'cancelled']
            }
          }
        }
      },
      {
        method: 'PATCH',
        path: '/api/orders/{id}',
        description: 'Update order status or details',
        requestBody: {
          status: 'preparing',
          reason: 'Order confirmed by kitchen',
          user_id: 'uuid'
        },
        response: {
          success: true,
          data: {
            order: { id: 'uuid', status: 'preparing' },
            message: 'Order status updated to preparing'
          }
        }
      }
    ]
  },
  {
    category: 'Admin',
    icon: BarChart3,
    color: 'bg-pink-100 text-pink-700',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/stats',
        description: 'Get dashboard statistics',
        params: [
          { name: 'tenant_id', required: true, description: 'Tenant UUID' },
          { name: 'branch_id', required: false, description: 'Filter by branch' },
          { name: 'date', required: false, description: 'Date (YYYY-MM-DD), default: today' }
        ],
        response: {
          success: true,
          data: {
            stats: {
              date: '2025-01-31',
              orders: { total: 50, pending: 5, preparing: 10, completed: 35 },
              sales: { total: 250.500, paid: 240.000, pending: 10.500 },
              by_channel: { pos: 40, website: 10 },
              by_order_type: { qsr: 25, takeaway: 15, delivery: 10 },
              top_items: [{ name: 'Classic Burger', quantity: 45 }],
              recent_orders: []
            }
          }
        }
      }
    ]
  },
  {
    category: 'Customers',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-700',
    endpoints: [
      {
        method: 'GET',
        path: '/api/customers',
        description: 'List customers with search',
        params: [
          { name: 'tenant_id', required: true, description: 'Tenant UUID' },
          { name: 'search', required: false, description: 'Search by name/phone/email' },
          { name: 'limit', required: false, description: 'Page size' },
          { name: 'offset', required: false, description: 'Page offset' }
        ]
      },
      {
        method: 'POST',
        path: '/api/customers',
        description: 'Create or get existing customer',
        requestBody: {
          tenant_id: 'uuid',
          name: 'John Doe',
          phone: '+96512345678',
          email: 'john@example.com',
          user_id: 'uuid'
        },
        response: {
          success: true,
          data: { customer: { id: 'uuid', name: 'John Doe' }, existing: false }
        }
      }
    ]
  }
]

const orderStatusFlow = [
  { status: 'pending', next: ['accepted', 'preparing', 'cancelled'], color: 'bg-yellow-500' },
  { status: 'accepted', next: ['preparing', 'cancelled'], color: 'bg-blue-500' },
  { status: 'preparing', next: ['ready', 'cancelled'], color: 'bg-orange-500' },
  { status: 'ready', next: ['dispatched', 'completed', 'cancelled'], color: 'bg-green-500' },
  { status: 'dispatched', next: ['delivered', 'cancelled'], color: 'bg-purple-500' },
  { status: 'delivered', next: ['completed'], color: 'bg-teal-500' },
  { status: 'completed', next: [], color: 'bg-emerald-600' },
  { status: 'cancelled', next: [], color: 'bg-red-500' }
]

function EndpointCard({ endpoint }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const methodColors = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    PATCH: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700'
  }
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <Card className="mb-3">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Badge className={methodColors[endpoint.method]}>{endpoint.method}</Badge>
          <code className="text-sm font-mono text-gray-700">{endpoint.path}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{endpoint.description}</span>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>
      
      {expanded && (
        <CardContent className="border-t pt-4">
          {endpoint.params && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Query Parameters</h4>
              <div className="space-y-1">
                {endpoint.params.map(param => (
                  <div key={param.name} className="flex items-center gap-2 text-sm">
                    <code className="bg-gray-100 px-2 py-0.5 rounded">{param.name}</code>
                    {param.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                    <span className="text-gray-500">{param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {endpoint.requestBody && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Request Body</h4>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(endpoint.requestBody, null, 2))}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(endpoint.requestBody, null, 2)}
              </pre>
            </div>
          )}
          
          {endpoint.response && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Response</h4>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(endpoint.response, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-8 h-8 text-[#d4af37]" />
            <h1 className="text-2xl font-bold">RIWA POS API Documentation</h1>
          </div>
          <p className="text-[#a8c5e6]">Backend API for Restaurant POS & Ordering Platform</p>
          <div className="flex items-center gap-4 mt-4">
            <Badge className="bg-[#d4af37] text-[#1e3a5f]">Version 1.0</Badge>
            <code className="text-sm bg-[#2a4a6f] px-3 py-1 rounded">Base URL: {API_BASE}</code>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="endpoints" className="space-y-6">
          <TabsList>
            <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
            <TabsTrigger value="order-flow">Order Flow</TabsTrigger>
            <TabsTrigger value="database">Database Schema</TabsTrigger>
          </TabsList>
          
          <TabsContent value="endpoints">
            <div className="grid gap-6">
              {endpoints.map((category) => (
                <Card key={category.category}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${category.color}`}>
                        <category.icon className="w-5 h-5" />
                      </div>
                      <CardTitle>{category.category}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {category.endpoints.map((endpoint, idx) => (
                      <EndpointCard key={idx} endpoint={endpoint} />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="order-flow">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Flow</CardTitle>
                <CardDescription>Valid status transitions for orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  {orderStatusFlow.map((s) => (
                    <div key={s.status} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${s.color}`}></div>
                      <span className="text-sm font-medium">{s.status}</span>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  {orderStatusFlow.map((s) => (
                    <div key={s.status} className="flex items-center gap-4">
                      <Badge className={`${s.color} text-white min-w-[100px] justify-center`}>{s.status}</Badge>
                      <span className="text-gray-400">→</span>
                      <div className="flex gap-2">
                        {s.next.length > 0 ? s.next.map(next => (
                          <Badge key={next} variant="outline">{next}</Badge>
                        )) : <span className="text-gray-400 text-sm">Terminal state</span>}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                  <h4 className="font-semibold mb-2">Business Rules</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Order numbers format: <code>ORD-YYYYMMDD-###</code> (resets daily per branch)</li>
                    <li>• Currency: KWD with 3 decimal places (e.g., 2.500)</li>
                    <li>• Channels: pos, website, mobile, talabat, keeta, deliveroo</li>
                    <li>• Order types: qsr (dine-in), takeaway, delivery</li>
                    <li>• Payment methods: cash, card, online, wallet</li>
                    <li>• Service charge only applies to dine-in orders</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>Database Schema</CardTitle>
                <CardDescription>Supabase PostgreSQL - Core Tables</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: 'tenants', desc: 'Restaurant brands/organizations' },
                    { name: 'branches', desc: 'Physical locations' },
                    { name: 'users', desc: 'Staff accounts (admin, cashier, kitchen)' },
                    { name: 'categories', desc: 'Menu categories' },
                    { name: 'items', desc: 'Menu items' },
                    { name: 'item_variants', desc: 'Item size/flavor options' },
                    { name: 'modifier_groups', desc: 'Customization groups' },
                    { name: 'modifiers', desc: 'Individual modifiers (toppings, etc.)' },
                    { name: 'item_modifier_groups', desc: 'Item-to-modifier mapping' },
                    { name: 'orders', desc: 'Order headers' },
                    { name: 'order_items', desc: 'Order line items' },
                    { name: 'order_item_modifiers', desc: 'Selected modifiers per item' },
                    { name: 'order_states', desc: 'Order status history' },
                    { name: 'customers', desc: 'Customer profiles' },
                    { name: 'customer_addresses', desc: 'Delivery addresses' },
                    { name: 'payments', desc: 'Payment transactions' },
                    { name: 'refunds', desc: 'Refund records' },
                    { name: 'coupons', desc: 'Discount codes' },
                    { name: 'coupon_usage', desc: 'Coupon redemption tracking' },
                    { name: 'floor_plans', desc: 'Restaurant layouts' },
                    { name: 'tables', desc: 'Dine-in tables' },
                    { name: 'kitchen_stations', desc: 'KDS stations' },
                    { name: 'kds_items', desc: 'Kitchen display queue' },
                    { name: 'loyalty_transactions', desc: 'Points earned/redeemed' },
                    { name: 'wallet_transactions', desc: 'Customer wallet activity' },
                    { name: 'audit_logs', desc: 'System activity log' }
                  ].map(table => (
                    <div key={table.name} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-[#1e3a5f]" />
                        <code className="font-semibold text-sm">{table.name}</code>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{table.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
