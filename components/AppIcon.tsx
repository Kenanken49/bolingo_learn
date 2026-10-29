import { View, type StyleProp, type TextStyle } from 'react-native';
import Text from './ui/Text';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';

/**
 * Bolingo Learn icon system — flat Duolingo-style vector glyphs.
 * Replaces every UI emoji with a real icon (crisp at all sizes, one visual
 * language). Mascots (Bingo/Livia/Zora) and lesson *content* art stay custom;
 * everything that is chrome (nav, HUD, buttons, statuses) comes from here.
 *
 * Usage: <AppIcon name="flame" size={20} color="#F97316" />
 */
export type AppIconName =
  | 'flame'
  | 'gem'
  | 'heart'
  | 'heartOutline'
  | 'trophy'
  | 'home'
  | 'target'
  | 'camera'
  | 'image'
  | 'user'
  | 'users'
  | 'book'
  | 'headset'
  | 'star'
  | 'starOutline'
  | 'check'
  | 'checkCircle'
  | 'xCircle'
  | 'alert'
  | 'lock'
  | 'crown'
  | 'doc'
  | 'upload'
  | 'volume'
  | 'volumeOff'
  | 'mic'
  | 'code'
  | 'bug'
  | 'chat'
  | 'gift'
  | 'globe'
  | 'medal'
  | 'zap'
  | 'play'
  | 'pause'
  | 'next'
  | 'prev'
  | 'close'
  | 'refresh'
  | 'trash'
  | 'plus'
  | 'bell'
  | 'calendar'
  | 'google'
  | 'folder'
  | 'map'
  | 'sparkles'
  | 'party'
  | 'chess'
  | 'robot'
  | 'chevBack'
  | 'chevRight'
  | 'gradCap'
  | 'palette'
  | 'linux'
  | 'flask'
  | 'pencil'
  | 'ruler'
  | 'brain'
  | 'leaf'
  | 'music'
  | 'eye'
  | 'thumbUp'
  | 'thumbDown'
  | 'mail'
  | 'key'
  | 'rocket'
  | 'phone'
  | 'layers'
  | 'briefcase'
  | 'sunny'
  | 'moon'
  | 'hand'
  | 'atom'
  | 'archive'
  | 'plug'
  | 'snake'
  | 'shield'
  | 'scale'
  | 'shuffle'
  | 'time';

type Glyph = { lib: 'ion' | 'mci' | 'fa'; glyph: string };

const MAP: Record<AppIconName, Glyph> = {
  flame: { lib: 'ion', glyph: 'flame' },
  gem: { lib: 'ion', glyph: 'diamond' },
  heart: { lib: 'ion', glyph: 'heart' },
  heartOutline: { lib: 'ion', glyph: 'heart-outline' },
  trophy: { lib: 'ion', glyph: 'trophy' },
  home: { lib: 'ion', glyph: 'home' },
  target: { lib: 'ion', glyph: 'locate' },
  camera: { lib: 'ion', glyph: 'camera' },
  image: { lib: 'ion', glyph: 'image' },
  user: { lib: 'ion', glyph: 'person' },
  users: { lib: 'ion', glyph: 'people' },
  book: { lib: 'ion', glyph: 'book' },
  headset: { lib: 'ion', glyph: 'headset' },
  star: { lib: 'ion', glyph: 'star' },
  starOutline: { lib: 'ion', glyph: 'star-outline' },
  check: { lib: 'ion', glyph: 'checkmark' },
  checkCircle: { lib: 'ion', glyph: 'checkmark-circle' },
  xCircle: { lib: 'ion', glyph: 'close-circle' },
  alert: { lib: 'ion', glyph: 'warning' },
  lock: { lib: 'ion', glyph: 'lock-closed' },
  crown: { lib: 'mci', glyph: 'crown' },
  doc: { lib: 'ion', glyph: 'document-text' },
  upload: { lib: 'ion', glyph: 'cloud-upload' },
  volume: { lib: 'ion', glyph: 'volume-high' },
  volumeOff: { lib: 'ion', glyph: 'volume-mute' },
  mic: { lib: 'ion', glyph: 'mic' },
  code: { lib: 'ion', glyph: 'code-slash' },
  bug: { lib: 'ion', glyph: 'bug' },
  chat: { lib: 'ion', glyph: 'chatbubbles' },
  gift: { lib: 'ion', glyph: 'gift' },
  globe: { lib: 'ion', glyph: 'globe' },
  medal: { lib: 'ion', glyph: 'medal' },
  zap: { lib: 'ion', glyph: 'flash' },
  play: { lib: 'ion', glyph: 'play' },
  pause: { lib: 'ion', glyph: 'pause' },
  next: { lib: 'ion', glyph: 'play-skip-forward' },
  prev: { lib: 'ion', glyph: 'play-skip-back' },
  close: { lib: 'ion', glyph: 'close' },
  refresh: { lib: 'ion', glyph: 'refresh' },
  trash: { lib: 'ion', glyph: 'trash' },
  plus: { lib: 'ion', glyph: 'add' },
  bell: { lib: 'ion', glyph: 'notifications' },
  calendar: { lib: 'ion', glyph: 'calendar' },
  google: { lib: 'fa', glyph: 'google' },
  folder: { lib: 'ion', glyph: 'folder' },
  map: { lib: 'ion', glyph: 'map' },
  sparkles: { lib: 'ion', glyph: 'sparkles' },
  party: { lib: 'mci', glyph: 'party-popper' },
  chess: { lib: 'mci', glyph: 'chess-pawn' },
  robot: { lib: 'mci', glyph: 'robot' },
  chevBack: { lib: 'ion', glyph: 'chevron-back' },
  chevRight: { lib: 'ion', glyph: 'chevron-forward' },
  gradCap: { lib: 'ion', glyph: 'school' },
  palette: { lib: 'mci', glyph: 'palette' },
  linux: { lib: 'mci', glyph: 'linux' },
  flask: { lib: 'ion', glyph: 'flask' },
  pencil: { lib: 'ion', glyph: 'pencil' },
  ruler: { lib: 'ion', glyph: 'shapes' },
  brain: { lib: 'mci', glyph: 'brain' },
  leaf: { lib: 'ion', glyph: 'leaf' },
  music: { lib: 'ion', glyph: 'musical-notes' },
  eye: { lib: 'ion', glyph: 'eye' },
  thumbUp: { lib: 'ion', glyph: 'thumbs-up' },
  thumbDown: { lib: 'ion', glyph: 'thumbs-down' },
  mail: { lib: 'ion', glyph: 'mail' },
  key: { lib: 'ion', glyph: 'key' },
  rocket: { lib: 'ion', glyph: 'rocket' },
  phone: { lib: 'ion', glyph: 'phone-portrait' },
  layers: { lib: 'ion', glyph: 'layers' },
  briefcase: { lib: 'ion', glyph: 'briefcase' },
  sunny: { lib: 'ion', glyph: 'sunny' },
  moon: { lib: 'ion', glyph: 'moon' },
  hand: { lib: 'ion', glyph: 'hand-left' },
  atom: { lib: 'ion', glyph: 'atom' },
  archive: { lib: 'ion', glyph: 'archive' },
  plug: { lib: 'mci', glyph: 'power-plug' },
  snake: { lib: 'mci', glyph: 'snake' },
  shield: { lib: 'mci', glyph: 'shield' },
  scale: { lib: 'mci', glyph: 'scale-balance' },
  shuffle: { lib: 'ion', glyph: 'shuffle' },
  time: { lib: 'ion', glyph: 'time' },
};

/**
 * Content art bridge: course/unit pictures that used to be emoji.
 * Flags become crisp code badges (ES/FR/…); everything else maps to a
 * vector glyph. Null only for truly unknown art (renders a star).
 */
const FLAG_BADGE: Record<string, string> = {
  '🇪🇸': 'ES',
  '🇫🇷': 'FR',
  '🇩🇪': 'DE',
  '🇰🇪': 'KE',
  '🇬🇧': 'GB',
};

const ART_ICON: Record<string, AppIconName> = {
  '🎨': 'palette',
  '📖': 'book',
  '📚': 'book',
  '📐': 'ruler',
  '🌐': 'globe',
  '🌍': 'globe',
  '🐧': 'linux',
  '♟️': 'chess',
  '🎓': 'gradCap',
  '🏆': 'trophy',
  '📝': 'pencil',
  '🛠️': 'code',
  '🛠': 'code',
  '🧪': 'flask',
  '🏗️': 'folder',
  '🏗': 'folder',
  '👀': 'eye',
  '⭐': 'star',
  '🎧': 'headset',
  '🎓‍': 'gradCap',
  '📄': 'doc',
  '🟨': 'code',
  '⚛️': 'atom',
  '🗄️': 'archive',
  '🔌': 'plug',
  '🐍': 'snake',
  '🛡️': 'shield',
  '⚖️': 'scale',
  '🔀': 'shuffle',
  '🗺️': 'map',
  '⏱': 'time',
};

/** Course/unit art without a single emoji. */
export function ContentMark({
  emoji,
  size = 22,
  color = '#0F172A',
  badgeBg = '#0F172A',
}: {
  emoji: string;
  size?: number;
  color?: string;
  badgeBg?: string;
}) {
  const code = FLAG_BADGE[emoji];
  if (code) {
    return (
      <AppIconNameBadge code={code} size={size} color={color} badgeBg={badgeBg} />
    );
  }
  return <AppIcon name={ART_ICON[emoji] ?? 'star'} size={size} color={color} />;
}

function AppIconNameBadge({
  code,
  size,
  color,
  badgeBg,
}: {
  code: string;
  size: number;
  color: string;
  badgeBg: string;
}) {
  return (
    <View
      style={{
        minWidth: size * 1.5,
        height: size * 1.1,
        borderRadius: size * 0.28,
        backgroundColor: badgeBg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: size * 0.25,
      }}
    >
      <Text style={{ fontSize: size * 0.52, fontWeight: '900', letterSpacing: 1, color }}>{code}</Text>
    </View>
  );
}

export default function AppIcon({
  name,
  size = 22,
  color = '#0F172A',
  style,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const m = MAP[name];
  if (m.lib === 'mci') return <MaterialCommunityIcons name={m.glyph as never} size={size} color={color} style={style} />;
  if (m.lib === 'fa') return <FontAwesome name={m.glyph as never} size={size} color={color} style={style} />;
  return <Ionicons name={m.glyph as never} size={size} color={color} style={style} />;
}
