import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { getProfile, type Profile } from '../../lib/progress';
import { PREMIUM_PRICE_LABEL } from '../../lib/tiers';
import { useNatural } from '../../lib/natural';
import AppIcon from '../../components/AppIcon';
import AudiobookPlayer from '../../components/AudiobookPlayer';
import type { AudioChapter } from '../../lib/audiobook';
import {
  CLASSICS,
  downloadBook,
  formatBytes,
  genreCounts,
  getOfflineStatus,
  localCoverUri,
  localTextUri,
  playableChapters,
  readTextFile,
  removeOfflineBook,
  type ClassicBook,
  type OfflineStatus,
} from '../../lib/classicsAudiobooks';
import {
  canDownloadToday,
  getDailyDownload,
  recordDailyDownload,
  todayKey,
  type DailyDownload,
} from '../../lib/classicsDailyLimit';

const READER_PAGE = 5500;

/** Split ebook text into word-safe pages so words are never cut in half. */
function paginate(text: string, size: number = READER_PAGE): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const pages: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && cur.length + w.length + 1 > size) {
      pages.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) pages.push(cur);
  return pages.length > 0 ? pages : [''];
}

interface ReaderState {
  book: ClassicBook;
  text: string;
  page: number;
}

interface PlayerState {
  book: ClassicBook;
  chapters: AudioChapter[];
}

export default function ClassicsLibrary() {
  const p = useNatural();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, OfflineStatus>>({});
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, { written: number; total: number }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyDownload | null>(null);
  const [reader, setReader] = useState<ReaderState | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const statusToken = useRef(0);

  const isPremium = profile?.is_premium === true;

  const refreshStatuses = useCallback(async () => {
    const token = statusToken.current + 1;
    statusToken.current = token;
    const entries = await Promise.all(
      CLASSICS.map(async (b) => [b.slug, await getOfflineStatus(b).catch(() => null)] as const)
    );
    if (statusToken.current !== token) return;
    const next: Record<string, OfflineStatus> = {};
    for (const [slug, st] of entries) if (st) next[slug] = st;
    setStatuses(next);
    const coverEntries = await Promise.all(
      CLASSICS.map(async (b) => [b.slug, await localCoverUri(b).catch(() => null)] as const)
    );
    if (statusToken.current !== token) return;
    const coverNext: Record<string, string> = {};
    for (const [slug, uri] of coverEntries) if (uri) coverNext[slug] = uri;
    setCovers(coverNext);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const prof = await getProfile().catch(() => null);
          if (alive) setProfile(prof);
        } catch {}
        await refreshStatuses().catch(() => {});
        try {
          const day = await getDailyDownload().catch(() => null);
          if (alive) setDaily(day);
        } catch {}
      })();
      return () => {
        alive = false;
      };
    }, [refreshStatuses])
  );

  const genres = useMemo(() => genreCounts(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLASSICS.filter((b) => {
      if (genre && !b.genres.includes(genre)) return false;
      if (offlineOnly && statuses[b.slug]?.state !== 'complete') return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.genres.some((g) => g.toLowerCase().includes(q))
      );
    });
  }, [query, genre, offlineOnly, statuses]);

  // Top of the screen is audio-first (Listen to Audiobook Mode); the Books
  // Library below is text-first. Both share the search / genre / offline
  // filters so one search narrows the whole shelf.
  const audioBooks = useMemo(() => filtered.filter((b) => b.hasAudio), [filtered]);
  const libraryBooks = useMemo(() => filtered.filter((b) => b.hasText), [filtered]);

  const offlineBytes = useMemo(
    () => Object.values(statuses).reduce((n, s) => n + s.bytes, 0),
    [statuses]
  );

  const guardPremium = () => {
    if (isPremium) return true;
    setNotice(`Philosophy Classics is a Premium perk (${PREMIUM_PRICE_LABEL}). Your downloads and offline shelf unlock with Premium.`);
    return false;
  };

  const openReader = async (book: ClassicBook) => {
    if (!guardPremium()) return;
    setBusy(book.slug);
    setNotice(null);
    try {
      const uri = await localTextUri(book);
      if (!uri) throw new Error('No readable text for this book yet.');
      const text = await readTextFile(uri);
      setReader({ book, text, page: 0 });
    } catch (e) {
      setNotice(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  };

  const openPlayer = async (book: ClassicBook) => {
    if (!guardPremium()) return;
    setBusy(book.slug);
    setNotice(null);
    try {
      const parts = await playableChapters(book);
      if (parts.length === 0) throw new Error('No audio for this book yet.');
      setPlayer({
        book,
        chapters: parts.map((c, i) => ({
          index: i,
          audio_path: '',
          url: c.url,
          chars: 0,
          title: c.title,
          offline: c.offline,
        })),
      });
    } catch (e) {
      setNotice(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  };

  // Premium includes 1 book download per day: the first download stamps
  // the day, re-downloading that same book stays free, and books already
  // offline never count. Streaming and reading bundled/in-app copies stay
  // unlimited.
  const download = async (book: ClassicBook) => {
    if (!guardPremium()) return;
    const offline = statuses[book.slug]?.state === 'complete';
    const verdict = await canDownloadToday(book.slug, offline).catch(() => null);
    if (verdict && !verdict.allowed && verdict.today) {
      setNotice(
        `Premium includes 1 book download per day. Today's pick is “${verdict.today.title || 'your download'}” — your next book unlocks tomorrow.`
      );
      setDaily(verdict.today);
      return;
    }
    setBusy(book.slug);
    setNotice(null);
    try {
      await downloadBook(book, (written, total) =>
        setProgress((prev) => ({ ...prev, [book.slug]: { written, total } }))
      );
      const stamped = await recordDailyDownload(book.slug, book.title);
      setDaily(stamped);
      setNotice(`“${book.title}” is now offline.`);
    } catch (e) {
      setNotice(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
      setProgress((prev) => {
        const next = { ...prev };
        delete next[book.slug];
        return next;
      });
      await refreshStatuses().catch(() => {});
    }
  };

  const remove = async (book: ClassicBook) => {
    setBusy(book.slug);
    try {
      await removeOfflineBook(book);
    } catch (e) {
      setNotice(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
      await refreshStatuses().catch(() => {});
    }
  };

  const renderRow = (book: ClassicBook, emphasis: 'audio' | 'text' = 'text') => {
    const st = statuses[book.slug];
    const prog = progress[book.slug];
    const offline = st?.state === 'complete';
    const partial = st?.state === 'partial';
    const pct = prog ? Math.min(1, prog.total > 0 ? prog.written / prog.total : 0) : 0;
    const working = busy === book.slug;
    // One tight row per book: status dot + cover + title/author on the left,
    // the section's single action (Listen in audiobooks, Read in the library)
    // + the download/remove slot on the right.
    const primaryLabel = emphasis === 'audio' ? 'Listen' : 'Read';
    const primaryAction = emphasis === 'audio' ? () => void openPlayer(book) : () => void openReader(book);
    return (
      <View
        key={book.slug}
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: p.line,
          backgroundColor: p.surface,
          paddingVertical: 9,
          paddingHorizontal: 12,
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: offline ? p.moss : partial ? p.honey : p.stone,
            }}
          />
          {covers[book.slug] ? (
            <Image
              source={{ uri: covers[book.slug] }}
              accessibilityLabel={`${book.title} cover`}
              style={{ width: 40, height: 56, borderRadius: 6, backgroundColor: p.surfaceAlt }}
            />
          ) : (
            <View
              accessibilityLabel={`${book.title} cover`}
              style={{ width: 40, height: 56, borderRadius: 6, backgroundColor: p.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: p.muted }}>
                {(book.title || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', color: p.ink }}>
              {book.title}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: p.muted }}>
              {book.author || 'Unknown'}
              {offline ? ' · offline' : partial ? ' · downloading' : ''}
            </Text>
          </View>
          <Pressable
            onPress={primaryAction}
            disabled={working}
            accessibilityRole="button"
            accessibilityLabel={`${primaryLabel} ${book.title}`}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderRadius: 10,
              backgroundColor: emphasis === 'audio' ? 'transparent' : p.moss,
              borderWidth: emphasis === 'audio' ? 1 : 0,
              borderColor: p.moss,
              paddingVertical: 7,
              paddingHorizontal: 14,
              opacity: pressed || working ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: emphasis === 'audio' ? p.moss : '#10150D',
              }}
            >
              {primaryLabel}
            </Text>
          </Pressable>
          {offline || partial ? (
            <Pressable
              onPress={() => void remove(book)}
              disabled={working}
              accessibilityRole="button"
              accessibilityLabel={`Remove offline files for ${book.title}`}
              style={{ alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, backgroundColor: p.surfaceAlt, borderWidth: 1, borderColor: p.line }}
            >
              {working ? <ActivityIndicator size="small" color={p.muted} /> : <AppIcon name="close" size={15} color={p.muted} />}
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void download(book)}
              disabled={working}
              accessibilityRole="button"
              accessibilityLabel={`Download ${book.title} for offline`}
              style={{ alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, backgroundColor: p.surfaceAlt, borderWidth: 1, borderColor: p.line }}
            >
              {working || prog ? (
                <Text style={{ fontSize: 10, fontWeight: '800', color: p.muted }}>
                  {prog ? `${Math.round(pct * 100)}%` : '…'}
                </Text>
              ) : (
                <AppIcon name="download" size={16} color={p.moss} />
              )}
            </Pressable>
          )}
        </View>
        {prog ? (
          <View style={{ marginTop: 8, height: 4, borderRadius: 2, backgroundColor: p.surfaceAlt }}>
            <View style={{ width: `${Math.round(pct * 100)}%`, height: 4, borderRadius: 2, backgroundColor: p.moss }} />
          </View>
        ) : null}
      </View>
    );
  };

  const readerScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // Word-safe pages for reading mode; page turns never split a word.
  const readerPageList = useMemo(() => (reader ? paginate(reader.text) : ['']), [reader]);
  const readerPages = readerPageList.length;
  const readerSlice = reader ? (readerPageList[reader.page] ?? '') : '';

  // Every page turn starts at the top of the new page.
  useEffect(() => {
    if (reader) readerScroll.current?.scrollTo({ y: 0, animated: false });
  }, [reader]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, backgroundColor: p.isDark ? '#010603' : '#F3F7EE' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.line }}
          >
            <AppIcon name="chevBack" size={17} color={p.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '800', color: p.ink }}>Philosophy Classics</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: p.muted }}>
              {CLASSICS.length} public-domain books · {formatBytes(offlineBytes)} offline
            </Text>
          </View>
          <Pressable
            onPress={() => setOfflineOnly((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Downloaded only"
            style={{
              borderRadius: 99,
              paddingHorizontal: 11,
              paddingVertical: 7,
              backgroundColor: offlineOnly ? p.moss : p.surface,
              borderWidth: 1,
              borderColor: p.line,
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: offlineOnly ? '#10150D' : p.muted }}>
              OFFLINE ONLY
            </Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search title, author, genre…"
            placeholderTextColor={p.muted}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: p.line,
              backgroundColor: p.surface,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 13.5,
              color: p.ink,
            }}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
          style={{ maxHeight: 44, flexGrow: 0 }}
        >
          <Pressable
            onPress={() => setGenre(null)}
            style={{
              borderRadius: 99,
              paddingHorizontal: 12,
              paddingVertical: 7,
              backgroundColor: genre === null ? p.moss : p.surface,
              borderWidth: 1,
              borderColor: p.line,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: genre === null ? '#10150D' : p.muted }}>
              ALL ({CLASSICS.length})
            </Text>
          </Pressable>
          {genres.map((g) => (
            <Pressable
              key={g.name}
              onPress={() => setGenre(genre === g.name ? null : g.name)}
              style={{
                borderRadius: 99,
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: genre === g.name ? p.moss : p.surface,
                borderWidth: 1,
                borderColor: p.line,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: genre === g.name ? '#10150D' : p.muted }}>
                {g.name.toUpperCase()} ({g.count})
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {!isPremium ? (
          <View style={{ marginHorizontal: 16, marginTop: 8, borderRadius: 18, borderWidth: 1, borderColor: p.honey, backgroundColor: p.isDark ? '#171208' : '#FBF3E2', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <AppIcon name="crown" size={17} color={p.honey} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: p.ink }}>Premium classics shelf</Text>
            </View>
            <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '600', color: p.muted }}>
              {CLASSICS.length} public-domain philosophy books with full audio + text. Premium unlocks 1 book download per day for offline ({PREMIUM_PRICE_LABEL}).
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable
                onPress={() => router.push('/paywall')}
                accessibilityRole="button"
                accessibilityLabel="Go premium"
                style={{ flex: 1, alignItems: 'center', borderRadius: 12, backgroundColor: p.honey, paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#241806' }}>Go Premium</Text>
              </Pressable>
              {!profile ? (
                <Pressable
                  onPress={() => router.push('/auth')}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                  style={{ flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: p.ink }}>Sign in</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6, marginBottom: 2 }}>
            <AppIcon name="headset" size={16} color={p.moss} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: p.ink }}>Listen to Audiobook Mode</Text>
          </View>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: p.muted, marginBottom: 2 }}>
            {audioBooks.length} narrated books · stream anytime{daily && daily.date === todayKey() ? ` · today's download: ${daily.title || 'picked'}` : ' · 1 download available today'}
          </Text>
          {audioBooks.map((b) => renderRow(b, 'audio'))}
          {audioBooks.length === 0 ? (
            <Text style={{ textAlign: 'center', marginVertical: 12, fontSize: 13, fontWeight: '600', color: p.muted }}>
              No narrated books match — try another search or genre.
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, marginBottom: 2 }}>
            <AppIcon name="book" size={16} color={p.moss} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: p.ink }}>Books Library</Text>
          </View>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: p.muted, marginBottom: 2 }}>
            {libraryBooks.length} ebooks · Premium downloads: 1 book per day
          </Text>
          {libraryBooks.map((b) => renderRow(b, 'text'))}
          {filtered.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 24, fontSize: 13, fontWeight: '600', color: p.muted }}>
              Nothing matches — try another search or genre.
            </Text>
          ) : null}

        </ScrollView>

        {notice ? (
          <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, padding: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: p.muted }}>{notice}</Text>
          </View>
        ) : null}

        <Modal visible={player !== null} animationType="slide" onRequestClose={() => setPlayer(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: p.isDark ? '#010603' : '#F3F7EE' }} edges={['top', 'bottom']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Pressable
                onPress={() => setPlayer(null)}
                accessibilityRole="button"
                accessibilityLabel="Close player"
                style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.line }}
              >
                <AppIcon name="chevBack" size={17} color={p.ink} />
              </Pressable>
              {player && covers[player.book.slug] ? (
                <Image
                  source={{ uri: covers[player.book.slug] }}
                  accessibilityLabel={`${player.book.title} cover`}
                  style={{ width: 48, height: 68, borderRadius: 8 }}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: p.ink }}>
                  Now playing
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: p.muted }}>
                  {player ? `${player.chapters.filter((c) => c.offline).length}/${player.chapters.length} parts on this device` : ''}
                </Text>
              </View>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 16, paddingBottom: 40 }}>
              {player ? (
                <AudiobookPlayer
                  key={player.book.slug}
                  title={player.book.title}
                  author={player.book.author}
                  segments={[]}
                  chapters={player.chapters}
                  fullUrl={null}
                  onClose={() => setPlayer(null)}
                />
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal visible={reader !== null} animationType="slide" onRequestClose={() => setReader(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: p.isDark ? '#010603' : '#F3F7EE' }} edges={['top', 'bottom']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Pressable
                onPress={() => setReader(null)}
                accessibilityRole="button"
                accessibilityLabel="Close reader"
                style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.line }}
              >
                <AppIcon name="close" size={16} color={p.ink} />
              </Pressable>
              {reader && covers[reader.book.slug] ? (
                <Image
                  source={{ uri: covers[reader.book.slug] }}
                  accessibilityLabel={`${reader.book.title} cover`}
                  style={{ width: 32, height: 45, borderRadius: 6 }}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: p.ink }}>
                  {reader?.book.title}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: p.muted }}>
                  {reader?.book.author} · public domain
                </Text>
              </View>
            </View>
            <ScrollView ref={readerScroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <Text style={{ fontSize: 15.5, lineHeight: 24, color: p.ink }}>{readerSlice}</Text>
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 14 }}>
              <Pressable
                disabled={!reader || reader.page === 0}
                onPress={() => setReader((r) => (r ? { ...r, page: Math.max(0, r.page - 1) } : r))}
                accessibilityRole="button"
                accessibilityLabel="Previous page"
                style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, opacity: !reader || reader.page === 0 ? 0.35 : 1 }}
              >
                <AppIcon name="chevBack" size={28} color={p.ink} />
              </Pressable>
              <Text style={{ fontSize: 12, fontWeight: '700', color: p.muted }}>
                {(reader?.page ?? 0) + 1} / {readerPages}
              </Text>
              <Pressable
                disabled={!reader || reader.page >= readerPages - 1}
                onPress={() => setReader((r) => (r ? { ...r, page: Math.min(readerPages - 1, r.page + 1) } : r))}
                accessibilityRole="button"
                accessibilityLabel="Next page"
                style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: p.moss, opacity: !reader || reader.page >= readerPages - 1 ? 0.35 : 1 }}
              >
                <AppIcon name="chevRight" size={28} color="#10150D" />
              </Pressable>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
