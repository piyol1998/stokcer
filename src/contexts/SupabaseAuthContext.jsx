
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('user'); // 'owner' or 'staff'
  const [ownerId, setOwnerId] = useState(null); // The ID of the business owner (self if owner, boss if employee)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("⚠️ Auth initialization timed out - forcing app load");
        setLoading(false);
      }
    }, 5000); 

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) console.warn("Session check warning:", sessionError.message);

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
             // Race condition protection for role fetching
             try {
               await Promise.race([
                 determineUserRole(initialSession.user.id),
                 new Promise(resolve => setTimeout(resolve, 2000)) 
               ]);
             } catch (roleErr) {
               console.error("Role fetch warning:", roleErr);
             }
          }
        }
      } catch (err) {
        console.error('Auth initialization critical error:', err);
        if (mounted) setError(err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          determineUserRole(newSession.user.id);
        } else {
          setUserRole('user');
          setOwnerId(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription?.unsubscribe();
    };
  }, []); 

  const determineUserRole = async (userId) => {
    if (!userId) return;
    
    try {
      // 1. Check if they are an employee (Team Member)
      const { data: employeeData, error: empError } = await supabase
        .from('employees')
        .select('role, user_id') // user_id here is the OWNER's ID
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (employeeData) {
        // Enforce new role structure: All employees are 'staff' (Staf Produksi)
        // We ignore previous roles like 'manager' or 'kasir' to clean up logic
        setUserRole('staff'); 
        setOwnerId(employeeData.user_id); // Set the owner ID so we can inherit their sub
        return;
      }

      // 2. If not an employee, they are the Owner
      setUserRole('owner');
      setOwnerId(userId); // Owner is their own owner

    } catch (err) {
      console.error("Role determination error:", err);
      // Fallback
      setUserRole('user');
      setOwnerId(userId);
    }
  };

  const signOut = async () => {
    try {
      // Attempt server-side sign out
      const { error } = await supabase.auth.signOut();
      if (error) {
        // If user not found (403) or other error, we still want to clear local state
        console.warn("Server sign out warning:", error.message);
      }
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      // Always clear local state to prevent "stuck" sessions
      // This fixes the 403 error loop when user is deleted but session persists
      setUser(null);
      setSession(null);
      setUserRole('user');
      setOwnerId(null);
      // Force reload to clear any cached states or listeners
      window.location.href = '/login';
    }
  };

  const value = {
    session,
    user,
    userRole,
    ownerId, // Export ownerId so useSubscription can use it
    loading,
    error,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
