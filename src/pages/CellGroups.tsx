import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { getYoutubeEmbedUrl } from '../components/LivePlayerModal';
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
  fetchCurrentMember,
  recordCellMeeting,
  fetchCellMeetings,
  fetchCellMeetingDetails
} from '../services/api';
import { CellsMapView } from '../components/CellsMapView';
import { BottomSheet } from '../components/BottomSheet';

const API_URL = import.meta.env.VITE_API_URL || 'https://566n5qz7te.execute-api.us-east-2.amazonaws.com';

interface Chapter {
  id?: string;
  chapter_number: number;
  title: string;
  verse_reference?: string;
  icebreaker?: string;
  content_text?: string;
  content_body?: string;
  discussion_questions?: string[] | string;
  questions?: string[] | string;
  practical_challenge?: string;
  media_type?: 'NONE' | 'VIDEO' | 'PDF';
  media_link?: string;
  media_url?: string;
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
  focus?: string;
  target_audience?: string;
  leader?: string;
  leader_name?: string;
  leader_id?: string;
  host?: string;
  neighborhood?: string;
  meeting_day?: string;
  meeting_time?: string;
  day_time?: string;
  whatsapp?: string;
  whatsapp_contact?: string;
  address?: string;
  description?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  cover_url?: string;
  image_url?: string;
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
  verse?: string;
  verse_reference?: string;
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
  phone?: string;
  id: string;
  name: string;
  email?: string;
  role?: string;
  created_at?: string;
}

type PortalTab = 'dashboard' | 'mural' | 'estudos' | 'lanches' | 'lideranca';
type LeaderSubTab = 'attendance' | 'requests' | 'members' | 'lanches' | 'settings';

export const CellGroups: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { branding } = useBranding();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [cells, setCells] = useState<CellGroup[]>([]);
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'portal' | 'discover'>('discover');
  const urlMap = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('map') === 'true';
  const urlCellTab = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('cell_tab') as PortalTab) : null;
  const [myGroupId, setMyGroupId] = useState<string | null>(null);
  const [portalTab, setPortalTab] = useState<PortalTab>(urlCellTab || 'dashboard');
  const [isCellLeader, setIsCellLeader] = useState(false);
  
  // Discover State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('ALL');
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(urlMap);
  const [selectedCellDetail, setSelectedCellDetail] = useState<CellGroup | null>(null);
  const [readingChapter, setReadingChapter] = useState<Chapter | null>(null);

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
  const [leaderSubTab, setLeaderSubTab] = useState<LeaderSubTab>('attendance');
  const [pendingUsers, setPendingUsers] = useState<CellMember[]>([]);
  const [groupMembers, setGroupMembers] = useState<CellMember[]>([]);
  const [, setLoadingDetails] = useState(false);

  // Chamada e Frequência Semanal (Attendance)
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [studyTopic, setStudyTopic] = useState('');
  const [offeringsAmount, setOfferingsAmount] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [attendeesStatus, setAttendeesStatus] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'JUSTIFIED'>>({});
  const [attendeesJustification, setAttendeesJustification] = useState<Record<string, string>>({});
  const [visitorsList, setVisitorsList] = useState<Array<{ name: string; phone: string }>>([]);
  const [numericVisitorCount, setNumericVisitorCount] = useState<number>(0);
  const [showAdvancedMeetingDetails, setShowAdvancedMeetingDetails] = useState<boolean>(false);
  const [newVisitorName, setNewVisitorName] = useState('');
  const [newVisitorPhone, setNewVisitorPhone] = useState('');
  const [showAddVisitor, setShowAddVisitor] = useState(false);
  const [isRecordingMeeting, setIsRecordingMeeting] = useState(false);
  const [meetingsHistory, setMeetingsHistory] = useState<any[]>([]);
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [showTopicNotes, setShowTopicNotes] = useState<boolean>(false);
  const [isCellHeaderExpanded, setIsCellHeaderExpanded] = useState<boolean>(false);

  // Form edit meeting
  const [editMeetingDay, setEditMeetingDay] = useState('');
  const [editMeetingTime, setEditMeetingTime] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modal de Relatório Detalhado de Encontro Passado
  const [viewingMeetingReport, setViewingMeetingReport] = useState<any | null>(null);
  const [loadingReportDetails, setLoadingReportDetails] = useState<boolean>(false);

  const getInitials = (name?: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatMeetingShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const weekdays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
      const dayName = weekdays[d.getDay()] || 'qui';
      const formattedDay = String(day).padStart(2, '0');
      const formattedMonth = String(month).padStart(2, '0');
      return `${dayName}, ${formattedDay}/${formattedMonth}`;
    } catch {
      return dateStr;
    }
  };

  const getDayOfWeekIndex = (dayName?: string): number | null => {
    if (!dayName) return null;
    const d = dayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (d.includes('seg')) return 1;
    if (d.includes('ter')) return 2;
    if (d.includes('qua')) return 3;
    if (d.includes('qui')) return 4;
    if (d.includes('sex')) return 5;
    if (d.includes('sab')) return 6;
    if (d.includes('dom')) return 0;
    return null;
  };

  // Calcula a data exata da próxima reunião baseando-se no dia da semana configurado na célula
  const calculateNextMeetingDate = (meetingDay?: string): { dateStr: string; displayLabel: string } => {
    const now = new Date();
    const targetDayIdx = getDayOfWeekIndex(meetingDay);
    if (targetDayIdx === null) {
      const todayStr = now.toISOString().split('T')[0];
      return { dateStr: todayStr, displayLabel: formatMeetingShortDate(todayStr) };
    }
    const currentDayIdx = now.getDay();
    let diff = (targetDayIdx - currentDayIdx + 7) % 7;
    // Se diff for 0 (hoje é o dia do encontro), pode ser hoje mesmo!
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    const weekdaysCapitalized = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayLabel = weekdaysCapitalized[targetDayIdx];
    return { dateStr, displayLabel: `${dayLabel}, ${d}/${m}` };
  };

  // Gera as opções de datas reais dos encontros da célula para a seleção na chamada
  const getMeetingDateOptions = (meetingDay?: string) => {
    const targetDayIdx = getDayOfWeekIndex(meetingDay);
    const now = new Date();
    const options: Array<{ date: string; label: string; badge: string }> = [];

    if (targetDayIdx === null) {
      const todayStr = now.toISOString().split('T')[0];
      options.push({ date: todayStr, label: `Hoje (${formatMeetingShortDate(todayStr)})`, badge: 'Hoje' });
      return options;
    }

    const nextDiff = (targetDayIdx - now.getDay() + 7) % 7;
    const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + nextDiff);
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
    
    options.push({
      date: nextStr,
      label: `${formatMeetingShortDate(nextStr)}`,
      badge: nextDiff === 0 ? 'Hoje' : 'Próximo'
    });

    for (let i = 1; i <= 3; i++) {
      const pastDiff = nextDiff - (i * 7);
      const pastDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + pastDiff);
      const pastStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
      options.push({
        date: pastStr,
        label: `${formatMeetingShortDate(pastStr)}`,
        badge: i === 1 ? 'Último' : `${i} sem atrás`
      });
    }

    return options;
  };

  // Navegação semanal para a chamada (Semana anterior / Próxima semana)
  const handleStepMeetingDate = (deltaDays: number) => {
    try {
      const parts = meetingDate.split('-');
      if (parts.length !== 3) return;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const curr = new Date(y, m, d);
      curr.setDate(curr.getDate() + deltaDays);
      const newY = curr.getFullYear();
      const newM = String(curr.getMonth() + 1).padStart(2, '0');
      const newD = String(curr.getDate()).padStart(2, '0');
      setMeetingDate(`${newY}-${newM}-${newD}`);
    } catch {
      // fallback silencioso
    }
  };

  // Formatação rica e elegante da data selecionada na chamada
  const getMeetingDateRichInfo = (dateStr: string, meetingDay?: string) => {
    if (!dateStr) return { title: 'Data não definida', badge: 'Data' };
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return { title: dateStr, badge: 'Data' };
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const dayLabel = weekdays[dt.getDay()] || '';
      const monthLabel = months[dt.getMonth()] || '';
      
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const nextMeetingStr = calculateNextMeetingDate(meetingDay).dateStr;

      let badge = 'Encontro';
      if (dateStr === todayStr) {
        badge = 'Hoje';
      } else if (dateStr === nextMeetingStr) {
        badge = 'Próximo Encontro';
      } else if (dateStr < todayStr) {
        badge = 'Encontro Anterior';
      } else {
        badge = 'Encontro Futuro';
      }

      return {
        dayOfWeek: dayLabel,
        formattedShort: `${d} de ${monthLabel}`,
        title: `${dayLabel}, ${d} de ${monthLabel}`,
        badge
      };
    } catch {
      return { title: dateStr, badge: 'Encontro' };
    }
  };

  const formatNextMeetingLabel = (meetingDay?: string, meetingTime?: string) => {
    const next = calculateNextMeetingDate(meetingDay);
    const timeFormatted = meetingTime ? meetingTime.replace(':00', 'h') : '20h';
    return `${next.displayLabel} · ${timeFormatted}`;
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

  const getAuthorColor = (name: string, isDarkTheme: boolean) => {
    const colorsLight = ['#0284c7', '#7c3aed', '#059669', '#ea580c', '#db2777', '#0891b2', '#4f46e5'];
    const colorsDark = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#22d3ee', '#818cf8'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const idx = Math.abs(hash) % colorsLight.length;
    return isDarkTheme ? colorsDark[idx] : colorsLight[idx];
  };

  const formatBubbleTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    } catch {
      return '';
    }
  };

  const formatChapterDateAndSchedule = (ch: Chapter, idx: number) => {
    let raw = (ch.scheduled_date || '').trim();
    let validDate: Date | null = null;

    if (raw && !raw.startsWith('0000') && raw !== 'null' && raw !== 'undefined') {
      const clean = raw.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const testD = new Date(y, m, d);
        if (!isNaN(testD.getTime())) {
          validDate = testD;
        }
      }
    }

    // Se estiver zerado, null ou 00000: projeta datas a partir de hoje (+1 semana por capítulo)
    if (!validDate) {
      const today = new Date();
      validDate = new Date(today);
      validDate.setDate(today.getDate() + (idx * 7));
    }

    const day = String(validDate.getDate()).padStart(2, '0');
    const month = String(validDate.getMonth() + 1).padStart(2, '0');
    const year = validDate.getFullYear();
    const dateFormatted = `${day}/${month}/${year}`;

    // Adiciona horário do encontro se configurado na célula
    const timeInfo = (selectedBook?.target_group_id && myGroup?.meeting_time) 
      ? ` • ⏰ ${myGroup.meeting_time}` 
      : '';

    return `🗓️ ${dateFormatted}${timeInfo}`;
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
  }, [user, isAuthenticated, branding.organization_id]);

  // Preenchimento inteligente do tema com o livro ou estudo ativo
  useEffect(() => {
    if (!studyTopic) {
      const activeTopic = selectedBook?.title || study?.title || '';
      if (activeTopic) {
        setStudyTopic(activeTopic);
      }
    }
  }, [selectedBook, study, studyTopic]);

  const handleOpenMeetingReport = async (meeting: any) => {
    setLoadingReportDetails(true);
    setViewingMeetingReport(meeting);
    try {
      if (myGroup?.id && meeting?.id) {
        const fullDetails = await fetchCellMeetingDetails(myGroup.id, meeting.id);
        if (fullDetails) {
          setViewingMeetingReport(fullDetails);
        }
      }
    } catch (e) {
      console.error('Erro ao abrir relatório da reunião:', e);
    } finally {
      setLoadingReportDetails(false);
    }
  };

  const loadAllData = async () => {
    try {
      // Busca grupos e perfil do membro simultaneamente em paralelo
      const [groupList, member] = await Promise.all([
        fetchCellGroups(branding.organization_id),
        (user?.email || isAuthenticated) ? fetchCurrentMember() : Promise.resolve(null)
      ]);

      const cellsArray = Array.isArray(groupList) ? groupList : [];
      setCells(cellsArray);

      let assignedGroupId: string | null = null;
      let userRole = 'Membro';

      if (member) {
        setCurrentMember(member);
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

      // Se ainda não tiver grupo atribuído, verifica se o usuário é líder de alguma célula
      if (!assignedGroupId && cellsArray.length > 0) {
        const ledCell = cellsArray.find(c => 
          (c.leader_id && member?.id && c.leader_id === member.id) ||
          (c.leader_name && user?.name && c.leader_name.toLowerCase() === user.name.toLowerCase()) ||
          (c.leader && user?.name && c.leader.toLowerCase() === user.name.toLowerCase()) ||
          (user?.email && user.email.toLowerCase() === 'rfsena@icloud.com')
        );
        if (ledCell) {
          assignedGroupId = ledCell.id;
          if (user?.email) {
            localStorage.setItem(`faithhub_my_cell_group_id_${user.email.toLowerCase()}`, ledCell.id);
          }
        }
      }

      // Força portal ou discover se especificado na URL para exportação de criativos
      const urlCellPortal = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('cell_portal') : null;
      if (urlCellPortal === 'true' && cellsArray.length > 0) {
        assignedGroupId = cellsArray[0].id;
      } else if (urlCellPortal === 'false') {
        assignedGroupId = null;
      }

      // Fallback local se necessário
      if (!assignedGroupId && user?.email && urlCellPortal !== 'false') {
        assignedGroupId = localStorage.getItem(`faithhub_my_cell_group_id_${user.email.toLowerCase()}`);
      }

      const matchedGroup = cellsArray.find(c => c.id === assignedGroupId);

      if (matchedGroup) {
        setMyGroupId(matchedGroup.id);
        setViewMode('portal');

        const roleUpper = userRole.toUpperCase();
        const isLeader = Boolean(
          (matchedGroup.leader_id && member?.id && matchedGroup.leader_id === member.id) ||
          (matchedGroup.leader_name && user?.name && matchedGroup.leader_name.toLowerCase() === user.name.toLowerCase()) ||
          (matchedGroup.leader && user?.name && matchedGroup.leader.toLowerCase() === user.name.toLowerCase()) ||
          (user?.email && user.email.toLowerCase() === 'rfsena@icloud.com') ||
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
          // Expande apenas o primeiro capítulo que ainda estiver pendente (se todos concluídos, deixa todos recolhidos)
          const firstPending = fullBook.chapters.find((ch: Chapter, idx: number) => !mergedCompletions.includes(ch.id || String(idx)));
          if (firstPending) {
            setExpandedChapterIds([firstPending.id || '0']);
          } else {
            setExpandedChapterIds([]);
          }
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
        const firstPending = fullBook.chapters.find((ch: Chapter, idx: number) => !mergedCompletions.includes(ch.id || String(idx)));
        if (firstPending) {
          setExpandedChapterIds([firstPending.id || '0']);
        } else {
          setExpandedChapterIds([]);
        }
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
    
    // Se está sendo concluído agora, RECOLHE automaticamente para economizar espaço
    if (!isCurrentlyCompleted) {
      setExpandedChapterIds(prev => prev.filter(id => id !== chapterId));
    }

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
          const firstPending = defaultBook.chapters.find((ch: Chapter, idx: number) => !merged.includes(ch.id || String(idx)));
          if (firstPending) {
            setExpandedChapterIds([firstPending.id || '0']);
          } else {
            setExpandedChapterIds([]);
          }
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
      if (Array.isArray(details.members)) {
        setGroupMembers(details.members);
        const initStatus: Record<string, 'PRESENT' | 'ABSENT' | 'JUSTIFIED'> = {};
        details.members.forEach((m: any) => {
          initStatus[m.id] = 'PRESENT';
        });
        setAttendeesStatus(initStatus);
      }
      fetchCellMeetings(groupId).then(res => {
        if (Array.isArray(res)) setMeetingsHistory(res);
      });
      setEditMeetingDay(details.meeting_day || '');
      setEditMeetingTime(details.meeting_time || '');
      setEditAddress(details.address || '');
      setEditWhatsapp(details.whatsapp_contact || details.whatsapp || '');
      setEditCoverUrl(details.cover_url || details.image_url || '');
    } else {
      const activeCell = (groupList || cells).find(c => c.id === groupId);
      if (activeCell) {
        setEditMeetingDay(activeCell.meeting_day || '');
        setEditMeetingTime(activeCell.meeting_time || '');
        setEditAddress(activeCell.address || '');
        setEditWhatsapp(activeCell.whatsapp || activeCell.whatsapp_contact || '');
        setEditCoverUrl(activeCell.cover_url || activeCell.image_url || '');
      }
    }
  };

  const myGroup = cells.find(g => g.id === myGroupId) || cells[0];

  // Pré-seleção da data da reunião com base no dia do encontro da célula
  // (precisa ficar APÓS a declaração de myGroup para evitar ReferenceError/TDZ)
  const myGroupMeetingDay = myGroup?.meeting_day;
  useEffect(() => {
    if (myGroupMeetingDay) {
      setMeetingDate(calculateNextMeetingDate(myGroupMeetingDay).dateStr);
    }
  }, [myGroupMeetingDay]);

  // Controles de Scroll Interno e Auto-Scroll para o Fim do Mural (Estilo WhatsApp)
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    } else if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Auto-scroll instantâneo/suave para a última mensagem ao alternar para a aba Mural
  useEffect(() => {
    if (portalTab === 'mural') {
      const t1 = setTimeout(() => scrollToBottom('auto'), 40);
      const t2 = setTimeout(() => scrollToBottom('smooth'), 180);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [portalTab]);

  // Auto-scroll ao receber ou carregar mensagens no Mural
  useEffect(() => {
    if (portalTab === 'mural' && posts.length > 0) {
      const timer = setTimeout(() => scrollToBottom('smooth'), 80);
      return () => clearTimeout(timer);
    }
  }, [posts.length, portalTab]);

  // Auto-scroll adaptativo ao expandir ou recolher os detalhes da célula
  useEffect(() => {
    if (portalTab === 'mural') {
      const timer = setTimeout(() => scrollToBottom('smooth'), 280);
      return () => clearTimeout(timer);
    }
  }, [isCellHeaderExpanded, portalTab]);

  // Travar o scroll da página externa ao entrar no Mural, mantendo a tela 100% fixa (estilo WhatsApp)
  useEffect(() => {
    if (viewMode === 'portal' && portalTab === 'mural') {
      const originalOverflow = document.body.style.overflow;
      const originalOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.overscrollBehavior = originalOverscroll;
      };
    }
  }, [viewMode, portalTab]);

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

  const handleEnterCell = async (cell: CellGroup) => {
    setMyGroupId(cell.id);
    if (user?.email) {
      localStorage.setItem(`faithhub_my_cell_group_id_${user.email.toLowerCase()}`, cell.id);
    }
    const isLeaderOfThisCell = Boolean(
      (cell.leader_id && currentMember?.id && cell.leader_id === currentMember.id) ||
      (cell.leader_name && user?.name && cell.leader_name.toLowerCase() === user.name.toLowerCase()) ||
      (cell.leader && user?.name && cell.leader.toLowerCase() === user.name.toLowerCase()) ||
      (user?.email && user.email.toLowerCase() === 'rfsena@icloud.com')
    );
    setIsCellLeader(isLeaderOfThisCell || ['ADMIN', 'PASTOR', 'SUPERADMIN', 'LEADER', 'LÍDER'].includes((currentMember?.role || '').toUpperCase()));
    setViewMode('portal');
    await loadGroupSpecifics(cell.id, cells);
  };

  const handleOpenWhatsApp = (cell: CellGroup) => {
    const phone = (cell.whatsapp || cell.whatsapp_contact || '').replace(/\D/g, '');
    if (!phone) return;
    const cleanNumber = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(`Olá, gostaria de informações sobre a célula ${cell.name}!`)}`, '_blank');
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
    setTimeout(() => {
      scrollToBottom('smooth');
    }, 60);
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

  const handleToggleAttendeeStatus = (memberId: string, status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED') => {
    setAttendeesStatus(prev => ({
      ...prev,
      [memberId]: status
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, 'PRESENT'> = {};
    groupMembers.forEach(m => {
      updated[m.id] = 'PRESENT';
    });
    setAttendeesStatus(updated);
  };

  const handleAddVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitorName.trim()) return;
    setVisitorsList(prev => [...prev, { name: newVisitorName.trim(), phone: newVisitorPhone.trim() }]);
    setNewVisitorName('');
    setNewVisitorPhone('');
    setShowAddVisitor(false);
  };

  const handleRemoveVisitor = (index: number) => {
    setVisitorsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveMeeting = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!myGroupId || isRecordingMeeting) return;
    setIsRecordingMeeting(true);
    try {
      // Membros marcados ou ausentes por padrão
      const attendeesPayload = groupMembers.map(m => ({
        member_id: m.id,
        status: attendeesStatus[m.id] || 'ABSENT',
        justification: attendeesJustification[m.id] || undefined
      }));

      // Visitantes detalhados com nome
      visitorsList.forEach(v => {
        attendeesPayload.push({
          visitor_name: v.name,
          visitor_phone: v.phone,
          status: 'PRESENT' as const
        } as any);
      });

      // Quantidade de visitantes anônimos via stepper numérico
      const extraVisitors = Math.max(0, numericVisitorCount - visitorsList.length);
      for (let i = 1; i <= extraVisitors; i++) {
        attendeesPayload.push({
          visitor_name: `Visitante ${visitorsList.length + i}`,
          status: 'PRESENT' as const
        } as any);
      }

      // Converte ofertas no formato "85,00" ou "85"
      const parsedOfferings = offeringsAmount
        ? parseFloat(offeringsAmount.replace(/\./g, '').replace(',', '.'))
        : 0;

      const res = await recordCellMeeting(myGroupId, {
        meeting_date: meetingDate,
        study_topic: studyTopic || undefined,
        offerings_amount: !isNaN(parsedOfferings) ? parsedOfferings : 0,
        notes: meetingNotes || undefined,
        attendees: attendeesPayload
      });

      if (res) {
        alert(`✓ Relatório da reunião enviado com sucesso!\nPresentes: ${res.present_count} | Ausentes: ${res.absent_count} | Visitantes: ${res.visitor_count}`);
        setVisitorsList([]);
        setNumericVisitorCount(0);
        setOfferingsAmount('');
        setMeetingNotes('');
        const updated = await fetchCellMeetings(myGroupId);
        if (Array.isArray(updated)) setMeetingsHistory(updated);
      } else {
        alert('Erro ao registrar a reunião. Tente novamente.');
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor.');
    } finally {
      setIsRecordingMeeting(false);
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
      whatsapp_contact: editWhatsapp,
      cover_url: editCoverUrl,
      image_url: editCoverUrl
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
        whatsapp_contact: editWhatsapp,
        cover_url: editCoverUrl,
        image_url: editCoverUrl
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

  const isMuralView = viewMode === 'portal' && portalTab === 'mural';

  return (
    <div 
      className="pwa-content animate-fade-in" 
      style={{ 
        padding: isMuralView ? '6px 12px 0 12px' : '16px 16px 90px 16px',
        height: isMuralView 
          ? 'calc(100dvh - 60px - var(--bottom-nav-height, 68px) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 12px) - 6px)' 
          : 'auto',
        maxHeight: isMuralView 
          ? 'calc(100dvh - 60px - var(--bottom-nav-height, 68px) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 12px) - 6px)' 
          : 'none',
        overflow: isMuralView ? 'hidden' : 'visible',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      
      {/* Header com Switch entre "Minha Célula" e "Explorar Células" (Apenas em modo Discover) */}
      {viewMode === 'discover' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '1.25rem', margin: 0 }}>Células & Redes</h2>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Encontre uma célula perto de você
            </p>
          </div>

          {cells.length > 0 && myGroupId && (
            <button 
              type="button" 
              onClick={() => setViewMode('portal')}
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
              🏠 Minha Célula
            </button>
          )}
        </div>
      )}

      {/* ========================================================
          MODO 1: PORTAL CONECTADO DA MINHA CÉLULA (SUB-APP)
          ======================================================== */}
      {viewMode === 'portal' && myGroup ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: isMuralView ? '6px' : '12px',
          flex: isMuralView ? 1 : 'none',
          minHeight: 0,
          overflow: isMuralView ? 'hidden' : 'visible'
        }}>
          
          {/* Barra Superior Menor da Célula com Expansão de Detalhes ao Clicar */}
          {portalTab !== 'lideranca' && (
            <div 
              onClick={() => setIsCellHeaderExpanded(prev => !prev)}
              style={{
                flexShrink: 0,
                background: (myGroup.cover_url || myGroup.image_url)
                  ? `linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%), url(${myGroup.cover_url || myGroup.image_url}) center/cover no-repeat`
                  : (isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'),
                color: '#ffffff',
                borderRadius: '18px',
                padding: isCellHeaderExpanded ? '16px 16px 14px 16px' : '12px 16px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {/* Linha Principal do Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '2px'
                  }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                    <span>Célula Conectada • {myGroup.network || 'Geral'}</span>
                    <span style={{ fontSize: '0.62rem', color: '#cbd5e1', opacity: 0.8, marginLeft: '2px' }}>
                      {isCellHeaderExpanded ? '▴ Recolher' : '▾ Ver Detalhes'}
                    </span>
                  </div>
                  <h3 style={{
                    fontSize: isCellHeaderExpanded ? '1.25rem' : '1.15rem',
                    fontWeight: 900,
                    margin: 0,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {myGroup.name}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {cells.length > 1 && (
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewMode('discover');
                      }}
                      title="Explorar outras células"
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        backdropFilter: 'blur(8px)',
                        flexShrink: 0
                      }}
                    >
                      🔍 Trocar
                    </button>
                  )}
                  <span style={{ fontSize: '0.80rem', color: '#94a3b8', transform: isCellHeaderExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                    ▼
                  </span>
                </div>
              </div>

              {/* Informações Detalhadas da Célula (Expandido no toque) */}
              {isCellHeaderExpanded && (
                <div 
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'rgba(255, 255, 255, 0.14)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    marginTop: '2px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👤</span>
                    <span><strong>Liderança:</strong> {myGroup.leader || myGroup.leader_name || 'Pastoral'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🗓️</span>
                    <span><strong>Encontro:</strong> {myGroup.meeting_day ? `${myGroup.meeting_day} às ${myGroup.meeting_time || '20:00'}` : (myGroup.day_time || 'A definir')}</span>
                  </div>
                  {myGroup.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📍</span>
                      <span><strong>Endereço:</strong> {myGroup.address} {myGroup.neighborhood ? `(${myGroup.neighborhood})` : ''}</span>
                    </div>
                  )}
                  {myGroup.target_audience && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🎯</span>
                      <span><strong>Público:</strong> {myGroup.target_audience}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Abas de Navegação Interna da Célula (Ocultas na tela exclusiva do líder) */}
          {portalTab !== 'lideranca' && (
            <div 
              className="no-scrollbar" 
              style={{ 
                flexShrink: 0,
                display: 'flex', 
                gap: '8px', 
                overflowX: 'auto', 
                padding: '2px 2px 4px 2px', 
                WebkitOverflowScrolling: 'touch' 
              }}
            >
              {[
                { id: 'dashboard', icon: '📊', label: 'Início' },
                { id: 'mural', icon: '💬', label: 'Mural' },
                { id: 'estudos', icon: '📖', label: 'Estudos' },
                { id: 'lanches', icon: '☕', label: 'Partilha' },
                ...(isCellLeader ? [{ 
                  id: 'lideranca', 
                  icon: '🛡️',
                  label: pendingUsers.length > 0 ? `Parte Gerencial (${pendingUsers.length})` : 'Parte Gerencial' 
                }] : [])
              ].map(tab => {
                const isActive = portalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPortalTab(tab.id as PortalTab)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '12px',
                      border: isActive ? '1.5px solid var(--accent-primary)' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'var(--panel-border)'}`,
                      background: isActive 
                        ? 'var(--accent-primary-light)' 
                        : (tab.id === 'lideranca' && pendingUsers.length > 0 ? (isDark ? 'rgba(239, 68, 68, 0.20)' : '#fef2f2') : (isDark ? 'var(--bg-card)' : '#ffffff')),
                      color: isActive 
                        ? 'var(--accent-primary)' 
                        : (tab.id === 'lideranca' && pendingUsers.length > 0 ? (isDark ? '#f87171' : '#dc2626') : 'var(--text-main)'),
                      fontWeight: isActive ? 900 : 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

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

              {/* Atalho de Chamada Rápida para o Líder de Célula */}
              {isCellLeader && (
                <div 
                  onClick={() => { setPortalTab('lideranca'); setLeaderSubTab('attendance'); }}
                  style={{
                    background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)',
                    border: '1.5px solid #99f6e4',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 6px rgba(15, 118, 110, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: '#ccfbf1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem'
                    }}>
                      📋
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f766e' }}>
                        Chamada da Reunião Semanal
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#115e59', marginTop: '2px' }}>
                        Registre presenças em 30s e alimente o Radar Pastoral
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f766e', background: '#e6fffa', padding: '6px 12px', borderRadius: '10px' }}>
                    Fazer Chamada ➔
                  </span>
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

          {/* TAB 2: MURAL - FEED OTIMIZADO VERTICALMENTE COM ROLAGEM INTERNA */}
          {portalTab === 'mural' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              gap: '6px',
              overflow: 'hidden'
            }}>
              
              {/* Chat Container estilo WhatsApp Wallpaper - Termina rigorosamente ANTES do campo de envio */}
              <div 
                ref={chatScrollRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  background: isDark ? '#0b141a' : '#efeae2',
                  backgroundImage: isDark 
                    ? 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)' 
                    : 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                  borderRadius: '20px',
                  padding: '14px 12px 10px 12px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  boxShadow: isDark ? 'inset 0 2px 6px rgba(0,0,0,0.5)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                }}
              >
                {/* Feed de Balões */}
                {posts.length === 0 ? (
                  <div style={{
                    alignSelf: 'center',
                    background: isDark ? 'rgba(32, 44, 51, 0.85)' : '#ffffff',
                    borderRadius: '14px',
                    padding: '24px 18px',
                    textAlign: 'center',
                    border: isDark ? '1px dashed rgba(255, 255, 255, 0.15)' : '1px dashed #cbd5e1',
                    maxWidth: '85%',
                    margin: '30px auto'
                  }}>
                    <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '6px' }}>🕊️</span>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)', marginBottom: '3px' }}>
                      Nenhuma mensagem no mural ainda
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', margin: 0 }}>
                      Envie um recado, gratidão, versículo ou aviso para sua célula no campo abaixo!
                    </p>
                  </div>
                ) : (
                  posts.map((p) => {
                    const authorDisplayName = p.author_name || p.author || 'Membro';
                    const isCurrentUser = Boolean(
                      (user?.name && authorDisplayName.toLowerCase() === user.name.toLowerCase()) ||
                      (user?.email && p.author_id === user.userId)
                    );
                    const isLeaderPost = p.author_role === 'Líder' || p.author_role === 'LEADER' || p.author_role === 'PASTOR' || p.author_role === 'SUPERADMIN';
                    const reactionsObj = p.reactions || {};
                    const reactionKeys = Object.keys(reactionsObj);
                    const effectiveUserId = user?.userId || user?.email || 'anonymous';
                    const bubbleTime = formatBubbleTime(p.created_at) || formatPostTime(p.created_at);
                    const authorColor = getAuthorColor(authorDisplayName, isDark);

                    return (
                      <div
                        key={p.id}
                        style={{
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                          gap: '2px'
                        }}
                      >
                        {/* Balão de Mensagem */}
                        <div
                          style={{
                            maxWidth: '86%',
                            minWidth: isCurrentUser ? '110px' : '140px',
                            background: isCurrentUser 
                              ? (isDark ? '#005c4b' : '#d9fdd3') 
                              : (isDark ? '#202c33' : '#ffffff'),
                            color: isDark ? '#e9edef' : '#111b21',
                            borderRadius: isCurrentUser 
                              ? '14px 14px 2px 14px' 
                              : '14px 14px 14px 2px',
                            padding: '7px 11px 5px 12px',
                            boxShadow: isDark 
                              ? '0 1px 3px rgba(0, 0, 0, 0.35)' 
                              : '0 1px 2px rgba(0, 0, 0, 0.15)',
                            position: 'relative'
                          }}
                        >
                          {/* Nome do Autor */}
                          {!isCurrentUser && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: authorColor }}>
                                {authorDisplayName}
                              </span>
                              {isLeaderPost && (
                                <span style={{
                                  fontSize: '0.60rem',
                                  background: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fef3c7',
                                  color: isDark ? '#fbbf24' : '#b45309',
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: '5px'
                                }}>
                                  👑 Líder
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bloco de Mensagem Respondida (Quote) */}
                          {p.reply_to_text && (
                            <div style={{
                              background: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.05)',
                              borderLeft: `3.5px solid ${isCurrentUser ? '#00a884' : authorColor}`,
                              borderRadius: '7px',
                              padding: '4px 8px',
                              marginBottom: '6px',
                              fontSize: '0.72rem'
                            }}>
                              <div style={{ fontWeight: 800, color: isCurrentUser ? (isDark ? '#25d366' : '#00a884') : authorColor, fontSize: '0.68rem' }}>
                                @{p.reply_to_author || 'Membro'}
                              </div>
                              <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                "{p.reply_to_text}"
                              </div>
                            </div>
                          )}

                          {/* Conteúdo da Mensagem */}
                          <div style={{
                            fontSize: '0.88rem',
                            lineHeight: 1.42,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: isDark ? '#e9edef' : '#111b21'
                          }}>
                            {p.content || p.content_text || ''}
                          </div>

                          {/* Rodapé do Balão: Horário, Checks e Ação Discreta de Responder */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '6px',
                            marginTop: '2px'
                          }}>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(p);
                                const inputEl = document.getElementById('cell-mural-input');
                                if (inputEl) inputEl.focus();
                              }}
                              title="Responder"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: isDark ? 'rgba(233, 237, 239, 0.60)' : 'rgba(17, 27, 33, 0.50)',
                                fontSize: '0.68rem',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              ↩️
                            </button>
                            <span style={{
                              fontSize: '0.64rem',
                              color: isDark ? 'rgba(233, 237, 239, 0.65)' : 'rgba(17, 27, 33, 0.55)'
                            }}>
                              {bubbleTime}
                            </span>
                            {isCurrentUser && (
                              <span style={{ color: '#53bdeb', fontSize: '0.74rem', fontWeight: 900, lineHeight: 1 }}>
                                ✓✓
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pílula de Reações (Apenas quando houver reações) */}
                        {reactionKeys.length > 0 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: isDark ? '#202c33' : '#ffffff',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '2px 7px',
                            fontSize: '0.70rem',
                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
                            marginTop: '-6px',
                            marginRight: isCurrentUser ? '6px' : '0',
                            marginLeft: isCurrentUser ? '0' : '6px',
                            zIndex: 2
                          }}>
                            {reactionKeys.map(emoji => {
                              const userList = reactionsObj[emoji] || [];
                              const hasReacted = userList.includes(effectiveUserId);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleReactPost(p.id, emoji)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    fontSize: '0.72rem',
                                    color: hasReacted ? 'var(--accent-primary)' : 'inherit',
                                    fontWeight: hasReacted ? 800 : 600
                                  }}
                                >
                                  <span>{emoji}</span>
                                  <span>{userList.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Marcador invisível para auto-scroll até a última mensagem (estilo WhatsApp) */}
                <div ref={messagesEndRef} style={{ height: '1px', flexShrink: 0 }} />
              </div>

              {/* Campo e Botão de Envio Posicionados Imediatamente Abaixo do Modal de Mensagens */}
              <div style={{
                width: '100%',
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
                paddingBottom: '2px'
              }}>
                <form 
                  onSubmit={handleAddPost} 
                  style={{
                    width: '100%',
                    maxWidth: '680px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  {/* Banner Flutuante de Resposta Ativa */}
                  {replyingTo && (
                    <div style={{
                      background: isDark ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255, 255, 255, 0.96)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      borderLeft: '3.5px solid var(--accent-primary, #00a884)',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)'
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary, #00a884)' }}>
                          Respondendo a @{replyingTo.author_name || replyingTo.author || 'Membro'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                          fontSize: '0.80rem',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          fontWeight: 900
                        }}
                        title="Cancelar resposta"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Linha Flutuante: Textarea Cápsula + Botão Circular Flutuante */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <textarea
                      id="cell-mural-input"
                      placeholder={replyingTo ? `Responda a @${replyingTo.author_name || replyingTo.author}...` : "Mensagem para a célula..."}
                      rows={1}
                      value={newPostText}
                      onChange={e => setNewPostText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (newPostText.trim() && !isSubmittingPost) {
                            handleAddPost(e);
                          }
                        }
                      }}
                      style={{
                        flex: 1,
                        minHeight: '44px',
                        maxHeight: '100px',
                        borderRadius: '24px',
                        background: isDark ? '#1e293b' : '#ffffff',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                        padding: '11px 18px',
                        fontSize: '0.88rem',
                        color: 'var(--text-main)',
                        resize: 'none',
                        lineHeight: 1.35,
                        boxSizing: 'border-box',
                        outline: 'none',
                        boxShadow: isDark ? '0 4px 18px rgba(0, 0, 0, 0.45)' : '0 4px 16px rgba(0, 0, 0, 0.12)'
                      }}
                    />

                    <button 
                      type="submit" 
                      disabled={!newPostText.trim() || isSubmittingPost}
                      title="Enviar mensagem"
                      style={{ 
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: (newPostText.trim() && !isSubmittingPost) 
                          ? 'var(--accent-primary, #059669)' 
                          : (isDark ? 'rgba(255, 255, 255, 0.10)' : '#e2e8f0'),
                        color: (newPostText.trim() && !isSubmittingPost) 
                          ? '#ffffff' 
                          : (isDark ? '#64748b' : '#94a3b8'),
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.05rem',
                        cursor: (newPostText.trim() && !isSubmittingPost) ? 'pointer' : 'default',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                        boxShadow: (newPostText.trim() && !isSubmittingPost) 
                          ? '0 4px 16px rgba(5, 150, 105, 0.38)' 
                          : (isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.06)')
                      }}
                    >
                      <span>{isSubmittingPost ? '⏳' : '➤'}</span>
                    </button>
                  </div>
                </form>
              </div>
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

                  {/* 4. SESSÕES & LIÇÕES DO LIVRO (PADRÃO LISTA COMPACTA COM MODAL DE LEITURA) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Lições do Livro ({selectedBook.chapters?.length || 0})
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Toque para abrir o estudo completo
                      </span>
                    </div>

                    {(selectedBook.chapters || []).map((ch) => {
                      const chapterId = ch.id || String(ch.chapter_number);
                      const isCompleted = completedChapterIds.includes(chapterId);

                      return (
                        <div
                          key={chapterId}
                          onClick={() => setReadingChapter(ch)}
                          style={{
                            background: 'var(--bg-card, #ffffff)',
                            borderRadius: '16px',
                            border: isCompleted ? '1.5px solid #a7f3d0' : '1px solid var(--panel-border)',
                            boxShadow: 'var(--shadow-sm)',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            {/* Número ou Check */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCompletion(chapterId, e);
                              }}
                              title={isCompleted ? "Concluído (toque para alternar)" : "Toque para concluir"}
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                background: isCompleted ? '#059669' : 'var(--accent-primary-light)',
                                color: isCompleted ? '#ffffff' : 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isCompleted ? '0.90rem' : '0.80rem',
                                fontWeight: 800,
                                flexShrink: 0,
                                boxShadow: isCompleted ? '0 2px 6px rgba(5,150,105,0.25)' : 'none'
                              }}
                            >
                              {isCompleted ? '✓' : ch.chapter_number}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: 'var(--text-main)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {ch.title}
                              </div>
                              <div style={{
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                gap: '8px',
                                marginTop: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                alignItems: 'center'
                              }}>
                                {ch.verse_reference && <span>📖 {ch.verse_reference}</span>}
                                <span>{formatChapterDateAndSchedule(ch, ch.chapter_number ? ch.chapter_number - 1 : 0)}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {isCompleted ? (
                              <span style={{
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                color: '#059669',
                                background: '#dcfce7',
                                padding: '3px 8px',
                                borderRadius: '8px'
                              }}>
                                Concluído
                              </span>
                            ) : null}
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: '#f8fafc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                              fontSize: '0.92rem',
                              fontWeight: 700
                            }}>
                              ›
                            </div>
                          </div>
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

          {/* TAB 4: LANCHES / PARTILHA (VISÃO PREMIUM DE COMUNHÃO & ESCALA) */}
          {portalTab === 'lanches' && (() => {
            const confirmedCount = snacks.filter(s => s.confirmed || s.is_confirmed).length;
            const openCount = snacks.filter(s => !s.confirmed && !s.is_confirmed).length;
            const myItemsCount = snacks.filter(s => {
              const assignedPerson = s.person || s.member_name || s.user_name || '';
              return (
                (user?.name && assignedPerson.toLowerCase().includes(user.name.toLowerCase())) ||
                (user?.email && assignedPerson.toLowerCase().includes(user.email.split('@')[0].toLowerCase())) ||
                (user?.userId && s.user_id === user.userId)
              );
            }).length;

            const nextMeetingInfo = myGroup.meeting_day ? calculateNextMeetingDate(myGroup.meeting_day) : null;
            const coveragePercentage = snacks.length > 0 ? Math.round((confirmedCount / snacks.length) * 100) : 0;

            const filteredSnacks = snacks.filter(snack => {
              if (snackFilterCategory === 'ALL') return true;
              if (snackFilterCategory === 'OPEN') return !snack.confirmed && !snack.is_confirmed;
              if (snackFilterCategory === 'MINE') {
                const assignedPerson = snack.person || snack.member_name || snack.user_name || '';
                return (
                  (user?.name && assignedPerson.toLowerCase().includes(user.name.toLowerCase())) ||
                  (user?.email && assignedPerson.toLowerCase().includes(user.email.split('@')[0].toLowerCase())) ||
                  (user?.userId && snack.user_id === user.userId)
                );
              }
              const name = (snack.item || snack.item_name || '').toLowerCase();
              const cat = snack.category || '';
              if (snackFilterCategory === 'BEBIDAS') {
                return cat === 'BEBIDAS' || name.includes('refri') || name.includes('coca') || name.includes('suco') || name.includes('bebida') || name.includes('água') || name.includes('café') || name.includes('chá');
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

            // Se NÃO houver nenhuma partilha cadastrada na célula ainda:
            if (snacks.length === 0) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Banner Acolhedor de Estado Inicial da Partilha */}
                  <div style={{
                    background: isDark 
                      ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
                      : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '24px',
                    padding: '32px 20px',
                    textAlign: 'center',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--panel-border)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '22px',
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      color: '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.2rem',
                      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
                      animation: 'pulseIconGlow 2.5s infinite ease-in-out'
                    }}>
                      🥐
                    </div>

                    <div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isDark ? 'rgba(15, 118, 110, 0.25)' : 'var(--accent-primary-light)',
                        color: 'var(--accent-primary)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '8px'
                      }}>
                        <span>Mesa de Comunhão</span>
                        {nextMeetingInfo && <span>• {nextMeetingInfo.displayLabel}</span>}
                      </div>

                      <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: 'var(--text-main)',
                        margin: '0 0 6px 0',
                        letterSpacing: '-0.3px'
                      }}>
                        Nenhuma partilha cadastrada ainda
                      </h3>

                      <p style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.45,
                        margin: 0,
                        maxWidth: '340px'
                      }}>
                        Planeje os comes e bebes do nosso próximo encontro! Cadastre o que a célula vai partilhar e incentive a comunhão entre todos.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (myGroup?.meeting_day) {
                          setNewSnackDate(calculateNextMeetingDate(myGroup.meeting_day).dateStr);
                        }
                        setIsSnackModalOpen(true);
                      }}
                      className="v2-pressable"
                      style={{
                        background: 'linear-gradient(135deg, var(--accent-primary, #0f766e) 0%, #0d9488 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '13px 26px',
                        borderRadius: '16px',
                        fontWeight: 900,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 6px 20px rgba(15, 118, 110, 0.32)'
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>🥖</span>
                      <span>Iniciar Partilha da Célula</span>
                    </button>
                  </div>

                  {/* Card com Ideias de Alimentos para Inspirar */}
                  <div style={{
                    background: isDark ? 'rgba(30, 41, 59, 0.50)' : '#f8fafc',
                    borderRadius: '20px',
                    padding: '16px',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      💡 Sugestões de Itens para o Encontro:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{
                        background: isDark ? '#1e293b' : '#ffffff',
                        padding: '12px',
                        borderRadius: '14px',
                        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0'
                      }}>
                        <span style={{ fontSize: '1.3rem' }}>🥟</span>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '4px' }}>Salgados & Pães</div>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Pão de queijo, tortas, salgados</div>
                      </div>
                      <div style={{
                        background: isDark ? '#1e293b' : '#ffffff',
                        padding: '12px',
                        borderRadius: '14px',
                        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0'
                      }}>
                        <span style={{ fontSize: '1.3rem' }}>🥤</span>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '4px' }}>Bebidas & Sucos</div>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Sucos, café, refrigerante</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 1. HERO CARD PREMIUM DA MESA DE COMUNHÃO */}
                <div style={{
                  background: isDark 
                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderRadius: '22px',
                  padding: '18px 16px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--panel-border)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  {/* Topo do Hero: Identidade & Ação */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        color: '#b45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.45rem',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.20)',
                        flexShrink: 0
                      }}>
                        🥐
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            background: isDark ? 'rgba(15, 118, 110, 0.25)' : 'var(--accent-primary-light)',
                            color: 'var(--accent-primary)',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            Mesa de Comunhão
                          </span>
                          {nextMeetingInfo && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              • {nextMeetingInfo.displayLabel}
                            </span>
                          )}
                        </div>
                        <h3 style={{
                          margin: 0,
                          fontSize: '1.08rem',
                          fontWeight: 900,
                          color: 'var(--text-main)',
                          letterSpacing: '-0.3px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          Partilha da Célula
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (myGroup?.meeting_day) {
                          setNewSnackDate(calculateNextMeetingDate(myGroup.meeting_day).dateStr);
                        }
                        setIsSnackModalOpen(true);
                      }}
                      className="v2-pressable"
                      style={{
                        background: 'linear-gradient(135deg, var(--accent-primary, #0f766e) 0%, #0d9488 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '9px 14px',
                        borderRadius: '14px',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      <span style={{ fontSize: '0.90rem' }}>＋</span>
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {/* Painel de Cobertura e Progresso */}
                  <div style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.60)' : '#f8fafc',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {/* Indicadores Numéricos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{
                        background: isDark ? '#1e293b' : '#ffffff',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>✅</span>
                        <div>
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                            Confirmados
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#10b981' }}>
                            {confirmedCount} {confirmedCount === 1 ? 'item' : 'itens'}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        background: isDark ? '#1e293b' : '#ffffff',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>{openCount > 0 ? '⏳' : '🎉'}</span>
                        <div>
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                            Em Aberto
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 900, color: openCount > 0 ? '#f59e0b' : '#10b981' }}>
                            {openCount > 0 ? `${openCount} ${openCount === 1 ? 'item' : 'itens'}` : 'Tudo Pronto!'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Preenchimento da Mesa</span>
                        <span style={{ color: 'var(--accent-primary)' }}>{coveragePercentage}%</span>
                      </div>
                      <div style={{ width: '100%', height: '7px', background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${coveragePercentage}%`,
                          height: '100%',
                          background: coveragePercentage === 100 
                            ? 'linear-gradient(90deg, #10b981, #059669)' 
                            : 'linear-gradient(90deg, var(--accent-primary, #0f766e), #14b8a6)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>

                    {/* Frase Contextual de Comunhão */}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                      {openCount === 0 && snacks.length > 0 && (
                        <span style={{ color: '#059669', fontWeight: 700 }}>
                          ✨ Mesa 100% coberta para o próximo encontro! Louvado seja Deus pela comunhão de todos!
                        </span>
                      )}
                      {openCount > 0 && (
                        <span>
                          💡 Temos <strong>{openCount}</strong> item(ns) esperando voluntário(s). Toque em <strong>"🙋 Eu Levo"</strong> abaixo para participar!
                        </span>
                      )}
                      {snacks.length === 0 && (
                        <span>
                          Toque em <strong>"+ Adicionar"</strong> para listar os pratos e bebidas para a próxima reunião da célula.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. FILTROS ERGONÔMICOS EM PÍLULAS COM CONTADORES */}
                <div 
                  className="no-scrollbar"
                  style={{
                    display: 'flex',
                    gap: '7px',
                    overflowX: 'auto',
                    padding: '2px 2px 4px 2px',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {[
                    { id: 'ALL', label: 'Todos', count: snacks.length, icon: '🍽️' },
                    ...(openCount > 0 ? [{ id: 'OPEN', label: 'Em Aberto', count: openCount, icon: '⏳', isHighlight: true }] : []),
                    ...(myItemsCount > 0 ? [{ id: 'MINE', label: 'Minha Parte', count: myItemsCount, icon: '🙋' }] : []),
                    { id: 'SALGADOS', label: 'Salgados', icon: '🥟' },
                    { id: 'BEBIDAS', label: 'Bebidas', icon: '🥤' },
                    { id: 'DOCES', label: 'Doces & Bolos', icon: '🍰' },
                    { id: 'FRUTAS', label: 'Frutas', icon: '🍉' },
                    { id: 'DESCARTAVEIS', label: 'Descartáveis', icon: '🍴' }
                  ].map(cat => {
                    const isActive = snackFilterCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSnackFilterCategory(cat.id)}
                        className="v2-pressable"
                        style={{
                          padding: '8px 13px',
                          borderRadius: '14px',
                          border: isActive 
                            ? '1.5px solid var(--accent-primary)' 
                            : (cat.isHighlight ? (isDark ? '1px solid rgba(245, 158, 11, 0.40)' : '1px solid #fde68a') : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'var(--panel-border)'}`),
                          background: isActive 
                            ? 'var(--accent-primary-light)' 
                            : (cat.isHighlight ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb') : (isDark ? 'var(--bg-card)' : '#ffffff')),
                          color: isActive 
                            ? 'var(--accent-primary)' 
                            : (cat.isHighlight ? (isDark ? '#fbbf24' : '#b45309') : 'var(--text-main)'),
                          fontWeight: isActive ? 900 : 700,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        {typeof cat.count === 'number' && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 900,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: isActive ? 'var(--accent-primary)' : (isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'),
                            color: isActive ? '#ffffff' : 'var(--text-muted)'
                          }}>
                            {cat.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 3. LISTA DE ITENS DA PARTILHA */}
                {filteredSnacks.length === 0 ? (
                  <div style={{
                    background: isDark ? 'var(--bg-card)' : '#ffffff',
                    borderRadius: '20px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    border: isDark ? '1px dashed rgba(255, 255, 255, 0.15)' : '1px dashed #cbd5e1'
                  }}>
                    <span style={{ fontSize: '2.4rem', display: 'block', marginBottom: '8px' }}>🥐</span>
                    <div style={{ fontWeight: 900, fontSize: '0.96rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {snackFilterCategory === 'OPEN' 
                        ? 'Nenhum item aguardando voluntário' 
                        : (snackFilterCategory === 'MINE' 
                          ? 'Você ainda não assumiu nenhum item' 
                          : 'Nenhum item nesta categoria')}
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 16px 0', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
                      {snackFilterCategory === 'OPEN' 
                        ? 'Todos os itens já têm pessoas escaladas para levar!' 
                        : (snackFilterCategory === 'MINE' 
                          ? 'Escolha um item da lista e toque em "Eu Levo" para colaborar com o lanche.' 
                          : 'Toque no botão abaixo para adicionar um item para a partilha!')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (myGroup?.meeting_day) {
                          setNewSnackDate(calculateNextMeetingDate(myGroup.meeting_day).dateStr);
                        }
                        setIsSnackModalOpen(true);
                      }}
                      className="v2-pressable"
                      style={{
                        margin: '0 auto',
                        background: 'var(--accent-primary)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontSize: '0.80rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      ＋ Adicionar Item Agora
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredSnacks.map(snack => {
                      const isConfirmed = snack.confirmed || snack.is_confirmed;
                      const itemName = snack.item || snack.item_name || 'Item de Partilha';
                      const itemIcon = getSnackIcon(itemName);
                      const assignedPerson = snack.person || snack.member_name || snack.user_name || 'A definir';
                      const isMe = Boolean(
                        (user?.name && assignedPerson.toLowerCase() === user.name.toLowerCase()) ||
                        (user?.email && assignedPerson.toLowerCase().includes(user.email.split('@')[0].toLowerCase())) ||
                        (user?.userId && snack.user_id === user.userId)
                      );

                      return (
                        <div
                          key={snack.id}
                          style={{
                            background: isDark ? 'var(--bg-card)' : '#ffffff',
                            borderRadius: '18px',
                            padding: '14px 16px',
                            border: isConfirmed 
                              ? (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0') 
                              : (isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #fed7aa'),
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Lado Esquerdo: Ícone + Detalhes */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '15px',
                              background: isConfirmed 
                                ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5') 
                                : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fff7ed'),
                              color: isConfirmed ? '#10b981' : '#f59e0b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.45rem',
                              flexShrink: 0
                            }}>
                              {itemIcon}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                  {itemName}
                                </span>
                                {snack.quantity && (
                                  <span style={{
                                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                                    color: 'var(--text-muted)',
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    padding: '1px 6px',
                                    borderRadius: '6px'
                                  }}>
                                    {snack.quantity}
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {snack.event_date && (
                                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    🗓️ {formatMeetingShortDate(snack.event_date) || snack.event_date}
                                  </span>
                                )}
                                
                                {isConfirmed ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {snack.event_date && <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>•</span>}
                                    <div style={{
                                      width: '18px',
                                      height: '18px',
                                      borderRadius: '50%',
                                      background: isMe ? 'var(--accent-primary)' : (isDark ? '#334155' : '#cbd5e1'),
                                      color: '#ffffff',
                                      fontSize: '0.58rem',
                                      fontWeight: 900,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      {getInitials(assignedPerson)}
                                    </div>
                                    <span style={{
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      color: isMe ? 'var(--accent-primary)' : (isDark ? '#10b981' : '#059669')
                                    }}>
                                      {isMe ? 'Você vai levar' : `${assignedPerson} vai levar`}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{
                                    fontSize: '0.70rem',
                                    fontWeight: 800,
                                    color: isDark ? '#fbbf24' : '#d97706',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    <span>⏳</span>
                                    <span>Aguardando voluntário</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Lado Direito: Ações */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {!isConfirmed ? (
                              <button
                                type="button"
                                onClick={() => handleVolunteerSnack(snack.id)}
                                className="v2-pressable"
                                style={{
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '8px 14px',
                                  borderRadius: '12px',
                                  fontWeight: 900,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.32)',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                🙋 Eu Levo!
                              </button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isMe && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnvolunteerSnack(snack.id)}
                                    title="Desmarcar minha contribuição"
                                    className="v2-pressable"
                                    style={{
                                      background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                                      color: isDark ? '#f87171' : '#dc2626',
                                      border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
                                      padding: '5px 9px',
                                      borderRadius: '10px',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Liberar
                                  </button>
                                )}
                                <span style={{
                                  background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                                  color: isDark ? '#34d399' : '#059669',
                                  border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0'}`,
                                  padding: '5px 9px',
                                  borderRadius: '10px',
                                  fontSize: '0.70rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
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
                                className="v2-pressable"
                                style={{
                                  background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                                  border: 'none',
                                  color: '#ef4444',
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  padding: '6px 8px',
                                  borderRadius: '8px'
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
                )}
              </div>
            );
          })()}

          {/* ========================================================
              TAB 5: PAINEL DE GESTÃO DO LÍDER (TELA DEDICADA MODERNA)
              ======================================================== */}
          {portalTab === 'lideranca' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* HERO DO TOPO: Identidade e Status da Célula para o Líder */}
              <div style={{
                background: (myGroup.cover_url || myGroup.image_url)
                  ? `linear-gradient(180deg, rgba(24, 23, 38, 0.72) 0%, rgba(17, 16, 29, 0.95) 100%), url(${myGroup.cover_url || myGroup.image_url}) center/cover no-repeat`
                  : (isDark 
                    ? 'linear-gradient(180deg, #181726 0%, #11101d 100%)' 
                    : 'linear-gradient(180deg, #221e38 0%, #17142b 100%)'),
                color: '#ffffff',
                borderRadius: '26px',
                padding: '20px 18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Botão de Retorno para a Visão Normal da Célula */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setPortalTab('dashboard')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>‹</span>
                    <span>Voltar à Célula</span>
                  </button>
                </div>

                {/* Header com Identidade da Igreja e Célula */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    flexShrink: 0
                  }}>
                    🌱
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {(branding?.church_name || 'IGREJA').toUpperCase()}
                      {myGroup.network ? ` · REDE ${myGroup.network.toUpperCase()}` : ''}
                    </div>
                    <h2 style={{
                      margin: '2px 0 0 0',
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: '#ffffff',
                      letterSpacing: '-0.3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      Liderar · {myGroup.name}
                    </h2>
                  </div>
                </div>

                {/* Dois Cards Lado a Lado do Hero */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.10)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '16px',
                    padding: '12px 14px'
                  }}>
                    <div style={{ fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 700 }}>
                      Próxima reunião
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#ffffff', fontWeight: 900, marginTop: '2px' }}>
                      {formatNextMeetingLabel(myGroup.meeting_day, myGroup.meeting_time)}
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.10)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '16px',
                    padding: '12px 14px'
                  }}>
                    <div style={{ fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 700 }}>
                      Participantes
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#ffffff', fontWeight: 900, marginTop: '2px' }}>
                      {groupMembers.length} · {pendingUsers.length > 0 ? `${pendingUsers.length} pedido novo` : 'Sem pedidos'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-navegação do Líder (Pílulas Fluidas com Scroll Suave) */}
              <div 
                className="no-scrollbar"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '8px', 
                  overflowX: 'auto',
                  padding: '4px 2px',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {[
                  { id: 'attendance', icon: '📋', label: 'Chamada' },
                  { id: 'requests', icon: '📩', label: 'Pedidos', count: pendingUsers.length },
                  { id: 'members', icon: '👥', label: 'Membros', count: groupMembers.length },
                  { id: 'lanches', icon: '☕', label: 'Lanches' },
                  { id: 'settings', icon: '⚙️', label: 'Encontro' }
                ].map(sub => {
                  const isActive = leaderSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setLeaderSubTab(sub.id as LeaderSubTab)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '14px',
                        border: isActive 
                          ? '1.5px solid var(--accent-primary, #ea580c)' 
                          : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                        background: isActive 
                          ? (isDark ? '#431407' : '#ffedd5') 
                          : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                        color: isActive 
                          ? '#ea580c' 
                          : (isDark ? '#cbd5e1' : '#475569'),
                        fontWeight: isActive ? 900 : 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isActive ? '0 2px 6px rgba(234, 88, 12, 0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.90rem' }}>{sub.icon}</span>
                      <span>{sub.label}</span>
                      {typeof sub.count === 'number' && sub.count > 0 && (
                        <span style={{
                          background: isActive ? '#ea580c' : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'),
                          color: isActive ? '#ffffff' : (isDark ? '#ffffff' : '#334155'),
                          padding: '1px 6px',
                          borderRadius: '999px',
                          fontSize: '0.66rem',
                          fontWeight: 900
                        }}>
                          {sub.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* SUBTAB 0: CHAMADA E FREQUÊNCIA DA SEMANA (ERGONÔMICO ESTILO MOCKUP MOBILE) */}
              {leaderSubTab === 'attendance' && (() => {
                const markedMembersCount = groupMembers.filter(m => !!attendeesStatus[m.id]).length;
                const unmarkedMembersCount = groupMembers.length - markedMembersCount;
                const presentMembersCount = groupMembers.filter(m => attendeesStatus[m.id] === 'PRESENT').length;
                const absentMembersCount = groupMembers.filter(m => attendeesStatus[m.id] === 'ABSENT').length;
                const justifiedMembersCount = groupMembers.filter(m => attendeesStatus[m.id] === 'JUSTIFIED').length;
                const totalVisitors = Math.max(numericVisitorCount, visitorsList.length);
                const totalPresentWithVisitors = presentMembersCount + totalVisitors;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* CARD PRINCIPAL DA CHAMADA (Fundo Ergonômico Acolhedor) */}
                    <div style={{
                      background: isDark ? 'var(--bg-card, #1e293b)' : '#faf8f5',
                      borderRadius: '26px',
                      padding: '20px 18px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#eee8df'}`,
                      boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>

                      {/* 1. NAVEGADOR SEMANAL LIMPO (‹ DATA DO ENCONTRO ▾ ›) */}
                      {(() => {
                        const dateInfo = getMeetingDateRichInfo(meetingDate, myGroup.meeting_day);
                        return (
                          <div style={{
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                            borderRadius: '20px',
                            padding: '10px 14px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                          }}>
                            {/* Botão Semana Anterior */}
                            <button
                              type="button"
                              onClick={() => handleStepMeetingDate(-7)}
                              title="Semana anterior"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '12px',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                                color: 'var(--text-main, #0f172a)',
                                fontSize: '1.25rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              ‹
                            </button>

                            {/* Centro: Data Clicável para abrir o Bottom Sheet */}
                            <button
                              type="button"
                              onClick={() => setShowDatePickerModal(true)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '2px 8px',
                                minWidth: 0,
                                flex: 1
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 900,
                                  color: '#ea580c',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em'
                                }}>
                                  {dateInfo.badge}
                                </span>
                                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>▾</span>
                              </div>
                              <div style={{
                                fontSize: '0.96rem',
                                fontWeight: 900,
                                color: 'var(--text-main, #0f172a)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {dateInfo.title}
                              </div>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                Toque para escolher outra data
                              </span>
                            </button>

                            {/* Botão Próxima Semana */}
                            <button
                              type="button"
                              onClick={() => handleStepMeetingDate(7)}
                              title="Próxima semana"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '12px',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                                color: 'var(--text-main, #0f172a)',
                                fontSize: '1.25rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              ›
                            </button>
                          </div>
                        );
                      })()}

                      {/* 2. CARD COMPACTO EXPANSÍVEL: TEMA & NOTAS DO ENCONTRO */}
                      <div style={{
                        background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                        borderRadius: '16px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                      }}>
                        <button
                          type="button"
                          onClick={() => setShowTopicNotes(prev => !prev)}
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            background: 'transparent',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ fontSize: '1rem', flexShrink: 0 }}>📖</span>
                            <div style={{ textAlign: 'left', minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {studyTopic ? `Estudo: ${studyTopic}` : 'Tema do Encontro & Notas'}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {studyTopic || meetingNotes ? 'Clique para ver/editar tema e notas' : 'Opcional • Toque para adicionar'}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', transform: showTopicNotes ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                            ▼
                          </span>
                        </button>

                        {showTopicNotes && (
                          <div style={{
                            padding: '0 14px 14px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`,
                            paddingTop: '12px'
                          }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                  Tema / Estudo Ministrado
                                </label>
                                {selectedBook?.title && studyTopic !== selectedBook.title && (
                                  <button
                                    type="button"
                                    onClick={() => setStudyTopic(selectedBook.title)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#ea580c',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      padding: 0
                                    }}
                                  >
                                    Usar livro sugerido ↵
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                placeholder="Ex: O Fruto do Espírito, Vivendo em Comunidade..."
                                value={studyTopic}
                                onChange={e => setStudyTopic(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 12px',
                                  borderRadius: '12px',
                                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                                  background: isDark ? '#0f172a' : '#f8fafc',
                                  color: 'var(--text-main)',
                                  fontSize: '0.80rem',
                                  fontWeight: 700,
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                                Observações & Pedidos de Oração
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Decisões de fé, testemunhos, pedidos de oração ou notas..."
                                value={meetingNotes}
                                onChange={e => setMeetingNotes(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: '12px',
                                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                                  background: isDark ? '#0f172a' : '#f8fafc',
                                  color: 'var(--text-main)',
                                  fontSize: '0.78rem',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  resize: 'vertical'
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SEÇÃO 2: CHAMADA NOMINAL DOS MEMBROS */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                          Chamada
                        </h3>
                        <span style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--text-muted, #64748b)' }}>
                          {markedMembersCount} de {groupMembers.length} marcados
                        </span>
                      </div>

                      {/* Pills de Contadores de Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Presentes */}
                        <div style={{
                          background: isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7',
                          color: isDark ? '#6ee7b7' : '#15803d',
                          border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0'}`,
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}>
                          {presentMembersCount} presente{presentMembersCount !== 1 ? 's' : ''}
                        </div>

                        {/* Ausente */}
                        <div style={{
                          background: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2',
                          color: isDark ? '#fca5a5' : '#b91c1c',
                          border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}>
                          {absentMembersCount} ausente{absentMembersCount !== 1 ? 's' : ''}
                        </div>

                        {/* Justificado */}
                        <div style={{
                          background: isDark ? 'rgba(168, 85, 247, 0.18)' : '#f3e8ff',
                          color: isDark ? '#d8b4fe' : '#7e22ce',
                          border: `1px solid ${isDark ? 'rgba(168, 85, 247, 0.3)' : '#e9d5ff'}`,
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}>
                          {justifiedMembersCount} justificado{justifiedMembersCount !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Ação: Marcar todos presentes */}
                      {groupMembers.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                          <button
                            type="button"
                            onClick={handleMarkAllPresent}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ea580c',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              padding: '2px 0',
                              transition: 'opacity 0.15s ease'
                            }}
                          >
                            Marcar todos presentes
                          </button>
                        </div>
                      )}

                      {/* Lista de Membros com Ergonomia Mobile */}
                      {groupMembers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.80rem', background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff', borderRadius: '16px', border: `1px dashed ${isDark ? '#334155' : '#e2e8f0'}` }}>
                          Nenhum membro cadastrado nesta célula ainda.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {groupMembers.map(m => {
                            const status = attendeesStatus[m.id];
                            return (
                              <div
                                key={m.id}
                                style={{
                                  background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
                                  borderRadius: '18px',
                                  padding: '12px 14px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px'
                                }}
                              >
                                {/* Linha do Membro: Avatar + Nome + Tag de Cargo */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <div style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      background: '#23223f',
                                      color: '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 900,
                                      fontSize: '0.78rem',
                                      flexShrink: 0
                                    }}>
                                      {getInitials(m.name)}
                                    </div>
                                    <div style={{ minWidth: 0, fontWeight: 900, fontSize: '0.90rem', color: 'var(--text-main, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {m.name}
                                    </div>
                                  </div>

                                  {m.role && m.role !== 'Membro' && (
                                    <div style={{
                                      background: isDark ? 'rgba(168, 85, 247, 0.2)' : '#ede9fe',
                                      color: isDark ? '#d8b4fe' : '#6d28d9',
                                      padding: '3px 10px',
                                      borderRadius: '999px',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {m.role}
                                    </div>
                                  )}
                                </div>

                                {/* 3 Botões Cápsula Largos para Polegar */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                  {/* Presente */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendeeStatus(m.id, 'PRESENT')}
                                    style={{
                                      padding: '9px 0',
                                      borderRadius: '12px',
                                      border: status === 'PRESENT' ? '1.5px solid #10b981' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                                      background: status === 'PRESENT' ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
                                      color: status === 'PRESENT' ? (isDark ? '#6ee7b7' : '#065f46') : (isDark ? '#94a3b8' : '#64748b'),
                                      fontWeight: status === 'PRESENT' ? 900 : 700,
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      textAlign: 'center',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    Presente
                                  </button>

                                  {/* Ausente */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendeeStatus(m.id, 'ABSENT')}
                                    style={{
                                      padding: '9px 0',
                                      borderRadius: '12px',
                                      border: status === 'ABSENT' ? '1.5px solid #ef4444' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                                      background: status === 'ABSENT' ? (isDark ? '#7f1d1d' : '#fef2f2') : (isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
                                      color: status === 'ABSENT' ? (isDark ? '#fca5a5' : '#991b1b') : (isDark ? '#94a3b8' : '#64748b'),
                                      fontWeight: status === 'ABSENT' ? 900 : 700,
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      textAlign: 'center',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    Ausente
                                  </button>

                                  {/* Justif. */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendeeStatus(m.id, 'JUSTIFIED')}
                                    style={{
                                      padding: '9px 0',
                                      borderRadius: '12px',
                                      border: status === 'JUSTIFIED' ? '1.5px solid #a855f7' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                                      background: status === 'JUSTIFIED' ? (isDark ? '#581c87' : '#faf5ff') : (isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
                                      color: status === 'JUSTIFIED' ? (isDark ? '#d8b4fe' : '#6b21a8') : (isDark ? '#94a3b8' : '#64748b'),
                                      fontWeight: status === 'JUSTIFIED' ? 900 : 700,
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      textAlign: 'center',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    Justif.
                                  </button>
                                </div>

                                {/* Campo retrátil de Justificativa */}
                                {status === 'JUSTIFIED' && (
                                  <input
                                    type="text"
                                    placeholder="Motivo da falta (ex: saúde, viagem, trabalho)..."
                                    value={attendeesJustification[m.id] || ''}
                                    onChange={e => setAttendeesJustification({ ...attendeesJustification, [m.id]: e.target.value })}
                                    style={{
                                      width: '100%',
                                      padding: '8px 10px',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(168, 85, 247, 0.4)',
                                      background: isDark ? '#1e1b4b' : '#faf5ff',
                                      color: 'var(--text-main, #0f172a)',
                                      fontSize: '0.75rem',
                                      outline: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* CARD DE VISITANTES E OFERTA (Conforme Mockup) */}
                    <div style={{
                      background: isDark ? 'var(--bg-card, #1e293b)' : '#faf8f5',
                      borderRadius: '26px',
                      padding: '20px 18px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#eee8df'}`,
                      boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      {/* Linha de Visitantes: Stepper Ergonômico */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.96rem', color: 'var(--text-main, #0f172a)' }}>
                            Visitantes
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)' }}>
                            Só a quantidade
                          </div>
                        </div>

                        {/* Stepper [-] 2 [+] */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                          padding: '4px 6px',
                          borderRadius: '16px'
                        }}>
                          <button
                            type="button"
                            onClick={() => setNumericVisitorCount(prev => Math.max(0, prev - 1))}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              border: 'none',
                              background: isDark ? '#334155' : '#f8fafc',
                              color: '#ea580c',
                              fontSize: '1.2rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            −
                          </button>
                          <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-main, #0f172a)' }}>
                            {totalVisitors}
                          </span>
                          <button
                            type="button"
                            onClick={() => setNumericVisitorCount(prev => prev + 1)}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              border: 'none',
                              background: isDark ? '#334155' : '#f8fafc',
                              color: '#ea580c',
                              fontSize: '1.2rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Opção Discreta para Detalhar Nomes dos Visitantes */}
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddVisitor(!showAddVisitor)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-primary, #0f766e)',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {showAddVisitor ? '✕ Ocultar lista nominal' : '+ Detalhar nomes dos visitantes (opcional)'}
                        </button>
                      </div>

                      {/* Formulário de Visitante com Nome/WhatsApp */}
                      {showAddVisitor && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: isDark ? '#0f172a' : '#ffffff', padding: '12px', borderRadius: '14px', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                          <input
                            type="text"
                            placeholder="Nome completo do visitante..."
                            value={newVisitorName}
                            onChange={e => setNewVisitorName(e.target.value)}
                            style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, background: isDark ? '#1e293b' : '#f8fafc', color: 'var(--text-main)', fontSize: '0.80rem' }}
                          />
                          <input
                            type="tel"
                            placeholder="WhatsApp (ex: 11 98765-4321)..."
                            value={newVisitorPhone}
                            onChange={e => setNewVisitorPhone(e.target.value)}
                            style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, background: isDark ? '#1e293b' : '#f8fafc', color: 'var(--text-main)', fontSize: '0.80rem' }}
                          />
                          <button
                            type="button"
                            onClick={handleAddVisitor}
                            style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}
                          >
                            + Confirmar Visitante na Lista
                          </button>

                          {visitorsList.map((v, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                              <span>👤 <strong>{v.name}</strong> {v.phone && `(${v.phone})`}</span>
                              <button type="button" onClick={() => handleRemoveVisitor(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', margin: '2px 0' }} />

                      {/* Linha de Oferta (Opcional) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.96rem', color: 'var(--text-main, #0f172a)' }}>
                            Oferta <span style={{ fontWeight: 600, fontSize: '0.76rem', color: 'var(--text-muted, #94a3b8)' }}>(opcional)</span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)' }}>
                            Visível à liderança e à tesouraria
                          </div>
                        </div>

                        {/* Input de Oferta Formatado */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                          padding: '6px 10px',
                          borderRadius: '14px'
                        }}>
                          <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-muted, #64748b)' }}>
                            R$
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={offeringsAmount}
                            onChange={e => setOfferingsAmount(e.target.value)}
                            style={{
                              width: '74px',
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              color: 'var(--text-main, #0f172a)',
                              fontWeight: 900,
                              fontSize: '0.96rem',
                              textAlign: 'right'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* BARRA FIXA INFERIOR (STICKY ACTION BAR): Conforme Mockup */}
                    <div style={{
                      position: 'sticky',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      zIndex: 40,
                      background: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(250, 248, 245, 0.96)',
                      backdropFilter: 'blur(12px)',
                      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#eee8df'}`,
                      padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px)) 16px',
                      boxShadow: '0 -4px 18px rgba(0,0,0,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      margin: '0 -16px -16px -16px',
                      borderRadius: '0 0 20px 20px'
                    }}>
                      {/* Aviso de Membros Não Marcados */}
                      <div style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                        {unmarkedMembersCount > 0 ? (
                          <span style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
                            ⚠️ {unmarkedMembersCount} pessoa{unmarkedMembersCount !== 1 ? 's' : ''} ainda sem marcar — ficarão como ausentes
                          </span>
                        ) : (
                          <span style={{ color: isDark ? '#34d399' : '#15803d' }}>
                            ✓ Todos os membros foram marcados!
                          </span>
                        )}
                      </div>

                      {/* Linha com Resumo e Botão Salvar Chamada */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.94rem', color: 'var(--text-main, #0f172a)' }}>
                            {totalPresentWithVisitors} presentes · {totalVisitors} visitante{totalVisitors !== 1 ? 's' : ''}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', textTransform: 'lowercase' }}>
                            {formatMeetingShortDate(meetingDate)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveMeeting()}
                          disabled={isRecordingMeeting}
                          style={{
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '12px 22px',
                            fontWeight: 900,
                            fontSize: '0.92rem',
                            cursor: isRecordingMeeting ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                            opacity: isRecordingMeeting ? 0.7 : 1,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'transform 0.15s ease'
                          }}
                        >
                          {isRecordingMeeting ? 'Salvando Chamada...' : '💾 Salvar Chamada'}
                        </button>
                      </div>
                    </div>

                    {/* Histórico das Últimas Reuniões */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📜</span>
                        <span>Histórico das Últimas Reuniões</span>
                      </div>

                      {meetingsHistory.length === 0 ? (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '24px 16px', 
                          color: 'var(--text-muted, #94a3b8)', 
                          background: isDark ? 'var(--bg-card, #1e293b)' : '#ffffff', 
                          borderRadius: '16px', 
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <div style={{ fontSize: '1.8rem', opacity: 0.7 }}>📅</div>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>
                            Nenhuma reunião gravada ainda
                          </div>
                          <div style={{ fontSize: '0.72rem' }}>
                            Ao salvar a primeira chamada semanal, o histórico detalhado aparecerá aqui.
                          </div>
                        </div>
                      ) : (
                        meetingsHistory.map(m => (
                          <div 
                            key={m.id} 
                            style={{ 
                              background: isDark ? 'var(--bg-card, #1e293b)' : '#ffffff', 
                              borderRadius: '16px', 
                              padding: '14px 16px', 
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, 
                              boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.04))',
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              gap: '10px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span>📅 {new Date(m.meeting_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                {m.study_topic && (
                                  <span style={{ 
                                    fontWeight: 700, 
                                    fontSize: '0.70rem', 
                                    background: 'rgba(15, 118, 110, 0.1)', 
                                    color: 'var(--accent-primary, #0f766e)', 
                                    padding: '2px 8px', 
                                    borderRadius: '6px' 
                                  }}>
                                    {m.study_topic}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>🟢 {m.present_count || 0} presentes</span>
                                <span>🔴 {m.absent_count || 0} faltas</span>
                                {m.visitor_count > 0 && <span>🌟 {m.visitor_count} visitantes</span>}
                                {m.offerings_amount && Number(m.offerings_amount) > 0 && (
                                  <span>💰 R$ {Number(m.offerings_amount).toFixed(2).replace('.', ',')}</span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenMeetingReport(m)}
                              style={{
                                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f8fafc',
                                border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1'}`,
                                color: 'var(--text-main, #0f172a)',
                                padding: '6px 12px',
                                borderRadius: '12px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                flexShrink: 0,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                              }}
                            >
                              <span>👁️</span>
                              <span>Ver Relatório</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                );
              })()}

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

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      🖼️ Foto de Capa da Célula (Banner de Fundo)
                    </label>
                    <input 
                      type="url" 
                      className="input-pwa"
                      placeholder="https://... (URL da imagem para banner e fundos)"
                      value={editCoverUrl}
                      onChange={e => setEditCoverUrl(e.target.value)}
                    />
                    {editCoverUrl && (
                      <div style={{ marginTop: '8px', position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '110px', border: '1px solid #cbd5e1' }}>
                        <img 
                          src={editCoverUrl} 
                          alt="Prévia da Capa" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <div style={{ position: 'absolute', bottom: '6px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.66rem', fontWeight: 800 }}>
                          Prévia da Capa
                        </div>
                      </div>
                    )}
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
          {/* Barra de Busca e Ação: Abrir Mapa Interativo */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              className="input-pwa"
              placeholder="Buscar por bairro, nome ou líder..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 16px',
                fontSize: '0.84rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              title="Explorar células no mapa interativo"
            >
              <span style={{ fontSize: '1.05rem' }}>🗺️</span>
              <span>Ver Mapa</span>
            </button>
          </div>

          {/* Modal Fixo de Mapa de Células (Tela Cheia Nativa) */}
          <CellsMapView
            isOpen={isMapModalOpen}
            onClose={() => setIsMapModalOpen(false)}
            cells={filteredCells}
            primaryColor={branding?.primary_color || '#0f766e'}
            secondaryColor={branding?.secondary_color || '#14b8a6'}
            myGroupId={myGroupId}
            currentMemberCellId={currentMember?.cell_group_id}
            onRequestJoin={(cell) => handleRequestJoin(cell.id)}
            isPendingJoin={(cellId) => pendingGroupId === cellId}
            onOpenWhatsApp={handleOpenWhatsApp}
            onEnterCell={handleEnterCell}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredCells.map(cell => {
                const isMyAssignedCell = myGroupId === cell.id || (currentMember?.cell_group_id === cell.id);
                const isLeaderOfThisCell = Boolean(
                  (cell.leader_id && currentMember?.id && cell.leader_id === currentMember.id) ||
                  (cell.leader_name && user?.name && cell.leader_name.toLowerCase() === user.name.toLowerCase()) ||
                  (cell.leader && user?.name && cell.leader.toLowerCase() === user.name.toLowerCase()) ||
                  (user?.email && user.email.toLowerCase() === 'rfsena@icloud.com')
                );
                const isMemberOrLeader = isMyAssignedCell || isLeaderOfThisCell;

                return (
                  <div 
                    key={cell.id} 
                    onClick={() => setSelectedCellDetail(cell)}
                    style={{ 
                      background: '#ffffff', 
                      borderRadius: '18px', 
                      padding: '14px 18px', 
                      border: isMemberOrLeader ? '1.5px solid var(--accent-primary)' : '1px solid var(--panel-border)', 
                      boxShadow: 'var(--shadow-sm)', 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          color: 'var(--accent-primary)',
                          textTransform: 'uppercase',
                          background: 'var(--accent-primary-light)',
                          padding: '2px 8px',
                          borderRadius: '8px'
                        }}>
                          {cell.network || cell.focus || 'Geral'}
                        </span>

                        {isLeaderOfThisCell ? (
                          <span style={{ fontSize: '0.66rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '8px' }}>
                            👑 Sua Liderança
                          </span>
                        ) : isMyAssignedCell ? (
                          <span style={{ fontSize: '0.66rem', fontWeight: 800, background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: '8px' }}>
                            ✓ Sua Célula
                          </span>
                        ) : cell.neighborhood ? (
                          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            📍 {cell.neighborhood}
                          </span>
                        ) : null}
                      </div>

                      <div style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cell.name}
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {cell.meeting_day && <span>🗓️ {cell.meeting_day} {cell.meeting_time ? `às ${cell.meeting_time}` : ''}</span>}
                        {(cell.leader || cell.leader_name) && <span>• 👤 {cell.leader || cell.leader_name}</span>}
                      </div>
                    </div>

                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 900,
                      flexShrink: 0
                    }}>
                      <span style={{ lineHeight: 1, marginTop: '-1px' }}>›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal de Detalhes da Célula Selecionada */}
          {selectedCellDetail && (
            <BottomSheet isOpen={Boolean(selectedCellDetail)} onClose={() => setSelectedCellDetail(null)} maxHeight="92dvh">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        color: 'var(--accent-primary)',
                        textTransform: 'uppercase',
                        background: 'var(--accent-primary-light)',
                        padding: '3px 8px',
                        borderRadius: '8px'
                      }}>
                        {selectedCellDetail.network || selectedCellDetail.focus || 'Geral'}
                      </span>
                      {selectedCellDetail.neighborhood && (
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          📍 {selectedCellDetail.neighborhood}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                      {selectedCellDetail.name}
                    </h3>
                  </div>
                </div>

                {selectedCellDetail.description && (
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                    {selectedCellDetail.description}
                  </p>
                )}

                {/* Bloco de Encontro */}
                <div style={{
                  background: 'var(--bg-card-subtle, #f8fafc)',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid var(--panel-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.80rem'
                }}>
                  {selectedCellDetail.meeting_day && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 800 }}>
                      <span>🗓️</span>
                      <span>Encontro semanal: {selectedCellDetail.meeting_day} às {selectedCellDetail.meeting_time || '19:30'}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👤</span>
                    <span>Liderança: <b>{selectedCellDetail.leader || selectedCellDetail.leader_name || 'Pastoral'}</b></span>
                  </div>

                  {selectedCellDetail.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span>🏠</span>
                      <span style={{ flex: 1 }}>{selectedCellDetail.address}</span>
                    </div>
                  )}
                </div>

                {/* Botão Como Chegar se houver endereço */}
                {selectedCellDetail.address && (
                  <button
                    type="button"
                    onClick={() => {
                      const query = encodeURIComponent(`${selectedCellDetail.address}`);
                      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                    }}
                    style={{
                      background: 'var(--bg-card-subtle, #f1f5f9)',
                      border: '1.5px solid var(--panel-border)',
                      borderRadius: '14px',
                      padding: '12px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>🧭</span>
                    <span>Traçar Rota no Google Maps</span>
                  </button>
                )}

                {/* Botões de Ação Principal */}
                {(() => {
                  const isMyCell = myGroupId === selectedCellDetail.id || (currentMember?.cell_group_id === selectedCellDetail.id);
                  const isLeader = Boolean(
                    (selectedCellDetail.leader_id && currentMember?.id && selectedCellDetail.leader_id === currentMember.id) ||
                    (selectedCellDetail.leader_name && user?.name && selectedCellDetail.leader_name.toLowerCase() === user.name.toLowerCase()) ||
                    (user?.email && user.email.toLowerCase() === 'rfsena@icloud.com')
                  );
                  const isPending = pendingGroupId === selectedCellDetail.id;

                  if (isMyCell || isLeader) {
                    return (
                      <button 
                        type="button" 
                        className="btn-pwa-primary" 
                        onClick={async () => {
                          const targetId = selectedCellDetail.id;
                          setSelectedCellDetail(null);
                          setMyGroupId(targetId);
                          if (user?.email) {
                            localStorage.setItem(`faithhub_my_cell_group_id_${user.email.toLowerCase()}`, targetId);
                          }
                          setIsCellLeader(isLeader || ['ADMIN', 'PASTOR', 'SUPERADMIN', 'LEADER', 'LÍDER'].includes((currentMember?.role || '').toUpperCase()));
                          setViewMode('portal');
                          await loadGroupSpecifics(targetId, cells);
                        }}
                        style={{ padding: '14px', fontSize: '0.90rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <span>🚀</span>
                        <span>Acessar Painel da Célula</span>
                      </button>
                    );
                  }

                  if (isPending) {
                    return (
                      <button 
                        type="button" 
                        disabled
                        style={{ padding: '14px', fontSize: '0.84rem', background: '#f1f5f9', color: 'var(--text-muted)', border: '1px solid var(--panel-border)', borderRadius: '14px', cursor: 'default', fontWeight: 800 }}
                      >
                        ⏳ Solicitação Enviada (Aguardando Líder)
                      </button>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(selectedCellDetail.whatsapp || selectedCellDetail.whatsapp_contact) && (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(selectedCellDetail)}
                          style={{
                            flex: 1,
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '14px',
                            padding: '14px',
                            fontSize: '0.84rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>💬</span>
                          <span>WhatsApp</span>
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="btn-pwa-primary" 
                        onClick={() => {
                          handleRequestJoin(selectedCellDetail.id);
                          setSelectedCellDetail(null);
                        }}
                        style={{ flex: 2, padding: '14px', fontSize: '0.84rem', fontWeight: 900 }}
                      >
                        Quero Participar desta Célula
                      </button>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setSelectedCellDetail(null)}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    fontWeight: 800,
                    fontSize: '0.80rem',
                    cursor: 'pointer'
                  }}
                >
                  Voltar à Lista
                </button>
              </div>
            </BottomSheet>
          )}

        </div>
      )}

      {/* Modal de Detalhes e Leitura do Estudo / Lição (Disponível Globalmente tanto na Minha Célula quanto no Descobrir) */}
      {readingChapter && (
        <BottomSheet isOpen={Boolean(readingChapter)} onClose={() => setReadingChapter(null)} maxHeight="94dvh">
          {(() => {
            const chapterId = readingChapter.id || String(readingChapter.chapter_number);
            const isCompleted = completedChapterIds.includes(chapterId);

            // Parser seguro de markdown (Negrito, Itálico, Sublinhado, Títulos, Listas, Citações)
            const formatStudyMarkdown = (text: string): string => {
              if (!text) return '';
              let safe = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              safe = safe.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>');

              const lines = safe.split('\n');
              const parsed: string[] = [];

              for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                if (/^#\s+(.*)/.test(line)) {
                  line = line.replace(/^#\s+(.*)/, `<h3 style="font-size: 1.10rem; font-weight: 900; margin: 12px 0 4px 0; color: ${isDark ? '#2dd4bf' : 'var(--accent-primary, #0ea5e9)'};">$1</h3>`);
                } else if (/^##\s+(.*)/.test(line)) {
                  line = line.replace(/^##\s+(.*)/, `<h4 style="font-size: 1.00rem; font-weight: 800; margin: 10px 0 4px 0; color: ${isDark ? '#f8fafc' : '#1e293b'};">$1</h4>`);
                } else if (/^###\s+(.*)/.test(line)) {
                  line = line.replace(/^###\s+(.*)/, `<h5 style="font-size: 0.90rem; font-weight: 800; margin: 8px 0 4px 0; color: ${isDark ? '#2dd4bf' : 'var(--accent-primary, #0ea5e9)'};">$1</h5>`);
                } else if (/^&gt;\s*(.*)/.test(line)) {
                  line = line.replace(/^&gt;\s*(.*)/, `<blockquote style="border-left: 3px solid ${isDark ? '#2dd4bf' : '#0284c7'}; background: ${isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'}; padding: 8px 12px; margin: 6px 0; border-radius: 6px; font-style: italic; color: ${isDark ? '#cbd5e1' : '#475569'};">$1</blockquote>`);
                } else if (/^[\•\-\*]\s+(.*)/.test(line)) {
                  line = line.replace(/^[\•\-\*]\s+(.*)/, `<div style="display: flex; gap: 8px; margin: 4px 0 4px 4px; align-items: flex-start;"><span style="color: ${isDark ? '#2dd4bf' : '#0284c7'}; font-weight: 900;">•</span><span style="flex: 1;">$1</span></div>`);
                } else if (/^(\d+)\.\s+(.*)/.test(line)) {
                  line = line.replace(/^(\d+)\.\s+(.*)/, `<div style="display: flex; gap: 8px; margin: 4px 0 4px 4px; align-items: flex-start;"><span style="font-weight: 800; color: ${isDark ? '#2dd4bf' : '#0284c7'}; min-width: 18px;">$1.</span><span style="flex: 1;">$2</span></div>`);
                }

                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
                line = line.replace(/__(.*?)__/g, '<u>$1</u>');
                parsed.push(line);
              }

              return parsed.join('<br />');
            };

            // Resolução unificada de campos configurados no Studio Web
            const contentText = (readingChapter.content_text || readingChapter.content_body || '').trim();
            const rawQuestions = readingChapter.discussion_questions || readingChapter.questions;
            let questionsList: string[] = [];
            if (Array.isArray(rawQuestions)) {
              questionsList = rawQuestions.filter(Boolean);
            } else if (typeof rawQuestions === 'string') {
              try {
                const parsed = JSON.parse(rawQuestions);
                if (Array.isArray(parsed)) questionsList = parsed.filter(Boolean);
              } catch {}
            }

            const mediaLink = (readingChapter.media_link || readingChapter.media_url || '').trim();
            const mediaType = readingChapter.media_type || (mediaLink.toLowerCase().includes('.pdf') ? 'PDF' : (mediaLink.includes('youtube') || mediaLink.includes('youtu.be') ? 'VIDEO' : 'NONE'));
            const isVideo = mediaType === 'VIDEO' || mediaLink.includes('youtube') || mediaLink.includes('youtu.be');
            const isPdf = mediaType === 'PDF' || mediaLink.toLowerCase().includes('.pdf');
            const videoEmbedUrl = isVideo ? getYoutubeEmbedUrl(mediaLink) : '';
            const scheduleBadge = formatChapterDateAndSchedule(readingChapter, readingChapter.chapter_number ? readingChapter.chapter_number - 1 : 0);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px', color: isDark ? '#f8fafc' : 'var(--text-main)' }}>
                {/* Header do Estudo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '0.70rem',
                        fontWeight: 900,
                        color: isDark ? '#2dd4bf' : 'var(--accent-primary)',
                        background: isDark ? 'rgba(45, 212, 191, 0.15)' : 'var(--accent-primary-light)',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        textTransform: 'uppercase'
                      }}>
                        {selectedBook?.title || 'Estudo Bíblico'} • Lição {readingChapter.chapter_number}
                      </span>
                      {scheduleBadge && (
                        <span style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          color: isDark ? '#cbd5e1' : 'var(--text-muted)',
                          background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-card-subtle, #f1f5f9)',
                          padding: '3px 8px',
                          borderRadius: '8px'
                        }}>
                          {scheduleBadge}
                        </span>
                      )}
                      {isCompleted && (
                        <span style={{
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          color: '#059669',
                          background: isDark ? 'rgba(16, 185, 129, 0.20)' : '#dcfce7',
                          border: isDark ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                          padding: '3px 9px',
                          borderRadius: '10px'
                        }}>
                          ✓ Concluído
                        </span>
                      )}
                    </div>
                    <h2 style={{ fontSize: '1.24rem', fontWeight: 900, color: isDark ? '#f8fafc' : 'var(--text-main)', margin: 0, lineHeight: 1.3 }}>
                      {readingChapter.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReadingChapter(null)}
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.10)' : 'var(--bg-card-subtle, #f1f5f9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDark ? '#f8fafc' : 'var(--text-secondary, #64748b)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.90rem',
                      flexShrink: 0
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Texto Bíblico Base */}
                {readingChapter.verse_reference && (
                  <div style={{
                    background: isDark ? 'rgba(30, 41, 59, 0.70)' : 'var(--bg-card-subtle, #eff6ff)',
                    borderLeft: `4px solid ${isDark ? '#2dd4bf' : 'var(--accent-primary)'}`,
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid var(--panel-border, #dbeafe)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    fontSize: '0.88rem',
                    color: isDark ? '#ffffff' : 'var(--text-main, #1e40af)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>📖</span>
                    <div>
                      <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.8, color: isDark ? '#2dd4bf' : 'inherit' }}>Texto Bíblico Base</div>
                      <div style={{ color: isDark ? '#ffffff' : 'inherit', fontWeight: 800 }}>{readingChapter.verse_reference}</div>
                    </div>
                  </div>
                )}

                {/* 1. DINÂMICA / QUEBRA-GELO */}
                {readingChapter.icebreaker && (
                  <div style={{
                    background: isDark ? 'rgba(99, 102, 241, 0.10)' : 'var(--bg-card-subtle, #f8fafc)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    border: isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid var(--panel-border, #e2e8f0)'
                  }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#818cf8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🧊</span>
                      <span>Quebra-Gelo / Dinâmica de Abertura</span>
                    </div>
                    <div
                      style={{ fontSize: '0.86rem', color: isDark ? '#f1f5f9' : 'var(--text-secondary)', lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: formatStudyMarkdown(readingChapter.icebreaker) }}
                    />
                  </div>
                )}

                {/* 2. MINISTRAÇÃO & CONTEÚDO PRINCIPAL (Planejado no Studio) */}
                {contentText && (
                  <div>
                    <div style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      color: isDark ? '#2dd4bf' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                      letterSpacing: '0.03em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>💡</span>
                      <span>Ministração & Conteúdo do Estudo</span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.92rem',
                        color: isDark ? '#f8fafc' : 'var(--text-main)',
                        lineHeight: 1.7,
                        background: isDark ? '#111827' : 'var(--bg-card, #ffffff)',
                        padding: '18px',
                        borderRadius: '18px',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid var(--panel-border, #f1f5f9)',
                        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : 'var(--shadow-sm)'
                      }}
                      dangerouslySetInnerHTML={{ __html: formatStudyMarkdown(contentText) }}
                    />
                  </div>
                )}

                {/* 3. PERGUNTAS PARA COMPARTILHAMENTO (Planejado no Studio) */}
                {questionsList.length > 0 && (
                  <div style={{
                    background: isDark ? 'rgba(168, 85, 247, 0.10)' : 'var(--bg-card-subtle, #fdf4ff)',
                    borderRadius: '18px',
                    padding: '16px 18px',
                    border: isDark ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid var(--panel-border, #f5d0fe)'
                  }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#c084fc', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💬</span>
                      <span>Perguntas para Edificação & Partilha</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {questionsList.map((q, qIdx) => (
                        <div key={qIdx} style={{ display: 'flex', gap: '10px', fontSize: '0.86rem', color: isDark ? '#f8fafc' : 'var(--text-main)', lineHeight: 1.5, alignItems: 'flex-start' }}>
                          <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#c084fc',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            flexShrink: 0,
                            marginTop: '1px'
                          }}>
                            {qIdx + 1}
                          </span>
                          <span style={{ flex: 1 }}>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. DESAFIO PRÁTICO DA SEMANA */}
                {readingChapter.practical_challenge && (
                  <div style={{
                    background: isDark ? 'rgba(217, 119, 6, 0.10)' : 'var(--bg-card-subtle, #fffbeb)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    border: isDark ? '1px solid rgba(217, 119, 6, 0.25)' : '1px solid var(--panel-border, #fde68a)'
                  }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🎯</span>
                      <span>Desafio Prático da Semana</span>
                    </div>
                    <div
                      style={{ fontSize: '0.86rem', color: isDark ? '#fde68a' : 'var(--text-secondary, #92400e)', lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: formatStudyMarkdown(readingChapter.practical_challenge) }}
                    />
                  </div>
                )}

                {/* 5. MÍDIA DE APOIO (VÍDEO YOUTUBE / PDF / DRIVE) */}
                {mediaLink && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {isVideo && videoEmbedUrl && (
                      <div style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        aspectRatio: '16 / 9',
                        width: '100%',
                        background: '#000000',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
                      }}>
                        <iframe
                          width="100%"
                          height="100%"
                          src={videoEmbedUrl}
                          title="Vídeo de Apoio do Estudo"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
                        />
                      </div>
                    )}

                    <a
                      href={mediaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '14px 18px',
                        background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-card-subtle, #f8fafc)',
                        borderRadius: '14px',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--panel-border, #e2e8f0)',
                        color: isDark ? '#2dd4bf' : 'var(--accent-primary)',
                        textDecoration: 'none',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <span>{isVideo ? '🎥 Abrir Vídeo no YouTube' : isPdf ? '📕 Abrir Arquivo PDF do Estudo' : '🔗 Abrir Material de Apoio'}</span>
                      <span style={{ fontSize: '0.90rem' }}>↗</span>
                    </a>
                  </div>
                )}

                {/* BOTÕES DE AÇÃO INFERIORES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  {isCompleted ? (
                    <button
                      type="button"
                      onClick={(e) => handleToggleCompletion(chapterId, e)}
                      style={{
                        width: '100%',
                        background: isDark ? 'rgba(16, 185, 129, 0.20)' : '#ecfdf5',
                        color: isDark ? '#34d399' : '#059669',
                        border: '1.5px solid #10b981',
                        borderRadius: '16px',
                        padding: '14px',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(5,150,105,0.15)'
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
                        borderRadius: '16px',
                        padding: '14px',
                        fontWeight: 900,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                      }}
                    >
                      <span>✅</span>
                      <span>Marcar este Estudo como Concluído</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setReadingChapter(null)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid var(--panel-border, #e2e8f0)',
                      background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'var(--bg-card, #ffffff)',
                      color: isDark ? '#cbd5e1' : 'var(--text-secondary, #64748b)',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            );
          })()}
        </BottomSheet>
      )}

      {/* ========================================================
          MODAL / BOTTOM SHEET DE ADICIONAR ITEM À PARTILHA
          ======================================================== */}
      {isSnackModalOpen && (
        <BottomSheet 
          isOpen={isSnackModalOpen} 
          onClose={() => setIsSnackModalOpen(false)} 
          maxHeight="92dvh"
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '4px 4px calc(14px + env(safe-area-inset-bottom, 0px)) 4px'
          }}>
            {/* Header do BottomSheet */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '4px', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f1f5f9' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.45rem',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.20)',
                flexShrink: 0
              }}>
                🥐
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-primary)',
                  marginBottom: '2px'
                }}>
                  Mesa de Comunhão · {myGroup.name}
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.10rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.3px'
                }}>
                  Adicionar Item à Partilha
                </h3>
              </div>
            </div>

            {/* Sugestões Rápidas em Pílulas com 1 Toque */}
            <div>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
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
                      className="v2-pressable"
                      style={{
                        background: isSelected 
                          ? 'var(--accent-primary)' 
                          : (isDark ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc'),
                        color: isSelected 
                          ? '#ffffff' 
                          : 'var(--text-main)',
                        border: isSelected 
                          ? '1.5px solid var(--accent-primary)' 
                          : (isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid #e2e8f0'),
                        borderRadius: '12px',
                        padding: '7px 11px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: isSelected ? '0 3px 10px rgba(15, 118, 110, 0.30)' : 'none',
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
            <form onSubmit={handleCreateSnack} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Nome do Item */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                  Nome do Alimento ou Bebida *
                </label>
                <input
                  type="text"
                  className="input-pwa"
                  placeholder="Ex: Bolo de Cenoura, Salgadinhos, Suco de Laranja..."
                  value={newSnackItem}
                  onChange={e => setNewSnackItem(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    fontSize: '0.90rem',
                    background: isDark ? 'rgba(15, 23, 42, 0.60)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    color: 'var(--text-main)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Quantidade & Data do Encontro */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                    Quantidade Sugerida
                  </label>
                  <input
                    type="text"
                    className="input-pwa"
                    placeholder="Ex: 2 garrafas, 1 cento"
                    value={newSnackQty}
                    onChange={e => setNewSnackQty(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '0.86rem',
                      background: isDark ? 'rgba(15, 23, 42, 0.60)' : '#ffffff',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      color: 'var(--text-main)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                    Data do Encontro *
                  </label>
                  <input
                    type="date"
                    className="input-pwa"
                    value={newSnackDate}
                    onChange={e => setNewSnackDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      fontSize: '0.86rem',
                      background: isDark ? 'rgba(15, 23, 42, 0.60)' : '#ffffff',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                      borderRadius: '14px',
                      padding: '11px 12px',
                      color: 'var(--text-main)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Seletor Visual de Compromisso (Quem vai levar?) */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Quem vai levar este item?
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px'
                }}>
                  {/* Opção 1: Eu mesmo levo */}
                  <div
                    onClick={() => setNewSnackAssigneeMode('me')}
                    className="v2-pressable"
                    style={{
                      padding: '12px',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      border: newSnackAssigneeMode === 'me'
                        ? '1.5px solid var(--accent-primary)'
                        : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.10)' : '#e2e8f0'}`,
                      background: newSnackAssigneeMode === 'me'
                        ? (isDark ? 'rgba(15, 118, 110, 0.20)' : 'var(--accent-primary-light)')
                        : (isDark ? 'rgba(15, 23, 42, 0.50)' : '#f8fafc'),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🙋</span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        color: newSnackAssigneeMode === 'me' ? 'var(--accent-primary)' : 'var(--text-main)'
                      }}>
                        Eu vou levar
                      </span>
                    </div>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      Assumo este item como meu compromisso
                    </span>
                  </div>

                  {/* Opção 2: Deixar em aberto */}
                  <div
                    onClick={() => setNewSnackAssigneeMode('open')}
                    className="v2-pressable"
                    style={{
                      padding: '12px',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      border: newSnackAssigneeMode === 'open'
                        ? (isDark ? '1.5px solid #f59e0b' : '1.5px solid #d97706')
                        : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.10)' : '#e2e8f0'}`,
                      background: newSnackAssigneeMode === 'open'
                        ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb')
                        : (isDark ? 'rgba(15, 23, 42, 0.50)' : '#f8fafc'),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.1rem' }}>⏳</span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        color: newSnackAssigneeMode === 'open' ? (isDark ? '#fbbf24' : '#b45309') : 'var(--text-main)'
                      }}>
                        Deixar em aberto
                      </span>
                    </div>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      Outro participante poderá assumir
                    </span>
                  </div>
                </div>

                {/* Seção extra se for Líder e quiser atribuir a um membro específico */}
                {isCellLeader && groupMembers.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setNewSnackAssigneeMode('member')}
                      style={{
                        background: newSnackAssigneeMode === 'member' ? 'var(--accent-primary-light)' : 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      👥 Ou atribuir a um participante específico...
                    </button>

                    {newSnackAssigneeMode === 'member' && (
                      <select
                        className="input-pwa"
                        value={newSnackAssignedMemberId}
                        onChange={e => setNewSnackAssignedMemberId(e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          fontSize: '0.86rem',
                          background: isDark ? 'rgba(15, 23, 42, 0.60)' : '#ffffff',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                          borderRadius: '12px',
                          padding: '11px 12px',
                          color: 'var(--text-main)',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">Selecione um participante...</option>
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
                className="btn-pwa-primary v2-pressable"
                style={{
                  marginTop: '10px',
                  padding: '14px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(15, 118, 110, 0.28)'
                }}
              >
                {isAddingSnack ? 'Salvando na Escala...' : '✨ Confirmar e Adicionar à Mesa'}
              </button>
            </form>
          </div>
        </BottomSheet>
      )}

      {/* ========================================================
          MODAL / BOTTOM SHEET: SELEÇÃO DA DATA DO ENCONTRO
          ======================================================== */}
      {showDatePickerModal && (
        <div 
          onClick={() => setShowDatePickerModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.70)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '0'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: isDark ? '#1e1c2e' : '#ffffff',
              width: '100%',
              maxWidth: '520px',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              padding: '24px 20px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            {/* Pill drag handle */}
            <div style={{ width: '44px', height: '4px', background: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1', borderRadius: '999px', margin: '0 auto -4px auto' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                  Data do Encontro
                </h3>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                  Reuniões da célula: {myGroup.meeting_day ? `${myGroup.meeting_day}s` : 'Semanal'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDatePickerModal(false)}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Lista de Encontros Sugeridos */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Encontros Recentes da Célula
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {getMeetingDateOptions(myGroup.meeting_day).map(opt => {
                  const isSelected = meetingDate === opt.date;
                  return (
                    <button
                      key={opt.date}
                      type="button"
                      onClick={() => {
                        setMeetingDate(opt.date);
                        setShowDatePickerModal(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        border: isSelected 
                          ? '1.5px solid #ea580c' 
                          : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                        background: isSelected 
                          ? (isDark ? '#431407' : '#ffedd5') 
                          : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🗓️</span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: isSelected ? '#ea580c' : 'var(--text-main)' }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: '0.70rem', color: isSelected ? '#ea580c' : 'var(--text-muted)' }}>
                            {opt.date}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: isSelected ? '#ea580c' : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
                        color: isSelected ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569')
                      }}>
                        {opt.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seletor Customizado / Qualquer Data */}
            <div style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
              borderRadius: '18px',
              padding: '14px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
            }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Ou escolha outra data no calendário:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowDatePickerModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    background: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE RELATÓRIO COMPLETO DO ENCONTRO REGISTRADO
          ======================================================== */}
      {viewingMeetingReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.70)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: isDark ? 'var(--bg-card, #1e293b)' : '#ffffff',
            width: '100%',
            maxWidth: '540px',
            borderRadius: '28px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Header do Relatório */}
            <div style={{
              padding: '18px 20px',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: isDark ? 'rgba(255,255,255,0.02)' : '#faf8f5'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  📋
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    Relatório do Encontro
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    📅 {new Date(viewingMeetingReport.meeting_date).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingMeetingReport(null)}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
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

            {/* Conteúdo com Scroll */}
            <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {loadingReportDetails ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  ⏳ Carregando lista de chamada e participantes...
                </div>
              ) : (
                <>
                  {/* Tema do Estudo */}
                  {viewingMeetingReport.study_topic && (
                    <div style={{
                      background: isDark ? 'rgba(15, 118, 110, 0.15)' : '#f0fdfa',
                      border: `1px solid ${isDark ? 'rgba(15, 118, 110, 0.3)' : '#ccfbf1'}`,
                      padding: '12px 14px',
                      borderRadius: '16px'
                    }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary, #0f766e)', letterSpacing: '0.05em' }}>
                        📖 Tema Abordado no Encontro
                      </div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>
                        {viewingMeetingReport.study_topic}
                      </div>
                    </div>
                  )}

                  {/* Grid de Métricas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    <div style={{ background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.2)' : '#bbf7d0'}` }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981' }}>
                        {viewingMeetingReport.present_count || 0}
                      </div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 800, color: isDark ? '#6ee7b7' : '#047857' }}>
                        Presentes
                      </div>
                    </div>

                    <div style={{ background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca'}` }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ef4444' }}>
                        {viewingMeetingReport.absent_count || 0}
                      </div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 800, color: isDark ? '#fca5a5' : '#b91c1c' }}>
                        Ausentes
                      </div>
                    </div>

                    <div style={{ background: isDark ? 'rgba(168, 85, 247, 0.12)' : '#faf5ff', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', border: `1px solid ${isDark ? 'rgba(168, 85, 247, 0.2)' : '#e9d5ff'}` }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#a855f7' }}>
                        {viewingMeetingReport.justified_count || 0}
                      </div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 800, color: isDark ? '#d8b4fe' : '#7e22ce' }}>
                        Justificados
                      </div>
                    </div>

                    <div style={{ background: isDark ? 'rgba(249, 115, 22, 0.12)' : '#fff7ed', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', border: `1px solid ${isDark ? 'rgba(249, 115, 22, 0.2)' : '#fed7aa'}` }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f97316' }}>
                        {viewingMeetingReport.visitor_count || 0}
                      </div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 800, color: isDark ? '#fdba74' : '#c2410c' }}>
                        Visitantes
                      </div>
                    </div>
                  </div>

                  {/* Oferta Arrecadada (se houver) */}
                  {viewingMeetingReport.offerings_amount && Number(viewingMeetingReport.offerings_amount) > 0 && (
                    <div style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                      padding: '10px 14px',
                      borderRadius: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        💰 Oferta Arrecadada:
                      </span>
                      <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#059669' }}>
                        R$ {Number(viewingMeetingReport.offerings_amount).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}

                  {/* Observações / Anotações do Líder */}
                  {viewingMeetingReport.notes && (
                    <div style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                      padding: '12px 14px',
                      borderRadius: '14px'
                    }}>
                      <div style={{ fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        📝 Observações & Pedidos de Oração
                      </div>
                      <div style={{ fontSize: '0.80rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                        {viewingMeetingReport.notes}
                      </div>
                    </div>
                  )}

                  {/* Lista de Chamada Registrada */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Lista de Presença & Justificativas</span>
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        {viewingMeetingReport.attendees?.length || 0} registros
                      </span>
                    </div>

                    {(!viewingMeetingReport.attendees || viewingMeetingReport.attendees.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.76rem', background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderRadius: '12px' }}>
                        Nenhum detalhe nominal gravado para esta reunião.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {viewingMeetingReport.attendees.map((att: any, attIdx: number) => {
                          const isPresent = att.status === 'PRESENT';
                          const isAbsent = att.status === 'ABSENT';
                          const isJustified = att.status === 'JUSTIFIED';
                          const name = att.member_name || att.visitor_name || 'Participante';

                          return (
                            <div
                              key={att.id || attIdx}
                              style={{
                                background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}`,
                                borderRadius: '12px',
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{att.is_visitor ? '🌟' : '👤'}</span>
                                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                                  {att.is_visitor && (
                                    <span style={{ fontSize: '0.62rem', background: '#fff7ed', color: '#ea580c', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                      Visitante
                                    </span>
                                  )}
                                </div>
                                {isJustified && att.justification && (
                                  <div style={{ fontSize: '0.70rem', color: '#a855f7', marginTop: '2px', fontStyle: 'italic' }}>
                                    Motivo: {att.justification}
                                  </div>
                                )}
                              </div>

                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '8px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                flexShrink: 0,
                                background: isPresent 
                                  ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') 
                                  : isAbsent 
                                    ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2') 
                                    : (isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff'),
                                color: isPresent ? '#10b981' : isAbsent ? '#ef4444' : '#a855f7'
                              }}>
                                {isPresent ? '✓ Presente' : isAbsent ? '✕ Ausente' : '💬 Justificado'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer com Botão de Fechar */}
            <div style={{
              padding: '14px 20px',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}`,
              display: 'flex',
              justifyContent: 'flex-end',
              background: isDark ? 'rgba(255,255,255,0.02)' : '#faf8f5'
            }}>
              <button
                type="button"
                onClick={() => setViewingMeetingReport(null)}
                className="btn-pwa-primary"
                style={{ padding: '8px 18px', fontSize: '0.80rem' }}
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
