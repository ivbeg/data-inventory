import React, {type ReactNode} from 'react';
import {useColorMode} from '@docusaurus/theme-common';
import Mermaid from '@theme-original/Mermaid';
import type {Props} from '@theme/Mermaid';

// При смене темы Docusaurus рисует схему заново под тем же id, а Mermaid перед отрисовкой
// удаляет со страницы элемент с этим id — уже вставленную схему. При загрузке в тёмной теме
// из-за этого оставались пустыми все схемы страницы, кроме первой. Ключ по теме монтирует
// компонент заново, и каждая отрисовка получает свой id.
export default function MermaidWrapper(props: Props): ReactNode {
  const {colorMode} = useColorMode();
  return <Mermaid key={colorMode} {...props} />;
}
