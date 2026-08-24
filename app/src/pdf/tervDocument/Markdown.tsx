// A sablon-markdown (nyilatkozat/fizetési feltételek/garancia) renderelése
// -- kiemelve a TervDocument.tsx-ből.

import { Text, View } from '@react-pdf/renderer';
import { parseInline, type MdBlock } from '../markdownLite';
import { s } from './styles';

// Bold nélküli szöveg a nyers stringet adja vissza -- ez garantálja, hogy a
// mai (`**`-t nem tartalmazó) sablonszövegek renderelése bájtra változatlan
// marad.
export function MdInline({ text }: { text: string }) {
  const spans = parseInline(text);
  if (spans.length === 1 && !spans[0].bold) return <>{text}</>;
  return (
    <>
      {spans.map((span, i) => (
        <Text key={i} style={span.bold ? s.bold : undefined}>
          {span.text}
        </Text>
      ))}
    </>
  );
}

export function MdBlocks({ blocks, legal }: { blocks: MdBlock[]; legal?: boolean }) {
  const paragraphStyle = legal ? s.legalParagraph : s.paragraph;
  const bulletTextStyle = legal ? s.legalBulletText : s.bulletText;
  return (
    <>
      {blocks.map((block, i) => {
        if (block.kind === 'ul') {
          return (
            <View key={i}>
              {block.items.map((item, j) => (
                <View key={j} style={s.bulletRow}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={bulletTextStyle}>
                    <MdInline text={item} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        if (block.kind === 'ol') {
          return (
            <View key={i}>
              {block.items.map((item, j) => (
                <View key={j} style={s.bulletRow}>
                  <Text style={s.numberMarker}>{item.marker}.</Text>
                  <Text style={bulletTextStyle}>
                    <MdInline text={item.text} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={i} style={paragraphStyle}>
            <MdInline text={block.text} />
          </Text>
        );
      })}
    </>
  );
}
