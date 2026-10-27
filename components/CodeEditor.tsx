import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';

export type CodeLang = 'html' | 'css' | 'js';

export interface CodeDoc {
  html: string;
  css: string;
  js: string;
}

const TABS: Array<{ id: CodeLang; label: string; color: string }> = [
  { id: 'html', label: 'index.html', color: 'bg-orange-500' },
  { id: 'css', label: 'styles.css', color: 'bg-sky-500' },
  { id: 'js', label: 'script.js', color: 'bg-amber-400' },
];

/** Tiny regex highlighter — colors for tags/attrs/strings/comments + CSS/JS keywords. */
function highlight(lang: CodeLang, code: string, keyPrefix: string) {
  if (code.length > 8000) {
    return [<Text key={`${keyPrefix}-plain`} className="text-slate-200">{code}</Text>];
  }
  const out: React.ReactNode[] = [];
  let key = 0;
  // No font classes here: spans inherit the parent's monospace 14/20 metrics
  // so highlight and input glyphs align pixel-for-pixel.
  const push = (text: string, cls: string) => {
    out.push(
      <Text key={`${keyPrefix}-${key++}`} className={cls}>
        {text}
      </Text>
    );
  };
  const pattern =
    lang === 'html'
      ? /(<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|"[^"]*")/g
      : lang === 'css'
        ? /(\/\*[\s\S]*?\*\/|[.#]?[a-zA-Z-]+\s*(?=\{)|[a-zA-Z-]+\s*(?=:)|:[^;{}]+;?|"[^"]*")/g
        : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|\b(?:const|let|var|function|return|if|else|for|while|document|querySelector|addEventListener)\b|\b\d+\b)/g;
  let last = 0;
  for (const m of code.matchAll(pattern)) {
    const idx = m.index ?? 0;
    if (idx > last) push(code.slice(last, idx), 'text-slate-200');
    const tok = m[0];
    let cls = 'text-slate-200';
    if (lang === 'html') {
      cls = tok.startsWith('<!--') ? 'text-slate-500' : tok.startsWith('"') ? 'text-amber-300' : 'text-sky-400';
    } else if (lang === 'css') {
      cls = tok.startsWith('/*') ? 'text-slate-500' : tok.startsWith('"') ? 'text-amber-300' : /[:;{]/.test(tok) ? 'text-slate-200' : 'text-fuchsia-400';
    } else {
      cls = tok.startsWith('//') || tok.startsWith('/*') ? 'text-slate-500' : /^["']/.test(tok) || /^\d+$/.test(tok) ? 'text-amber-300' : 'text-fuchsia-400';
    }
    push(tok, cls);
    last = idx + tok.length;
  }
  if (last < code.length) push(code.slice(last), 'text-slate-200');
  if (out.length === 0) push('', 'text-slate-200');
  return out;
}

export function combineDoc(doc: CodeDoc): string {
  return `${doc.html}\n<style>${doc.css}</style>\n<script>${doc.js}</script>`;
}

/**
 * Pixel-locked gutter + highlight + input: ONE outer scroller drives the
 * gutter column and the code column together, while the highlight layer and
 * the transparent input share identical font/padding/width inside a single
 * growing container — they cannot drift at any zoom level. Line numbers
 * track logical lines (VS Code with word-wrap behaves the same way).
 */
function GutteredInput({
  tab,
  value,
  lines,
  onChange,
}: {
  tab: CodeLang;
  value: string;
  lines: number;
  onChange: (t: string) => void;
}) {
  return (
    <ScrollView className="h-64" nestedScrollEnabled>
      <View className="flex-row" style={{ minHeight: 256 }}>
        <View className="w-10 bg-slate-900 py-4">
          {Array.from({ length: lines }, (_, i) => (
            <Text key={i} className="text-right font-mono text-sm leading-5 text-slate-600" style={{ paddingRight: 8 }}>
              {i + 1}
            </Text>
          ))}
        </View>
        <View className="flex-1" style={{ position: 'relative' }}>
          {/* Identical string in both layers (same font/metrics/width) keeps
              heights — and therefore scroll — locked at any zoom level. */}
          <Text style={{ padding: 16, fontFamily: 'monospace', fontSize: 14, lineHeight: 20 }}>
            {highlight(tab, value || ' ', tab)}
          </Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            multiline
            scrollEnabled={false}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
            selectionColor="#22c55e"
            placeholder={tab === 'html' ? '<h1>Start here…' : tab === 'css' ? '/* style here… */' : '// script here…'}
            placeholderTextColor="#475569"
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              right: 16,
              bottom: 16,
              color: 'transparent',
              backgroundColor: 'transparent',
              fontFamily: 'monospace',
              fontSize: 14,
              lineHeight: 20,
              padding: 0,
              margin: 0,
              borderWidth: 0,
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

export default function CodeEditor({
  initial,
  onChange,
}: {
  initial: CodeDoc;
  onChange: (doc: CodeDoc) => void;
}) {
  const [tab, setTab] = useState<CodeLang>('html');
  const [doc, setDoc] = useState<CodeDoc>(initial);

  const set = (lang: CodeLang, value: string) => {
    const next = { ...doc, [lang]: value };
    setDoc(next);
    onChange(next);
  };

  const lines = useMemo(() => doc[tab].split('\n').length, [doc, tab]);
  const value = doc[tab];

  return (
    <View className="overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950">
      {/* File tabs */}
      <View className="flex-row border-b border-slate-800 bg-slate-900">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${t.label} tab`}
              className={`flex-row items-center px-4 py-2.5 ${active ? 'bg-slate-950' : ''}`}
            >
              <View className={`mr-1.5 h-2.5 w-2.5 rounded-full ${t.color}`} />
              <Text className={`font-mono text-xs font-bold ${active ? 'text-white' : 'text-slate-500'}`}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Gutter + highlighted code under a transparent input; scrolls stay synced */}
      <GutteredInput tab={tab} value={value} lines={lines} onChange={(t: string) => set(tab, t)} />
    </View>
  );
}
