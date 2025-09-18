// app/payment-success/page.js - FIXED LOADING STATE ISSUE
'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// ✅ HYDRATION FIX: Dynamic import to prevent SSR issues
const ClientOnlyPaymentSuccess = dynamic(() => Promise.resolve(PaymentSuccessContent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-gray-700">Loading payment status...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait while we load your payment details</p>
      </div>
    </div>
  )
});

// Icon components
const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CreditCardIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const StarIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

// ✅ MAIN CONTENT COMPONENT - Client-side only
function PaymentSuccessContent() {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // ✅ HYDRATION FIX: Prevent duplicate API calls
  const hasProcessed = useRef(false);
  const retryTimeoutRef = useRef(null);

  // ✅ HYDRATION FIX: Ensure we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ✅ HYDRATION FIX: Safe date formatting
  const formatDate = (dateString) => {
    if (!isClient || !dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  // ✅ HYDRATION FIX: Safe auth token retrieval
  const getAuthToken = () => {
    if (!isClient) return null;
    
    try {
      const tokenSources = [
        () => localStorage?.getItem('access_token'),
        () => localStorage?.getItem('jwt'),
        () => localStorage?.getItem('authToken'),
        () => localStorage?.getItem('token'),
        () => {
          if (typeof document !== 'undefined') {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (name === 'jwt' || name === 'access_token') {
                return decodeURIComponent(value);
              }
            }
          }
          return null;
        }
      ];

      for (const getToken of tokenSources) {
        const token = getToken();
        if (token && token !== 'null' && token !== 'undefined') {
          console.log('🔑 Found auth token for payment success');
          return token;
        }
      }

      console.warn('⚠️ No auth token found for payment success');
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // ✅ FIXED: Payment success processing with retry logic
  const processPaymentSuccess = async (attempt = 1) => {
    const paymentId = searchParams?.get('payment_id');
    
    if (!paymentId) {
      setError('Payment ID not found in URL parameters');
      setLoading(false);
      return;
    }

    try {
      console.log(`💳 Processing payment success for ID: ${paymentId} (Attempt ${attempt})`);
      
      // Get authentication token
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      console.log('🔑 Using auth token for payment success API');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-auth-token': authToken,
        'x-access-token': authToken
      };

      console.log('📡 Making payment success API call');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/drive/payment/success?payment_id=${paymentId}`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      console.log('📊 Payment success API response status:', response.status);

      // ✅ FIXED: Handle 500 errors with retry logic
      if (response.status === 500 && attempt <= 3) {
        console.log(`⚠️ Server error (attempt ${attempt}/3), retrying in ${attempt * 2} seconds...`);
        setRetryAttempt(attempt);
        
        // Wait before retrying (exponential backoff)
        retryTimeoutRef.current = setTimeout(() => {
          processPaymentSuccess(attempt + 1);
        }, attempt * 2000); // 2s, 4s, 6s delays
        
        return;
      }

      if (!response.ok) {
        let errorMessage = `Server responded with status ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.log('Could not parse error response as JSON');
        }

        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 404) {
          errorMessage = 'Payment record not found. Please contact support.';
        } else if (response.status === 500) {
          errorMessage = 'Server error occurred after multiple attempts. Please refresh the page or contact support.';
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Payment processed successfully:', data);
      
      if (data.status === 'success' && data.data?.payment) {
        setPaymentData(data.data.payment);
        setShowConfetti(true);
        setRetryAttempt(0); // Reset retry attempt on success
        setLoading(false); // ✅ FIXED: Set loading to false immediately on success
        
        // Hide confetti after 3 seconds
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        throw new Error('Invalid response format from server');
      }
      
    } catch (err) {
      console.error('❌ Payment processing error:', err);
      
      // ✅ FIXED: Only set error and stop loading if we've exhausted retries
      if (attempt > 3) {
        setError(err.message || 'Failed to process payment after multiple attempts. Please refresh the page or contact support.');
        setLoading(false);
      }
      
      // ✅ FIXED: If this is a retry-able error, don't set loading to false yet
      if (response?.status !== 500 || attempt > 3) {
        setLoading(false);
      }
    }
    
    // ✅ REMOVED: The problematic finally block that was causing the issue
  };

  // ✅ HYDRATION FIX: Only run on client after component mounts
  useEffect(() => {
    if (!isClient) return;

    const paymentId = searchParams?.get('payment_id');
    
    if (!paymentId) {
      setError('Payment ID not found in URL parameters');
      setLoading(false);
      return;
    }

    // ✅ PREVENT duplicate API calls
    if (hasProcessed.current) {
      console.log('🛑 Already processed payment, skipping duplicate call');
      return;
    }

    hasProcessed.current = true;

    // ✅ FIXED: Start payment processing with initial delay to allow webhook to process
    const timeoutId = setTimeout(() => {
      processPaymentSuccess(1);
    }, 1000); // 1 second initial delay
    
    return () => {
      clearTimeout(timeoutId);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isClient, searchParams]);

  const getRiderLevelBadge = (totalTrips) => {
    if (totalTrips >= 100) return { level: 'Gold', color: 'bg-yellow-500', textColor: 'text-yellow-800' };
    if (totalTrips >= 50) return { level: 'Silver', color: 'bg-gray-400', textColor: 'text-gray-800' };
    if (totalTrips >= 10) return { level: 'Bronze', color: 'bg-orange-600', textColor: 'text-orange-800' };
    return { level: 'New', color: 'bg-green-500', textColor: 'text-green-800' };
  };

  // ✅ FIXED: Better loading condition - show loading only when actually loading
  if (!isClient || (loading && !paymentData)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-700">
            {retryAttempt > 0 ? 'Confirming payment status...' : 'Processing your payment...'}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {retryAttempt > 0 
              ? `Retry attempt ${retryAttempt}/3 - Please wait...` 
              : 'Please wait while we confirm your payment'
            }
          </div>
          <div className="text-xs text-gray-400 mt-3">This may take a few moments</div>
          
          {/* ✅ Progress indicator for retries */}
          {retryAttempt > 0 && (
            <div className="mt-4 w-48 mx-auto">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${(retryAttempt / 3) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Waiting for payment confirmation...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Processing Error</h2>
            <div className="text-gray-600 mb-6 text-sm">{error}</div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  hasProcessed.current = false;
                  setError(null);
                  setLoading(true);
                  setRetryAttempt(0);
                  setPaymentData(null);
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              
              <Link href="/" className="block w-full bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center">
                Return to Home
              </Link>
              
              <Link href="/support" className="block w-full bg-green-100 text-green-700 px-6 py-2 rounded-lg hover:bg-green-200 transition-colors text-center">
                Contact Support
              </Link>
            </div>
            
            {/* ✅ Additional help text */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> If you just completed payment, please wait a moment and refresh this page. 
                Your payment may still be processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ FIXED: Show payment success UI when we have payment data
  const badge = paymentData ? getRiderLevelBadge(paymentData.rider.totalTrips) : null;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      {/* ✅ Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                <div className="w-3 h-3 bg-green-400 rounded-full opacity-80"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckIcon className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
              <div className="text-green-100 text-sm">Thank you for choosing RideFlex Pro</div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-6">
            {paymentData && (
              <>
                {/* Trip Info */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <CreditCardIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Trip Details
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">From:</span>
                      <span className="font-medium text-gray-900 text-right max-w-48 truncate">
                        {paymentData.trip.from}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">To:</span>
                      <span className="font-medium text-gray-900 text-right max-w-48 truncate">
                        {paymentData.trip.to}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-medium text-gray-900">
                        {paymentData.trip.distance} km
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Trip Date:</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(paymentData.completedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Breakdown</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base Fare:</span>
                      <span className="font-medium">₹{paymentData.breakdown.baseFare}</span>
                    </div>
                    {paymentData.breakdown.tipAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Driver Tip:</span>
                        <span className="font-medium text-green-600">₹{paymentData.breakdown.tipAmount}</span>
                      </div>
                    )}
                    {paymentData.breakdown.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-green-600">-₹{paymentData.breakdown.discount}</span>
                      </div>
                    )}
                    <div className="border-t pt-3 flex justify-between font-semibold text-base">
                      <span>Total Paid:</span>
                      <span className="text-green-600">₹{paymentData.amount}</span>
                    </div>
                  </div>
                </div>

                {/* Rider Stats & Level */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-blue-900">Your Achievement</h3>
                    {badge && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color} ${badge.textColor}`}>
                        {badge.level} Rider
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">{paymentData.rider.totalTrips}</div>
                      <div className="text-xs text-blue-800">Total Trips</div>
                      <div className="flex justify-center mt-1">
                        {[...Array(Math.min(5, Math.ceil(paymentData.rider.totalTrips / 10)))].map((_, i) => (
                          <StarIcon key={i} className="w-3 h-3 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-600">₹{paymentData.rider.totalAmountSpent}</div>
                      <div className="text-xs text-blue-800">Total Spent</div>
                      <div className="text-xs text-blue-600 mt-1">
                        Avg: ₹{Math.round(paymentData.rider.totalAmountSpent / paymentData.rider.totalTrips)}/trip
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Your Driver</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {paymentData.driver.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{paymentData.driver.name}</div>
                      <div className="text-sm text-gray-600">Professional Driver</div>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon key={i} className="w-3 h-3 text-yellow-400" />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">Excellent Service</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction Info */}
                <div className="mb-6 bg-green-50 rounded-lg p-4 border border-green-100">
                  <h4 className="font-medium text-green-800 mb-2">Transaction Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Payment Method:</span>
                      <span className="font-medium text-green-900">Stripe (Card)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Transaction ID:</span>
                      <span className="font-mono text-xs text-green-900">{paymentData.id.slice(-8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Status:</span>
                      <span className="font-medium text-green-900 capitalize">{paymentData.status}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link 
                href="/" 
                className="w-full bg-green-600 text-white px-4 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center block text-lg shadow-lg"
              >
                Book Another Ride
              </Link>
              
              <div className="grid grid-cols-2 gap-3">
                <Link 
                  href="/payment-history" 
                  className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors text-center block text-sm font-medium"
                >
                  Payment History
                </Link>
                
                <Link 
                  href="/trip-history" 
                  className="bg-blue-100 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-200 transition-colors text-center block text-sm font-medium"
                >
                  Trip History
                </Link>
              </div>
            </div>

            {/* Success Message */}
            <div className="mt-6 text-center">
              <div className="text-sm text-gray-500">
                🔒 Payment processed securely by Stripe
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Need help? Contact support at support@rideflex.com
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ MAIN COMPONENT - Uses dynamic import to prevent SSR
export default function PaymentSuccessPage() {
  return <ClientOnlyPaymentSuccess />;
}
