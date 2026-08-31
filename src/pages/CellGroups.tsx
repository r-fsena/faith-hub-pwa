import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchCellGroups, 
  fetchCellPosts, 
  createCellPost, 
  reactToCellPost,
  fetchStudyBooks,
  fetchStudyBookDetails,
  toggleChapterCompletion,
  fetchCellStudies, 
  fetchCellPartilhas, 
  togglePartilhaItem,
  requestJoinCell,
  fetchCellGroupDetails,
  evaluateCellJoinRequest,
  createPartilhaItem,
  deletePartilhaItem,
  removeCellMember,
  updateCellGroupDetails,
  fetchCurrentMember
} from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

interface Chapter {
  id?: string;
  chapter_number: number;
  title: string;
  verse_reference?: string;
  icebreaker?: string;
  content_text: string;
  discussion_questions?: string[];
  practical_challenge?: string;
  media_type?: 'NONE' | 'VIDEO' | 'PDF';
  media_link?: string;
  scheduled_date?: string;
  status?: string;
  completed?: boolean;
}

interface StudyBook {
  id: string;
  title: string;
  subtitle?: string;
  author_name?: string;
  preface?: string;
  cover_color?: string;
  cover_url?: string;
  status?: string;
  target_group_id?: string | null;
  target_group_name?: string | null;
  chapter_count?: number;
  chapters?: Chapter[];
  completed_chapter_ids?: string[];
}

interface CellGroup {
  id: string;
  name: string;
  network?: string;
  leader?: string;
  leader_name?: string;
  host?: string;
  neighborhood?: string;
  meeting_day?: string;
  meeting_time?: string;
  day_time?: string;
  whatsapp?: string;
  whatsapp_contact?: string;
  address?: string;
  description?: string;
}

interface CellPost {
  id: string;
  cell_group_id?: string;
  author_id?: string;
  author_name?: string;
  author?: string;
  author_role?: string;
  author_avatar?: string;
  avatar?: string;
  time_ago?: string;
  created_at?: string;
  content: string;
  content_text?: string;
  reply_to_id?: string;
  reply_to_author?: string;
  reply_to_text?: string;
  reactions?: Record<string, string[]>;
  likes?: number;
}

interface CellStudy {
  id: string;
  title: string;
  passage?: string;
  theme?: string;
  verse_text?: string;
  content?: string;
  questions?: string[];
  pdf_url?: string;
  created_at?: string;
}

interface SnackAssignment {
  id: string;
  user_id?: string;
  user_name?: string;
  member_name?: string;
  person?: string;
  item_name?: string;
  item?: string;
  quantity?: string;
  event_date?: string;
  scheduled_date?: string;
  date?: string;
  confirmed?: boolean;
  is_confirmed?: boolean;
  category?: string;
}

const SNACK_QUICK_SUGGESTIONS = [
  { name: 'Refrigerante 2L', qty: '2 garrafas', category: 'BEBIDAS', icon: '🥤' },
  { name: 'Suco Natural 1L', qty: '2 garrafas', category: 'BEBIDAS', icon: '🧃' },
  { name: 'Salgadinhos (Cento)', qty: '1 cento', category: 'SALGADOS', icon: '🥟' },
  { name: 'Pão de Queijo', qty: '1 pacote grande', category: 'SALGADOS', icon: '🧀' },
  { name: 'Bolo Caseiro', qty: '1 bolo', category: 'DOCES', icon: '🍰' },
  { name: 'Sanduíches Naturais', qty: '1 bandeja', category: 'SALGADOS', icon: '🥪' },
  { name: 'Frutas da Estação', qty: '1 porção', category: 'FRUTAS', icon: '🍉' },
  { name: 'Copos & Guardanapos', qty: '1 kit', category: 'DESCARTAVEIS', icon: '🍽️' },
  { name: 'Café Quentinho', qty: '1 garrafa', category: 'BEBIDAS', icon: '☕' },
];

const getSnackIcon = (itemText?: string) => {
  if (!itemText) return '🥪';
  const t = itemText.toLowerCase();
  if (t.includes('refri') || t.includes('coca') || t.includes('suco') || t.includes('bebida') || t.includes('água') || t.includes('cha') || t.includes('chá')) return '🥤';
  if (t.includes('café') || t.includes('cafe')) return '☕';
  if (t.includes('salgad') || t.includes('coxinha') || t.includes('kibe') || t.includes('empada') || t.includes('pão') || t.includes('pao') || t.includes('torta') || t.includes('sandu') || t.includes('queijo')) return '🥟';
  if (t.includes('bolo') || t.includes('doce') || t.includes('brigadeiro') || t.includes('sobremesa') || t.includes('pudim') || t.includes('torta')) return '🍰';
  if (t.includes('fruta') || t.includes('melancia') || t.includes('banana') || t.includes('uva') || t.includes('maçã') || t.includes('maca')) return '🍉';
  if (t.includes('copo') || t.includes('guardanapo') || t.includes('prato') || t.includes('descart')) return '🍽️';
  return '🥪';
};

interface CellMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  created_at?: string;
}

type PortalTab = 'dashboard' | 'mural' | 'estudos' | 'lanches' | 'lideranca';
type LeaderSubTab = 'requests' | 'members' | 'lanches' | 'settings';

export const CellGroups: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [cells, setCells] = useState<CellGroup[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'portal' | 'discover'>('discover');
  const [myGroupId, setMyGroupId] = useState<string | null>(null);
  const [portalTab, setPortalTab] = useState<PortalTab>('dashboard');
  const [isCellLeader, setIsCellLeader] = useState(false);
  
  // Discover State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('ALL');
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);

  // Portal State
  const [posts, setPosts] = useState<CellPost[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CellPost | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [activeReactionPickerPostId, setActiveReactionPickerPostId] = useState<string | null>(null);
  const [study, setStudy] = useState<CellStudy | null>(null);
  const [studyBooks, setStudyBooks] = useState<StudyBook[]>([]);
  const [loadedBooksMap, setLoadedBooksMap] = useState<Record<string, StudyBook>>({});
  const [studyScope, setStudyScope] = useState<'cell' | 'church'>('cell');
  const [selectedBook, setSelectedBook] = useState<StudyBook | null>(null);
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([]);
  const [completedChapterIds, setCompletedChapterIds] = useState<string[]>([]);
  const [showPreface, setShowPreface] = useState<boolean>(false);
  const [loadingBookDetails, setLoadingBookDetails] = useState<boolean>(false);
  const [, setTogglingChapterId] = useState<string | null>(null);
  const [snacks, setSnacks] = useState<SnackAssignment[]>([]);

  // Lanches & Partilha State
  const [isSnackModalOpen, setIsSnackModalOpen] = useState(false);
  const [snackFilterCategory, setSnackFilterCategory] = useState<string>('ALL');
  const [newSnackItem, setNewSnackItem] = useState('');
  const [newSnackDate, setNewSnackDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSnackQty, setNewSnackQty] = useState('');
  const [newSnackCategory, setNewSnackCategory] = useState<string>('SALGADOS');
  const [newSnackAssigneeMode, setNewSnackAssigneeMode] = useState<'me' | 'open' | 'member'>('me');
  const [newSnackAssignedMemberId, setNewSnackAssignedMemberId] = useState<string>('');
  const [isAddingSnack, setIsAddingSnack] = useState(false);

  // Leader Hub State
  const [leaderSubTab, setLeaderSubTab] = useState<LeaderSubTab>('requests');
  const [pendingUsers, setPendingUsers] = useState<CellMember[]>([]);
  const [groupMembers, setGroupMembers] = useState<CellMember[]>([]);
  const [, setLoadingDetails] = useState(false);

  // Form edit meeting
  const [editMeetingDay, setEditMeetingDay] = useState('');
  const [editMeetingTime, setEditMeetingTime] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarBg = (name?: string) => {
    const gradients = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #10b981, #047857)',
      'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      'linear-gradient(135deg, #f59e0b, #b45309)',
      'linear-gradient(135deg, #ec4899, #be185d)',
      'linear-gradient(135deg, #06b6d4, #0e7490)'
    ];
    if (!name) return gradients[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const formatPostTime = (dateStr?: string) => {
    if (!dateStr) return 'Agora';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Agora';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      if (isToday) return `Hoje às ${hours}:${minutes}`;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return `Ontem às ${hours}:${minutes}`;
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} às ${hours}:${minutes}`;
    } catch {
      return 'Recente';
    }
  };

  useEffect(() => {
    // 1. Hidratação Instantânea por Cache Local (0ms):
    if (user?.email) {
      try {
        const cachedGroupId = localStorage.getItem(`faithhub_my_cell_group_id_${user.email.toLowerCase()}`);
        if (cachedGroupId) {
          setMyGroupId(cachedGroupId);
          setViewMode('portal');

          const cachedPosts = localStorage.getItem(`faithhub_cache_posts_${cachedGroupId}`);
          if (cachedPosts) setPosts(JSON.parse(cachedPosts));

          const cachedSnacks = localStorage.getItem(`faithhub_cache_snacks_${cachedGroupId}`);
          if (cachedSnacks) setSnacks(JSON.parse(cachedSnacks));

          const cachedBooks = localStorage.getItem(`faithhub_cache_books_${cachedGroupId}`);
          if (cachedBooks) {
            const parsedBooks = JSON.parse(cachedBooks);
            setStudyBooks(parsedBooks);
            if (parsedBooks.length > 0) setSelectedBook(parsedBooks[0]);
          }

          // Se já tem cache, desativa o loading em tela cheia na hora
          setIsLoadingInitial(false);
        }
      } catch {}
    }
    loadAllData();
  }, [user, isAuthenticated]);

  const loadAllData = async () => {
    try {
      // Busca grupos e perfil do membro simultaneamente em paralelo
      const [groupList, member] = await Promise.all([
        fetchCellGroups(),
        (user?.email || isAuthenticated) ? fetchCurrentMember() : Promise.resolve(null)
      ]);

      const cellsArray = Array.isArray(groupList) ? groupList : [];
      setCells(cellsArray);

      let assignedGroupId: string | null = null;
      let userRole = 'Membro';

      if (member) {
        userRole = member.role || 'Membro';
        if (member.cell_group_id) {
          assignedGroupId = member.cell_group_id;
          if (user?.email) {
            localStorage.setItem(`faithhub_my_cell_group_id_${user.email.toLowerCase()}`, member.cell_group_id);
          }
        }
        if (member.pending_cell_group_id && member.pending_cell_group_id !== member.cell_group_id) {
          setPendingGroupId(member.pending_cell_group_id);
        } else {
          setPendingGroupId(null);
        }
      }

      // Fallback local se necessário
      if (!assignedGroupId && user?.email) {
        assignedGroupId = localStorage.getItem(`faithhub_my_cell_group_id_${user.email.toLowerCase()}`);
      }

      const matchedGroup = cellsArray.find(c => c.id === assignedGroupId);

      if (matchedGroup) {
        setMyGroupId(matchedGroup.id);
        setViewMode('portal');

        const roleUpper = userRole.toUpperCase();
        const isLeader = Boolean(
          (matchedGroup.leader_name && user?.name && matchedGroup.leader_name.toLowerCase() === user.name.toLowerCase()) ||
          (matchedGroup.leader && user?.name && matchedGroup.leader.toLowerCase() === user.name.toLowerCase()) ||
          ['ADMIN', 'PASTOR', 'SUPERADMIN', 'LEADER', 'LÍDER', 'ADMINISTRADOR'].includes(roleUpper)
        );
        setIsCellLeader(isLeader);

        // Carrega todos os dados específicos da célula em paralelo ultra-rápido
        await loadGroupSpecifics(matchedGroup.id, cellsArray);
      } else {
        setMyGroupId(null);
        setViewMode('discover');
        setIsCellLeader(false);
      }
    } catch (e) {
      console.error('Erro ao carregar dados de células:', e);
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const loadBookWithCompletions = async (bookId: string, silent = true) => {
    if (!silent && !loadedBooksMap[bookId]) {
      setLoadingBookDetails(true);
    }
    try {
      const userIdentifier = user?.email || 'guest';
      const fullBook = await fetchStudyBookDetails(bookId, userIdentifier);
      if (fullBook) {
        setLoadedBooksMap(prev => ({ ...prev, [bookId]: fullBook }));
        setSelectedBook(fullBook);
        
        // Sincroniza conclusões do localStorage + backend
        const localKey = `faithhub_completed_chapters_${userIdentifier}_${bookId}`;
        let cachedCompletions: string[] = [];
        try {
          cachedCompletions = JSON.parse(localStorage.getItem(localKey) || '[]');
        } catch {}
        const backendCompletions: string[] = fullBook.completed_chapter_ids || [];
        const mergedCompletions = Array.from(new Set([...cachedCompletions, ...backendCompletions]));
        
        setCompletedChapterIds(mergedCompletions);
        
        if (fullBook.chapters && fullBook.chapters.length > 0) {
          setExpandedChapterIds(prev => prev.length === 0 ? [fullBook.chapters[0].id || '0'] : prev);
        }
      }
    } finally {
      setLoadingBookDetails(false);
    }
  };

  const handleSwitchScope = (scope: 'cell' | 'church') => {
    setStudyScope(scope);
    setShowPreface(false);
    
    let targetBook: StudyBook | undefined;
    if (scope === 'cell') {
      targetBook = Object.values(loadedBooksMap).find(b => b.target_group_id === myGroupId || b.target_group_id) ||
                   studyBooks.find(b => b.target_group_id === myGroupId || b.target_group_id);
    } else {
      targetBook = Object.values(loadedBooksMap).find(b => !b.target_group_id) ||
                   studyBooks.find(b => !b.target_group_id);
    }
    
    if (targetBook) {
      const fullBook = loadedBooksMap[targetBook.id] || targetBook;
      setSelectedBook(fullBook);

      const userIdentifier = user?.email || 'guest';
      const localKey = `faithhub_completed_chapters_${userIdentifier}_${fullBook.id}`;
      let cachedCompletions: string[] = [];
      try {
        cachedCompletions = JSON.parse(localStorage.getItem(localKey) || '[]');
      } catch {}
      const backendCompletions: string[] = fullBook.completed_chapter_ids || [];
      const mergedCompletions = Array.from(new Set([...cachedCompletions, ...backendCompletions]));
      setCompletedChapterIds(mergedCompletions);

      if (fullBook.chapters && fullBook.chapters.length > 0) {
        setExpandedChapterIds([fullBook.chapters[0].id || '0']);
      }

      // Carrega silenciosamente em background se faltar dados
      if (!fullBook.chapters || fullBook.chapters.length === 0) {
        loadBookWithCompletions(fullBook.id, true);
      }
    } else {
      setSelectedBook(null);
    }
  };

  const handleToggleExpandChapter = (chapterId: string) => {
    setExpandedChapterIds(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId) 
        : [...prev, chapterId]
    );
  };

  const handleToggleCompletion = async (chapterId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedBook) return;

    setTogglingChapterId(chapterId);
    const userIdentifier = user?.email || 'guest';
    const isCurrentlyCompleted = completedChapterIds.includes(chapterId);
    
    // Atualização otimista imediata
    const newCompletions = isCurrentlyCompleted 
      ? completedChapterIds.filter(id => id !== chapterId)
      : [...completedChapterIds, chapterId];
    
    setCompletedChapterIds(newCompletions);
    
    const localKey = `faithhub_completed_chapters_${userIdentifier}_${selectedBook.id}`;
    localStorage.setItem(localKey, JSON.stringify(newCompletions));

    // Atualiza também no mapa em memória
    setLoadedBooksMap(prev => {
      const existing = prev[selectedBook.id];
      if (!existing) return prev;
      return {
        ...prev,
        [selectedBook.id]: {
          ...existing,
          completed_chapter_ids: newCompletions
        }
      };
    });

    try {
      const res = await toggleChapterCompletion(chapterId, selectedBook.id, userIdentifier);
      if (res && Array.isArray(res.completed_chapter_ids)) {
        setCompletedChapterIds(res.completed_chapter_ids);
        localStorage.setItem(localKey, JSON.stringify(res.completed_chapter_ids));
      }
    } catch (err) {
      console.log('Mantido offline com sucesso', err);
    } finally {
      setTogglingChapterId(null);
    }
  };

  const loadGroupSpecifics = async (groupId: string, groupList?: CellGroup[]) => {
    const userIdentifier = user?.email || 'guest';

    // Dispara TODAS as 5 requisições em paralelo simultâneo (1 único roundtrip):
    const [p, books, s, l, details] = await Promise.all([
      fetchCellPosts(groupId),
      fetchStudyBooks(groupId),
      fetchCellStudies(groupId),
      fetchCellPartilhas(groupId),
      fetchCellGroupDetails(groupId)
    ]);

    // 1. Processa Posts do Mural
    if (Array.isArray(p)) {
      const normalized = p.map((item: any) => ({
        ...item,
        content: item.content || item.content_text || '',
        author_name: item.author_name || item.author || 'Membro',
        reactions: typeof item.reactions === 'string' ? JSON.parse(item.reactions || '{}') : (item.reactions || {})
      }));
      setPosts(normalized);
      try { localStorage.setItem(`faithhub_cache_posts_${groupId}`, JSON.stringify(normalized)); } catch {}
    }

    // 2. Processa Partilhas / Lanches
    if (Array.isArray(l)) {
      setSnacks(l);
      try { localStorage.setItem(`faithhub_cache_snacks_${groupId}`, JSON.stringify(l)); } catch {}
    }

    // 3. Processa Estudos
    if (Array.isArray(s) && s.length > 0) setStudy(s[0]);

    if (Array.isArray(books) && books.length > 0) {
      setStudyBooks(books);
      try { localStorage.setItem(`faithhub_cache_books_${groupId}`, JSON.stringify(books)); } catch {}

      const cellBook = books.find(b => b.target_group_id === groupId || b.target_group_id);
      const churchBook = books.find(b => !b.target_group_id);
      const defaultBook = cellBook || churchBook || books[0];

      if (defaultBook) {
        setSelectedBook(defaultBook);
        setStudyScope(defaultBook.target_group_id ? 'cell' : 'church');

        const localKey = `faithhub_completed_chapters_${userIdentifier}_${defaultBook.id}`;
        let cachedCompletions: string[] = [];
        try { cachedCompletions = JSON.parse(localStorage.getItem(localKey) || '[]'); } catch {}
        const backendCompletions: string[] = defaultBook.completed_chapter_ids || [];
        const merged = Array.from(new Set([...cachedCompletions, ...backendCompletions]));
        setCompletedChapterIds(merged);

        if (defaultBook.chapters && defaultBook.chapters.length > 0) {
          setExpandedChapterIds([defaultBook.chapters[0].id || '0']);
        }
      }

      // Pré-carrega capítulos completos dos livros em background silencioso (NÃO trava a tela!)
      Promise.all(
        books.map(async (b) => {
          try {
            const detail = await fetchStudyBookDetails(b.id, userIdentifier);
            return detail || b;
          } catch {
            return b;
          }
        })
      ).then(detailsList => {
        const bookMap: Record<string, StudyBook> = {};
        detailsList.forEach((b) => {
          if (b && b.id) bookMap[b.id] = b;
        });
        setLoadedBooksMap(bookMap);

        const fullCellBook = detailsList.find(b => b && (b.target_group_id === groupId || b.target_group_id));
        const fullChurchBook = detailsList.find(b => b && !b.target_group_id);
        const activeFull = (studyScope === 'cell' ? fullCellBook : fullChurchBook) || defaultBook;
        if (activeFull && activeFull.chapters) {
          setSelectedBook(activeFull);
        }
      });
    } else {
      setStudyBooks([]);
      setSelectedBook(null);
      setLoadedBooksMap({});
    }

    // 4. Processa Liderança e Encontro
    if (details) {
      if (Array.isArray(details.pending_users)) setPendingUsers(details.pending_users);
      if (Array.isArray(details.members)) setGroupMembers(details.members);
      setEditMeetingDay(details.meeting_day || '');
      setEditMeetingTime(details.meeting_time || '');
      setEditAddress(details.address || '');
      setEditWhatsapp(details.whatsapp_contact || details.whatsapp || '');
    } else {
      const activeCell = (groupList || cells).find(c => c.id === groupId);
      if (activeCell) {
        setEditMeetingDay(activeCell.meeting_day || '');
        setEditMeetingTime(activeCell.meeting_time || '');
        setEditAddress(activeCell.address || '');
        setEditWhatsapp(activeCell.whatsapp || activeCell.whatsapp_contact || '');
      }
    }
  };

  const myGroup = cells.find(g => g.id === myGroupId) || cells[0];

  const filteredCells = cells.filter(cell => {
    const name = cell.name || '';
    const neighborhood = cell.neighborhood || '';
    const leader = cell.leader || cell.leader_name || '';
    const network = cell.network || 'Geral';

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          leader.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNetwork = selectedNetwork === 'ALL' || network === selectedNetwork;
    return matchesSearch && matchesNetwork;
  });

  const handleRequestJoin = async (id: string) => {
    setPendingGroupId(id);
    const userId = user?.userId || 'me';
    await requestJoinCell(userId, id, user?.email);
    alert('Solicitação enviada com sucesso ao líder da célula!');
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() || !myGroupId || isSubmittingPost) return;
    
    setIsSubmittingPost(true);
    const authorName = user?.name || (user?.email ? user.email.split('@')[0] : 'Membro');
    const authorId = user?.userId || `usr_${Date.now()}`;
    const authorRole = isCellLeader ? 'Líder' : 'Membro';

    const payload = {
      group_id: myGroupId,
      content: newPostText.trim(),
      author_name: authorName,
      author_id: authorId,
      author_role: authorRole,
      reply_to_id: replyingTo?.id,
      reply_to_author: replyingTo ? (replyingTo.author_name || replyingTo.author || 'Membro') : undefined,
      reply_to_text: replyingTo ? (replyingTo.content || replyingTo.content_text || '') : undefined
    };

    const res = await createCellPost(payload);

    const newPost: CellPost = res?.post || {
      id: res?.id || `p_${Date.now()}`,
      cell_group_id: myGroupId,
      author_id: authorId,
      author_name: authorName,
      author: authorName,
      author_role: authorRole,
      created_at: new Date().toISOString(),
      content: newPostText.trim(),
      content_text: newPostText.trim(),
      reply_to_id: replyingTo?.id,
      reply_to_author: replyingTo ? (replyingTo.author_name || replyingTo.author || 'Membro') : undefined,
      reply_to_text: replyingTo ? (replyingTo.content || replyingTo.content_text || '') : undefined,
      reactions: {}
    };

    setPosts(prev => [...prev, newPost]);
    setNewPostText('');
    setReplyingTo(null);
    setIsSubmittingPost(false);
  };

  const handleReactPost = async (postId: string, emoji: string) => {
    const effectiveUserId = user?.userId || user?.email || 'anonymous';
    
    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const current = { ...(p.reactions || {}) };
        const users = Array.isArray(current[emoji]) ? [...current[emoji]] : [];
        if (users.includes(effectiveUserId)) {
          current[emoji] = users.filter(u => u !== effectiveUserId);
          if (current[emoji].length === 0) delete current[emoji];
        } else {
          current[emoji] = [...users, effectiveUserId];
        }
        return { ...p, reactions: current };
      }
      return p;
    }));

    setActiveReactionPickerPostId(null);
    await reactToCellPost(postId, emoji, effectiveUserId);
  };

  const handleVolunteerSnack = async (snackId: string) => {
    const currentName = user?.name || (user?.email ? user.email.split('@')[0] : 'Voluntário');
    const currentId = user?.userId || 'me';

    setSnacks(prev => prev.map(s => {
      if (s.id === snackId) {
        return {
          ...s,
          user_name: currentName,
          member_name: currentName,
          person: currentName,
          user_id: currentId,
          confirmed: true,
          is_confirmed: true
        };
      }
      return s;
    }));

    await togglePartilhaItem(snackId, true, currentName, currentId);
  };

  const handleUnvolunteerSnack = async (snackId: string) => {
    setSnacks(prev => prev.map(s => {
      if (s.id === snackId) {
        return {
          ...s,
          user_name: 'A definir',
          member_name: 'A definir',
          person: 'A definir',
          user_id: undefined,
          confirmed: false,
          is_confirmed: false
        };
      }
      return s;
    }));

    await togglePartilhaItem(snackId, false, 'A definir', undefined);
  };

  const handleSelectQuickSuggestion = (sug: { name: string; qty: string; category: string }) => {
    setNewSnackItem(sug.name);
    setNewSnackQty(sug.qty);
    setNewSnackCategory(sug.category);
  };

  // --- LÍDER ACTIONS ---
  const handleApproveMember = async (member: CellMember) => {
    if (!myGroupId) return;
    const ok = await evaluateCellJoinRequest(myGroupId, member.id, true);
    if (ok) {
      setPendingUsers(prev => prev.filter(u => u.id !== member.id));
      setGroupMembers(prev => [member, ...prev]);
      alert(`✓ ${member.name} foi aprovado(a) com sucesso na célula!`);
    } else {
      alert('Erro ao aprovar solicitação.');
    }
  };

  const handleRejectMember = async (member: CellMember) => {
    if (!myGroupId) return;
    if (!confirm(`Deseja recusar a entrada de ${member.name}?`)) return;
    const ok = await evaluateCellJoinRequest(myGroupId, member.id, false);
    if (ok) {
      setPendingUsers(prev => prev.filter(u => u.id !== member.id));
    }
  };

  const handleRemoveMember = async (member: CellMember) => {
    if (!myGroupId) return;
    if (!confirm(`Remover ${member.name} desta célula?`)) return;
    const ok = await removeCellMember(myGroupId, member.id);
    if (ok) {
      setGroupMembers(prev => prev.filter(u => u.id !== member.id));
      alert(`${member.name} foi desvinculado(a) da célula.`);
    }
  };

  const handleCreateSnack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGroupId || !newSnackItem.trim() || !newSnackDate || isAddingSnack) return;
    setIsAddingSnack(true);

    let assignedName = 'A definir';
    let assignedId = undefined;
    let isConfirmed = false;

    if (newSnackAssigneeMode === 'me') {
      assignedName = user?.name || (user?.email ? user.email.split('@')[0] : 'Voluntário');
      assignedId = user?.userId || 'me';
      isConfirmed = true;
    } else if (newSnackAssigneeMode === 'member' && newSnackAssignedMemberId) {
      const found = groupMembers.find(m => m.id === newSnackAssignedMemberId);
      if (found) {
        assignedName = found.name;
        assignedId = found.id;
        isConfirmed = true;
      }
    }

    const payload = {
      cell_group_id: myGroupId,
      item_name: newSnackItem.trim(),
      quantity: newSnackQty.trim(),
      event_date: newSnackDate,
      user_name: assignedName,
      user_id: assignedId
    };

    const res = await createPartilhaItem(payload);
    if (res && res.partilha) {
      const createdItem: SnackAssignment = {
        ...res.partilha,
        is_confirmed: isConfirmed,
        confirmed: isConfirmed,
        user_name: assignedName,
        item_name: newSnackItem.trim(),
        quantity: newSnackQty.trim(),
        event_date: newSnackDate,
        category: newSnackCategory
      };

      if (isConfirmed) {
        await togglePartilhaItem(res.partilha.id, true, assignedName, assignedId);
      }

      setSnacks(prev => [createdItem, ...prev]);
      setNewSnackItem('');
      setNewSnackQty('');
      setIsSnackModalOpen(false);
    }
    setIsAddingSnack(false);
  };

  const handleDeleteSnack = async (snackId: string) => {
    if (!confirm('Remover este item da escala de comunhão?')) return;
    const ok = await deletePartilhaItem(snackId);
    if (ok) {
      setSnacks(prev => prev.filter(s => s.id !== snackId));
    }
  };

  const handleSaveMeetingInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGroupId || !myGroup) return;
    setSavingMeeting(true);
    setSaveSuccess(false);

    const ok = await updateCellGroupDetails({
      id: myGroupId,
      name: myGroup.name,
      meeting_day: editMeetingDay,
      meeting_time: editMeetingTime,
      address: editAddress,
      whatsapp_contact: editWhatsapp
    });

    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setCells(prev => prev.map(c => c.id === myGroupId ? {
        ...c,
        meeting_day: editMeetingDay,
        meeting_time: editMeetingTime,
        address: editAddress,
        whatsapp: editWhatsapp,
        whatsapp_contact: editWhatsapp
      } : c));
    } else {
      alert('Erro ao atualizar informações do encontro.');
    }
    setSavingMeeting(false);
  };

  if (isLoadingInitial) {
    return (
      <div className="pwa-content animate-fade-in" style={{ paddingBottom: '90px', minHeight: '65vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '22px',
          background: 'var(--accent-primary-light)',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          animation: 'pulseIconGlow 1.8s infinite ease-in-out'
        }}>
          👥
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: '1.08rem', color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
            Acessando Pequenos Grupos...
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Sincronizando encontros, roteiros e comunhão
          </div>
        </div>

        {/* Barra de Progresso Animada Contínua */}
        <div className="pwa-progress-track" style={{ width: '180px', height: '6px', marginTop: '2px' }}>
          <div className="pwa-progress-indicator" />
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-content animate-fade-in" style={{ paddingBottom: '90px' }}>
      
      {/* Header com Switch entre "Minha Célula" e "Explorar Células" */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem', margin: 0 }}>Células & Redes</h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            {viewMode === 'portal' && myGroup ? 'Hub conectado do seu Pequeno Grupo' : 'Encontre uma célula perto de você'}
          </p>
        </div>

        {cells.length > 0 && myGroupId && (
          <button 
            type="button" 
            onClick={() => setViewMode(viewMode === 'portal' ? 'discover' : 'portal')}
            style={{
              background: 'var(--accent-primary-light)',
              color: 'var(--accent-primary)',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.74rem',
              cursor: 'pointer'
            }}
          >
            {viewMode === 'portal' ? '🔍 Explorar' : '🏠 Minha Célula'}
          </button>
        )}
      </div>

      {/* ========================================================
          MODO 1: PORTAL CONECTADO DA MINHA CÉLULA (SUB-APP)
          ======================================================== */}
      {viewMode === 'portal' && myGroup ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card Hero da Minha Célula */}
          <div style={{ background: 'var(--accent-primary-gradient)', color: '#ffffff', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                  CÉLULA CONECTADA • {myGroup.network || 'Geral'}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: '2px' }}>
                  {myGroup.name}
                </h3>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 14px', borderRadius: '12px', marginTop: '14px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>👤 <strong>Liderança:</strong> {myGroup.leader || myGroup.leader_name || 'Pastoral'}</div>
              <div>🗓️ <strong>Encontro:</strong> {myGroup.meeting_day ? `${myGroup.meeting_day} às ${myGroup.meeting_time}` : (myGroup.day_time || 'A definir')}</div>
              {myGroup.address && <div>📍 <strong>Endereço:</strong> {myGroup.address} {myGroup.neighborhood ? `(${myGroup.neighborhood})` : ''}</div>}
            </div>
          </div>

          {/* Abas de Navegação Interna da Célula (Incluindo Gestão do Líder se for Líder) */}
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'dashboard', label: '📊 Início' },
              { id: 'mural', label: '💬 Mural' },
              { id: 'estudos', label: '📖 Estudos' },
              { id: 'lanches', label: '☕ Partilha' },
              ...(isCellLeader ? [{ 
                id: 'lideranca', 
                label: pendingUsers.length > 0 ? `🛡️ Gestão do Líder (${pendingUsers.length})` : '🛡️ Gestão do Líder' 
              }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPortalTab(tab.id as PortalTab)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: portalTab === tab.id ? '1.5px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                  background: portalTab === tab.id 
                    ? 'var(--accent-primary-light)' 
                    : (tab.id === 'lideranca' && pendingUsers.length > 0 ? '#fef2f2' : '#ffffff'),
                  color: portalTab === tab.id 
                    ? 'var(--accent-primary)' 
                    : (tab.id === 'lideranca' && pendingUsers.length > 0 ? '#dc2626' : 'var(--text-main)'),
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: DASHBOARD */}
          {portalTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Notificação rápida para o Líder se houver novos pedidos */}
              {pendingUsers.length > 0 && (
                <div 
                  onClick={() => { setPortalTab('lideranca'); setLeaderSubTab('requests'); }}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔔</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#991b1b' }}>
                        {pendingUsers.length} solicitação(ões) de entrada pendente(s)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                        Toque para aprovar os novos participantes da célula
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#dc2626' }}>Ver ➔</span>
                </div>
              )}

              {/* Estudo da Semana */}
              <div 
                onClick={() => setPortalTab('estudos')}
                style={{ background: '#ffffff', border: '1px solid var(--panel-border)', borderRadius: '18px', padding: '16px', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                    {selectedBook?.target_group_id ? '👥 ESTUDO DA CÉLULA' : '🌐 ESTUDO GERAL DA IGREJA'}
                  </span>
                  {selectedBook && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '8px' }}>
                      {completedChapterIds.length}/{selectedBook.chapters?.length || 0} Concluídos
                    </span>
                  )}
                </div>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 2px 0' }}>
                  {selectedBook ? selectedBook.title : (study?.title || 'Nenhum estudo publicado')}
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                  {selectedBook?.chapters && selectedBook.chapters.length > 0 
                    ? `${selectedBook.chapters.length} encontros estruturados • Toque para ver o roteiro` 
                    : (study?.verse || study?.verse_reference || 'Toque para abrir a lição e roteiro')}
                </p>
              </div>

              {/* Botão de WhatsApp do Líder */}
              {(myGroup.whatsapp || myGroup.whatsapp_contact) && (
                <a
                  href={`https://wa.me/${(myGroup.whatsapp || myGroup.whatsapp_contact || '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pwa-secondary"
                  style={{ textDecoration: 'none', color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <span>💬</span>
                  <span>Falar com o Líder no WhatsApp</span>
                </a>
              )}
            </div>
          )}

          {/* TAB 2: MURAL - ESTILO COMUNIDADE / WHATSAPP */}
          {portalTab === 'mural' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Top Summary Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                borderRadius: '16px',
                padding: '12px 16px',
                border: '1px solid var(--panel-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>💬</span>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Mural da Célula {myGroup.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {posts.length} {posts.length === 1 ? 'mensagem compartilhada' : 'mensagens compartilhadas'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, padding: '4px 10px', borderRadius: '12px' }}>
                  Comunidade Viva
                </div>
              </div>

              {/* Feed de Mensagens */}
              {posts.length === 0 ? (
                <div style={{ 
                  background: '#ffffff', 
                  borderRadius: '20px', 
                  padding: '36px 20px', 
                  textAlign: 'center', 
                  border: '1px dashed #cbd5e1' 
                }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🕊️</span>
                  <div style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                    O mural da célula está tranquilo
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>
                    Compartilhe um versículo, um pedido de oração ou avise a turma sobre o encontro!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {posts.map((p) => {
                    const authorDisplayName = p.author_name || p.author || 'Membro';
                    const isCurrentUser = Boolean(
                      (user?.name && authorDisplayName.toLowerCase() === user.name.toLowerCase()) ||
                      (user?.email && p.author_id === user.userId)
                    );
                    const isLeaderPost = p.author_role === 'Líder' || p.author_role === 'LEADER' || p.author_role === 'PASTOR' || p.author_role === 'SUPERADMIN';
                    const reactionsObj = p.reactions || {};
                    const reactionKeys = Object.keys(reactionsObj);
                    const effectiveUserId = user?.userId || user?.email || 'anonymous';

                    return (
                      <div 
                        key={p.id} 
                        style={{
                          background: isCurrentUser ? '#f0fdf4' : '#ffffff',
                          borderRadius: '20px',
                          padding: '16px',
                          border: isCurrentUser ? '1.5px solid #bbf7d0' : '1px solid var(--panel-border)',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          position: 'relative'
                        }}
                      >
                        {/* Header da Mensagem (Avatar + Nome + Badge + Horário) */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            {/* Avatar com Gradiente e Iniciais */}
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: getAvatarBg(authorDisplayName),
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.82rem',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                            }}>
                              {getInitials(authorDisplayName)}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {authorDisplayName}
                                </span>
                                
                                {isCurrentUser && (
                                  <span style={{ fontSize: '0.64rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '1px 6px', borderRadius: '6px' }}>
                                    Você
                                  </span>
                                )}

                                {isLeaderPost && (
                                  <span style={{ fontSize: '0.64rem', background: '#fef3c7', color: '#b45309', fontWeight: 800, padding: '1px 6px', borderRadius: '6px' }}>
                                    👑 Líder
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                {formatPostTime(p.created_at)}
                              </div>
                            </div>
                          </div>

                          {/* Botão Responder Rápido */}
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(p);
                              const inputEl = document.getElementById('cell-mural-input');
                              if (inputEl) {
                                inputEl.focus();
                                inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '5px 9px',
                              fontSize: '0.70rem',
                              fontWeight: 800,
                              color: 'var(--accent-primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0
                            }}
                          >
                            <span>↩️</span>
                            <span>Responder</span>
                          </button>
                        </div>

                        {/* Card de Mensagem Respondida (Estilo WhatsApp Quote) */}
                        {p.reply_to_text && (
                          <div style={{
                            background: isCurrentUser ? '#dcfce7' : '#f1f5f9',
                            borderLeft: '3.5px solid var(--accent-primary)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '0.76rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}>
                            <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.72rem' }}>
                              @{p.reply_to_author || 'Membro'}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              "{p.reply_to_text}"
                            </div>
                          </div>
                        )}

                        {/* Corpo da Mensagem */}
                        <div style={{
                          fontSize: '0.88rem',
                          color: 'var(--text-main)',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {p.content || p.content_text || ''}
                        </div>

                        {/* Barra de Reações e Emojis Rápidos */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px',
                          paddingTop: '6px',
                          borderTop: isCurrentUser ? '1px solid #dcfce7' : '1px solid #f1f5f9'
                        }}>
                          {/* Reações Ativas com Contador */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            {reactionKeys.map(emoji => {
                              const userList = reactionsObj[emoji] || [];
                              const hasReacted = userList.includes(effectiveUserId);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleReactPost(p.id, emoji)}
                                  style={{
                                    background: hasReacted ? '#e0e7ff' : '#f8fafc',
                                    border: hasReacted ? '1px solid #818cf8' : '1px solid #e2e8f0',
                                    color: hasReacted ? '#3730a3' : 'var(--text-main)',
                                    borderRadius: '16px',
                                    padding: '2px 8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span>{emoji}</span>
                                  <span>{userList.length}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick Emoji Reaction Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {['❤️', '🙏', '🔥', '👏', '😍'].map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReactPost(p.id, emoji)}
                                title={`Reagir com ${emoji}`}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  fontSize: '0.96rem',
                                  cursor: 'pointer',
                                  padding: '2px 3px',
                                  borderRadius: '6px',
                                  lineHeight: 1,
                                  transition: 'transform 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Caixa de Entrada e Envio de Mensagens */}
              <form 
                onSubmit={handleAddPost} 
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '14px',
                  border: '1.5px solid var(--panel-border)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Banner de Citação Ativa se estiver Respondendo */}
                {replyingTo && (
                  <div style={{
                    background: '#eff6ff',
                    borderLeft: '4px solid var(--accent-primary)',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                        Respondendo a @{replyingTo.author_name || replyingTo.author || 'Membro'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{replyingTo.content || replyingTo.content_text}"
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        padding: '4px',
                        fontWeight: 900
                      }}
                      title="Cancelar resposta"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Textarea Espaçoso e Ergonômico (Largura Total) */}
                <textarea
                  id="cell-mural-input"
                  className="input-pwa"
                  placeholder={replyingTo ? `Escreva sua resposta para @${replyingTo.author_name || replyingTo.author}...` : "Compartilhe um recado, aviso, gratidão ou versículo com a célula..."}
                  rows={3}
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    resize: 'none',
                    padding: '12px 14px',
                    fontSize: '0.88rem',
                    borderRadius: '14px',
                    border: '1px solid #cbd5e1',
                    lineHeight: 1.4,
                    minHeight: '76px'
                  }}
                />

                {/* Barra de Ações Inferior */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {replyingTo ? '💬 Respondendo mensagem' : '✨ Visível para todos da célula'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {replyingTo && (
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '8px 14px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                    )}

                    <button 
                      type="submit" 
                      disabled={!newPostText.trim() || isSubmittingPost}
                      style={{ 
                        background: 'var(--gradient-primary, linear-gradient(135deg, #1e3a8a, #3b82f6))',
                        color: '#ffffff',
                        border: 'none',
                        padding: '9px 18px', 
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        borderRadius: '12px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                        opacity: (!newPostText.trim() || isSubmittingPost) ? 0.6 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{isSubmittingPost ? 'Enviando...' : '➤'}</span>
                      <span>{replyingTo ? 'Responder' : 'Publicar'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ESTUDOS - LEITOR DIGITAL DE LIVROS, SESSÕES & CHECK DE CONCLUSÃO */}
          {portalTab === 'estudos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 1. SELETOR DE ESCOPO: CÉLULA VS IGREJA */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '16px',
                gap: '4px',
                border: '1px solid var(--panel-border)'
              }}>
                <button
                  type="button"
                  onClick={() => handleSwitchScope('cell')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: studyScope === 'cell' ? '#ffffff' : 'transparent',
                    color: studyScope === 'cell' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: 800,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    boxShadow: studyScope === 'cell' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>👥</span>
                  <span>Estudo da Célula</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchScope('church')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: studyScope === 'church' ? '#ffffff' : 'transparent',
                    color: studyScope === 'church' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: 800,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    boxShadow: studyScope === 'church' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🌐</span>
                  <span>Geral da Igreja</span>
                </button>
              </div>

              {loadingBookDetails && !selectedBook ? (
                <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Carregando roteiro do estudo...
                </div>
              ) : selectedBook ? (
                <>
                  {/* 2. CARD CAPA DO LIVRO COM ESCOPO CLARO */}
                  <div style={{
                    background: selectedBook.cover_color || 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                    borderRadius: '22px',
                    padding: '20px',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.64rem', 
                        fontWeight: 900, 
                        background: 'rgba(255,255,255,0.22)', 
                        padding: '3px 10px', 
                        borderRadius: '8px', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px' 
                      }}>
                        {selectedBook.target_group_id ? `👥 CÉLULA: ${selectedBook.target_group_name || myGroup?.name || 'GRUPO'}` : '🌐 SÉRIE GERAL DA IGREJA'}
                      </span>
                      {selectedBook.preface && (
                        <button
                          type="button"
                          onClick={() => setShowPreface(!showPreface)}
                          style={{
                            background: 'rgba(255,255,255,0.25)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '4px 10px',
                            color: '#ffffff',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{showPreface ? '✕ Fechar' : '📜 Ler Prefácio'}</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '2px 0 4px 0', textShadow: '0 2px 4px rgba(0,0,0,0.25)' }}>
                        {selectedBook.title}
                      </h3>
                      {selectedBook.subtitle && (
                        <p style={{ fontSize: '0.80rem', margin: 0, opacity: 0.9 }}>
                          {selectedBook.subtitle}
                        </p>
                      )}
                      {selectedBook.author_name && (
                        <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '6px' }}>
                          ✍️ Por {selectedBook.author_name}
                        </div>
                      )}
                    </div>

                    {/* Prefácio Expansível */}
                    {showPreface && selectedBook.preface && (
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '14px',
                        padding: '14px',
                        marginTop: '6px',
                        fontSize: '0.80rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        <div style={{ fontWeight: 800, marginBottom: '6px', color: '#fef08a' }}>
                          📜 Prefácio & Propósito Espiritual da Série:
                        </div>
                        {selectedBook.preface}
                      </div>
                    )}
                  </div>

                  {/* 3. CARD DE PROGRESSO DA SÉRIE (CHECK DE CONCLUSÃO) */}
                  {(() => {
                    const totalChapters = selectedBook.chapters?.length || 0;
                    const completedCount = (selectedBook.chapters || []).filter(c => completedChapterIds.includes(c.id || '')).length;
                    const progressPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
                    const isAllDone = totalChapters > 0 && completedCount === totalChapters;

                    return (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '18px',
                        padding: '16px',
                        border: '1px solid var(--panel-border)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '1rem' }}>{isAllDone ? '🏆' : '🎯'}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                              Progresso dos Encontros
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            color: isAllDone ? '#059669' : 'var(--accent-primary)',
                            background: isAllDone ? '#ecfdf5' : '#eff6ff',
                            padding: '2px 8px',
                            borderRadius: '8px'
                          }}>
                            {completedCount} de {totalChapters} Concluídos ({progressPercent}%)
                          </span>
                        </div>

                        {/* Barra de Progresso */}
                        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: isAllDone 
                              ? 'linear-gradient(90deg, #10b981, #059669)' 
                              : 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* 4. SESSÕES / ENCONTROS VERTICAIS EM ACORDEÃO (UI & UX ERGONÔMICO) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Sessões & Lições do Livro ({selectedBook.chapters?.length || 0})
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Toque no card para abrir ou recolher
                      </span>
                    </div>

                    {(selectedBook.chapters || []).map((ch) => {
                      const chapterId = ch.id || String(ch.chapter_number);
                      const isExpanded = expandedChapterIds.includes(chapterId);
                      const isCompleted = completedChapterIds.includes(chapterId);

                      return (
                        <div
                          key={chapterId}
                          style={{
                            background: '#ffffff',
                            borderRadius: '18px',
                            border: isCompleted 
                              ? '1.5px solid #a7f3d0' 
                              : (isExpanded ? '1.5px solid var(--accent-primary)' : '1px solid var(--panel-border)'),
                            boxShadow: isExpanded ? '0 4px 14px rgba(0,0,0,0.06)' : 'var(--shadow-sm)',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Header da Sessão (Acordeão) */}
                          <div
                            onClick={() => handleToggleExpandChapter(chapterId)}
                            style={{
                              padding: '14px 18px',
                              background: isCompleted ? '#f0fdf4' : (isExpanded ? '#f8fafc' : '#ffffff'),
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                              {/* Ícone de Status do Capítulo */}
                              <div 
                                onClick={(e) => handleToggleCompletion(chapterId, e)}
                                title={isCompleted ? "Concluído (toque para desmarcar)" : "Pendente (toque para concluir)"}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: isCompleted ? '#059669' : 'var(--accent-primary-light)',
                                  color: isCompleted ? '#ffffff' : 'var(--accent-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: isCompleted ? '0.90rem' : '0.78rem',
                                  fontWeight: 900,
                                  flexShrink: 0,
                                  boxShadow: isCompleted ? '0 2px 6px rgba(5,150,105,0.3)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {isCompleted ? '✓' : ch.chapter_number}
                              </div>

                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                                  {ch.title}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                  {ch.verse_reference && <span>📖 {ch.verse_reference}</span>}
                                  {ch.scheduled_date && (
                                    <span>🗓️ {ch.scheduled_date.split('-').reverse().slice(0, 2).join('/')}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              {isCompleted ? (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  color: '#059669',
                                  background: '#dcfce7',
                                  padding: '3px 8px',
                                  borderRadius: '8px'
                                }}>
                                  ✓ Concluído
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  color: 'var(--text-muted)',
                                  background: '#f1f5f9',
                                  padding: '3px 8px',
                                  borderRadius: '8px'
                                }}>
                                  Pendente
                                </span>
                              )}
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </div>
                          </div>

                          {/* Corpo Expansível da Lição */}
                          {isExpanded && (
                            <div style={{ padding: '18px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              
                              {/* Texto Bíblico Base */}
                              {ch.verse_reference && (
                                <div style={{
                                  background: '#eff6ff',
                                  borderLeft: '3.5px solid var(--accent-primary)',
                                  borderRadius: '10px',
                                  padding: '8px 12px',
                                  fontSize: '0.80rem',
                                  fontWeight: 700,
                                  color: 'var(--accent-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span>📖</span>
                                  <span>Texto Bíblico Base: {ch.verse_reference}</span>
                                </div>
                              )}

                              {/* Bloco 1: Quebra-Gelo */}
                              {ch.icebreaker && (
                                <div style={{
                                  background: '#f0fdfa',
                                  borderRadius: '14px',
                                  padding: '12px 14px',
                                  border: '1px solid #ccfbf1',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px'
                                }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>🧊</span>
                                    <span>Quebra-Gelo / Dinâmica de Abertura</span>
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: '#134e4a', lineHeight: 1.45 }}>
                                    {ch.icebreaker}
                                  </div>
                                </div>
                              )}

                              {/* Bloco 2: Ministração da Palavra */}
                              {ch.content_text && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>💡</span>
                                    <span>Ministração & Estudo Bíblico</span>
                                  </div>
                                  <div style={{
                                    fontSize: '0.88rem',
                                    color: 'var(--text-main)',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    background: '#fafafa',
                                    borderRadius: '14px',
                                    padding: '14px',
                                    border: '1px solid #f1f5f9'
                                  }}>
                                    {ch.content_text}
                                  </div>
                                </div>
                              )}

                              {/* Bloco 3: Perguntas de Debate */}
                              {ch.discussion_questions && ch.discussion_questions.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>💬</span>
                                    <span>Perguntas para Debate & Compartilhamento</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {ch.discussion_questions.map((q, qIdx) => (
                                      <div 
                                        key={qIdx}
                                        style={{
                                          background: '#fffbeb',
                                          borderRadius: '12px',
                                          padding: '10px 12px',
                                          border: '1px solid #fef3c7',
                                          fontSize: '0.82rem',
                                          color: '#78350f',
                                          lineHeight: 1.4,
                                          display: 'flex',
                                          gap: '8px'
                                        }}
                                      >
                                        <span style={{ fontWeight: 900, color: '#d97706' }}>{qIdx + 1}.</span>
                                        <span>{q}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Bloco 4: Desafio Prático & Oração */}
                              {ch.practical_challenge && (
                                <div style={{
                                  background: '#fefce8',
                                  borderRadius: '14px',
                                  padding: '12px 14px',
                                  border: '1px solid #fef08a',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px'
                                }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#854d0e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>🎯</span>
                                    <span>Desafio Prático & Oração da Semana</span>
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: '#713f12', lineHeight: 1.45 }}>
                                    {ch.practical_challenge}
                                  </div>
                                </div>
                              )}

                              {/* Bloco 5: Mídia de Apoio */}
                              {ch.media_type !== 'NONE' && ch.media_link && (
                                <a
                                  href={ch.media_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn-pwa-secondary"
                                  style={{
                                    textDecoration: 'none',
                                    padding: '10px',
                                    fontSize: '0.80rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <span>{ch.media_type === 'VIDEO' ? '🎥 Assistir Vídeo' : '📕 Abrir Arquivo PDF'}</span>
                                </a>
                              )}

                              {/* 5. BOTÃO DE AÇÃO: CONCLUIR / REABRIR ESTUDO */}
                              <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                                {isCompleted ? (
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleCompletion(chapterId, e)}
                                    style={{
                                      width: '100%',
                                      background: '#ecfdf5',
                                      color: '#059669',
                                      border: '1.5px solid #a7f3d0',
                                      borderRadius: '14px',
                                      padding: '12px 18px',
                                      fontWeight: 800,
                                      fontSize: '0.82rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '8px',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <span>✓</span>
                                    <span>Estudo Concluído (Toque para reabrir)</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleCompletion(chapterId, e)}
                                    style={{
                                      width: '100%',
                                      background: 'linear-gradient(135deg, #10b981, #059669)',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '14px',
                                      padding: '12px 18px',
                                      fontWeight: 800,
                                      fontSize: '0.82rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '8px',
                                      boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <span>✅</span>
                                    <span>Marcar este Estudo como Concluído</span>
                                  </button>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Fallback se nenhum livro for encontrado para o escopo */
                <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed #cbd5e1' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📖</span>
                  <div style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Nenhum Estudo {studyScope === 'cell' ? 'Exclusivo da Célula' : 'Geral da Igreja'}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Alterne para a outra aba acima ou aguarde a publicação da liderança.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: LANCHES / PARTILHA (VISÃO MEMBROS & LIDERANÇA) */}
          {portalTab === 'lanches' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* 1. CARD DISCRETO E ELEGANTE DA MESA DE COMUNHÃO */}
              <div style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '16px',
                border: '1px solid var(--panel-border)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'var(--accent-primary-light)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem'
                    }}>
                      🥐
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                        Mesa de Comunhão
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Partilha de alimentos para nosso próximo encontro
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSnackModalOpen(true)}
                    style={{
                      background: 'var(--accent-primary-light)',
                      color: 'var(--accent-primary)',
                      border: 'none',
                      padding: '7px 12px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>＋</span>
                    <span>Adicionar Item</span>
                  </button>
                </div>

                {/* Resumo Discreto de Cobertura */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>🍽️</span>
                      <span>Cobertura da Mesa</span>
                    </span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>
                      {snacks.filter(s => s.confirmed || s.is_confirmed).length} de {snacks.length} confirmados ({snacks.length > 0 ? Math.round((snacks.filter(s => s.confirmed || s.is_confirmed).length / snacks.length) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${snacks.length > 0 ? (snacks.filter(s => s.confirmed || s.is_confirmed).length / snacks.length) * 100 : 0}%`,
                      height: '100%',
                      background: 'var(--accent-primary)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>

              {/* 2. FILTROS DE CATEGORIA EM PÍLULAS */}
              <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'none'
              }}>
                {[
                  { id: 'ALL', label: `Todos (${snacks.length})`, icon: '🍽️' },
                  { id: 'BEBIDAS', label: 'Bebidas', icon: '🥤' },
                  { id: 'SALGADOS', label: 'Salgados', icon: '🥟' },
                  { id: 'DOCES', label: 'Doces & Bolos', icon: '🍰' },
                  { id: 'FRUTAS', label: 'Frutas', icon: '🍉' },
                  { id: 'DESCARTAVEIS', label: 'Descartáveis', icon: '🍴' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSnackFilterCategory(cat.id)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: snackFilterCategory === cat.id ? 'var(--accent-primary)' : '#ffffff',
                      color: snackFilterCategory === cat.id ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      boxShadow: snackFilterCategory === cat.id ? '0 2px 8px rgba(15,118,110,0.25)' : 'var(--shadow-sm)',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* 3. LISTA DE ITENS DA PARTILHA */}
              {(() => {
                const filtered = snacks.filter(snack => {
                  if (snackFilterCategory === 'ALL') return true;
                  const name = (snack.item || snack.item_name || '').toLowerCase();
                  const cat = snack.category || '';
                  if (snackFilterCategory === 'BEBIDAS') {
                    return cat === 'BEBIDAS' || name.includes('refri') || name.includes('suco') || name.includes('bebida') || name.includes('água') || name.includes('café') || name.includes('chá');
                  }
                  if (snackFilterCategory === 'SALGADOS') {
                    return cat === 'SALGADOS' || name.includes('salgad') || name.includes('coxinha') || name.includes('pão') || name.includes('pao') || name.includes('sandu') || name.includes('torta') || name.includes('queijo');
                  }
                  if (snackFilterCategory === 'DOCES') {
                    return cat === 'DOCES' || name.includes('bolo') || name.includes('doce') || name.includes('brigadeiro') || name.includes('pudim');
                  }
                  if (snackFilterCategory === 'FRUTAS') {
                    return cat === 'FRUTAS' || name.includes('fruta') || name.includes('melancia') || name.includes('banana') || name.includes('uva') || name.includes('maçã');
                  }
                  if (snackFilterCategory === 'DESCARTAVEIS') {
                    return cat === 'DESCARTAVEIS' || name.includes('copo') || name.includes('guardanapo') || name.includes('prato') || name.includes('descart');
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '8px' }}>🥐</span>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                        Mesa aguardando itens
                      </div>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
                        Toque no botão abaixo para sugerir ou voluntariar um prato/bebida!
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsSnackModalOpen(true)}
                        className="btn-pwa-primary"
                        style={{ margin: '0 auto', padding: '10px 18px', fontSize: '0.80rem' }}
                      >
                        ＋ Adicionar Item Agora
                      </button>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filtered.map(snack => {
                      const isConfirmed = snack.confirmed || snack.is_confirmed;
                      const itemName = snack.item || snack.item_name || 'Item de Partilha';
                      const itemIcon = getSnackIcon(itemName);
                      const assignedPerson = snack.person || snack.member_name || snack.user_name || 'A definir';
                      const isMe = assignedPerson === user?.name || (user?.email && assignedPerson.toLowerCase().includes(user.email.split('@')[0].toLowerCase()));

                      return (
                        <div
                          key={snack.id}
                          style={{
                            background: '#ffffff',
                            borderRadius: '18px',
                            padding: '14px 16px',
                            border: isConfirmed ? '1px solid #e2e8f0' : '1px solid #fed7aa',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '14px',
                              background: isConfirmed ? '#f0fdf4' : '#fff7ed',
                              color: isConfirmed ? '#16a34a' : '#ea580c',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.4rem',
                              flexShrink: 0
                            }}>
                              {itemIcon}
                            </div>

                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main)' }}>
                                {itemName} {snack.quantity ? <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem' }}>({snack.quantity})</span> : ''}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                  🗓️ {snack.event_date || snack.scheduled_date || 'Próximo Encontro'}
                                </span>
                                <span style={{ fontSize: '0.70rem', color: '#cbd5e1' }}>•</span>
                                {isConfirmed ? (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    ✓ {assignedPerson} vai levar
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706' }}>
                                    ⏳ Aberto para voluntário
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {!isConfirmed ? (
                              <button
                                type="button"
                                onClick={() => handleVolunteerSnack(snack.id)}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '8px 14px',
                                  borderRadius: '12px',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                🙋 Eu Levo!
                              </button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isMe && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnvolunteerSnack(snack.id)}
                                    title="Desmarcar minha contribuição"
                                    style={{
                                      background: '#f1f5f9',
                                      color: 'var(--text-muted)',
                                      border: 'none',
                                      padding: '6px 10px',
                                      borderRadius: '10px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Liberar
                                  </button>
                                )}
                                <span style={{
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  padding: '5px 9px',
                                  borderRadius: '10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800
                                }}>
                                  ✓ Confirmado
                                </span>
                              </div>
                            )}

                            {isCellLeader && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSnack(snack.id)}
                                title="Excluir item da lista"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  fontSize: '0.80rem',
                                  cursor: 'pointer',
                                  padding: '4px 6px'
                                }}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ========================================================
              TAB 5: PAINEL DE GESTÃO DO LÍDER (ORGANIZADO NA CÉLULA)
              ======================================================== */}
          {portalTab === 'lideranca' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Sub-navegação do Líder */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '14px' }}>
                {[
                  { id: 'requests', label: pendingUsers.length > 0 ? `Pedidos (${pendingUsers.length})` : 'Pedidos' },
                  { id: 'members', label: `Membros (${groupMembers.length})` },
                  { id: 'lanches', label: 'Lanches' },
                  { id: 'settings', label: 'Encontro' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setLeaderSubTab(sub.id as LeaderSubTab)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: 'none',
                      background: leaderSubTab === sub.id ? '#ffffff' : 'transparent',
                      color: leaderSubTab === sub.id ? 'var(--text-main)' : 'var(--text-muted)',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      boxShadow: leaderSubTab === sub.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      textAlign: 'center'
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* SUBTAB 1: SOLICITAÇÕES DE ENTRADA PENDENTES */}
              {leaderSubTab === 'requests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Pessoas que solicitaram entrar na sua célula pelo aplicativo:
                  </div>

                  {pendingUsers.length === 0 ? (
                    <div style={{ background: '#ffffff', borderRadius: '18px', padding: '30px 20px', textAlign: 'center', border: '1px solid var(--panel-border)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                      <div style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main)' }}>
                        Nenhuma solicitação pendente
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Quando novos membros ou visitantes pedirem ingresso no app, eles aparecerão aqui para sua aprovação.
                      </div>
                    </div>
                  ) : (
                    pendingUsers.map(user => (
                      <div key={user.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #fecaca', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {user.phone ? `📱 ${user.phone}` : (user.email ? `✉️ ${user.email}` : 'Novo Membro')}
                            </div>
                          </div>
                          <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800 }}>
                            Pendente
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleApproveMember(user)}
                            style={{ flex: 1, background: '#059669', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}
                          >
                            ✓ Aprovar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRejectMember(user)}
                            style={{ background: '#f1f5f9', color: '#dc2626', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}
                          >
                            ✕ Recusar
                          </button>

                          {user.phone && (
                            <a
                              href={`https://wa.me/${user.phone.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(user.name)}!%20Vi%20sua%20solicita%C3%A7%C3%A3o%20para%20nossa%20c%C3%A9lula%20${encodeURIComponent(myGroup.name)}!`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '8px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.76rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              💬 WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUBTAB 2: MEMBROS ATIVOS DA CÉLULA */}
              {leaderSubTab === 'members' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Participantes integrados à sua célula ({groupMembers.length}):
                  </div>

                  {groupMembers.length === 0 ? (
                    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      Nenhum membro vinculado ainda. Aprove as solicitações para montar sua equipe!
                    </div>
                  ) : (
                    groupMembers.map(member => (
                      <div key={member.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                            {member.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {member.phone ? `📱 ${member.phone}` : (member.email || 'Membro')}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {member.phone && (
                            <a
                              href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ background: '#ecfdf5', color: '#059669', padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, textDecoration: 'none' }}
                            >
                              💬 Contato
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member)}
                            title="Desvincular da célula"
                            style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 8px', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUBTAB 3: LANCHES & PARTILHA (GESTÃO DIRETA DO LÍDER) */}
              {leaderSubTab === 'lanches' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Mesa de Lanches da Célula ({snacks.length} itens cadastrados)
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSnackModalOpen(true)}
                      className="btn-pwa-primary"
                      style={{ padding: '8px 14px', fontSize: '0.75rem' }}
                    >
                      ＋ Adicionar Item
                    </button>
                  </div>

                  {snacks.length === 0 ? (
                    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      Nenhum item de lanche cadastrado. Toque no botão acima para adicionar!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {snacks.map(snack => {
                        const isConfirmed = snack.confirmed || snack.is_confirmed;
                        return (
                          <div key={snack.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.4rem' }}>{getSnackIcon(snack.item || snack.item_name)}</span>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                                  {snack.item || snack.item_name} {snack.quantity ? `(${snack.quantity})` : ''}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  🗓️ {snack.event_date || snack.scheduled_date || 'Encontro'} • 👤 {snack.person || snack.member_name || snack.user_name || 'A definir'}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                background: isConfirmed ? '#ecfdf5' : '#fff7ed',
                                color: isConfirmed ? '#059669' : '#ea580c',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                fontSize: '0.70rem',
                                fontWeight: 800
                              }}>
                                {isConfirmed ? '✓ Confirmado' : '⏳ Aberto'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSnack(snack.id)}
                                title="Excluir"
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.80rem', cursor: 'pointer', padding: '4px' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: CONFIGURAÇÃO RÁPIDA DO ENCONTRO */}
              {leaderSubTab === 'settings' && (
                <form onSubmit={handleSaveMeetingInfo} style={{ background: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                    ⚙️ Informações do Encontro Semanal
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Dia da Semana
                    </label>
                    <input 
                      type="text" 
                      className="input-pwa"
                      placeholder="Ex: Toda Quarta-feira"
                      value={editMeetingDay}
                      onChange={e => setEditMeetingDay(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Horário do Encontro
                    </label>
                    <input 
                      type="text" 
                      className="input-pwa"
                      placeholder="Ex: 20:00"
                      value={editMeetingTime}
                      onChange={e => setEditMeetingTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Endereço / Casa do Anfitrião
                    </label>
                    <input 
                      type="text" 
                      className="input-pwa"
                      placeholder="Ex: Rua das Palmeiras, 120 (Apto 402)"
                      value={editAddress}
                      onChange={e => setEditAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      WhatsApp de Contato da Liderança
                    </label>
                    <input 
                      type="text" 
                      className="input-pwa"
                      placeholder="Ex: 48999999999"
                      value={editWhatsapp}
                      onChange={e => setEditWhatsapp(e.target.value)}
                    />
                  </div>

                  {saveSuccess && (
                    <div style={{ background: '#ecfdf5', color: '#059669', padding: '8px 12px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 800, textAlign: 'center' }}>
                      ✓ Dados do encontro atualizados com sucesso!
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn-pwa-primary"
                    disabled={savingMeeting}
                    style={{ marginTop: '6px', padding: '10px', fontSize: '0.82rem' }}
                  >
                    {savingMeeting ? 'Salvando...' : 'Salvar Alterações do Encontro'}
                  </button>
                </form>
              )}

            </div>
          )}

        </div>
      ) : (
        /* ========================================================
            MODO 2: EXPLORAR / DISCOVER CÉLULAS
            ======================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="text"
            className="input-pwa"
            placeholder="Buscar por bairro, nome ou líder..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          {filteredCells.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>👥</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                Nenhuma célula cadastrada
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0', lineHeight: 1.4 }}>
                As células, redes e grupos caseiros cadastrados no Portal Web aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '16px' }}>
              {filteredCells.map(cell => (
                <div key={cell.id} style={{ background: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                        {cell.network || 'Geral'}
                      </span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                        {cell.name}
                      </h4>
                    </div>
                    {cell.neighborhood && (
                      <span style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                        📍 {cell.neighborhood}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    👤 <strong>Líder:</strong> {cell.leader || cell.leader_name || 'Pastoral'}
                  </div>

                  <button 
                    type="button" 
                    className="btn-pwa-primary" 
                    onClick={() => handleRequestJoin(cell.id)}
                    style={{ marginTop: 'auto', padding: '10px', fontSize: '0.80rem' }}
                  >
                    {pendingGroupId === cell.id ? '✓ Solicitação Enviada' : 'Quero Participar desta Célula'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL / BOTTOM DRAWER DE ADICIONAR ITEM À PARTILHA
          ======================================================== */}
      {isSnackModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: '0'
        }}>
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '500px',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px)) 20px',
            maxHeight: '88vh',
            overflowY: 'auto',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header do Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem'
                }}>
                  🥐
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    Mesa de Comunhão
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Adicionar item ou sugerir para a célula
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSnackModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '0.90rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Sugestões Rápidas em Pílulas com 1 Toque */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                ✨ Sugestões Rápidas (1 Toque para Preencher):
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                {SNACK_QUICK_SUGGESTIONS.map((sug, sIdx) => {
                  const isSelected = newSnackItem === sug.name;
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleSelectQuickSuggestion(sug)}
                      style={{
                        background: isSelected ? 'var(--accent-primary)' : '#f8fafc',
                        color: isSelected ? '#ffffff' : 'var(--text-main)',
                        border: isSelected ? '1px solid var(--accent-primary)' : '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '7px 11px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{sug.icon}</span>
                      <span>{sug.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formulário de Cadastro */}
            <form onSubmit={handleCreateSnack} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Nome do Item */}
              <div>
                <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Nome do Alimento / Bebida *
                </label>
                <input
                  type="text"
                  className="input-pwa"
                  placeholder="Ex: Bolo de Cenoura, Salgadinhos, Suco..."
                  value={newSnackItem}
                  onChange={e => setNewSnackItem(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '0.86rem' }}
                />
              </div>

              {/* Quantidade & Data do Encontro */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Quantidade Sugerida
                  </label>
                  <input
                    type="text"
                    className="input-pwa"
                    placeholder="Ex: 2 garrafas, 1 cento"
                    value={newSnackQty}
                    onChange={e => setNewSnackQty(e.target.value)}
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Data do Encontro *
                  </label>
                  <input
                    type="date"
                    className="input-pwa"
                    value={newSnackDate}
                    onChange={e => setNewSnackDate(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Quem vai levar? */}
              <div>
                <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Quem vai levar este item?
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '12px'
                }}>
                  <button
                    type="button"
                    onClick={() => setNewSnackAssigneeMode('me')}
                    style={{
                      padding: '9px 8px',
                      borderRadius: '9px',
                      border: 'none',
                      background: newSnackAssigneeMode === 'me' ? '#ffffff' : 'transparent',
                      color: newSnackAssigneeMode === 'me' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      boxShadow: newSnackAssigneeMode === 'me' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    🙋 Eu mesmo levo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSnackAssigneeMode('open')}
                    style={{
                      padding: '9px 8px',
                      borderRadius: '9px',
                      border: 'none',
                      background: newSnackAssigneeMode === 'open' ? '#ffffff' : 'transparent',
                      color: newSnackAssigneeMode === 'open' ? '#d97706' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      boxShadow: newSnackAssigneeMode === 'open' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    ⏳ Deixar em Aberto
                  </button>
                </div>

                {/* Seção extra se for Líder e quiser atribuir a um membro específico */}
                {isCellLeader && groupMembers.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setNewSnackAssigneeMode('member')}
                      style={{
                        background: newSnackAssigneeMode === 'member' ? 'var(--accent-primary-light)' : 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      👥 Ou atribuir a um membro específico...
                    </button>

                    {newSnackAssigneeMode === 'member' && (
                      <select
                        className="input-pwa"
                        value={newSnackAssignedMemberId}
                        onChange={e => setNewSnackAssignedMemberId(e.target.value)}
                        style={{ width: '100%', marginTop: '6px', fontSize: '0.82rem' }}
                      >
                        <option value="">Selecione um membro...</option>
                        {groupMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Botão Salvar */}
              <button
                type="submit"
                disabled={isAddingSnack || !newSnackItem.trim()}
                className="btn-pwa-primary"
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  borderRadius: '16px',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.25)'
                }}
              >
                {isAddingSnack ? 'Salvando na Escala...' : '✨ Adicionar à Mesa de Comunhão'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
