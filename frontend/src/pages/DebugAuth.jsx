import { supabase } from '@/supabaseClient'

export default function DebugAuth() {
  
  // Get the actual Supabase URL being used
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  
  const testOAuth = async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: true,
        ...(provider === 'azure' && { scopes: 'email' })
      }
    })
    
    console.log(`${provider} OAuth test:`, { data, error })
    return { data, error }
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">OAuth Debug Info</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <p><strong>Supabase URL:</strong> {supabaseUrl}</p>
        <p><strong>Expected:</strong> https://ducrwfvylwdaqpwfbdub.supabase.co</p>
        <p className={supabaseUrl === 'https://ducrwfvylwdaqpwfbdub.supabase.co' ? 'text-green-600' : 'text-red-600'}>
          Status: {supabaseUrl === 'https://ducrwfvylwdaqpwfbdub.supabase.co' ? '✅ Correct' : '❌ Wrong URL'}
        </p>
      </div>
      
      <div className="space-y-2">
        <button 
          onClick={() => testOAuth('google')}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Test Google OAuth
        </button>
        <button 
          onClick={() => testOAuth('azure')}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Test Microsoft OAuth
        </button>
      </div>
      
      <p className="mt-4 text-sm text-gray-600">Check browser console for results</p>
    </div>
  )
}