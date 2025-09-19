// app/payment-success/page.js - ENHANCED WITH RIDER STATS DISPLAY
'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Hydration fix: Dynamic import to prevent SSR issues
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

const TrophyIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

// Main content component - Client-side only
function PaymentSuccessContent() {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Hydration fix: Prevent duplicate API calls
  const hasProcessed = useRef(false);
  const retryTimeoutRef = useRef(null);

  // Hydration fix: Ensure we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Hydration fix: Safe date formatting
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

  // Hydration fix: Safe auth token retrieval
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
          return token;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  // Fixed: Payment success processing with status checking
  const processPaymentSuccess = async (attempt = 1) => {
    const paymentId = searchParams?.get('payment_id');
    
    if (!paymentId) {
      setError('Payment ID not found in URL parameters');
      setLoading(false);
      return;
    }

    try {
      // Get authentication token
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-auth-token': authToken,
        'x-access-token': authToken
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/drive/payment/success?payment_id=${paymentId}`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      // Fixed: Handle 500 errors with retry logic
      if (response.status === 500 && attempt <= 3) {
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
          // Could not parse error response as JSON
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
      
      if (data.status === 'success' && data.data?.payment) {
        // New: Only set payment data and stop loading if status is 'paid'
        const payment = data.data.payment;
        setPaymentStatus(payment.status);
        
        if (payment.status === 'paid') {
          setPaymentData(payment);
          setShowConfetti(true);
          setRetryAttempt(0); // Reset retry attempt on success
          setLoading(false); // Only stop loading when payment is confirmed paid
          
          // Hide confetti after 3 seconds
          setTimeout(() => setShowConfetti(false), 3000);
        } else {
          // New: If payment is not yet paid, keep polling
          setRetryAttempt(attempt);
          
          // Poll again after delay
          retryTimeoutRef.current = setTimeout(() => {
            processPaymentSuccess(attempt + 1);
          }, 2000); // 2 second delay for status checking
          
          return; // Don't stop loading, keep polling
        }
      } else {
        throw new Error('Invalid response format from server');
      }
      
    } catch (err) {
      // Fixed: Only set error and stop loading if we've exhausted retries
      if (attempt > 5) { // Increased retry limit for status polling
        setError(err.message || 'Failed to process payment after multiple attempts. Please refresh the page or contact support.');
        setLoading(false);
      }
    }
  };

  // Hydration fix: Only run on client after component mounts
  useEffect(() => {
    if (!isClient) return;

    const paymentId = searchParams?.get('payment_id');
    
    if (!paymentId) {
      setError('Payment ID not found in URL parameters');
      setLoading(false);
      return;
    }

    // Prevent duplicate API calls
    if (hasProcessed.current) {
      return;
    }

    hasProcessed.current = true;

    // Fixed: Start payment processing with initial delay to allow webhook to process
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
    if (totalTrips >= 100) return { level: 'Gold', color: 'bg-yellow-500', textColor: 'text-yellow-800', icon: '🏆' };
    if (totalTrips >= 50) return { level: 'Silver', color: 'bg-gray-400', textColor: 'text-gray-800', icon: '🥈' };
    if (totalTrips >= 10) return { level: 'Bronze', color: 'bg-orange-600', textColor: 'text-orange-800', icon: '🥉' };
    return { level: 'New', color: 'bg-green-500', textColor: 'text-green-800', icon: '🆕' };
  };

  // New: Calculate milestone achievements
  const getMilestoneAchievement = (totalTrips) => {
    const milestones = [
      { trips: 100, title: 'Century Rider!', desc: 'Completed 100 trips' },
      { trips: 50, title: 'Half Century!', desc: 'Completed 50 trips' },
      { trips: 25, title: 'Quarter Century!', desc: 'Completed 25 trips' },
      { trips: 10, title: 'Frequent Rider!', desc: 'Completed 10 trips' },
      { trips: 5, title: 'Regular User!', desc: 'Completed 5 trips' },
      { trips: 1, title: 'First Ride!', desc: 'Completed your first trip' },
    ];

    return milestones.find(milestone => totalTrips >= milestone.trips);
  };

  // New: Enhanced loading condition - only show success when payment is confirmed paid
  if (!isClient || loading || (paymentData && paymentStatus !== 'paid')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-700">
            {paymentStatus ? 
              `Confirming payment status (${paymentStatus})...` :
              retryAttempt > 0 ? 'Checking payment confirmation...' : 'Processing your payment...'
            }
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {paymentStatus && paymentStatus !== 'paid' ? 
              `Payment is ${paymentStatus}, waiting for confirmation...` :
              retryAttempt > 0
                ? `Verification attempt ${retryAttempt}/5 - Please wait...` 
              : 'Please wait while we confirm your payment'
            }
          </div>
          <div className="text-xs text-gray-400 mt-3">
            {paymentStatus === 'processing' || paymentStatus === 'pending' ? 
              'Your payment is being processed by our payment provider...' :
              'This may take a few moments'
            }
          </div>
          
          {/* Enhanced progress indicator */}
          {(retryAttempt > 0 || paymentStatus) && (
            <div className="mt-4 w-48 mx-auto">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
                  style={{ 
                    width: paymentStatus === 'paid' ? '100%' : 
                           paymentStatus === 'processing' ? '75%' :
                           paymentStatus === 'pending' ? '50%' :
                           `${(retryAttempt / 5) * 100}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {paymentStatus === 'paid' ? 'Payment confirmed!' :
                 paymentStatus === 'processing' ? 'Processing payment...' :
                 paymentStatus === 'pending' ? 'Payment pending...' :
                 'Waiting for payment confirmation...'}
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
                  setPaymentStatus(null);
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
            
            {/* Additional help text with status info */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> If you just completed payment, please wait a moment and refresh this page. 
                {paymentStatus && <><br />Last status: <strong>{paymentStatus}</strong></>}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New: Only render success UI when payment status is confirmed as 'paid'
  if (!paymentData || paymentStatus !== 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-700">Waiting for payment confirmation...</div>
          <div className="text-sm text-gray-500 mt-2">Status: {paymentStatus || 'Checking...'}</div>
        </div>
      </div>
    );
  }

  const badge = getRiderLevelBadge(paymentData.rider.totalTrips);
  const milestone = getMilestoneAchievement(paymentData.rider.totalTrips);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              >
                <div 
                  className="w-3 h-3 rounded-full opacity-80"
                  style={{
                    backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'][Math.floor(Math.random() * 5)]
                  }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Enhanced: Success Header with Achievement */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckIcon className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
              <div className="text-green-100 text-sm">Thank you for choosing RideFlex Pro</div>
              <div className="text-green-200 text-xs mt-1">✅ Status: {paymentStatus}</div>
              
              {/* New: Achievement Banner */}
              {milestone && (
                <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
                  <div className="flex items-center justify-center space-x-2">
                    <TrophyIcon className="w-5 h-5 text-yellow-300" />
                    <div>
                      <div className="text-sm font-semibold text-yellow-100">{milestone.title}</div>
                      <div className="text-xs text-green-200">{milestone.desc}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-6">
            {/* Enhanced: Trip Info */}
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

            {/* Enhanced: Payment Breakdown */}
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
                    <span className="font-medium text-green-600">+₹{paymentData.breakdown.tipAmount}</span>
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

            {/* Enhanced: Rider Stats & Level with updated values */}
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-900">Your Achievement</h3>
                {badge && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color} ${badge.textColor} flex items-center space-x-1`}>
                    <span>{badge.icon}</span>
                    <span>{badge.level} Rider</span>
                  </span>
                )}
              </div>
              
              {/* New: Enhanced stats grid */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">{paymentData.rider.totalTrips}</div>
                  <div className="text-xs text-blue-800">Total Trips</div>
                  <div className="flex justify-center mt-1">
                    {[...Array(Math.min(5, Math.ceil(paymentData.rider.totalTrips / 10)))].map((_, i) => (
                      <StarIcon key={i} className="w-3 h-3 text-yellow-400" />
                    ))}
                  </div>
                  {/* New: Progress to next level */}
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.min(100, ((paymentData.rider.totalTrips % 10) / 10) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {paymentData.rider.totalTrips >= 100 ? 'Max Level!' : 
                       `${10 - (paymentData.rider.totalTrips % 10)} more trips to next level`}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">₹{paymentData.rider.totalAmountSpent}</div>
                  <div className="text-xs text-blue-800">Total Spent</div>
                  <div className="text-xs text-blue-600 mt-1">
                    Avg: ₹{Math.round(paymentData.rider.totalAmountSpent / paymentData.rider.totalTrips)}/trip
                  </div>
                  
                  {/* New: Spending tier indicator */}
                  <div className="mt-2">
                    <div className="text-xs font-medium">
                      {paymentData.rider.totalAmountSpent >= 50000 ? '💎 Premium' :
                       paymentData.rider.totalAmountSpent >= 20000 ? '🌟 VIP' :
                       paymentData.rider.totalAmountSpent >= 5000 ? '🎯 Regular' : '🆕 Starter'}
                    </div>
                  </div>
                </div>
              </div>

              {/* New: Milestone progress */}
              <div className="mt-4 p-3 bg-white rounded-lg">
                <div className="text-xs font-medium text-gray-700 mb-2">Next Milestone</div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Current: {paymentData.rider.totalTrips} trips</span>
                  <span>
                    {paymentData.rider.totalTrips >= 100 ? 'All milestones completed! 🏆' :
                     paymentData.rider.totalTrips >= 50 ? 'Next: 100 trips (Century)' :
                     paymentData.rider.totalTrips >= 25 ? 'Next: 50 trips (Half Century)' :
                     paymentData.rider.totalTrips >= 10 ? 'Next: 25 trips (Quarter Century)' :
                     paymentData.rider.totalTrips >= 5 ? 'Next: 10 trips (Frequent Rider)' :
                     'Next: 5 trips (Regular User)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced: Driver Info */}
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Your Driver</h3>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {paymentData.driver.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{paymentData.driver.name}</div>
                  <div className="text-sm text-gray-600">Professional Driver</div>
                  <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="w-3 h-3 text-yellow-400" />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">Excellent Service</span>
                  </div>
                </div>
                {/* New: Rate driver button */}
                <Link 
                  href={`/rate-driver?tripId=${paymentData.trip.id}`}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs hover:bg-blue-200 transition-colors"
                >
                  Rate Driver
                </Link>
              </div>
            </div>

            {/* Enhanced: Transaction Info */}
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
                  <span className="font-medium text-green-900 capitalize flex items-center space-x-1">
                    <span>{paymentData.status}</span>
                    <CheckIcon className="w-3 h-3 text-green-600" />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Processed At:</span>
                  <span className="font-medium text-green-900">
                    {formatDate(paymentData.completedAt)} {new Date(paymentData.completedAt).toLocaleTimeString('en-IN', { 
                      hour12: true, 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced: Action Buttons */}
            <div className="space-y-3">
              <Link 
                href="/" 
                className="w-full bg-green-600 text-white px-4 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center block text-lg shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Book Another Ride</span>
                <span>🚗</span>
              </Link>
              
              <div className="grid grid-cols-2 gap-3">
                <Link 
                  href="/payment-history" 
                  className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors text-center block text-sm font-medium flex items-center justify-center space-x-1"
                >
                  <span>💳</span>
                  <span>Payment History</span>
                </Link>
                
                <Link 
                  href="/trip-history" 
                  className="bg-blue-100 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-200 transition-colors text-center block text-sm font-medium flex items-center justify-center space-x-1"
                >
                  <span>📱</span>
                  <span>Trip History</span>
                </Link>
              </div>

              {/* New: Additional action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Link 
                  href="/profile/settings" 
                  className="bg-purple-100 text-purple-700 px-4 py-3 rounded-lg hover:bg-purple-200 transition-colors text-center block text-sm font-medium flex items-center justify-center space-x-1"
                >
                  <span>👤</span>
                  <span>My Profile</span>
                </Link>
                
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'RideFlex Pro - Great Service!',
                        text: `Just completed my ${paymentData.rider.totalTrips}${paymentData.rider.totalTrips === 1 ? 'st' : 
                               paymentData.rider.totalTrips === 2 ? 'nd' : 
                               paymentData.rider.totalTrips === 3 ? 'rd' : 'th'} ride with RideFlex Pro! ${badge.level} rider status achieved! 🚗✨`,
                        url: 'https://rideflex.com'
                      });
                    }
                  }}
                  className="bg-orange-100 text-orange-700 px-4 py-3 rounded-lg hover:bg-orange-200 transition-colors text-center block text-sm font-medium flex items-center justify-center space-x-1"
                >
                  <span>📤</span>
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Enhanced: Success Message & Support */}
            <div className="mt-6 text-center space-y-3">
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                🔒 Payment processed securely by Stripe
              </div>
              
              <div className="text-xs text-gray-400 flex items-center justify-center space-x-4">
                <span>Need help?</span>
                <Link 
                  href="/support" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Contact Support
                </Link>
                <span>|</span>
                <Link 
                  href="/help" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Help Center
                </Link>
              </div>

              {/* New: Thank you message */}
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-gray-800 mb-1">
                  Thank you for riding with RideFlex Pro! 🙏
                </div>
                <div className="text-xs text-gray-600">
                  Your {badge.level.toLowerCase()} membership comes with special benefits and exclusive offers.
                </div>
                {paymentData.rider.totalTrips === 1 && (
                  <div className="text-xs text-green-700 mt-2 font-medium">
                    🎉 Welcome to our community! Your journey begins now.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component - Uses dynamic import to prevent SSR
export default function PaymentSuccessPage() {
  return <ClientOnlyPaymentSuccess />;
}
