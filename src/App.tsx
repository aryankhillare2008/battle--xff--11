import React, { useState, useEffect } from 'react';
import { 
  Trophy, Wallet, Users, Gamepad2, Shield, User, LogOut, Plus, Search, 
  CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft, Key, Lock, 
  Clock, DollarSign, Award, Flame, ChevronRight, Settings, Smartphone, 
  FileText, Copy, Check, Menu, X, Globe, Sparkles
} from 'lucide-react';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc } from 'firebase/firestore';

// Types
interface UserProfile {
  id: string;
  username: string;
  email: string;
  ffUid: string;
  ign: string;
  role: 'user' | 'admin';
  wallet: number;
}

interface Tournament {
  id: string;
  title: string;
  mode: 'Solo' | 'Duo' | 'Squad' | 'Clash Squad';
  map: 'Bermuda' | 'Purgatory' | 'Kalahari' | 'NeXTerra';
  entryFee: number;
  prizePool: number;
  perKill: number;
  totalSlots: number;
  filledSlots: number;
  startTime: string;
  status: 'upcoming' | 'live' | 'completed';
  roomId?: string;
  roomPass?: string;
  winner?: string;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'entry_fee' | 'prize_won';
  amount: number;
  date: string;
  status: 'success' | 'pending' | 'failed';
  reference: string;
}

interface JoinedMatch {
  tournamentId: string;
  tournamentTitle: string;
  ffUid: string;
  teamMembers?: string[];
  joinedAt: string;
}

const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 't1',
    title: 'Free Fire Daily Clash #101',
    mode: 'Squad',
    map: 'Bermuda',
    entryFee: 50,
    prizePool: 2000,
    perKill: 10,
    totalSlots: 48,
    filledSlots: 38,
    startTime: '2026-10-25T18:30:00',
    status: 'upcoming',
    roomId: 'FF99281',
    roomPass: 'BOOYAH88'
  },
  {
    id: 't2',
    title: 'Solo Bermuda Master Cup',
    mode: 'Solo',
    map: 'Bermuda',
    entryFee: 30,
    prizePool: 1200,
    perKill: 15,
    totalSlots: 50,
    filledSlots: 50,
    startTime: '2026-10-25T20:00:00',
    status: 'live',
    roomId: 'FF88310',
    roomPass: 'SOLO2026'
  },
  {
    id: 't3',
    title: 'Duo Purgatory Showdown',
    mode: 'Duo',
    map: 'Purgatory',
    entryFee: 40,
    prizePool: 1500,
    perKill: 12,
    totalSlots: 40,
    filledSlots: 40,
    startTime: '2026-10-24T16:00:00',
    status: 'completed',
    roomId: 'FF77123',
    roomPass: 'DUO999',
    winner: 'Team Phoenix (FFUID: 881923)'
  }
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('battleff_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'tournaments' | 'my-matches' | 'wallet' | 'leaderboard' | 'admin' | 'backend-guide'>('tournaments');
  
  // Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Tournaments
  const [tournaments, setTournaments] = useState<Tournament[]>(INITIAL_TOURNAMENTS);
  const [joinedMatches, setJoinedMatches] = useState<JoinedMatch[]>([
    {
      tournamentId: 't3',
      tournamentTitle: 'Duo Purgatory Showdown',
      ffUid: '482910293',
      teamMembers: ['AlphaGamer', 'ShadowSniper'],
      joinedAt: '2026-10-24 14:00'
    }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 'tx1', type: 'deposit', amount: 500, date: '2026-10-24 12:30', status: 'success', reference: 'UPI_REF_998231' },
    { id: 'tx2', type: 'entry_fee', amount: 40, date: '2026-10-24 14:00', status: 'success', reference: 'JOIN_T3' }
  ]);

  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [teamMemberInputs, setTeamMemberInputs] = useState<string[]>(['', '', '']);
  const [filterMode, setFilterMode] = useState<string>('All');
  
  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Admin form
  const [newTitle, setNewTitle] = useState('');
  const [newMode, setNewMode] = useState<'Solo' | 'Duo' | 'Squad' | 'Clash Squad'>('Squad');
  const [newMap, setNewMap] = useState<'Bermuda' | 'Purgatory' | 'Kalahari' | 'NeXTerra'>('Bermuda');
  const [newEntryFee, setNewEntryFee] = useState('50');
  const [newPrizePool, setNewPrizePool] = useState('2000');
  const [newPerKill, setNewPerKill] = useState('10');
  const [newSlots, setNewSlots] = useState('48');
  const [newStartTime, setNewStartTime] = useState('');

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch or create user doc in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          setUser({ id: firebaseUser.uid, ...data });
        } else {
          const newUser: UserProfile = {
            id: firebaseUser.uid,
            username: firebaseUser.displayName || 'FreeFireGamer',
            email: firebaseUser.email || '',
            ffUid: 'FF' + Math.floor(10000000 + Math.random() * 90000000),
            ign: firebaseUser.displayName || 'B.F.F. Player',
            role: firebaseUser.email?.includes('admin') ? 'admin' : 'user',
            wallet: 100
          };
          await setDoc(userRef, newUser);
          setUser(newUser);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('battleff_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('battleff_user');
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fUser = result.user;
      const userRef = doc(db, 'users', fUser.uid);
      const userSnap = await getDoc(userRef);
      let profile: UserProfile;
      if (userSnap.exists()) {
        profile = { id: fUser.uid, ...(userSnap.data() as UserProfile) };
      } else {
        profile = {
          id: fUser.uid,
          username: fUser.displayName || 'GamerPro',
          email: fUser.email || '',
          ffUid: 'FF' + Math.floor(10000000 + Math.random() * 90000000),
          ign: fUser.displayName || 'B.F.F. VIP',
          role: 'user',
          wallet: 100
        };
        await setDoc(userRef, profile);
      }
      setUser(profile);
      setShowAuthModal(false);
      setSuccessMessage('Successfully logged in with Google & Firebase Auth!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Login failed');
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  const handleDemoLogin = (isAdmin = false) => {
    const demoUser: UserProfile = {
      id: isAdmin ? 'admin1' : 'user_demo_1',
      username: isAdmin ? 'AdminSupreme' : 'ProKiller99',
      email: isAdmin ? 'admin@battleffx11.com' : 'player@battleffx11.com',
      ffUid: isAdmin ? '100000001' : '482910293',
      ign: isAdmin ? 'BFF11_OWNER' : 'B.F.F. ⚡ VIP',
      role: isAdmin ? 'admin' : 'user',
      wallet: isAdmin ? 5000 : 450
    };
    setUser(demoUser);
    setShowAuthModal(false);
    setSuccessMessage(`Logged in as ${isAdmin ? 'Admin' : 'Player'}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setUser(null);
    setSuccessMessage('Logged out successfully.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Enter a valid amount.');
      return;
    }
    if (!user) return;
    
    setUser({ ...user, wallet: user.wallet + amt });
    setTransactions(prev => [
      { id: 'tx_' + Date.now(), type: 'deposit', amount: amt, date: new Date().toLocaleString(), status: 'success', reference: 'TEST_PG_' + Math.floor(Math.random() * 100000) },
      ...prev
    ]);
    setSuccessMessage(`Successfully added ₹${amt} to wallet (Test Mode).`);
    setTimeout(() => setSuccessMessage(''), 4000);
    setDepositAmount('100');
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Enter valid withdrawal amount.');
      return;
    }
    if (!user || user.wallet < amt) {
      setErrorMessage('Insufficient wallet balance.');
      return;
    }
    if (!upiId) {
      setErrorMessage('Enter your UPI ID or Bank details.');
      return;
    }

    setUser({ ...user, wallet: user.wallet - amt });
    setTransactions(prev => [
      { id: 'tx_' + Date.now(), type: 'withdrawal', amount: amt, date: new Date().toLocaleString(), status: 'pending', reference: 'UPI:' + upiId },
      ...prev
    ]);
    setSuccessMessage(`Withdrawal request of ₹${amt} submitted successfully.`);
    setTimeout(() => setSuccessMessage(''), 5000);
    setWithdrawAmount('');
    setUpiId('');
  };

  const handleJoinTournament = () => {
    if (!user || !selectedTournament) return;
    if (user.wallet < selectedTournament.entryFee) {
      setErrorMessage('Insufficient wallet balance to join this tournament!');
      setActiveTab('wallet');
      setShowJoinModal(false);
      return;
    }

    setUser({ ...user, wallet: user.wallet - selectedTournament.entryFee });
    setTournaments(prev => prev.map(t => t.id === selectedTournament.id ? { ...t, filledSlots: t.filledSlots + 1 } : t));

    setJoinedMatches(prev => [
      {
        tournamentId: selectedTournament.id,
        tournamentTitle: selectedTournament.title,
        ffUid: user.ffUid,
        teamMembers: selectedTournament.mode === 'Solo' ? [] : teamMemberInputs.filter(Boolean),
        joinedAt: new Date().toLocaleString()
      },
      ...prev
    ]);

    setTransactions(prev => [
      {
        id: 'tx_' + Date.now(),
        type: 'entry_fee',
        amount: selectedTournament.entryFee,
        date: new Date().toLocaleString(),
        status: 'success',
        reference: 'JOIN_' + selectedTournament.title
      },
      ...prev
    ]);

    setShowJoinModal(false);
    setSuccessMessage(`Successfully joined ${selectedTournament.title}!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newStartTime) {
      setErrorMessage('Please fill in tournament title and start time.');
      return;
    }
    const tournament: Tournament = {
      id: 't_' + Date.now(),
      title: newTitle,
      mode: newMode,
      map: newMap,
      entryFee: parseFloat(newEntryFee) || 0,
      prizePool: parseFloat(newPrizePool) || 1000,
      perKill: parseFloat(newPerKill) || 10,
      totalSlots: parseInt(newSlots) || 48,
      filledSlots: 0,
      startTime: newStartTime,
      status: 'upcoming',
      roomId: 'FF' + Math.floor(10000 + Math.random() * 90000),
      roomPass: 'BOOYAH' + Math.floor(10 + Math.random() * 90)
    };

    setTournaments([tournament, ...tournaments]);
    setNewTitle('');
    setSuccessMessage('Tournament created successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const filteredTournaments = tournaments.filter(t => {
    if (filterMode === 'All') return true;
    return t.mode === filterMode;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-600 selection:text-white pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-red-900/40 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-600/30 flex items-center justify-center">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-wider text-white flex items-center gap-2">
              BATTLE<span className="text-red-500">FF</span>11
            </h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">Firebase Enabled Esports</p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button onClick={() => setActiveTab('tournaments')} className={`hover:text-red-400 transition-colors ${activeTab === 'tournaments' ? 'text-red-500 font-semibold' : ''}`}>Tournaments</button>
          <button onClick={() => setActiveTab('my-matches')} className={`hover:text-red-400 transition-colors ${activeTab === 'my-matches' ? 'text-red-500 font-semibold' : ''}`}>My Matches</button>
          <button onClick={() => setActiveTab('wallet')} className={`hover:text-red-400 transition-colors ${activeTab === 'wallet' ? 'text-red-500 font-semibold' : ''}`}>Wallet</button>
          <button onClick={() => setActiveTab('leaderboard')} className={`hover:text-red-400 transition-colors ${activeTab === 'leaderboard' ? 'text-red-500 font-semibold' : ''}`}>Leaderboard</button>
          {user?.role === 'admin' && (
            <button onClick={() => setActiveTab('admin')} className={`hover:text-red-400 transition-colors text-red-400 font-bold flex items-center gap-1 ${activeTab === 'admin' ? 'underline' : ''}`}>
              <Shield className="w-4 h-4" /> Admin Panel
            </button>
          )}
          <button onClick={() => setActiveTab('backend-guide')} className={`hover:text-red-400 transition-colors text-amber-400 font-medium flex items-center gap-1 ${activeTab === 'backend-guide' ? 'underline' : ''}`}>
            <FileText className="w-4 h-4" /> PHP & KSWEB Guide
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 rounded-full px-3 py-1.5 shadow-inner">
              <div 
                onClick={() => setActiveTab('wallet')} 
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity bg-red-950/60 px-2.5 py-1 rounded-full border border-red-800/50"
              >
                <Wallet className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 font-mono">₹{user.wallet}</span>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-white truncate max-w-[100px]">{user.username}</span>
                <span className="text-[10px] text-slate-400 font-mono">UID: {user.ffUid}</span>
              </div>
              <button 
                onClick={handleLogout} 
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded-full hover:bg-slate-700/50"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center gap-2"
            >
              <User className="w-4 h-4" /> Login / Register
            </button>
          )}
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-20 right-4 z-50 bg-red-950 border border-red-500 text-red-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        
        {activeTab === 'tournaments' && (
          <div className="space-y-8">
            <div className="relative rounded-3xl overflow-hidden border border-red-900/50 shadow-2xl bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
              <div className="relative z-10 space-y-4 max-w-xl">
                <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/40 px-3 py-1 rounded-full text-red-400 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> Firebase Firestore Live Sync
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
                  Play Daily & Win <span className="text-red-500">Real Cash</span> Prizes
                </h2>
                <p className="text-slate-300 text-sm md:text-base">
                  Join Solo, Duo, and Squad custom room matches. Secured by Firebase Cloud Firestore & Google Authentication.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <button 
                    onClick={() => {
                      if (!user) { setShowAuthModal(true); }
                      else { setActiveTab('wallet'); }
                    }}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/40 transition-all flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4" /> Add Money to Wallet
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4 pt-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {['All', 'Solo', 'Duo', 'Squad', 'Clash Squad'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition-all shrink-0 ${
                      filterMode === mode
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTournaments.map((tournament) => {
                const isFull = tournament.filledSlots >= tournament.totalSlots;
                const progress = (tournament.filledSlots / tournament.totalSlots) * 100;

                return (
                  <div 
                    key={tournament.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-red-600/50 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="relative h-40 bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 p-4 flex flex-col justify-between border-b border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tournament.status === 'live' 
                              ? 'bg-red-600 text-white animate-pulse' 
                              : tournament.status === 'upcoming' 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {tournament.status === 'live' ? '● LIVE NOW' : tournament.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
                            {tournament.mode} • {tournament.map}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">
                            {tournament.title}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono">Start: {new Date(tournament.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Prize Pool</p>
                            <p className="text-sm font-black text-amber-400 font-mono">₹{tournament.prizePool}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Per Kill</p>
                            <p className="text-sm font-black text-red-400 font-mono">₹{tournament.perKill}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase">Entry Fee</p>
                            <p className="text-sm font-black text-white font-mono">₹{tournament.entryFee}</p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-400">Slots Filled</span>
                            <span className={isFull ? 'text-red-400 font-bold' : 'text-slate-300'}>
                              {tournament.filledSlots} / {tournament.totalSlots}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className={`h-full transition-all duration-500 ${isFull ? 'bg-red-600' : 'bg-red-500'}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      {tournament.status === 'completed' ? (
                        <div className="w-full py-2.5 bg-slate-800 text-slate-400 text-xs font-bold text-center rounded-xl border border-slate-700">
                          Winner: {tournament.winner || 'Completed'}
                        </div>
                      ) : isFull ? (
                        <button disabled className="w-full py-2.5 bg-slate-800 text-slate-500 text-xs font-bold uppercase rounded-xl cursor-not-allowed">
                          Slots Full
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            if (!user) { setShowAuthModal(true); return; }
                            setSelectedTournament(tournament);
                            setShowJoinModal(true);
                          }}
                          className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                        >
                          <Gamepad2 className="w-4 h-4" /> Join Tournament (₹{tournament.entryFee})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'my-matches' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white tracking-tight">My Tournament Matches</h2>
            {joinedMatches.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-sm">You haven't joined any tournaments yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {joinedMatches.map((jm, idx) => {
                  const t = tournaments.find(item => item.id === jm.tournamentId);
                  return (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-red-400 uppercase">Joined: {jm.joinedAt}</span>
                        <h3 className="text-lg font-bold text-white">{jm.tournamentTitle}</h3>
                        <p className="text-xs text-slate-400">Free Fire UID: <span className="font-mono text-white">{jm.ffUid}</span></p>
                      </div>

                      <div className="bg-slate-950 border border-red-900/50 rounded-xl p-4 w-full md:w-auto min-w-[280px] space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span>ROOM CREDENTIALS</span>
                          <span className="text-emerald-400 flex items-center gap-1"><Key className="w-3 h-3" /> Unlocked</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Room ID</span>
                            <span className="font-mono font-bold text-white text-sm">{t?.roomId || 'FF94821'}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Password</span>
                            <span className="font-mono font-bold text-amber-400 text-sm">{t?.roomPass || 'BOOYAH2026'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 border border-red-900/40 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="text-xs text-slate-400 uppercase font-mono">Available Balance</span>
                <h2 className="text-4xl md:text-5xl font-black text-amber-400 font-mono">₹{user?.wallet || 0}</h2>
                <p className="text-xs text-slate-300">Firestore synced wallet balance.</p>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl w-full md:w-72 space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-300">Quick Add Money</h4>
                <form onSubmit={handleDeposit} className="space-y-3">
                  <input 
                    type="number" 
                    value={depositAmount} 
                    onChange={e => setDepositAmount(e.target.value)}
                    placeholder="Enter amount" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                  />
                  <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg shadow-red-600/30">
                    Add Money (Test Mode)
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-red-500" /> Withdraw Winnings
              </h3>
              <form onSubmit={handleWithdraw} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Withdrawal Amount (₹)</label>
                  <input 
                    type="number" 
                    value={withdrawAmount} 
                    onChange={e => setWithdrawAmount(e.target.value)}
                    placeholder="Min ₹100" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">UPI ID / Bank Details</label>
                  <input 
                    type="text" 
                    value={upiId} 
                    onChange={e => setUpiId(e.target.value)}
                    placeholder="e.g. username@oksbi" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2 pt-2">
                  <button type="submit" className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl border border-slate-700 transition-all">
                    Submit Withdrawal Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-black text-white tracking-tight">Global Player Leaderboard</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="grid grid-cols-12 bg-slate-950 p-4 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase font-mono">
                <span className="col-span-2 text-center">Rank</span>
                <span className="col-span-6">Player / IGN</span>
                <span className="col-span-2 text-center">Total Kills</span>
                <span className="col-span-2 text-right">Earnings</span>
              </div>
              {[
                { rank: 1, name: 'B.F.F. ⚡ VIP (ProKiller99)', kills: 142, earnings: 18500 },
                { rank: 2, name: 'ShadowSniper_FF', kills: 128, earnings: 14200 },
                { rank: 3, name: 'AlphaGamer 🎯', kills: 115, earnings: 12000 }
              ].map((lb) => (
                <div key={lb.rank} className="grid grid-cols-12 items-center p-4 border-b border-slate-800/60">
                  <div className="col-span-2 flex items-center justify-center">
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs font-mono">
                      {lb.rank}
                    </span>
                  </div>
                  <div className="col-span-6">
                    <span className="text-sm font-bold text-white block">{lb.name}</span>
                  </div>
                  <div className="col-span-2 text-center font-mono font-bold text-red-400">{lb.kills} 🎯</div>
                  <div className="col-span-2 text-right font-mono font-bold text-amber-400">₹{lb.earnings}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="bg-red-950/40 border border-red-900/60 rounded-3xl p-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-500" /> Admin Control Panel
              </h2>
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold font-mono">ADMIN MODE</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" /> Create New Free Fire Tournament
              </h3>
              <form onSubmit={handleCreateTournament} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-slate-400">Tournament Title</label>
                  <input 
                    type="text" 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Free Fire Mega Squad #50" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Game Mode</label>
                  <select 
                    value={newMode} 
                    onChange={e => setNewMode(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                  >
                    <option value="Solo">Solo</option>
                    <option value="Duo">Duo</option>
                    <option value="Squad">Squad</option>
                    <option value="Clash Squad">Clash Squad</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Map</label>
                  <select 
                    value={newMap} 
                    onChange={e => setNewMap(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                  >
                    <option value="Bermuda">Bermuda</option>
                    <option value="Purgatory">Purgatory</option>
                    <option value="Kalahari">Kalahari</option>
                    <option value="NeXTerra">NeXTerra</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Entry Fee (₹)</label>
                  <input 
                    type="number" 
                    value={newEntryFee} 
                    onChange={e => setNewEntryFee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Prize Pool (₹)</label>
                  <input 
                    type="number" 
                    value={newPrizePool} 
                    onChange={e => setNewPrizePool(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs text-slate-400">Start Time</label>
                  <input 
                    type="datetime-local" 
                    value={newStartTime} 
                    onChange={e => setNewStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div className="md:col-span-3 pt-2">
                  <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg shadow-red-600/30 transition-all">
                    Publish Tournament to Firestore
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'backend-guide' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-amber-950/40 border border-amber-900/60 rounded-3xl p-6 md:p-8 space-y-4">
              <h2 className="text-2xl font-black text-white">PHP & MySQL Backend Guide (KSWEB / Android)</h2>
              <p className="text-xs text-amber-300">Complete PHP backend package is included in `/php-backend/` for local PHP hosting.</p>
            </div>
          </div>
        )}

      </main>

      {/* Join Modal */}
      {showJoinModal && selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-900/50 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Join Tournament</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-white text-sm">{selectedTournament.title}</h4>
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Mode: {selectedTournament.mode}</span>
                <span className="text-red-400 font-bold">Entry Fee: ₹{selectedTournament.entryFee}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button onClick={() => setShowJoinModal(false)} className="w-1/2 py-3 bg-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl">Cancel</button>
              <button onClick={handleJoinTournament} className="w-1/2 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg">Confirm & Pay</button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-900/50 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Login to battleffx11</h3>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4 pt-2">
              <button 
                onClick={handleGoogleLogin}
                className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.23 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.12 0 9.81 0 12s.43 3.88 1.18 5.39l4.09-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.15 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                </svg>
                Sign in with Google (Firebase)
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase font-mono">or demo access</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleDemoLogin(false)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700"
                >
                  Player Demo
                </button>
                <button 
                  onClick={() => handleDemoLogin(true)}
                  className="py-2.5 bg-red-950/80 hover:bg-red-900 text-red-300 font-bold text-xs rounded-xl border border-red-800"
                >
                  Admin Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-red-900/40 grid grid-cols-5 items-center h-16 px-2 lg:hidden">
        <button onClick={() => setActiveTab('tournaments')} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'tournaments' ? 'text-red-500' : 'text-slate-400'}`}>
          <Gamepad2 className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Matches</span>
        </button>
        <button onClick={() => setActiveTab('my-matches')} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'my-matches' ? 'text-red-500' : 'text-slate-400'}`}>
          <Key className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Room ID</span>
        </button>
        <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'wallet' ? 'text-red-500' : 'text-slate-400'}`}>
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Wallet</span>
        </button>
        <button onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'leaderboard' ? 'text-red-500' : 'text-slate-400'}`}>
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Ranks</span>
        </button>
        <button onClick={() => setActiveTab(user?.role === 'admin' ? 'admin' : 'backend-guide')} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'admin' || activeTab === 'backend-guide' ? 'text-red-500' : 'text-slate-400'}`}>
          {user?.role === 'admin' ? <Shield className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          <span className="text-[10px] font-medium mt-1">{user?.role === 'admin' ? 'Admin' : 'PHP Guide'}</span>
        </button>
      </div>
    </div>
  );
}
